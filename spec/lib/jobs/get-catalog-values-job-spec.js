/* jshint node:true */

'use strict';

describe('Job.Get.Catalog.Values', function(){
    var GetCatalogValuesJob,
        uuid,
        fakeNodeId,
        waterline = {},
        sandbox;

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/get-catalog-values-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        GetCatalogValuesJob = helper.injector.get('Job.Get.Catalog.Values');

        sandbox = sinon.sandbox.create();
		
        uuid = helper.injector.get('uuid');
        fakeNodeId = uuid.v4();

        waterline = helper.injector.get('Services.Waterline');
        waterline.catalogs = { findMostRecent: sandbox.stub() };
    });

    afterEach(function(){
        sandbox.restore();
    });

    it('should gracefully fail when asked for a non-existent property', function(){
        waterline.catalogs.findMostRecent.resolves({
            "node": fakeNodeId,
            "source": "ohai",
            "data": {
                "cpu": {
                    "0": {
                        "cores": "2"
                    }
                },
                "ipaddress": "1.1.1.1"
            }
        });

        var jobObject = new GetCatalogValuesJob(
            {
                "requestedData": [
                    {
                        "source": "ohai",
                        "keys": {
                            "cpuCores": "data.cpu.0.cores",
                            "ip": "data.ipaddress",
                            "failCase": "failed.poorly"
                        }
                    }
                ]
            },
            {
                "target": fakeNodeId
            },
            uuid.v4()
        );
        sandbox.stub(jobObject, '_subscribeActiveTaskExists').resolves();

        return jobObject.run()
           .then(function(){
                expect(jobObject.context.data.failCase).to.be.null;
            });
    });

    it('should find requested properties', function(){
        waterline.catalogs.findMostRecent.resolves({
            "node": fakeNodeId,
            "source": "ohai",
            "data": {
                "cpu": {
                    "0": {
                        "cores": "2"
                    }
                },
                "ipaddress": "1.1.1.1"
            }
        });

        var jobObject = new GetCatalogValuesJob(
            {
                'requestedData': [
                    {
                        "source": "ohai",
                        "keys": {
                            "cpuCores": "data.cpu.0.cores",
                            "ip": "data.ipaddress"
                        }
                    },
                ]
            },
            {
                "target": fakeNodeId
            },
            uuid.v4()
        );
        sandbox.stub(jobObject, '_subscribeActiveTaskExists').resolves();

        return jobObject.run()
            .then(function() {
                expect(jobObject.context.data).to.eql({
                    "cpuCores": "2",
                    "ip": "1.1.1.1"
                });
            });
    });

    it('should handle exceptions gracefully', function(){
        waterline.catalogs.findMostRecent.rejects('Expected Error');

        var jobObject = new GetCatalogValuesJob(
            {
                'requestedData': [
                    {
                        "source": "ohai",
                        "keys": {
                            "cpuCores": "data.cpu.0.cores",
                            "ip": "data.ipaddress"
                        }
                    },
                ]
            },
            {
                "target": fakeNodeId
            },
            uuid.v4()
        );
        sandbox.stub(jobObject, '_subscribeActiveTaskExists').resolves();

        return expect(jobObject.run()).to.be.rejectedWith('Expected Error');
    });
});
