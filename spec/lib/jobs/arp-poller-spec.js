// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe('ARP Poller Job', function () {
    var base = require('./base-spec');
    var fs;
    var uuid;
    var waterline = {};
    var rx = {};
    var procData = "IP address   HW type   Flags    HW address            Mask   Device\n" +
                   "1.2.3.4      0x1       0x2      52:54:be:ef:ff:12     *      eth1\n" +
                   "2.3.4.5      0x1       0x2      00:00:be:ef:ff:00     *      eth0\n" +
                   "2.3.4.6      0x1       0x2      00:00:be:ef:ff:01     *      eth0\n";
    
    var parsedData = [
        { ip:'1.2.3.4', mac:'52:54:be:ef:ff:12', iface:'eth1', flag:'0x2' },
        { ip:'2.3.4.5', mac:'00:00:be:ef:ff:00', iface:'eth0', flag:'0x2' },
        { ip:'2.3.4.6', mac:'00:00:be:ef:ff:01', iface:'eth0', flag:'0x2' }
    ];
                  
    base.before(function (context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/arp-poller.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(rx,'Rx')
        ]);

        waterline.lookups = {
            setIp: sinon.stub().resolves()
        };
        
        uuid = helper.injector.get('uuid');
        context.Jobclass = helper.injector.get('Job.ArpPoller');
        fs = helper.injector.get('fs');
        sinon.stub(fs, 'readFileAsync');
    });

    helper.after(function() {
        fs.readFileAsync.restore();
    });
    
    beforeEach(function() {
        fs.readFileAsync.reset();
        waterline.lookups.setIp.reset();
    });

    describe('Base', function () {
        base.examples();
        it('should run and subscribe', function() {
            rx.Observable = {
                interval: sinon.stub().returns({
                    subscribe: sinon.stub().resolves()
                })
            };
            var job = new this.Jobclass({}, {}, uuid.v4());
            job._run();
            expect(rx.Observable.interval).to.be.called.once;
        });
    });

    describe("Handle ARP Entry", function(){
        it('should parse ARP data', function() {
            fs.readFileAsync.resolves(procData);
            var job = new this.Jobclass({}, {}, uuid.v4());
            return job.parseArpCache()
            .then(function(parsed) {
                expect(parsed).to.deep.equal(parsedData);
            });
        });
        
        it('should parse ARP data with error', function() {
            fs.readFileAsync.rejects('error');
            var job = new this.Jobclass({}, {}, uuid.v4());
            return expect(job.parseArpCache()).to.be.rejectedWith('error');
        });
        
        it('should handle initial ARP data', function() {
            fs.readFileAsync.resolves(procData);
            var job = new this.Jobclass({}, {}, uuid.v4());
            job.last = { ip:'1.2.3.4', mac:'52:54:be:ef:ff:12', iface:'eth1', flag:'0x2' };
            return job.arpCacheHandler()
            .then(function() {
                expect(job.last).to.deep.equal(parsedData);
                expect(job.current).to.deep.equal(parsedData);
            });
        });

        it('should handle updated ARP data', function() {
            fs.readFileAsync.resolves(
                "IP address  HW type  Flags   HW address         Mask  Device\n" +
                "1.2.3.4     0x1      0x0     52:54:be:ef:ff:12  *     eth1\n" +
                "2.3.4.5     0x1      0x0     00:00:be:ef:ff:00  *     eth0\n" +
                "2.3.4.9     0x1      0x2     00:00:be:ef:ff:01  *     eth0\n"
            );
            parsedData[0].flag = '0x0';
            parsedData[1].flag = '0x0';
            parsedData[2].ip = '2.3.4.9';
            var job = new this.Jobclass({}, {}, uuid.v4());
            return job.arpCacheHandler()
            .then(function() {
                expect(waterline.lookups.setIp).to.be.calledThrice;
                expect(job.last).to.deep.equal(parsedData);
                expect(job.current).to.deep.equal(parsedData);
            });
        });
        
        it('should handle ARP data with error', function() {
            fs.readFileAsync.rejects('error');
            var job = new this.Jobclass({}, {}, uuid.v4());
            return expect(job.arpCacheHandler()).to.be.rejectedWith('error');
        });
        
    });
});
