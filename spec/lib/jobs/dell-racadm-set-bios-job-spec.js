// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid;
    var RacadmSetBiosJob;
    var Promise;
    var job;
    var encryption;
    var lookup;
    var racadmTool;
    var mockWaterline = {
        nodes: {},
        catalogs: {}
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/dell-racadm-set-bios-job'),
            helper.require('/lib/utils/job-utils/racadm-tool.js'),
            helper.require('/lib/utils/job-utils/racadm-parser.js'),
            helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);
        Promise = helper.injector.get('Promise');
        RacadmSetBiosJob = helper.injector.get('Job.DellRacadm.SetBIOS');
        racadmTool = helper.injector.get('JobUtils.RacadmTool');
        uuid = helper.injector.get('uuid');
        lookup = helper.injector.get('Services.Lookup');
        encryption = helper.injector.get('Services.Encryption');
    });

    describe('Input validation', function() {
        beforeEach('Dell Racadm Tool Set BIOS Validation', function() {
            var options = {
                username:"onrack",
                password: "onrack",
                filePath:"//1.2.3.4/src/bios.xml"
            };
            job = new RacadmSetBiosJob(options, {}, uuid.v4());
            mockWaterline.nodes.findByIdentifier = function(){};
            this.sandbox = sinon.sandbox.create();
            this.sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            this.sandbox.stub(mockWaterline.nodes,'findByIdentifier');
        });

        afterEach('Dell Racadm Tool Set BIOS Validation', function() {
            this.sandbox.restore();
        });

        it('should fail if node does not exist', function(done) {
            mockWaterline.nodes.findByIdentifier.resolves(null);
            job.run()
                .then(function() {
                    done(new Error("Expected job to fail"));
                })
                .catch(function(e) {
                    try {
                        expect(e).to.have.property('name').that.equals('AssertionError');
                        expect(e).to.have.property('message').that.equals('No node for dell' +
                            ' racadm set bios');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
        });

        it('should fail if ipmi obmSetting does not exist', function(done) {
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
            job.run()
                .then(function() {
                    done(new Error("Expected job to fail"));
                })
                .catch(function(e) {
                    try {
                        expect(e).to.have.property('name').that.equals('AssertionError');
                        expect(e).to.have.property('message').that.equals('No ipmi obmSetting for' +
                            ' dell racadm set bios');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
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
            return job.lookupHost(data)
                .then(function(result){
                    expect(result).to.deep.equal({
                        host: '10.1.1.2'
                    });
                });
        });
    });

    describe('DellRacadm Tool Set Bios', function() {
        var options;

        beforeEach('Dell Racadm Tool Set BIOS Validation', function() {
            options = {
                username:"onrack",
                password: "onrack",
                filePath:"//1.2.3.4/src/bios.xml"
            };
            job = new RacadmSetBiosJob(options, {}, uuid.v4());
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
            var cifsInfo = {user: options.username, password: options.password ,
                filePath: options.filePath};
            mockWaterline.nodes.findByIdentifier.resolves(node);
            setBiosStub.resolves(
                {
                    jobStatus:{
                        status:"Completed"
                    }
                }
            );
            return job.run()
                .then(function() {
                    expect(setBiosStub).to.have.been.called;
                    expect(setBiosStub).to.have.been.calledWith(
                        node.obmSettings[0].config.host, node.obmSettings[0].config.user,
                        node.obmSettings[0].config.password,cifsInfo);
                });
        });
    });
});
