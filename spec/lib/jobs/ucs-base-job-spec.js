// Copyright 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var uuid = require('node-uuid'),
    sandbox = sinon.sandbox.create(),
    taskId = uuid.v4(),
    UcsTool,
    ucsJobBase,
    UcsTool = function() {
        return {
            clientRequest: sandbox.stub().resolves({
                "body": "ACCEPTED"
            })
        };
    };

describe('Job.Ucs.Base', function() {
    var base = require('./base-spec');

    base.before(function(context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ucs-base-job.js'),
            helper.di.simpleWrapper(UcsTool, 'JobUtils.UcsTool')
        ]);
        context.Jobclass = helper.injector.get('Job.Ucs.Base');
        UcsTool = helper.injector.get('JobUtils.UcsTool');
    });

    describe('Base', function() {
        base.examples();
    });

    describe('ucs-job-base', function() {
        beforeEach(function() {

            var graphId = uuid.v4();
            ucsJobBase = new this.Jobclass({}, {}, {
                graphId: graphId
            }, taskId);
        });

        afterEach(function() {
            sandbox.restore();
        });



        it("should run ucs request", function() {

            return ucsJobBase._ucsRequest("http://localhost:12345", {})
                .then(function() {
                    expect(ucsJobBase._getUcsToolInstance().clientRequest).to.be.calledOnce;
                });
        });

        it("should run ucs request asynchronously", function() {

            ucsJobBase._subscribeHttpResponseUuidByPromisify = sandbox.stub().resolves("123");
            sandbox.spy(ucsJobBase, '_ucsRequest');

            return ucsJobBase._ucsRequestAsync("http://localhost:12345", {}, taskId)
                .then(function() {
                    expect(ucsJobBase._ucsRequest).to.be.calledOnce;
                    expect(ucsJobBase._ucsRequest).to.be.calledWith("http://localhost:12345", {});
                    expect(ucsJobBase._subscribeHttpResponseUuidByPromisify).to.be.calledOnce;
                    expect(ucsJobBase._subscribeHttpResponseUuidByPromisify)
                        .to.be.calledWith(taskId);
                });
        });

        it("should get bad request error to run ucs request asynchronously", function() {
            ucsJobBase._subscribeHttpResponseUuidByPromisify = sandbox.stub();
            ucsJobBase._ucsRequest = sandbox.stub().resolves({
                "body": "ERROR"
            });
            return ucsJobBase._ucsRequestAsync("http://localhost:12345", {}, taskId)
                .then(function() {
                    throw new Error("Test should fail");
                }, function(err) {
                    expect(ucsJobBase._ucsRequest).to.be.calledOnce;
                    expect(ucsJobBase._ucsRequest).to.be.calledWith("http://localhost:12345", {});
                    expect(ucsJobBase._subscribeHttpResponseUuidByPromisify).not.to.be.calledOnce;
                    expect(err.message).to.deep.equal(
                        "Request was not ACCEPTED. Please check input parameters.");
                });
        });

        it("should promisify subscribeHttpResponseUuid", function() {
            var mock = function(mockSpy) {
                mockSpy("abc");
            };
            ucsJobBase._subscribeHttpResponseUuid = mock;
            return ucsJobBase._subscribeHttpResponseUuidByPromisify(taskId)
                .then(function(data) {
                    expect(data).to.equal("abc");
                });
        });
    });
});
