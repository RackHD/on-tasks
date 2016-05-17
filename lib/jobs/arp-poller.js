// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = arpPollerFactory;
di.annotate(arpPollerFactory, new di.Provide('Job.ArpPoller'));
di.annotate(arpPollerFactory, new di.Inject(
    'Job.Base',
    'Services.Lookup',
    'Services.Waterline',
    'Logger',
    'Promise',
    'Rx',
    'Assert',
    'Util',
    '_',
    'fs'
));

function arpPollerFactory(
    BaseJob,
    lookupService,
    waterline,
    Logger,
    Promise,
    Rx,
    assert,
    util,
    _,
    nodeFs
) {
    var logger = Logger.initialize(arpPollerFactory);
    var fs = Promise.promisifyAll(nodeFs);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function ArpPollerJob(options, context, taskId) {
        BaseJob.call(this, logger, options, context, taskId);
        this.pollIntervalMs = options.pollIntervalMs || 1000;
        this.last = [];
        this.current = [];
    }

    util.inherits(ArpPollerJob, BaseJob);

    ArpPollerJob.prototype.parseArpCache = function() {
        return fs.readFileAsync('/proc/net/arp')
        .then(function(data) {
            var cols, lines, entries = [];
            lines = data.toString().split('\n');
            _.forEach(lines, function(line, index) {
                if(index !== 0) {
                    cols = line.replace(/ [ ]*/g, ' ').split(' ');
                    if((cols.length > 3) && 
                       (cols[0].length !== 0) && 
                       (cols[3].length !== 0)) {
                        entries.push({ 
                            ip: cols[0], 
                            mac: cols[3], 
                            iface: cols[5], 
                            flag: cols[2]
                        });
                    }
                }
            });
            return entries;
        })
        .catch(function(err) {
            logger.error('ARP Read Error', {error:err});
            throw err;
        });
    };
    
    ArpPollerJob.prototype.arpCacheHandler = function() {
        var self = this;
        return self.parseArpCache()
        .then(function(data) {
            self.current = data;
            var updated = _.merge(_(self.last)
            .filter(function(e) {
                return _.isUndefined(_.find(self.current, e));
            })
            .value(), _(self.current)
            .filter(function(e) {
                return _.isUndefined(_.find(self.last, e));
            })
            .value());
                        
            if(updated.length) {
                return Promise.map(updated, function(entry) {
                    // Maintain previous entry but update when the 
                    // entry changed but was not marked incomplete
                    if(entry.flag !== '0x0') {  
                        logger.debug('Add/Update Lookup', {entry:entry});
                        return waterline.lookups.setIp(entry.ip, entry.mac);
                    }
                });
            }
        })
        .catch(function(error) {
            logger.error('Error Handling ARP Entry', {error:error});
            throw error;
        })
        .finally(function() {
            self.last = self.current;
        });
    };
        

    /**
     * @memberOf ArpPollerJob
     */
    ArpPollerJob.prototype._run = function() {
        var self = this;
        Rx.Observable.interval(self.pollIntervalMs)
        .subscribe(
            self.arpCacheHandler.bind(self),
            function(error) {
                logger.error('ARP Poller Error', {error:error});
            }
        );
    };

    return ArpPollerJob;
}
