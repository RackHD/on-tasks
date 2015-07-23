// Copyright 2015, Renasar Technologies Inc.
/* jshint: node:true */

'use strict';

var di = require('di');

module.exports = iscDhcpLeasePollerFactory;
di.annotate(iscDhcpLeasePollerFactory, new di.Provide('Job.IscDhcpLeasePoller'));
di.annotate(iscDhcpLeasePollerFactory, new di.Inject(
    'Job.Base',
    'Services.Lookup',
    'Logger',
    'Promise',
    'lru-cache',
    'Assert',
    'Util',
    'fs',
    '_'
));
function iscDhcpLeasePollerFactory(
    BaseJob,
    lookupService,
    Logger,
    Promise,
    lruCache,
    assert,
    util,
    fs,
    _
) {

    var logger = Logger.initialize(iscDhcpLeasePollerFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function IscDhcpLeasePollerJob(options, context, taskId) {
        IscDhcpLeasePollerJob.super_.call(this, logger, options, context, taskId);
        if (!this.options.leasesFile) {
            if (process.platform === 'darwin') {
                this.options.leasesFile = '/var/db/dhcpd.leases';
            } else if (process.platform === 'linux') {
                this.options.leasesFile = '/var/lib/dhcp/dhcpd.leases';
            } else {
                throw new Error('Unsupported platform type ' + process.platform);
            }
        }
        this.listener = null;
        this.cache = lruCache({
            max: 254
        });
    }
    util.inherits(IscDhcpLeasePollerJob, BaseJob);

    /**
     * @memberOf IscDhcpLeasePollerJob
     */
    IscDhcpLeasePollerJob.prototype._run = function() {
        var self = this;

        self.updateLeases();

        // fs.watch() is a faster, more stable function to use, but does not
        // support nfs mounts, so use fs.watchFile as a hedge in case we
        // are ever deployed in such a manner. Performance cost is likely
        // trivial given that we are only watching one file. Poll frequency
        // defaults to 5007
        // (https://nodejs.org/api/fs.html#fs_fs_watchfile_filename_options_listener).
        self.listener = fs.watchFile(self.options.leasesFile, { persistent: false }, function() {
            self.updateLeases();
        });
    };

    IscDhcpLeasePollerJob.prototype._cleanup = function() {
        if (this.listener) {
            fs.unwatchFile(this.options.leasesFile, this.listener);
        }
    };

    IscDhcpLeasePollerJob.prototype.updateLeases = function() {
        fs.readFile(this.options.leasesFile, this._updateLeasesCallback.bind(this));
    };

    IscDhcpLeasePollerJob.prototype._updateLeasesCallback = function(err, data) {
        var self = this;

        if (err) {
            this._done(err);
            return;
        }

        var leases;
        var failed = false;
        try {
            leases = this.parseLeaseData(data.toString());
        } catch (err) {
            failed = true;
            this._done(err);
        }
        if (!failed) {
            this.updateLookups(leases)
            .catch(function(err) {
                self._done(err);
            });
        }
    };

    IscDhcpLeasePollerJob.prototype.parseLeaseData = function(data) {
        /*
         * SAMPLE ISC DHCP LEASE FILE
         *
         *  # The format of this file is documented in the dhcpd.leases(5) manual page.
         *  # This lease file was written by isc-dhcp-4.3.2
         *
         *  lease 10.1.1.3 {
         *    starts 1 2015/04/20 21:14:52;
         *    ends 1 2015/04/20 21:24:52;
         *    cltt 1 2015/04/20 21:14:52;
         *    binding state active;
         *    next binding state free;
         *    rewind binding state free;
         *    hardware ethernet 08:00:27:9b:d9:f8;
         *    set vendor-class-identifier = "PXEClient:Arch:00000:UNDI:002001";
         *  }
         *  lease 10.1.1.4 {
         *    starts 1 2015/04/20 21:14:52;
         *    ends 1 2015/04/20 21:24:52;
         *    cltt 1 2015/04/20 21:14:52;
         *    binding state active;
         *    next binding state free;
         *    rewind binding state free;
         *    hardware ethernet 08:00:27:a4:f4:bb;
         *    set vendor-class-identifier = "PXEClient:Arch:00000:UNDI:002001";
         *  }
        */

        var split = data.split('\n');
        var leases = {};
        _.reduce(split, function(ip, line) {
            if (!line || line.startsWith('#') || line.startsWith('}')) {
                return ip;
            }
            line = line.trim();
            if (line.startsWith('lease')) {
                ip = line.split(' ')[1];
                return ip;
            }
            if (line.startsWith('hardware ethernet') && ip) {
                // slice off the semicolon
                var mac = line.split(' ')[2].slice(0, -1);

                assert.isIP(ip);
                assert.isMac(mac);

                leases[ip] = mac;
            }
            return ip;
        }, null);

        return leases;
    };

    IscDhcpLeasePollerJob.prototype.updateLookups = function(leases) {
        var self = this;

        var newLeases = _.transform(leases, function(_leases, mac, ip) {
            if (self.cache.has(ip) && self.cache.get(ip) === mac) {
                return;
            } else {
                self.cache.set(ip, mac);
                _leases[ip] = mac;
            }
        }, {});

        if (!_.isEmpty(newLeases)) {
            logger.silly("Updating DHCP leases from file: " + this.options.leasesFile, {
                leases: newLeases
            });
        } else {
            return Promise.resolve();
        }

        return Promise.all(_.map(newLeases, function(mac, ip) {
            return lookupService.setIpAddress(ip, mac);
        }));
    };

    return IscDhcpLeasePollerJob;
}
