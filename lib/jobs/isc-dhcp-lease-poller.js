// Copyright 2015, EMC, Inc.

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
    'Tail',
    '_',
    'PromiseQueue'
));

function iscDhcpLeasePollerFactory(
    BaseJob,
    lookupService,
    Logger,
    Promise,
    lruCache,
    assert,
    util,
    Tail,
    _,
    PromiseQueue
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
        BaseJob.call(this, logger, options, context, taskId);

        if (!this.options.leasesFile) {
            if (this.getPlatform() === 'darwin') {
                this.options.leasesFile = '/var/db/dhcpd.leases';
            } else if (this.getPlatform() === 'linux') {
                this.options.leasesFile = '/var/lib/dhcp/dhcpd.leases';
            } else {
                throw new Error('Unsupported platform type ' + process.platform);
            }
        }

        this.queue = new PromiseQueue();

    }

    util.inherits(IscDhcpLeasePollerJob, BaseJob);


    IscDhcpLeasePollerJob.prototype.getPlatform = function () {
        return process.platform;
    };

    /**
     * @memberOf IscDhcpLeasePollerJob
     */
    IscDhcpLeasePollerJob.prototype._run = function() {
        var self = this;

        self.queue.on('error', self._queueError.bind(self));
        self.queue.start();

        self.tail = new Tail(self.options.leasesFile, '}', {}, true);
        self.tail.on('line', self._onLine.bind(self));
        self.tail.on('error', self._tailError.bind(self));
        self.tail.watch();
    };

    IscDhcpLeasePollerJob.prototype._onLine = function (data) {
        var self = this;

        return Promise.try(function () {
            var lease = self.parseLeaseData(data.toString());
            
            if (!_.isUndefined(lease)) {
                self.queue.enqueue(
                    lookupService.setIpAddress.bind(
                        lookupService,
                        lease.ip,
                        lease.mac
                    )
                );
            }
        }).catch(function (error) {
            logger.error(error.message, { error: error });
        });
    };

    IscDhcpLeasePollerJob.prototype._queueError = function (error) {
        logger.error('Queue Error', { error: error });
    };

    IscDhcpLeasePollerJob.prototype._tailError = function (error) {
        logger.error('Tail Error', { error: error });
    };

    IscDhcpLeasePollerJob.prototype._cleanup = function() {
        if (this.tail) {
            this.tail.unwatch();
            this.tail = undefined;
        }

        this.queue.stop();
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
        var lease;
        var currentTime = new Date();
        var expired = true;  //Default is true

       //look at/var/lib/dhcp/dhcpd.leases to find leases

        _.reduce(split, function(ip, line) {
            if (!line || line.startsWith('#') || line.startsWith('}')) {
                return ip;
            }

            line = line.trim();

            if (line.startsWith('lease')) {
                ip = line.split(' ')[1];
                return ip;
            }

            if(line.startsWith('ends')) {
                // slice off the to just get the date and time
                var expirationTime = new Date(line.slice(7, -1));

                //Checks to see if the lease is not expired.
                if(expirationTime > currentTime) {
                    expired = false;
                }
            }

            if (line.startsWith('hardware ethernet') && ip) {
                // slice off the semicolon
                var mac = line.split(' ')[2].slice(0, -1);

                assert.isIP(ip);
                assert.isMac(mac);

                if(expired === false) {
                    lease = { mac: mac, ip: ip };
                }

                //reset Expired.
                expired = true;
            }

            return ip;
        }, null);

        return lease;
    };

    return IscDhcpLeasePollerJob;
}
