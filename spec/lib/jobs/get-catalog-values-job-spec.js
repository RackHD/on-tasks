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
        waterline.catalogs = {findOne: sandbox.stub()};        
    });

    afterEach(function(){
        sandbox.restore();
    });

    it('should gracefully fail when asked for a non-existent property', function(){
        waterline.catalogs.findOne.resolves({
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
                            "cpu_cores": "data.cpu.0.cores",
                            "primaryip_address": "data.ipaddress",
                            "fail_case": "failed.poorly"
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
                expect(jobObject.context.data.fail_case).to.be.empty;
            })
           .catch(function(err){
               console.log(err);
               expect(err).to.not.be.ok;
           });
    });

    it('should find requested properties', function(){
        waterline.catalogs.findOne.resolves({
            "node": fakeNodeId,
            "source": "ohai",
            "data": {
                "cpu": {
                    "0": {
                        "cores": "2"
                    }
                },
                "ipaddress": "1.1.1.1"
            },
        });

        var jobObject = new GetCatalogValuesJob(
            {
                'requestedData': [
                    {
                        "source": "ohai",
                        "keys": {
                            "cpu_cores": "data.cpu.0.cores",
                            "primaryip_address": "data.ipaddress"
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
                    "cpu_cores": "2",
                    "primaryip_address": "1.1.1.1"
                });
            })
            .catch(function(err){
                console.log(err);
                expect(err).to.not.be.ok;
            });
    });
});
