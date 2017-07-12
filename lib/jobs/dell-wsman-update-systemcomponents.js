// Copyright 2017, DELL, Inc.

'used strict';

var di = require('di'),
    urlParse = require('url-parse');
var fs = require('fs');

module.exports = DellWsmanUpdateSystemConfigComponentsFactory;
di.annotate(DellWsmanUpdateSystemConfigComponentsFactory, new di.Provide('Job.Dell.Wsman.Update.SystemConfigurationComponents'));
di.annotate(DellWsmanUpdateSystemConfigComponentsFactory, new di.Inject(
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

function DellWsmanUpdateSystemConfigComponentsFactory(
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
    var logger = Logger.initialize(DellWsmanUpdateSystemConfigComponentsFactory);

    function DellWsmanUpdateSystemConfigComponentsJob(options, context, taskId) {
        DellWsmanUpdateSystemConfigComponentsJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanUpdateSystemConfigComponentsJob, BaseJob);

    DellWsmanUpdateSystemConfigComponentsJob.prototype._run = function () {
        var self = this;
        self.dell = configuration.get('dell');

        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP UpdateComponents web service is not defined in smiConfig.json.');
        }

        return Promise.resolve(self.checkOBM())
            .then(function(obm){
                return self.updateComponents(obm);
            })
            .then(function(){
                if(self.options.cleanup === true) {
                   fs.unlink(`${self.options.shareName}/${self.options.fileName}`, function() {});
                }
                return self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };

    DellWsmanUpdateSystemConfigComponentsJob.prototype.checkOBM = function() {
        var self = this;
        logger.info('checkOBM: Self.nodeID: ' + self.nodeId);
        return waterline.nodes.findByIdentifier(self.nodeId)
            .then(function(result) {
                self.nodeType = result.type;
                if (self.nodeType !== 'compute') {
                    logger.info('SCP UpdateComponents is not applicable to node type ' + self.nodeType);
                    self.cancel();
                    return;
                }
                return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true);
            }).then(function(obm) {
                if (!obm) {
                    throw new errors.NotFoundError('Cannot find DELL WSMAN OBM settings');
                }
                return obm;
            })
    };

    DellWsmanUpdateSystemConfigComponentsJob.prototype.updateComponents = function(obm) {

        if (!validator.isIP(this.options.serverIP) || !validator.isIP(this.options.shareAddress)) {
            throw new Error('Invalid ServerIP/ShareAddress');
        }
        var self = this;
        var data = {
            "serverAndNetworkShareRequest": {
                "fileName": this.options.fileName,
                "serverIP": this.options.serverIP,
                "serverUsername": obm.config.user,
                "serverPassword": encryption.decrypt(obm.config.password),
                "shareAddress": this.options.shareAddress,
                "shareName": this.options.shareName,
                "shareType": this.options.shareType,
                "shutdownType": this.options.shutdownType
            },
            "serverComponents": this.options.serverComponents
        };

        var gateway = self.dell.gateway;
        var parse = urlParse(gateway);

        var setups = {};
        setups.url = {};
        setups.url.protocol = parse.protocol.replace(':','').trim();
        setups.url.host = parse.host.split(':')[0];
        setups.url.port = parse.port;
        setups.url.path = self.dell.services.configuration.updateComponents || '/';

        setups.method = "POST";
        setups.credential = {};
        setups.verifySSl = false;
        setups.headers = {'Content-Type': 'application/json'};
        setups.recvTimeoutMs = 60000;
        setups.data = data;

        var http = new HttpTool();

        return http.setupRequest(setups)
            .then(function(){
                return http.runRequest();
            }).then(function(response) {
                logger.info('Response from SCP Microservice for UpdateComponents: ' + response.body);
                var json = JSON.parse(response.body);
                logger.info('Status from SCP Microservice for Update System Configuration:  ' + json["status"]);
                if(json["status"]=="OK") {
                    return response;
                } else {
                    throw new errors.InternalServerError(json["message"]);
                }
            });

    }

    return DellWsmanUpdateSystemConfigComponentsJob;
}
