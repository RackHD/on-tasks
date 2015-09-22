// Copyright 2015, EMC, Inc.
/* jshint node: true, newcap: false */
/* jslint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = vBoxObmServiceFactory;

di.annotate(vBoxObmServiceFactory, new di.Provide('vbox-obm-service'));
di.annotate(vBoxObmServiceFactory, new di.Inject('Promise', 'OBM.base', '_'));

function vBoxObmServiceFactory(Promise, BaseObmService, _) {
    function VBoxObmService(options) {
        BaseObmService.call(this, options);
        this.requiredKeys = ['user', 'alias'];
    }
    util.inherits(VBoxObmService, BaseObmService);

    VBoxObmService.prototype.reboot = function() {
        return this._runInternal(['vboxmanage', 'controlvm', this.options.config.alias, 'reset']);
    };

    VBoxObmService.prototype.powerOn = function() {
        return this._runInternal(['vboxmanage', 'startvm', this.options.config.alias]);
    };

    VBoxObmService.prototype.powerOff = function() {
        return this._runInternal(['vboxmanage', 'controlvm',
                this.options.config.alias, 'poweroff']);
    };

    VBoxObmService.prototype.powerStatus = function() {
        var self = this;
        return this._runInternal(['vboxmanage', 'list', 'runningvms']).then(function (result) {
            return _.contains(result.stdout, self.options.config.alias);
        });
    };

    VBoxObmService.prototype._runInternal = function (subcommand) {
        return this.run({
            command: 'sudo',
            args: ['-u', this.options.config.user].concat(subcommand),
            retries: this.options.retries,
            delay: this.options.delay,
        });
    };

    VBoxObmService.create = function(options) {
        return BaseObmService.create(VBoxObmService, options);
    };

    return VBoxObmService;
}
