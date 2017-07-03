// Copyright 2015, EMC, Inc.

'use strict';

describe('Snmp Collection Job', function() {
    var base = require('./base-spec.js'),
        uuid = require('node-uuid'),
        aNodeId = uuid.v4(),
        aGraphId = uuid.v4(),
        job,
        Snmptool,
        mockWaterline,
        snmpSettings = {
            config: {
                host: '1.2.3.4',
                community: 'community'
            }
        },
        snmpData = {oid: 'mibstuff'};

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/snmp-collection-job.js'),
            helper.di.simpleWrapper(function() {}, 'JobUtils.Snmptool'),
            helper.di.simpleWrapper({ ibms: {} }, 'Services.Waterline')
        ]);
        mockWaterline = helper.injector.get('Services.Waterline');
        Snmptool = helper.injector.get('JobUtils.Snmptool');
        this.Jobclass = helper.injector.get('Job.Snmp.Collect');
    });

    beforeEach(function() {
        this.sandbox = sinon.sandbox.create();
        job = new this.Jobclass(
                {},
                {
                    target: aNodeId,
                    graphId: aGraphId
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

    it('should get snmpSettings for the target node from waterline', function() {
        Snmptool.prototype.collectHostSnmp = function() {};
        mockWaterline.ibms.findByNode = function() {};
        this.sandbox.stub(Snmptool.prototype, 'collectHostSnmp').resolves();
        this.sandbox.stub(mockWaterline.ibms, 'findByNode').resolves(snmpSettings);
        this.sandbox.stub(job, '_publishSnmpCommandResult').resolves();

        job._run();
        return job._deferred
        .then(function() {
            expect(mockWaterline.ibms.findByNode)
            .to.have.been.calledWith(aNodeId, 'snmp-ibm-service');
        });
    });

    it('should publish the collected snmp results', function() {
        Snmptool.prototype.collectHostSnmp = function() {};
        mockWaterline.ibms.findByNode = function() {};
        this.sandbox.stub(Snmptool.prototype, 'collectHostSnmp').resolves(snmpData);
        this.sandbox.stub(mockWaterline.ibms, 'findByNode').resolves(snmpSettings);
        this.sandbox.stub(job, '_publishSnmpCommandResult').resolves();

        job._run();
        return job._deferred
        .then(function() {
            expect(job._publishSnmpCommandResult).to.have.been.calledWith(
                aGraphId,
                {
                    host: snmpSettings.config.host,
                    community: snmpSettings.config.community,
                    result: snmpData
                }
            );
        });
    });
});
