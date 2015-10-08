'use strict';
var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var _,
    base = require('./base-spec'),
    waterline = {},
    snmpData;

    base.before(function (context) {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/net-snmp-tool.js'),
            helper.require('/lib/utils/job-utils/net-snmp-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/snmp-job.js'),
            helper.require('/lib/jobs/snmp-poller-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        _ = helper.injector.get('_');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Snmp');
        var alertJob = new context.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());
        context.determineAlert = alertJob._determineAlert;
    });

    describe('Base', function () {
        base.examples();
    });

    describe('Snmp-poller-alert-job', function() {

        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            waterline.workitems = {
                update: this.sandbox.stub().resolves()
            };
            snmpData = {
                config: {
                    oids:[],
                    alerts:[]
                },
                host: '1.2.3.4',
                community: 'test',
                workitemId: 'aWorkItemId',
                node: 'aNodeId',
                result: []
            };
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should not alert if there are no alerts', function() {
            return this.determineAlert(snmpData).should.become(undefined);
        });

        it('should alert on matching alert string', function() {
            snmpData.config.alerts.push({'.1.3.6.1.2.1.1.5': 'test value'});
            snmpData.result.push({
                source: '.1.3.6.1.2.1.1.5',
                values: {'.1.3.6.1.2.1.1.5': 'test value'}
            });
            return this.determineAlert(snmpData)
            .then(function(out) {
                expect(out).to.have.property('alerts').with.length(1);
                expect(out.alerts[0]).to.have.property('data');
                expect(out.alerts[0].data).to.deep.equal({
                    '.1.3.6.1.2.1.1.5': 'test value'
                });
                expect(out.alerts[0]).to.have.property('matches');
                expect(out.alerts[0].matches).to.deep.equal({
                    '.1.3.6.1.2.1.1.5': 'test value',
                    inCondition: true
                });
            });
        });

        it('should alert on matching alert regex', function() {
            snmpData.config.alerts.push({'.1.3.6.1.2.1.1.5': '/test/'});
            snmpData.result.push({
                source: '.1.3.6.1.2.1.1.5',
                values: {'.1.3.6.1.2.1.1.5': 'test value'}
            });
            return this.determineAlert(snmpData)
            .then(function(out) {
                expect(out).to.have.property('alerts').with.length(1);
                expect(out.alerts[0]).to.have.property('data');
                expect(out.alerts[0].data).to.deep.equal({
                    '.1.3.6.1.2.1.1.5': 'test value'
                });
                expect(out.alerts[0]).to.have.property('matches');
                console.log(out.alerts[0].matches);
                expect(out.alerts[0].matches).to.deep.equal({
                    '.1.3.6.1.2.1.1.5': /test/,
                    inCondition: true
                });
            });
        });

        it('should alert on a change in alert status', function() {
            snmpData.config.alerts.push({
                '.1.3.6.1.2.1.1.5': "/won'tMatch/",
                inCondition: true
            });
            return this.determineAlert(snmpData)
            .then(function(out) {
                expect(out).to.have.property('alerts').with.length(1);
                expect(out.alerts[0].data).to.equal(undefined);
                expect(out.alerts[0]).to.have.property('matches');
                expect(out.alerts[0].matches).to.deep.equal({
                    '.1.3.6.1.2.1.1.5': /won'tMatch/,
                    inCondition: false
                });
            });
        });

        it('should not alert if there is no change in status', function() {
            snmpData.config.alerts.push({
                '.1.3.6.1.2.1.1.5': '/test/',
                inCondition: true
            });
            snmpData.result.push({
                source: '.1.3.6.1.2.1.1.5',
                values: {'.1.3.6.1.2.1.1.5': 'test value'}
            });
            return this.determineAlert(snmpData).should.become(undefined);
        });
    });

});
