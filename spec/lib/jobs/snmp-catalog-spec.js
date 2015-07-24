'use strict';

describe('Catalog Snmp Job', function () {
    var base = require('./base-spec.js'),
        uuid = require('node-uuid'),
        mockWaterline,
        job,
        aGraphId = uuid.v4(),
        aNodeId = uuid.v4(),
        snmpData = [{
            source: 'theSource',
            value:  {stuff: 'stuff'}
        }];

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/snmp-catalog.js'),
            helper.di.simpleWrapper({ catalogs: {} }, 'Services.Waterline')
        ]);
        this.Jobclass = helper.injector.get('Job.Snmp.Catalog');
        mockWaterline = helper.injector.get('Services.Waterline');
    });

    beforeEach(function() {
        this.sandbox = sinon.sandbox.create();
        job = new this.Jobclass(
                {},
                {
                    graphId: aGraphId,
                    target: aNodeId
                },
                uuid.v4()
        );
    });

    afterEach(function() {
        this.sandbox = sinon.sandbox.restore();
    });

    describe('Base', function() {
        base.examples();
    });

    it('should subscribe to snmpCommandResult', function() {
        this.sandbox.stub(job, '_subscribeSnmpCommandResult').callsArgWith(
                1,
                {result: Promise.resolve(snmpData)}
            );
        mockWaterline.catalogs.create = function() {};
        this.sandbox.stub(mockWaterline.catalogs, 'create').resolves();

        job._run();
        return job._deferred
        .then(function() {
            expect(job._subscribeSnmpCommandResult).to.have.been.calledOnce;
        });


    });

    it('should create a catalog via waterline', function() {
        this.sandbox.stub(job, '_subscribeSnmpCommandResult').callsArgWith(
                1,
                {result: Promise.resolve(snmpData)}
        );
        mockWaterline.catalogs.create = function() {};
        this.sandbox.stub(mockWaterline.catalogs, 'create').resolves();

        job._run();
        return job._deferred
        .then(function() {
            expect(mockWaterline.catalogs.create).to.have.been.calledWith({
                node: aNodeId,
                source: 'snmp-' + snmpData[0].source,
                data: snmpData[0].value
            });
        });
    });
});
