// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanPostDiscoveryJobFactory;
di.annotate(DellWsmanPostDiscoveryJobFactory, new di.Provide('Job.Dell.Wsman.PostDiscovery'));
di.annotate(DellWsmanPostDiscoveryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Lookup',
    'Services.Configuration',
    '_',
    'HttpTool',
    'Errors',
    'JobUtils.WorkflowTool',
    'Protocol.Events',
    'validator',
    'JobUtils.RedfishTool'
));

function DellWsmanPostDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    lookup,
    configuration,
    _,
    HttpTool,
    errors,
    workflowTool,
    eventsProtocol,
    validator,
    RedfishTool
) {
    var logger = Logger.initialize(DellWsmanPostDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanPostDiscoveryJob(options, context, taskId) {
        DellWsmanPostDiscoveryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        assert.object(this.options);
        this.user = options.credentials.userName;
        this.password = options.credentials.password;
        this.nodeId = this.context.target || undefined;
        this.nodeData = options.data || undefined;
        this.redfish = new RedfishTool();

    }

    util.inherits(DellWsmanPostDiscoveryJob, BaseJob);


    /**
     * @memberOf DellWsmanPostDiscoveryJob
     */
    DellWsmanPostDiscoveryJob.prototype._run = function () {
    	var self = this;

		self.dell = configuration.get('dell');
        if (!self.dell || !self.dell.services || !self.dell.services.discovery) {
        	throw new errors.NotFoundError('Dell Discovery web service is not defined in wsmanConfig.json.');
        }
        if(!self.nodeId) {
    	    throw new Error('Node ID is required.');
    	}
    	if(self.validateNodeData() === false) {
    	    throw new Error('Invalid node data.');
    	}
    	return Promise.resolve(self.processNode())
//        .then(function(){
//        	self._done();
//        })
        .catch(function(err){
        	self._done(err);
        });
    }


    /**
     * @memberOf DellWsmanPostDiscoveryJob
     */
    DellWsmanPostDiscoveryJob.prototype.validateNodeData = function () {

        if(!this.nodeData){
            return false;
        }
        var data = this.nodeData;
        if(data.status !== 'SUCCESS'){
            return false;
        }
//        var type = data.deviceType;
//        if( type === 'IDRAC7' || type === 'IDRAC8' || type === 'CMC_FX2' || type === 'CMC'){
//            if(!data.summary || !data.summary.serviceTag) {
//                logger.error('Node data is invalid for node ID: ' + this.nodeId);
//                return false;
//            }
//        } else {
//            return false
//        }
        return true;
    };


    DellWsmanPostDiscoveryJob.prototype.processNode = function() {

    	var self = this;
        var computeNode = null;
        var nodeType = self.nodeData.deviceType;

        return waterline.nodes.getNodeById(self.context.target)
        .then(function(node){
            computeNode = node;
            logger.debug('Creating WSman OBM for ' + nodeType + ' node ID: ' + computeNode.id);
            return Promise.resolve(self.createWsmanObm(computeNode, self.nodeData.summary.id))
        })
        .then(function(){
            if(nodeType === 'CMC_FX2' || nodeType === 'CMC') {
                logger.info('Node is: ' + nodeType + ', no Redfish OBM will be created.');
                return Promise.resolve()
            } else {
                logger.debug('Creating Redfish OBM for ' + nodeType + ' node ID: ' + computeNode.id);
                return Promise.resolve(self.createRedfishObm(computeNode, self.nodeData.summary.id))
            }
        })
        .then(function(){
            if(nodeType === 'CMC_FX2' || nodeType === 'CMC') {
                logger.info('Node is: ' + nodeType + ', no enclosure will be created.');
                return Promise.resolve()
            } else {
                logger.debug('Creating Enclosure for node ID: ' + computeNode.id);
                return Promise.resolve(self.createEnclosure(computeNode, self.nodeData.summary.id))
            }
        })
        .then(function(enclosureNode){
            if(enclosureNode){
                logger.debug('Setting relationships for nodes ID: ' + computeNode.id + ' - ' + enclosureNode.id);
                return Promise.resolve(self.setRelationships(computeNode, enclosureNode))
            } else {
                return Promise.resolve()
            }
        })
        .then(function(){
            self._done();
        })
        .catch(function(err){
            self._done(err);
        })
    }


    DellWsmanPostDiscoveryJob.prototype.createEnclosure = function(node, ipAddr) {

        var self = this;

        var newNode = {
                name: node.name + '_Enclosure',
                type: 'enclosure',
                identifiers: [node.name + '_Enclosure'],
                relations: []
        }
        return waterline.nodes.create(newNode)
        .then(function (node_) {
            return Promise.resolve(self.createRedfishObm(node_, ipAddr))
            .then(function(){
                logger.debug("Creating default Redfish Chassis pollers for node " + node_.id);
                return workflowTool.runGraph(node_.id, 'Graph.Redfish.Chassis.Poller.Create')
                .then(function(){
                    return node_;
                })
            })
        });
    }

    DellWsmanPostDiscoveryJob.prototype.createWsmanObm = function(node, ipAddr){

    	var self = this;

        var settings = {
            "service": "dell-wsman-obm-service",
            "config": {"userName": self.user || self.dell.credentials.userName,
                        "password": self.password || self.dell.credentials.password,
                        "host": ipAddr
            }
        }
        return waterline.obms.upsertByNode(node.id, settings)
    }


    /**
     * @function createRedfishObm
     */
    DellWsmanPostDiscoveryJob.prototype.createRedfishObm = function (node, ipAddr) {
        var self = this;
        var redfishType = 'Systems';
        if(node.type === 'enclosure'){
            redfishType = 'Chassis';
        }

        var uri = 'https://' + ipAddr + '/redfish/v1';

        var settings = {
            uri: uri,
            host: ipAddr,
            root: '/redfish/v1/',
            port: '',
            protocol: 'https',
            username: this.user || this.dell.credentials.userName,
            password: this.password || this.dell.credentials.password,
            verifySSL: true
        };
        this.redfish.settings = settings;

        var rootPath = settings.root;
        return this.redfish.clientRequest(rootPath)
        .then(function(root) {
            if (!_.has(root.body, redfishType)) {
                logger.warning('No ' + redfishType + ' Members Found');
                return Promise.resolve();
            }
            var path = redfishType === 'Systems' ? root.body.Systems['@odata.id'] : root.body.Chassis['@odata.id'];
            return self.redfish.clientRequest(path)
            .then(function(res) {
                assert.object(res);
                settings.root = res.body.Members[0]['@odata.id'];
                return Promise.resolve({
                    config: settings,
                    service: 'redfish-obm-service'
                })
            })
        })
        .then(function(redfishObm){
            if(redfishObm) {
                return waterline.obms.upsertByNode(node.id, redfishObm);
            } else {
                return Promise.resolve();
            }
        })
        .catch(function(err) {
            logger.error("Redfish call failed. No OBM settings created for " + ipAddr);
            return undefined;
        });
    };


    /**
     * @memberOf DellWsmanPostDiscoveryJob
     */
    DellWsmanPostDiscoveryJob.prototype.setRelationships = function (n1, n2) {
    	var self = this;
//        logger.debug('setRelationships: NODE: '+ JSON.stringify(n1, null, 4));
//        logger.debug('setRelationships: ENCL: '+ JSON.stringify(n2, null, 4));
        n1.relations.push({
            relationType: 'enclosedBy',
            targets: [n2.id]
        });
        return waterline.nodes.updateByIdentifier(
            n1.id,
            {relations: n1.relations}
        )
        .then(function(){
            if(_.isEmpty(n2.relations)){
                n2.relations.push({
                    relationType: 'encloses',
                    targets: [n1.id]
                });
            } else {
                var encloses = _.find(n2.relations, { 'relationType': 'encloses' } );
                encloses.targets.push(n1.id);
            }
        })
        .then(function(){
            return waterline.nodes.updateByIdentifier(
                n2.id,
                {relations: n2.relations}
            )
        });
    }


    DellWsmanPostDiscoveryJob.prototype.clientRequest = function(host, path, method, data) {
        var self = this;

        var parse = urlParse(host);

        var setups = {};

        setups.url = {};
        setups.url.protocol = parse.protocol.replace(':','').trim();
        setups.url.host = parse.host.split(':')[0];
        setups.url.port = parse.port;
        setups.url.path = path || '/';

        setups.method = method || 'GET';
        setups.credential = {};
        setups.verifySSl = false;
        setups.headers = {'Content-Type': 'application/json'};
        setups.recvTimeoutMs = 60000;
        setups.data = data || '';

        var http = new HttpTool();

        return http.setupRequest(setups)
        .then(function(){
            return http.runRequest();
        })
        .then(function(response){
            if (response.httpStatusCode > 206) {
                logger.debug(JSON.stringify(response, null, 4));
                var errorMsg = _.get(response, 'body.error.message', 'IP is NOT an iDRAC.');
                throw new Error(errorMsg);
            }

            if (response.body.length > 0) {
                response.body = JSON.parse(response.body);
            }
            return response.body;
        });
    }


    return DellWsmanPostDiscoveryJob;
}
