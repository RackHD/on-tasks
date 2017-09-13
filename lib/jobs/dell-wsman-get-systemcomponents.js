// Copyright 2017, DELL, Inc.

'used strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanGetSystemConfigComponentsFactory;
di.annotate(DellWsmanGetSystemConfigComponentsFactory, new di.Provide('Job.Dell.Wsman.Get.SystemConfigurationComponents'));
di.annotate(DellWsmanGetSystemConfigComponentsFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Configuration',
    '_',
    'HttpTool',
    'Errors',
    'Services.Encryption',
    'validator'
));

function DellWsmanGetSystemConfigComponentsFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    configuration,
    _,
    HttpTool,
    errors,
    encryption,
    validator
) {
    var logger = Logger.initialize(DellWsmanGetSystemConfigComponentsFactory);

    function DellWsmanGetSystemConfigComponentsJob(options, context, taskId) {
        DellWsmanGetSystemConfigComponentsJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanGetSystemConfigComponentsJob, BaseJob);

    DellWsmanGetSystemConfigComponentsJob.prototype._run = function () {
        var self = this;

        self.dell = configuration.get('dell');

        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP GetConfiguration web service is not defined in wsmanConfig.json.');
        }
        return Promise.resolve(self.checkOBM())
            .then(function(obm){
                return self.getComponents(obm);
            })
            .then(function(catalog){
                self.handleResponse(catalog);
                return self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };

    DellWsmanGetSystemConfigComponentsJob.prototype.checkOBM = function() {
        var self = this;
        logger.info('checkOBM: Self.nodeID: ' + self.nodeId);
        return waterline.nodes.findByIdentifier(self.nodeId)
            .then(function(result) {
                self.nodeType = result.type;
                if (self.nodeType !== 'compute') {
                    logger.info('SCP GetConfiguration is not applicable to node type ' + self.nodeType);
                    self.cancel();
                    return;
                }
                return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true)
            }).then(function(obm) {
                if (!obm) {
                    throw new errors.NotFoundError('Cannot find DELL WSMAN OBM settings');
                }
                return obm;
            })
    };

    DellWsmanGetSystemConfigComponentsJob.prototype.handleResponse = function(result) {

        var addCatalogPromises = [];
        if (typeof result !== "undefined" && result !== null) {
            addCatalogPromises.push(
                Promise.resolve(waterline.catalogs.create({
                    node: this.nodeId,
                    source: result.source,
                    data: result.data
                }))
            )
        } else {
            logger.info('No Result from getComponents to create catalog');
        }
    };

    DellWsmanGetSystemConfigComponentsJob.prototype.getComponents = function(obm) {

        if (!validator.isIP(this.options.serverIP) || !validator.isIP(this.options.shareAddress)) {
            throw new Error('Invalid ServerIP/ShareAddress');
        }
        var self = this;
        var gateway = self.dell.gateway;
        var parse = urlParse(gateway);

        var setups = {};

        setups.url = {};
        setups.url.protocol = parse.protocol.replace(':','').trim();
        setups.url.host = parse.host.split(':')[0];
        setups.url.port = parse.port;
        setups.url.path = self.dell.services.configuration.getComponents || '/';

        setups.method = "POST";
        setups.credential = {};
        setups.verifySSl = false;
        setups.headers = {'Content-Type': 'application/json'};
        setups.recvTimeoutMs = 60000;

        this.options.serverUsername = obm.config.user;
        this.options.serverPassword = encryption.decrypt(obm.config.password);

        setups.data = this.options;

        var http = new HttpTool();

        return http.setupRequest(setups)
            .then(function(){
                return http.runRequest();
            }).then(function(response) {
               var json = JSON.parse(response.body);
               logger.info('Status from SCP GetComponents Microservice:  ' + json["status"]);

                if (json["status"]=="OK" && json.hasOwnProperty("serverComponents") && null != json["serverComponents"]) {
                    return {data: response.body, source: 'idrac-wsman-systemconfiguration-components', store: true};
                } else {
                    throw new Error('Failed to Get the Requested Components');
                }
            });

    }

    return DellWsmanGetSystemConfigComponentsJob;
}
