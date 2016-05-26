// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');
    var IpmiObmService;
    var waterline;

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/lib/services/base-obm-service.js'),
            helper.require('/lib/services/ipmi-obm-service.js'),
            helper.require('/lib/services/obm-service.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/create-ipmi-obm-settings.js')
        ]);

        context.Jobclass = helper.injector.get('Job.Obm.Ipmi.CreateSettings');
        IpmiObmService = helper.injector.get('ipmi-obm-service');
        waterline = helper.injector.get('Services.Waterline');

        waterline.obms = {
            upsertByNode: sinon.stub().resolves()
        };
        waterline.catalogs = {
            findLatestCatalogOfSource: sinon.stub().resolves()
        };
    });

    describe('Base', function () {
        base.examples();
    });

    describe('create-ipmi-obm-settings job', function() {
        beforeEach('create-ipmi-obm-settings-job beforeEach', function() {
            this.sandbox = sinon.sandbox.create();
            var jobOptions = {
                user: 'test',
                password: 'test'
            };
            this.job = new this.Jobclass(
                jobOptions, { target: '554c0de769bb1ea853cf9db1' }, uuid.v4());

            waterline.obms.upsertByNode.reset();
            waterline.catalogs.findLatestCatalogOfSource.reset();
        });

        afterEach('create-ipmi-obm-settings-job afterEach', function() {
            this.sandbox.restore();
        });

        describe('catalog source', function() {
            before('catalog source before', function() {
                waterline.obms.upsertByNode.resolves();
                waterline.catalogs.findLatestCatalogOfSource.resolves(
                    { data: { 'IP Address': 'testIp' } } );
            });

            beforeEach('catalog source beforeEach', function() {
                this.sandbox.stub(this.job, '_done');
                this.sandbox.stub(this.job, 'liveTestIpmiConfig').resolves();
            });

            it('should use "bmc" source if ipmichannel is not specified', function() {
                var self = this;
                return self.job._run()
                .then(function() {
                    expect(waterline.catalogs.findLatestCatalogOfSource).to.have.been.calledWith(
                        self.job.nodeId, 'bmc');
                });
            });

            it('should use "rmm" source if ipmichannel is 3', function() {
                var self = this;
                self.job.options.ipmichannel = '3';
                return self.job._run()
                .then(function() {
                    expect(waterline.catalogs.findLatestCatalogOfSource).to.have.been.calledWith(
                        self.job.nodeId, 'rmm');
                });
            });

            it('should use "bmc-N" source if ipmichannel is N', function() {
                var self = this;
                self.job.options.ipmichannel = '5';
                return self.job._run()
                .then(function() {
                    expect(waterline.catalogs.findLatestCatalogOfSource).to.have.been.calledWith(
                        self.job.nodeId, 'bmc-5');
                });
            });
        });

        it('should update node with OBM settings', function() {
            var self = this;
            self.sandbox.stub(self.job, '_done');
            self.sandbox.stub(self.job, 'liveTestIpmiConfig').resolves();

            waterline.catalogs.findLatestCatalogOfSource.resolves(
                { data: { 'IP Address': 'testIp' } } );

            return self.job._run()
            .then(function() {
                expect(waterline.obms.upsertByNode)
                    .to.have.been.calledWith(self.job.nodeId, self.job.obmConfig);
            });
        });

        it('should run ipmi.powerStatus in liveTestIpmiConfig()', function() {
            var self = this;
            var powerStatus = self.sandbox.stub(IpmiObmService.prototype, 'powerStatus');
            powerStatus.resolves();
            self.job.obmConfig.config.host = 'test';
            return self.job.liveTestIpmiConfig()
            .then(function() {
                expect(powerStatus).to.have.been.calledOnce;
            });
        });
    });
});
