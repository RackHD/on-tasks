// Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');

module.exports = DellWsmanConfigureRedfishAlertFactory;
di.annotate(DellWsmanConfigureRedfishAlertFactory, new di.Provide('Job.Dell.Wsman.Configure.Redfish.Alert'));
di.annotate(DellWsmanConfigureRedfishAlertFactory, new di.Inject(
    'Job.Dell.Wsman.Base',
    'JobUtils.WsmanTool',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Configuration',
    '_',
    'Errors',
    'Services.Encryption'
));

function DellWsmanConfigureRedfishAlertFactory(
    BaseJob,
    WsmanTool,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    configuration,
    _,
    errors,
    encryption
) {
    var logger = Logger.initialize(DellWsmanConfigureRedfishAlertFactory);

    function DellWsmanConfigureRedfishAlertJob(options, context, taskId) {
        DellWsmanConfigureRedfishAlertJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanConfigureRedfishAlertJob, BaseJob);

    DellWsmanConfigureRedfishAlertJob.prototype._initJob = function () {
        var self = this;
        self.dell = configuration.get('dell');

        var updateComponents = _.get(self.dell, 'services.configuration.updateComponents');
        if (!updateComponents) {
            throw new errors.NotFoundError('Dell SCP UpdateComponents web service is not defined in smiConfig.json.');
        }

        var shareFolder = _.get(self.dell, 'shareFolder');
        if(!shareFolder) {
            throw new errors.NotFoundError('The shareFolder is not defined in smiConfig.json.');
        }
    };

    DellWsmanConfigureRedfishAlertJob.prototype._handleSyncRequest = function () {
        var self = this;
        return Promise.all([
            self.checkOBM('SCP UpdateComponents'),
            self.getServerComponents()
        ])
        .spread(function(obm, serverComponents){
            return self.updateComponents(obm, serverComponents);
        });
    };

    DellWsmanConfigureRedfishAlertJob.prototype._handleSyncResponse = function (response) {
        var body = _.get(response, 'body');
        var status = _.get(body, 'status');
        var message = _.get(body, 'message');
        logger.info('Response from SCP Microservice for UpdateComponents: ' + body);
        if(status === "OK") {
            return response;
        } else {
            throw new errors.InternalServerError(message);
        }
    };

    /**
     * generate components based on the following rule:
     *     all components prefixed by fqddPrefix and attributes postfixed by attrPostfix
     *     are Enabled except those prefixed by disableFqddPrefix and attributes postfixed by
     *     disableAttrPostfix, which are Disalbed.
     * @param  {Object} components the base components used to generate required components
     * @param  {String} fqddPrefix  the fqddPrefix
     * @param  {String} attrPostfix the attrPostfix
     * @param  {String} disableFqddPrefix the disableFqddPrefix
     * @param  {String} disableAttrPostfix  the disableAttrPostfix
     * @return {Object} the generated components
     */
    DellWsmanConfigureRedfishAlertJob.prototype.generateComponents = function(
        components,
        fqddPrefix,
        attrPostfix,
        disableFqddPrefix,
        disableAttrPostfix
    ) {
        var filteredComponents = _.filter(components, function(component) {
            return _.startsWith(component.fqdd, fqddPrefix);
        });

        return _.map(filteredComponents, function(component) {
            var newComponent = {};
            newComponent.fqdd = component.fqdd;
            var filteredAttrs = _.filter(component.attributes, function(attr) {
                return _.endsWith(attr.name, attrPostfix);
            });
            newComponent.attributes = _.map(filteredAttrs, function(attr) {
                var value = "Enabled";
                if(disableFqddPrefix &&
                   disableAttrPostfix &&
                    _.startsWith(component.fqdd, disableFqddPrefix) &&
                   _.endsWith(attr.name, disableAttrPostfix)
                  ) {
                    value = "Disabled";
                }
                return {
                    "name": attr.name,
                    "value": value
                };
            });
            return newComponent;
        });
    };

    DellWsmanConfigureRedfishAlertJob.prototype.getServerComponents = function() {
        var self = this;
        return waterline.catalogs.findLatestCatalogOfSource(
            self.nodeId,
            'idrac-wsman-systemconfiguration-components'
        )
        .then(function(catalogs) {
            var components = _.get(catalogs, 'data.serverComponents');
            var idrac = self.generateComponents(components, 'iDRAC.Embedded', '#AlertEnable');
            var eventfilters = self.generateComponents(
                components,
                'EventFilters',
                '#Alert#RedfishEventing',
                'EventFilters.Audit',
                '4_3#Alert#RedfishEventing'
            );
            return idrac.concat(eventfilters);
        });
    };

    DellWsmanConfigureRedfishAlertJob.prototype.updateComponents = function(obm, serverComponents) {
        var self = this;
        var data = {
            "serverAndNetworkShareRequest": {
                "serverIP": obm.config.host,
                "serverUsername": obm.config.user,
                "serverPassword": encryption.decrypt(obm.config.password),
                "shareAddress": self.dell.shareFolder.address,
                "shareName": self.dell.shareFolder.shareName,
                "shareUsername": self.dell.shareFolder.username,
                "sharePassword": self.dell.shareFolder.password,
                "shareType": self.dell.shareFolder.shareType,
                "shutdownType": self.options.shutdownType
            },
            "serverComponents": serverComponents,
            "forceUpdate": self.options.forceUpdate
        };

        var wsman = new WsmanTool(self.dell.gateway, {
            verifySSl: false,
            recvTimeoutMs: 1800000
        });
        return wsman.clientRequest(
            self.dell.services.configuration.updateComponents,
            "POST",
            data
        );
    };

    return DellWsmanConfigureRedfishAlertJob;
}
