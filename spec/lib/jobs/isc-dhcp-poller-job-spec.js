// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe('ISC DHCP Poller Job', function () {
    var base = require('./base-spec');
    var fs;
    var lookupService;
    var uuid;

    var leaseData = new Buffer(
        "# The format of this file is documented in the dhcpd.leases(5) manual page.\n" +
        "# This lease file was written by isc-dhcp-4.3.2\n" +
        "\n\n" +
        "lease 10.1.1.3 {\n" +
        "  starts 1 2015/04/20 21:14:52;\n" +
        "  ends 1 2015/04/20 21:24:52;\n" +
        "  cltt 1 2015/04/20 21:14:52;\n" +
        "  binding state active;\n" +
        "  next binding state free;\n" +
        "  rewind binding state free;\n" +
        "  hardware ethernet 08:00:27:9b:d9:f8;\n" +
        "  set vendor-class-identifier = \"PXEClient:Arch:00000:UNDI:002001\";\n" +
        "}\n" +
        "lease 10.1.1.4 {\n" +
        "  starts 1 2015/04/20 21:14:52;\n" +
        "  ends 1 2015/04/20 21:24:52;\n" +
        "  cltt 1 2015/04/20 21:14:52;\n" +
        "  binding state active;\n" +
        "  next binding state free;\n" +
        "  rewind binding state free;\n" +
        "  hardware ethernet 08:00:27:a4:f4:bb;\n" +
        "  set vendor-class-identifier = \"PXEClient:Arch:00000:UNDI:002001\";\n" +
        "}\n"
    );

    base.before('ISC DHCP Poller Job before', function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/isc-dhcp-lease-poller.js')
        ]);

        uuid = helper.injector.get('uuid');

        lookupService = helper.injector.get('Services.Lookup');
        sinon.stub(lookupService, 'setIpAddress');

        fs = helper.injector.get('fs');
        sinon.stub(fs, 'watchFile').returns({});
        sinon.stub(fs, 'unwatchFile');
        sinon.stub(fs, 'readFile');

        context.Jobclass = helper.injector.get('Job.IscDhcpLeasePoller');
    });

    beforeEach('ISC DHCP Poller Job beforeEach', function() {
        lookupService.setIpAddress.reset();
        fs.readFile.reset();
        fs.watchFile.reset();
        fs.unwatchFile.reset();
    });

    after('ISC DHCP Poller Job afterEach', function() {
        lookupService.setIpAddress.restore();
        fs.readFile.restore();
        fs.watchFile.restore();
        fs.unwatchFile.restore();
    });

    describe('Base', function () {
        base.examples();
    });

    describe('Platform', function() {
        var platform;

        before('ISC DHCP Poller Job platform before', function() {
            platform = process.platform;
        });

        beforeEach('ISC DHCP Poller Job platform beforeEach', function() {
            process.platform = null;
        });

        after('ISC DHCP Poller Job platform before', function() {
            process.platform = platform;
        });

        it('should find the right lease file on linux', function() {
            process.platform = 'linux';
            var _job = new this.Jobclass({}, {}, uuid.v4());
            expect(_job.options.leasesFile).to.equal('/var/lib/dhcpd/dhcpd.leases');
        });

        it('should find the right lease file on OSX', function() {
            process.platform = 'darwin';
            var _job = new this.Jobclass({}, {}, uuid.v4());
            expect(_job.options.leasesFile).to.equal('/var/db/dhcpd.leases');
        });

        it('should throw on unsupported platform', function() {
            var self = this;
            process.platform = 'invalid';
            expect(function() {
                var _job = new self.Jobclass({}, {}, uuid.v4());  /* jshint ignore:line */
            }).to.throw(/Unsupported platform type/);
        });

        it('should prioritize a user defined lease file', function() {
            var _job = new this.Jobclass({ leasesFile: '/user/defined' }, {}, uuid.v4());
            expect(_job.options.leasesFile).to.equal('/user/defined');
        });
    });

    it('should parse lease data', function() {
        var job = new this.Jobclass({}, {}, uuid.v4());
        var parsed = job.parseLeaseData(leaseData.toString());
        expect(parsed).to.deep.equal({
            '10.1.1.3': '08:00:27:9b:d9:f8',
            '10.1.1.4': '08:00:27:a4:f4:bb'
        });
    });

    it('should update the lease cache', function() {
        var job = new this.Jobclass({}, {}, uuid.v4());
        job.updateLeases();

        expect(fs.readFile).to.have.been.calledWith(job.options.leasesFile);
        expect(fs.readFile.firstCall.args[1]).to.be.a('function');
        job._updateLeasesCallback(null, leaseData);

        expect(lookupService.setIpAddress).to.have.been.calledWith('10.1.1.3', '08:00:27:9b:d9:f8');
        expect(lookupService.setIpAddress).to.have.been.calledWith('10.1.1.4', '08:00:27:a4:f4:bb');
    });

    it('should cache leases', function() {
        var job = new this.Jobclass({}, {}, uuid.v4());
        job.updateLeases();
        job._updateLeasesCallback(null, leaseData);

        expect(job.cache.get('10.1.1.3')).to.equal('08:00:27:9b:d9:f8');
        expect(job.cache.get('10.1.1.4')).to.equal('08:00:27:a4:f4:bb');
    });

    it('should update the lease cache with a changed IP only for the changed lease', function() {
        var job = new this.Jobclass({}, {}, uuid.v4());
        job.updateLeases();
        job._updateLeasesCallback(null, leaseData);
        lookupService.setIpAddress.reset();

        var updatedLeaseData = leaseData.toString().replace(/10\.1\.1\.3/, '10.1.1.5');
        job._updateLeasesCallback(null, updatedLeaseData);

        expect(lookupService.setIpAddress).to.have.been.calledOnce;
        expect(lookupService.setIpAddress).to.have.been.calledWith('10.1.1.5', '08:00:27:9b:d9:f8');
    });

    it('should update the lease cache with a changed mac only for the changed lease', function() {
        var job = new this.Jobclass({}, {}, uuid.v4());
        job.updateLeases();
        job._updateLeasesCallback(null, leaseData);
        lookupService.setIpAddress.reset();

        var updatedLeaseData = leaseData.toString()
            .replace(/08:00:27:9b:d9:f8/, '08:00:27:00:00:00');
        job._updateLeasesCallback(null, updatedLeaseData);

        expect(lookupService.setIpAddress).to.have.been.calledOnce;
        expect(lookupService.setIpAddress).to.have.been.calledWith('10.1.1.3', '08:00:27:00:00:00');
    });

    it('should load leases on start', function() {
        var job = new this.Jobclass({}, {}, uuid.v4());
        sinon.stub(job, 'updateLeases');
        job._run();
        expect(job.updateLeases).to.have.been.calledOnce;
    });

    it('should cleanup watchFile listener', function() {
        var job = new this.Jobclass({}, {}, uuid.v4());
        sinon.stub(job, 'updateLeases');
        job._run();
        expect(job.listener).to.deep.equal({});
        job.cleanup();
        expect(fs.unwatchFile).to.have.been.calledWith(job.options.leasesFile, job.listener);
    });
});
