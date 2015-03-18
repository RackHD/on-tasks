// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.GenerateSku", function () {
    var waterline = {};
    var taskProtocol = {};
    var GenerateSku;
    var Q;
    var uuid;

    var catalog1 = {
        id: 'abf9d5a4ebf61b6715dbaef6',
        source: 'dmi',
        data: {
            dmi: {
                system: {
                    manufacturer: 'Renasar',
                    'product_name': '1A'
                }
            }
        }
    };

    var catalog2 = {
        id: 'abf9d5a4ebf61b6715dbaef7',
        source: 'bmc',
        data: {
            'MAC Address' : '00:00:00:00:00:00',
            'Subnet Mask' : '255.255.255.0',
            'IP Address' : '10.1.1.1'
        }
    };

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/generate-sku.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper(taskProtocol, 'Protocol.Task')
        ]);

        GenerateSku = helper.injector.get('Job.Catalog.GenerateSku');
        Q = helper.injector.get('Q');
        uuid = helper.injector.get('uuid');
    });

    beforeEach(function () {
        waterline.skus = {
            find: sinon.stub()
        };
        waterline.catalogs = {
            findMostRecent: sinon.stub()
        };
        waterline.nodes = {
            updateByIdentifier: sinon.stub().returns(Q.resolve())
        };
        taskProtocol.subscribeActiveTaskExists = sinon.stub().returns(Q.resolve({
            dispose: sinon.stub()
        }));
    });

    it('invoke a cancel function', function(done) {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        job.on('done', function() {
            done();
        });
        job.cancel();
    });

    it('assigns a matching sku', function(done) {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        var sku = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'Renasar'
                }
            ]
        };
        var sku2 = {
            id: '2',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku Other',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'Other'
                }
            ]
        };
        waterline.skus.find.returns(Q.resolve([sku, sku2]));
        waterline.catalogs.findMostRecent.returns(Q.resolve(catalog1));
        job.on('done', function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '1');
            done();
        });
        job.run();
    });

    it('assigns null when no skus match', function(done) {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        var sku = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'Other'
                }
            ]
        };
        waterline.skus.find.returns(Q.resolve([sku]));
        waterline.catalogs.findMostRecent.returns(Q.resolve(catalog1));
        job.on('done', function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
            done();
        });
        job.run();
    });

    it('assigns the most specific sku when multiple match', function(done) {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        var sku = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'Renasar'
                }
            ]
        };
        var sku2 = {
            id: '2',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku Other',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'Renasar'
                },
                {
                    path: 'dmi.dmi.system.product_name',
                    equals: '1A'
                }
            ]
        };
        waterline.skus.find.returns(Q.resolve([sku, sku2]));
        waterline.catalogs.findMostRecent.returns(Q.resolve(catalog1));
        job.on('done', function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '2');
            done();
        });
        job.run();
    });

    it('assigns a matching sku against multiple catalogs', function(done) {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        var sku = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku',
            rules: [
                {
                    path: 'dmi.dmi.system.product_name',
                    equals: '1A'
                },
                {
                    path: 'bmc.IP Address',
                    regex: /^10\.[0-9]+.[0-9]+.[0-9]+$/
                }
            ]
        };
        waterline.skus.find.returns(Q.resolve([sku]));
        waterline.catalogs.findMostRecent.onCall(0).returns(Q.resolve(catalog1));
        waterline.catalogs.findMostRecent.onCall(1).returns(Q.resolve(catalog2));
        job.on('done', function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '1');
            done();
        });
        job.run();
    });

    it('assigns null when no skus match against multiple catalogs', function(done) {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        var sku = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku',
            rules: [
                {
                    path: 'dmi.dmi.system.product_name',
                    equals: '1A'
                },
                {
                    path: 'bmc.IP Address',
                    equals: '192.168.1.1'
                }
            ]
        };
        waterline.skus.find.returns(Q.resolve([sku]));
        waterline.catalogs.findMostRecent.onCall(0).returns(Q.resolve(catalog1));
        waterline.catalogs.findMostRecent.onCall(1).returns(Q.resolve(catalog2));
        job.on('done', function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
            done();
        });
        job.run();
    });


    it('assigns null when no catalogs present', function(done) {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        var sku = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Sku',
            rules: [
                {
                    path: 'dmi.dmi.system.product_name',
                    equals: '1A'
                },
                {
                    path: 'bmc.IP Address',
                    equals: '192.168.1.1'
                }
            ]
        };
        waterline.skus.find.returns(Q.resolve([sku]));
        waterline.catalogs.findMostRecent.returns(Q.resolve());
        job.on('done', function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
            done();
        });
        job.run();
    });

});

