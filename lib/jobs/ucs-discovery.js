// Copyright 2017, EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = UcsDiscoveryJobFactory;
di.annotate(UcsDiscoveryJobFactory, new di.Provide('Job.Ucs.Discovery'));
di.annotate(UcsDiscoveryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.UcsTool'
));

function UcsDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    UcsTool
) {
    var logger = Logger.initialize(UcsDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function UcsDiscoveryJob(options, context, taskId) {
        UcsDiscoveryJob.super_.call(this,
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
    
    util.inherits(UcsDiscoveryJob, BaseJob);

    /**
     * @memberOf UcsDiscoveryJob
     */
    UcsDiscoveryJob.prototype._run = function() {
        var self = this;
        
        return self.getRoot()
            .then(function(root) {
                return [ root, self.createRackmounts(root) ];
            })
            .spread(function() {
                self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };

    /**
     * @function logIn
     * @description Log into the UCS microservice
     */
    UcsDiscoveryJob.prototype.logIn = function () {
        var username = this.settings.username;
        var password = this.settings.password;
        var host = this.settings.ucs;
        var url= "/login?host=" + host+ "&user="+ username + "&password=" + password;
        return this.ucs.clientRequest(url)
            .then(function(response) {
                return response.body;
            });
    };


    /**
     * @function getRoot
     * @description return all the elments in the Cisco UCS that RackHD cares about
     */
    UcsDiscoveryJob.prototype.getRoot = function () {
        var username = this.settings.username;
        var password = this.settings.password;
        var ucs = this.settings.ucs;
        var baseurl= this.settings.protocol+"://"+this.settings.host+ ":"+this.settings.port;
        var url= baseurl = "/sys?host=" + ucs+ "&user="+ username + "&password=" + password;/* jshint ignore:line */

        return this.ucs.clientRequest(url)
            .then(function(response) {
                return response.body;
            });
    };

    /**
     * @function createRackmounts
     * @description discovers all the rackmount servers in the Cisco UCS
     */
    UcsDiscoveryJob.prototype.createRackmounts = function (root) {
        var self = this;
        var username = this.settings.username;
        var password = this.settings.password;
        var ucs = this.settings.ucs;
        var baseurl = this.settings.protocol+"://"+this.settings.host+ ":"+this.settings.port;
        var url= baseurl + "/rackmount?host=" + ucs+ "&user="+ username + "&password=" + password;/* jshint ignore:line */
        var obm;
        return Promise.try(function () {
            if (_.has(root, 'Servers')) {
                return self.ucs.clientRequest(url)
                    .then(function(res) {
                        assert.object(res);
                        return res.body;
                    })
                    .map(function(data) {
                        assert.array(data.macs);
                        assert.string(data.name);
                        assert.string(data.path);

                        var config = Object.assign({}, self.settings);
                        obm = {
                            config: config,
                            service: 'ucs-obm-service'
                        };
                        var node = {
                            type: 'compute',
                            name: data.path,
                            identifiers: data.macs,
                            obm:[obm],
                            relations : []
                        };

                        // Update existing node  or create a new one
                        return waterline.nodes.needOne({identifiers:data.macs})
                            .then(function(curNode) {
                                return waterline.nodes.updateOne(
                                    { id: curNode.id },
                                    node
                                )
                                .then(function(data){
                                    return data;
                                });
                            })
                            .catch(function(error) {
                                if (error.name === 'NotFoundError') {
                                    return waterline.nodes.create(node);
                                }
                                throw error;
                            })
                            .then(function(data){
                                return self.createObms(data.id,obm);
                            });

                    });
            }else{
                logger.warning('No rackmount servers found Found');
                return;
            }
        });
    };


    /**
     * @function getRoot
     * @description create obm setting for the node
     */
    UcsDiscoveryJob.prototype.createObms = function (nodeId, obm){
        return waterline.obms.upsertByNode(nodeId, obm)
            .then(function(n) {
                return n;
            });
    };

    return UcsDiscoveryJob;
}
