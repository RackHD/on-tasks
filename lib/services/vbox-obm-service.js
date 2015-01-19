// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true, newcap: false */
/* jslint node: true */

'use strict';

var di = require('di'),
    util = require('util');

module.exports = vBoxObmServiceFactory;

di.annotate(vBoxObmServiceFactory, new di.Provide('vbox-obm-service'));
di.annotate(vBoxObmServiceFactory, new di.Inject('Q', 'OBM.base', '_'));

function vBoxObmServiceFactory(Q, BaseObmService, _) {
    function VBoxObmService(config) {
        BaseObmService.call(this, config);
    }

    util.inherits(VBoxObmService, BaseObmService);

    VBoxObmService.prototype.reboot = function() {
        return this._runInternal(['vboxmanage', 'controlvm', this.alias, 'reset']);
    };

    VBoxObmService.prototype.powerOn = function() {
        return this._runInternal(['vboxmanage', 'startvm', this.alias]);
    };

    VBoxObmService.prototype.powerOff = function() {
        return this._runInternal(['vboxmanage', 'controlvm', this.alias, 'poweroff']);
    };

    VBoxObmService.prototype.powerStatus = function() {
        var self = this;
        return this._runInternal(['vboxmanage', 'list', 'runningvms']).then(function (result) {
            return _.contains(result.stdout, self.alias);
        });
    };

    VBoxObmService.prototype._runInternal = function (command) {
        return this.run('sudo',
            ['-u', this.user].concat(command)
        );
    };

    return function(config) {
        return BaseObmService.create(
            VBoxObmService,
            ['alias', 'user'],
            config
        );
    };
}
