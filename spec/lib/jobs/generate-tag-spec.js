// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Job.Catalog.GenerateTag", function () {
    var waterline = {};
    var taskProtocol = {};
    var GenerateTag;
    var uuid;

    var catalog1 = {
        id: 'abf9d5a4ebf61b6715dbaef6',
        source: 'dmi',
        data: {
            dmi: {
                system: {
                    manufacturer: 'RackHD',
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

    var targetId = 'bc7dab7e8fb7d6abf8e7d6ab';

    before(function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/generate-tag.js'),
            helper.require('/lib/utils/job-utils/catalog-searcher.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper(taskProtocol, 'Protocol.Task'),
        ]);

        GenerateTag = helper.injector.get('Job.Catalog.GenerateTag');
        uuid = helper.injector.get('uuid');
        waterline.tags = {
            find: sinon.stub()
        };
        waterline.catalogs = {
            findMostRecent: sinon.stub()
        };
        waterline.nodes = {
            addTags: sinon.stub().resolves()
        };
    });

    beforeEach(function () {
        waterline.tags.find.reset();
        waterline.catalogs.findMostRecent.reset();
        waterline.nodes.addTags.reset();
        taskProtocol.subscribeActiveTaskExists = sinon.stub().resolves({
            dispose: sinon.stub()
        });
    });

    it('assigns a matching tag', function() {
        var job = new GenerateTag({}, { target: targetId }, uuid.v4());
        var tags = [ {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    regex: /[On]*[Rr]ack[HD]*/
                }
            ]
        },
        {
            id: '2',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag 2',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'Other'
                }
            ]
        }];

        waterline.tags.find.resolves(tags);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(waterline.nodes.addTags).to.have.been.calledOnce;
            expect(waterline.nodes.addTags).to.have.been.calledWith(targetId, ['Test Tag']);
        });
    });

    it('assigns nothing when no tags match', function() {
        var job = new GenerateTag({}, { target: targetId }, uuid.v4());
        var tag = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'Other'
                }
            ]
        };
        waterline.tags.find.resolves([tag]);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(waterline.nodes.addTags).to.have.not.been.called;
        });
    });

    it('assigns all tags when multiples match', function() {
        var job = new GenerateTag({}, { target: targetId }, uuid.v4());
        var tags = [{
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'RackHD'
                }
            ]
        }, {
            id: '2',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag 2',
            rules: [
                {
                    path: 'dmi.dmi.system.manufacturer',
                    equals: 'RackHD'
                },
                {
                    path: 'dmi.dmi.system.product_name',
                    equals: '1A'
                }
            ]
        }];
        waterline.tags.find.resolves(tags);
        waterline.catalogs.findMostRecent.resolves(catalog1);

        return job.run()
        .then(function() {
            expect(waterline.nodes.addTags).to.have.been.calledOnce;
            expect(waterline.nodes.addTags).to.have.been.calledWith(
                targetId, ['Test Tag', 'Test Tag 2']);
        });
    });

    it('assigns a matching tag against multiple catalogs', function() {
        var job = new GenerateTag({}, { target: targetId }, uuid.v4());
        var tag = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag',
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
        waterline.tags.find.resolves([tag]);
        waterline.catalogs.findMostRecent.onCall(0).resolves(catalog1);
        waterline.catalogs.findMostRecent.onCall(1).resolves(catalog2);

        return job.run()
        .then(function() {
            expect(waterline.nodes.addTags).to.have.been.calledOnce;
            expect(waterline.nodes.addTags).to.have.been.calledWith(targetId, ['Test Tag']);
        });
    });

    it('assigns nothing when no tags match against multiple catalogs', function() {
        var job = new GenerateTag({}, { target: targetId }, uuid.v4());
        var tag = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag',
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
        waterline.tags.find.resolves([tag]);
        waterline.catalogs.findMostRecent.onCall(0).resolves(catalog1);
        waterline.catalogs.findMostRecent.onCall(1).resolves(catalog2);

        return job.run()
        .then(function() {
            expect(waterline.nodes.addTags).to.have.not.been.called;
        });
    });


    it('assigns nothing when no catalogs present', function() {
        var job = new GenerateTag({}, { target: targetId }, uuid.v4());
        var tag = {
            id: '1',
            createdAt: new Date('Feb 01 2015 12:00:00'),
            name: 'Test Tag',
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
        waterline.tags.find.resolves([tag]);
        waterline.catalogs.findMostRecent.resolves();

        return job.run()
        .then(function() {
            expect(waterline.nodes.addTags).to.have.not.been.called;
        });
    });

    it('assigns nothing when no tags present', function() {
        var job = new GenerateTag({}, { target: targetId }, uuid.v4());

        waterline.tags.find.resolves([]);
        waterline.catalogs.findMostRecent.resolves();

        return job.run()
        .then(function() {
            expect(waterline.nodes.addTags).to.have.not.been.called;
            expect(waterline.catalogs.findMostRecent).to.have.not.been.called;
        });
    });
});
