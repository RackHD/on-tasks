// Copyright 2017, Dell EMC, Inc.

'use strict';

describe('Dell Wsman Configure Idrac Job', function() {
    var WsmanJob;
    var uuid;
    var job;
    var sandbox = sinon.sandbox.create();
    var context;
    var errors;
    var taskName;
    var waterline = {};

    before(function(){
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/dell-wsman-configure-idrac.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        WsmanJob = helper.injector.get('Job.Dell.Wsman.Configure.Idrac');
        waterline.catalogs = {
            findLatestCatalogOfSource: sandbox.stub()
        };
        errors = helper.injector.get('Errors');
        uuid = helper.injector.get('uuid');
    });

    beforeEach(function(){
        context = {
            target: uuid.v4(),
        };
        taskName = 'testTaskName';
        job = new WsmanJob({
            gateway: "192.168.128.1",
            netmask: "192.168.128.255",
            address: "192.168.128.3"
        }, context, uuid.v4(), taskName);
        job._done = sandbox.stub();
    });

    afterEach(function(){
        sandbox.restore();
    });

    it('Should run succesfully', function(){
        waterline.catalogs.findLatestCatalogOfSource.resolves({
            "data": {
                "DCIM_iDRACCardString": [
                    {
                        "FQDD": "testFQDD"
                    }
                ]
            }
        });
        return job._run().then(function() {
            expect(context.outputs[taskName].fqdd).to.equal("testFQDD");
            expect(context.outputs[taskName].gateway).to.equal("192.168.128.1");
            expect(context.outputs[taskName].netmask).to.equal("192.168.128.255");
            expect(context.outputs[taskName].address).to.equal("192.168.128.3");
        });
    });

    it('Should throw an error if FQDD not found', function(){
        waterline.catalogs.findLatestCatalogOfSource.resolves();
        return job._run().then(function() {
            expect(job._done).to.be.calledWith(new errors.NotFoundError("Can't find IRAC FQDD"));
        });
    });
});
