// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.GenerateSku", function () {
    var waterline = {};
    var taskProtocol = {};
    var eventsProtocol = {
        publishSkuAssigned: sinon.stub()
    };
    var GenerateSku;
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
            helper.require('/lib/utils/job-utils/catalog-searcher.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper(taskProtocol, 'Protocol.Task'),
            helper.di.simpleWrapper(eventsProtocol, 'Protocol.Events')
        ]);

        GenerateSku = helper.injector.get('Job.Catalog.GenerateSku');
        uuid = helper.injector.get('uuid');
        waterline.skus = {
            find: sinon.stub()
        };
        waterline.catalogs = {
            findMostRecent: sinon.stub()
        };
        waterline.nodes = {
            updateByIdentifier: sinon.stub().resolves()
        };
    });

    beforeEach(function () {
        eventsProtocol.publishSkuAssigned.reset();
        waterline.skus.find.reset();
        waterline.catalogs.findMostRecent.reset();
        waterline.nodes.updateByIdentifier.reset();
        taskProtocol.subscribeActiveTaskExists = sinon.stub().resolves({
            dispose: sinon.stub()
        });
    });

    it('assigns a matching sku', function() {
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
        waterline.skus.find.resolves([sku, sku2]);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '1');
        });
    });

    it('publishes an event when a SKU has been assigned', function() {
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
        waterline.skus.find.resolves([sku]);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(eventsProtocol.publishSkuAssigned)
                .to.have.been.calledWith('bc7dab7e8fb7d6abf8e7d6ab', '1');
        });
    });

    it('does not publish an event when a SKU has not been assigned', function() {
        var job = new GenerateSku({}, { target: 'bc7dab7e8fb7d6abf8e7d6ab' }, uuid.v4());
        waterline.skus.find.resolves([]);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(eventsProtocol.publishSkuAssigned).to.not.have.been.called;
        });
    });

    it('assigns null when no skus match', function() {
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
        waterline.skus.find.resolves([sku]);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
        });
    });

    it('assigns the most specific sku when multiple match', function() {
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
        waterline.skus.find.resolves([sku, sku2]);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '2');
        });
    });

    it('assigns a matching sku against multiple catalogs', function() {
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
        waterline.skus.find.resolves([sku]);
        waterline.catalogs.findMostRecent.onCall(0).resolves(catalog1);
        waterline.catalogs.findMostRecent.onCall(1).resolves(catalog2);

        return job.run()
        .then(function() {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', '1');
        });
    });

    it('assigns null when no skus match against multiple catalogs', function() {
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
        waterline.skus.find.resolves([sku]);
        waterline.catalogs.findMostRecent.onCall(0).resolves(catalog1);
        waterline.catalogs.findMostRecent.onCall(1).resolves(catalog2);

        return job.run()
        .then(function() {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
        });
    });


    it('assigns null when no catalogs present', function() {
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
        waterline.skus.find.resolves([sku]);
        waterline.catalogs.findMostRecent.resolves();

        return job.run()
        .then(function() {
            expect(waterline.nodes.updateByIdentifier).to.have.been.calledOnce;
            expect(waterline.nodes.updateByIdentifier.firstCall.args[1])
                .to.have.property('sku', null);
        });
    });
});
