// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("Base Metric", function () {
    var sandbox = sinon.sandbox.create();
    var waterline;
    var BaseMetric;
    var base;

    before('Base Metric before', function () {
        helper.setupInjector([
            helper.require('/lib/utils/metrics/base-metric.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js')
        ]);

        BaseMetric = helper.injector.get('JobUtils.Metrics.Snmp.Base');
        waterline = helper.injector.get('Services.Waterline');
    });

    beforeEach('Base Metric beforeEach', function() {
        base = new BaseMetric('testnodeid', 'testhost', 'testcommunity');
        // reset this shared object
        base.oidDescriptionMap = {};
        waterline.catalogs = {
            findMostRecent: sandbox.stub().resolves()
        };
        waterline.nodes = {
            needByIdentifier: sandbox.stub().resolves({sku:'abc-xyz'})
        };
        waterline.environment = {
            findOne: sandbox.stub().resolves()
        };
    });

    it('should identify a node type from snmp data', function() {
        waterline.nodes.needByIdentifier.resolves({sku:null})
        waterline.catalogs.findMostRecent.resolves({
            data: { 'SNMPv2-MIB::sysDescr_0': 'Cisco' }
        });
        return base.identify()
        .then(function() {
            expect(base.nodeType).to.equal('cisco');
        });
    });

    it('should classify an unknown node type from snmp data as unknown', function() {
        waterline.catalogs.findMostRecent.resolves({
            data: { 'SNMPv2-MIB::sysDescr_0': 'invalid' }
        });

        return base.identify()
        .then(function() {
            expect(base.nodeType).to.equal('unknown');
        });
    });

    it('should classify an un-cataloged node as unknown', function() {
        waterline.catalogs.findMostRecent.resolves({
            data: { 'SNMPv2-MIB::sysDescr_0': 'invalid' }
        });

        return base.identify()
        .then(function() {
            expect(base.nodeType).to.equal('unknown');
        });
    });

    it('should update an oid description', function() {
        base.snmptool = { collectHostSnmp: sandbox.stub() };
        base.snmptool.collectHostSnmp.resolves([
            { values: { testoid1: '1', testoid2: '2' } }
        ]);

        return base.updateOidDescriptionMapByType('names')
        .then(function() {
            expect(base.oidDescriptionMap).to.have.property('testnodeid')
                .that.has.property('names').that.deep.equals({ testoid1: '1', testoid2: '2' }
            );
        });
    });

    it('should not update an oid description for an unknown cache type', function() {
        return expect(base.updateOidDescriptionMapByType('unknown'))
            .to.be.rejectedWith(/Unknown OID description map type: unknown/);
    });
});


