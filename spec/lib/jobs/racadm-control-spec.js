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
        nodes: {},
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
            mockWaterline.nodes.findByIdentifier = function() {
            };
            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes, 'findByIdentifier');
        });

        afterEach('Dell Racadm Tool Input Validation', function() {
            this.sandbox.restore();
        });

        it('should fail if node does not exist', function() {
            mockWaterline.nodes.findByIdentifier.resolves(null);
            return expect(job.run()).to.be.rejectedWith(Errors.AssertionError,
                'No node for dell racadm tool');
        });

        it('should fail if ipmi obmSetting does not exist', function() {
            var node = {
                id: 'bc7dab7e8fb7d6abf8e7d6ac',
                obmSettings: [
                    {
                        config: {
                        }
                    }
                ]
            };
            mockWaterline.nodes.findByIdentifier.resolves(node);
            return expect(job.run()).to.be.rejectedWith(Errors.AssertionError,
                'No ipmi obmSetting for dell racadm tool');
        });
    });

    describe("Obm setting decrypt", function() {
        beforeEach(function() {
            encryption.start();
            this.sandbox = sinon.sandbox.create();
        });

        afterEach(function() {
            encryption.stop();
            this.sandbox.restore();
        });

        it("should decrypt a password", function() {
            var iv = 'vNtIgxV4kh0XHSa9ZJxkSg==';
            var password = encryption.encrypt('password', iv);
            var data = {
                password: password
            };
            expect(job.revealSecrets(data)).to.deep.equal({
                password: 'password'
            });
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
            mockWaterline.nodes.findByIdentifier = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
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
            mockWaterline.nodes.findByIdentifier.resolves(node);
            setBiosStub.resolves(
                {
                    status:"Completed"
                }
            );
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
            mockWaterline.nodes.findByIdentifier = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
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
            mockWaterline.nodes.findByIdentifier.resolves(node);
            updateFirmwareStub.resolves(
                {
                    status:"Completed"
                }
            );
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
            mockWaterline.nodes.findByIdentifier = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
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
            mockWaterline.nodes.findByIdentifier.resolves(node);
            getBiosStub.resolves(
                {
                    status:"Completed"
                }
            );
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
            mockWaterline.nodes.findByIdentifier = function(){};

            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
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
            mockWaterline.nodes.findByIdentifier.resolves(node);
            getBiosStub.resolves(
                {
                    status:"Completed"
                }
            );
            return job.run()
                .then(function() {
                    done(new Error("Should not run into this piece of code!"));
                }).catch(function() {
                    expect (spy).to.have.been.calledOnce;
                    done();
                });
        });
    });
});

