// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = createIpmiObmSettingsJobFactory;
di.annotate(createIpmiObmSettingsJobFactory, new di.Provide('Job.Obm.Ipmi.CreateSettings'));
di.annotate(createIpmiObmSettingsJobFactory, new di.Inject(
    'Job.Base',
    'Services.Waterline',
    'Task.Services.OBM',
    'ipmi-obm-service',
    'Logger',
    'Assert',
    'Util'
));
function createIpmiObmSettingsJobFactory(
    BaseJob,
    waterline,
    ObmService,
    IpmiObmService,
    Logger,
    assert,
    util
) {

    var logger = Logger.initialize(createIpmiObmSettingsJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    var ObmSettingsJob = function ObmControlJob(options, context, taskId) {
        ObmControlJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.options.user);
        assert.string(this.options.password);
        assert.string(this.context.target);

        this.obmConfig = {
            service: 'ipmi-obm-service',
            config: {
                user: this.options.user,
                password: this.options.password
            }
        };

        this.nodeId = this.context.target;
    };
    util.inherits(ObmSettingsJob, BaseJob);

    /**
     * @memberOf ObmSettingsJob
     * @returns {Promise.Promise}
     */
    ObmSettingsJob.prototype._run = function run() {
        var self = this;
        var catalogSource;

        if (this.options.ipmichannel === '3') {
            catalogSource = 'rmm';
        } else if (this.options.ipmichannel) {
            catalogSource = 'bmc-%s'.format(this.options.ipmichannel);
        } else {
            catalogSource = 'bmc';
        }

        // TODO: Once a BMC can be referenced by mac address in order to get the IP
        // address dynamically via the lookup service, then we won't need to grab
        // the IP from the catalog anymore. Short term solution.
        return waterline.catalogs.findLatestCatalogOfSource(self.nodeId, catalogSource)
        .then(function(catalog) {
            self.obmConfig.config.host = catalog.data['MAC Address'];
            var updateData = {
                obmSettings: [ self.obmConfig ]
            };
            return waterline.nodes.updateByIdentifier(self.nodeId, updateData);
        })
        .then(function() {
            return self.liveTestIpmiConfig();
        })
        .then(function() {
            self._done();
        })
        .catch(function(e) {
            self._done(e);
        });
    };

    ObmSettingsJob.prototype.liveTestIpmiConfig = function liveTestIpmiConfig() {
        var ipmiRequestor = ObmService.create(this.nodeId, IpmiObmService, this.obmConfig);
        return ipmiRequestor.powerStatus();
    };

    return ObmSettingsJob;
}
