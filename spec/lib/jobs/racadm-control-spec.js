// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid;
    var RacadmToolJob;
    var Promise;
    var job;
    var encryption;
    var lookup;
    var racadmTool;
    var Errors;
    var mockWaterline = {
        obms: {},
        catalogs: {}
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/racadm-control'),
            helper.require('/lib/utils/job-utils/racadm-tool.js'),
            helper.require('/lib/utils/job-utils/racadm-parser.js'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);
        Promise = helper.injector.get('Promise');
        RacadmToolJob = helper.injector.get('Job.Dell.RacadmTool');
        racadmTool = helper.injector.get('JobUtils.RacadmTool');
        uuid = helper.injector.get('uuid');
        lookup = helper.injector.get('Services.Lookup');
        encryption = helper.injector.get('Services.Encryption');
        Errors = helper.injector.get('Errors');
    });

    describe('Input validation', function() {
        beforeEach('Dell Racadm Tool Input Validation', function() {
            var options = {
                serverUsername: "onrack",
                serverPassword: "onrack",
                serverFilePath: "//1.2.3.4/src/bios.xml",
                action: "setBiosConfig"
            };
            job = new RacadmToolJob(options, {}, uuid.v4());
            mockWaterline.obms.findByNode = function() {
            };
            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.obms, 'findByNode');
        });

        afterEach('Dell Racadm Tool Input Validation', function() {
            this.sandbox.restore();
        });

        it('should fail if OBM settings for node do not exist', function() {
            mockWaterline.obms.findByNode.resolves(undefined);
            return expect(job.run()).to.be.rejectedWith(undefined);
        });
    });

    describe("Obm setting decrypt", function() {
        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it("should convert a host mac address to an IP", function() {
            var macToIP = this.sandbox.stub(lookup, 'macAddressToIp');
            macToIP.resolves(
                '10.1.1.2'
            );
            var data = {
                host: '7a:c0:7a:c0:be:ef'
            };
            return job.lookupHost(data).should.become({ host: '10.1.1.2'});
        });
    });

    describe('DellRacadm Tool Set Bios', function() {
        var options;

        beforeEach('Dell Racadm Tool Set BIOS Validation', function() {
            options = {
                serverUsername: "onrack",
                serverPassword: "onrack",
                serverFilePath: "//1.2.3.4/src/bios.xml",
                action: "setBiosConfig"
            };
            job = new RacadmToolJob(options, {}, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.obms, 'findByNode');
        });

        afterEach('Dell Racadm Tool Set BIOS Validation', function() {
            this.sandbox.restore();
        });

        it("should call racadmTool.setBiosConfig", function(){
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        service: 'ipmi-obm-service',
                        config: {
                            host: '1.2.3.4',
                            user: 'admin',
                            password: 'password'
                        }
                    }
                ]
            };

            var setBiosStub = this.sandbox.stub(racadmTool,'setBiosConfig');
            var cifsInfo = {user: options.serverUsername, password: options.serverPassword ,
                filePath: options.serverFilePath};
            setBiosStub.resolves(
                {
                    status:"Completed"
                }
            );
            var lookupHostStub = this.sandbox.stub(job,'lookupHost');
            mockWaterline.obms.findByNode.resolves(node);
            lookupHostStub.resolves(node.obmSettings[0].config);
            return job.run()
                .then(function() {
                    expect(setBiosStub).to.have.been.calledWith(
                        node.obmSettings[0].config.host, node.obmSettings[0].config.user,
                        node.obmSettings[0].config.password,cifsInfo);
                });
        });
    });

    describe('DellRacadm Tool Update Firmware', function() {
        var options;

        beforeEach('Dell Racadm Tool Update Firmware', function() {
            options = {
                serverUsername: "onrack",
                serverPassword: "onrack",
                serverFilePath: "//1.2.3.4/src/firming.d7",
                action: "updateFirmware"
            };
            job = new RacadmToolJob(options, {}, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.obms, 'findByNode');
        });

        afterEach('Dell Racadm Tool Update Firmware Validation', function() {
            this.sandbox.restore();
        });

        it("should call racadmTool.updateFirmware", function(){
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        service: 'ipmi-obm-service',
                        config: {
                            host: '1.2.3.4',
                            user: 'admin',
                            password: 'password'
                        }
                    }
                ]
            };

            var updateFirmwareStub = this.sandbox.stub(racadmTool,'updateFirmware');
            var cifsInfo = {user: options.serverUsername, password: options.serverPassword ,
                filePath: options.serverFilePath};
            updateFirmwareStub.resolves(
                {
                    status:"Completed"
                }
            );
            var lookupHostStub = this.sandbox.stub(job,'lookupHost');
            mockWaterline.obms.findByNode.resolves(node);
            lookupHostStub.resolves(node.obmSettings[0].config);
            return job.run()
                .then(function() {
                    expect(updateFirmwareStub).to.have.been.calledWith(
                        node.obmSettings[0].config.host, node.obmSettings[0].config.user,
                        node.obmSettings[0].config.password,cifsInfo);
                });
        });
    });

    describe('DellRacadm Tool Get Bios', function() {
        var options;

        beforeEach('Dell Racadm Tool Get BIOS Validation', function() {
            options = {
                serverUsername: "onrack",
                serverPassword: "onrack",
                serverFilePath: "//1.2.3.4/src/bios.xml",
                action: "getBiosConfig",
                forceReboot: true
            };
            job = new RacadmToolJob(options, {}, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.obms, 'findByNode');
        });

        afterEach('Dell Racadm Tool Get BIOS Validation', function() {
            this.sandbox.restore();
        });

        it("should call racadmTool.getBiosConfig", function(){
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        service: 'ipmi-obm-service',
                        config: {
                            host: '1.2.3.4',
                            user: 'admin',
                            password: 'password'
                        }
                    }
                ]
            };

            var getBiosStub = this.sandbox.stub(racadmTool,'getBiosConfig');
            var cifsInfo = {user: options.serverUsername, password: options.serverPassword ,
                filePath: options.serverFilePath, forceReboot: options.forceReboot};
            getBiosStub.resolves(
                {
                    status:"Completed"
                }
            );
            var lookupHostStub = this.sandbox.stub(job,'lookupHost');
            mockWaterline.obms.findByNode.resolves(node);
            lookupHostStub.resolves(node.obmSettings[0].config);
            return job.run()
                .then(function() {
                    expect(getBiosStub).to.have.been.calledWith(
                        node.obmSettings[0].config.host, node.obmSettings[0].config.user,
                        node.obmSettings[0].config.password, cifsInfo);
                });
        });
    });

    describe('DellRacadm Tool failed with unsupported action', function() {
        var options;

        beforeEach('Dell Racadm Tool failed with unsupported action validation ', function() {
            options = {
                serverUsername: "onrack",
                serverPassword: "onrack",
                serverFilePath: "//1.2.3.4/src/bios.xml",
                action: "Unsupported_Action"
            };
            job = new RacadmToolJob(options, {}, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.obms, 'findByNode');
        });

        afterEach('Dell Racadm Tool Unsupported action validation ', function() {
            this.sandbox.restore();
        });

        it("should fail with unsupported action", function(done){
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        service: 'ipmi-obm-service',
                        config: {
                            host: '1.2.3.4',
                            user: 'admin',
                            password: 'password'
                        }
                    }
                ]
            };

            var getBiosStub = this.sandbox.stub(racadmTool,'getBiosConfig');
            var spy = this.sandbox.spy(job, '_done');
            getBiosStub.resolves(
                {
                    status:"Completed"
                }
            );
            var lookupHostStub = this.sandbox.stub(job,'lookupHost');
            mockWaterline.obms.findByNode.resolves(node);
            lookupHostStub.resolves(node.obmSettings[0].config);
            job.run()
                .then(function() {
                    done(new Error("Should not run into this piece of code!"));
                }).catch(function() {
                    expect (spy).to.have.been.calledOnce;
                    done();
                });
        });
    });

    describe('DellRacadm Tool Reset Components', function() {
        var options;

        beforeEach('Dell Racadm Tool Reset Components', function() {
            options = {
                components: ["bios","idrac"],
                action: "resetComponents"
            };
            job = new RacadmToolJob(options, {}, uuid.v4());

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.obms, 'findByNode');
        });

        afterEach('Dell Racadm Tool Reset Components Validation', function() {
            this.sandbox.restore();
        });

        it("should call racadmTool.resetComponents", function(){
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        service: 'dell-wsman-obm-service',
                        config: {
                            host: '1.2.3.4',
                            user: 'admin',
                            password: 'password'
                        }
                    }
                ]
            };

            var resetComponentStub = this.sandbox.stub(racadmTool,'resetComponents');
            var cifsInfo = options.components;
            resetComponentStub.resolves(
                {
                    status:"Completed"
                }
            );
            var lookupHostStub = this.sandbox.stub(job,'lookupHost');
            mockWaterline.obms.findByNode.resolves(node);
            lookupHostStub.resolves(node.obmSettings[0].config);
            return job.run()
                .then(function() {
                    expect(resetComponentStub).to.have.been.calledWith(
                        node.obmSettings[0].config.host, node.obmSettings[0].config.user,
                        node.obmSettings[0].config.password,cifsInfo);
                });
        });
    });

});

