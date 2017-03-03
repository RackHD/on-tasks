//Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = UcsServiceProfileDiscoveryJobFactory;
di.annotate(UcsServiceProfileDiscoveryJobFactory,
    new di.Provide('Job.Ucs.Service.Profile.Discovery'));
di.annotate(UcsServiceProfileDiscoveryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.UcsTool',
    'Constants'
));

function UcsServiceProfileDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    UcsTool,
    Constants
) {
    var logger = Logger.initialize(UcsServiceProfileDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function UcsServiceProfileDiscoveryJob(options, context, taskId) {
        UcsServiceProfileDiscoveryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        assert.object(this.options);
        assert.string(this.options.uri);
        assert.string(this.options.username);
        assert.string(this.options.password);
        assert.string(this.options.ucs);
        var parse = urlParse(this.options.uri);
        var protocol = parse.protocol.replace(':','').trim();
        this.settings = {
            uri: parse.href,
            host: parse.host.split(':')[0],
            root: parse.pathname,
            port: parse.port,
            protocol: protocol,
            username: this.options.username,
            password: this.options.password,
            ucs: this.options.ucs,
            verifySSL: this.options.verifySSL || false
        };
        this.ucs = new UcsTool();
        this.ucs.settings = this.settings;
    }
    
    util.inherits(UcsServiceProfileDiscoveryJob, BaseJob);

    /**
     * @memberOf UcsServiceProfileDiscoveryJob
     */
    UcsServiceProfileDiscoveryJob.prototype._run = function() {
        var self = this;
        
        return self.getRoot()
            .then(function(root) {
                return [ self.createServiceProfile(root) ];
            })
            .spread(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };

    /**
     * @function getRoot
     * @description return all the elements from the Cisco UCS Manager that RackHD cares about
     */
    UcsServiceProfileDiscoveryJob.prototype.getRoot = function () {
        var username = this.settings.username;
        var password = this.settings.password;
        var ucs = this.settings.ucs;
        var url=
            "/serviceProfile?host=" + ucs+ "&user="+ username + "&password=" + password;
        return this.ucs.clientRequest(url)
            .then(function(response) {
                return response.body;
            });
    };

    /**
     * @function createServiceProfile
     * @description discovers all the service profiles in the Cisco UCS
     */
    UcsServiceProfileDiscoveryJob.prototype.createServiceProfile = function (root) {
        var self = this;
        var username = this.settings.username;
        var password = this.settings.password;
        var ucs = this.settings.ucs;
        var baseurl = this.settings.protocol+"://"+this.settings.host+ ":"+this.settings.port;
        var url=
            baseurl + "/serviceProfile?host=" + ucs+ "&user="+ username + "&password=" + password;
        return Promise.try(function () {
            if (_.has(root, 'ServiceProfile')) {
                return self.ucs.clientRequest(url)
                    .then(function(res) {
                        assert.object(res);
                        return res.body;
                    })
                    .then(function(data) {
                        assert.object(data);
                        return data['ServiceProfile']['members'];
                    })
                    .map(function(members){
                        return self.createUpdateNode(members, Constants.NodeTypes.Compute)
                        .spread(function(newNode){
                            var relations = [{
                                relationType: 'associatedTo',
                                targets: [newNode.associatedServer]
                            }];
                            return self.updateRelations(newNode.id, relations)
                        });
                    });
            }else{
                logger.warning('No Logical Servers found');
                return;
            }
        });
    };

    UcsServiceProfileDiscoveryJob.prototype.updateRelations = function(nodeId, relations) {
        // Update existing node with new relations or create one
        return waterline.nodes.needOneById(nodeId)
            .then(function(curNode) {
                relations = _.uniq(relations.concat(curNode.relations), 'relationType');
                return waterline.nodes.updateOne(
                    { id: curNode.id },
                    { relations: relations });
            });
    };

    UcsServiceProfileDiscoveryJob.prototype.createUpdateNode = function(data, type) {

        var self = this;
        var config = Object.assign({}, self.settings);

        assert.string(data.name);
        assert.string(data.path);
        var ids;
        ids = [config.ucs, data.path];
        var obm = {
            config: config,
            service: 'ucs-obm-service'
        };
        var node = {
            type: type,
            name: data.name,
            identifiers: ids,
            relations : []
        };
        // Update existing node  or create a new one
        return waterline.nodes.needOne({identifiers:ids})
            .then(function(curNode) {
                return waterline.nodes.updateOne(
                    { id: curNode.id },
                    node
                );
            })
            .catch(function(error) {
                if (error.name === 'NotFoundError') {
                    return waterline.nodes.create(node);
                }
                throw error;
            })
            .then(function(data){
                return [data, waterline.obms.upsertByNode(data.id,obm)];
            });
    };

    return UcsServiceProfileDiscoveryJob;
}
