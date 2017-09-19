// Copyright 2017, Dell EMC, Inc.

'use strict';

var uuid = require('node-uuid'),
    waterline = {},
    encrypt = {},
    sandbox = sinon.sandbox.create(),
    ucsJob,
    ucsTool,
    data = {
        config: {
            command: 'ucs.powerthermal'
        },
        workItemId: 'testworkitemid',
        node: '12345678'
    },
    obmConfig = {
        config: {
            dn: 'sys/chassis-1/blade-2',
            ucsPassword: 'abc'
        }
    },
    ucsResponseData = {
        "memoryUnitEnvStats": [{
                "child_action": null,
                "dn": "sys/chassis-1/blade-2/board/memarray-1/mem-1/dimm-env-stats",
                "intervals": "58982460",
                "rn": "dimm-env-stats"
            },
            {
                "child_action": null,
                "dn": "sys/chassis-1/blade-2/board/memarray-1/mem-4/dimm-env-stats",
                "intervals": "58982460",
                "rn": "dimm-env-stats"
            }
        ],
        "processorEnvStats": [{
                "child_action": null,
                "dn": "sys/chassis-1/blade-2/board/cpu-1/env-stats"
            },
            {
                "child_action": null,
                "dn": "sys/chassis-1/blade-2/board/cpu-2/env-stats"
            }
        ]
    };

describe('Job.Ucs', function() {
    var base = require('./base-spec');

    base.before(function(context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ucs-job.js'),
            helper.require('/lib/utils/job-utils/ucs-tool.js'),
            helper.di.simpleWrapper(encrypt, 'Services.Encryption'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        context.Jobclass = helper.injector.get('Job.Ucs');
    });

    describe('Base', function() {
        base.examples();
    });

    describe('ucs-job', function() {
        beforeEach(function() {
            encrypt.decrypt = sandbox.stub().returns('abc');
            waterline.workitems = {
                update: sandbox.stub().resolves(),
                findOne: sandbox.stub().resolves(),
                setSucceeded: sandbox.stub().resolves()
            };

            waterline.obms = {
                findByNode: sandbox.stub().resolves(obmConfig)
            };

            var graphId = uuid.v4();
            ucsJob = new this.Jobclass({}, {
                graphId: graphId
            }, uuid.v4());

            ucsTool = {
                clientRequest: sandbox.stub().resolves({
                    body: ucsResponseData
                })
            };
            ucsJob._initUcsTool = sandbox.stub().returns(ucsTool);
            ucsJob._publishUcsCommandResult = sandbox.stub().resolves();
        });

        afterEach(function() {
            sandbox.restore();
        });

        it("should catch an error bacause of waterline.workitems.update function.", function() {
            var error = new Error('Call waterline.workitems.update function failed.');
            waterline.workitems.update = sandbox.stub().rejects(error);
            ucsJob._subscribeRunUcsCommand = sandbox.stub();
            return ucsJob._run()
            .then(function() {
                expect(ucsJob._subscribeRunUcsCommand).to.have.not.been.called;
                expect(error).to.exist;
            });
        });

        it("should invoke ucsTool.clientRequest function to get ucs data.", function() {
            return ucsJob._subscribeUcsCallback(data)
                .then(function() {
                    expect(waterline.obms.findByNode).to.have.been.calledOnce;
                    expect(ucsTool.clientRequest).to.have.been.calledOnce;
                    expect(ucsJob._publishUcsCommandResult).to.have.been.calledOnce;
                    expect(waterline.workitems.findOne).to.have.been.calledOnce;
                    expect(waterline.workitems.setSucceeded).to.have.been.calledOnce;
                });
        });

        it("should log error if no obm service is found.", function() {
            waterline.obms.findByNode.resolves();
            return ucsJob._subscribeUcsCallback(data)
                .then(function() {
                    expect(ucsTool.clientRequest).to.have.not.been.calledOnce;
                });
        });

        it("should log error if no class id is found.", function() {
            waterline.obms.findByNode.resolves();
            return ucsJob._collectUcsPollerData({
                    command: 'anything'
                })
                .then(
                    function() {
                        throw new Error('Test should fail');
                    },
                    function(err) {
                        expect(ucsTool.clientRequest).to.have.not.been.calledOnce;
                        expect(err.message).to.equal('No ucs classIds found for command anything');
                    }
                );
        });

        it("should reach upper limit of concurrent request pool and cannot add new one.",
            function() {
                var addConcurrentRequestSpy = sandbox.spy(ucsJob, 'addConcurrentRequest');
                ucsJob.maxConcurrent = -1;
                return ucsJob._subscribeUcsCallback(data)
                    .then(function() {
                        expect(addConcurrentRequestSpy).to.have.not.been.called;
                        expect(waterline.obms.findByNode).to.have.not.been.called;
                    });
            });

        it("should listen for ucs.powerthermal command requests", function() {
            ucsJob._subscribeRunUcsCommand = sandbox.stub();
            return ucsJob._run()
                .then(function() {
                    expect(waterline.workitems.update).to.have.been.calledOnce;
                    expect(ucsJob._subscribeRunUcsCommand).to.have.been.calledOnce;
                });
        });

        it("should not be allowed to exceed the concurrent of maximum limit.", function() {
            expect(ucsJob.concurrentRequests('node', 'type')).to.be.false;
            ucsJob.addConcurrentRequest('node', 'type');
            ucsJob.addConcurrentRequest('node', 'type');
            expect(ucsJob.concurrent.node.type).to.equal(2);
            expect(ucsJob.concurrentRequests('node', 'type')).to.be.true;
            ucsJob.removeConcurrentRequest('node', 'type');
            expect(ucsJob.concurrent.node.type).to.equal(1);
        });
    });
});
