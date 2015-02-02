// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.GenerateSku", function () {

    var injector;
    var waterline = {};
    var GenerateSku;
    var Q;

    var catalog1 = {
        id: '12341234123412341234',
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
        id: '12341234123412341234',
        source: 'bmc',
        data: {
            'MAC Address' : '00:00:00:00:00:00',
            'Subnet Mask' : '255.255.255.0',
            'IP Address' : '10.1.1.1'
        }
    };

    before(function () {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/generate-sku.js'),
            dihelper.simpleWrapper(waterline, 'Services.Waterline')
        ]));

        GenerateSku = injector.get('Job.Catalog.GenerateSku');
        Q = injector.get('Q');
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
    });

    it('invoke a cancel function', function() {
        var job = GenerateSku.create({}, { target: '1234' }, '1');
        return job.cancel().should.eventually.be.fulfilled;
    });

    it('assigns a matching sku', function() {
        var job = GenerateSku.create({}, { target: '1234' }, '1');
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
        waterline.catalogs.findMostRecent.returns(Q.resolve([catalog1]));
        return job.run().then(function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '1');
        });
    });

    it('assigns null when no skus match', function() {
        var job = GenerateSku.create({}, { target: '1234' }, '1');
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
        waterline.catalogs.findMostRecent.returns(Q.resolve([catalog1]));
        return job.run().then(function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
        });
    });

    it('assigns the most specific sku when multiple match', function() {
        var job = GenerateSku.create({}, { target: '1234' }, '1');
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
        waterline.catalogs.findMostRecent.returns(Q.resolve([catalog1]));
        return job.run().then(function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '2');
        });
    });

    it('assigns a matching sku against multiple catalogs', function() {
        var job = GenerateSku.create({}, { target: '1234' }, '1');
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
        waterline.catalogs.findMostRecent.returns(Q.resolve([catalog1, catalog2]));
        return job.run().then(function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '1');
        });
    });

    it('assigns null when no skus match against multiple catalogs', function() {
        var job = GenerateSku.create({}, { target: '1234' }, '1');
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
        waterline.catalogs.findMostRecent.returns(Q.resolve([catalog1, catalog2]));
        return job.run().then(function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
        });
    });


    it('assigns null when no catalogs present', function() {
        var job = GenerateSku.create({}, { target: '1234' }, '1');
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
        waterline.catalogs.findMostRecent.returns(Q.resolve([]));
        return job.run().then(function () {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
        });
    });

});

