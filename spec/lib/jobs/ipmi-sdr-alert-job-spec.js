// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

// Various data pieced together from EMC and local data and spit out of parseSdrData()
var _samples = {
    // analog sensors
    '+5 V (0x9)': { value: '5.056', type: 'analog' },
    '+3.3VSB (0xd)': { value: '3.264', type: 'analog' },
    '+12 V (0xa)': { value: '12.296', type: 'analog' },
    'FAN 1 (0xf)': { value: '3249', type: 'analog' },
    '+1.1 V (0x7)': { value: '1.104', type: 'analog' },
    '+1.8 V (0x8)': { value: '1.848', type: 'analog' },
    'CPU Mem VTT (0x15)': { value: '0.672', type: 'analog' },
    // threshold sensors
    'P1 MTT (0x34)': { value: 'ok', type: 'threshold' },
    'Sys Fan 1A (0x30)': { value: 'ok', type: 'threshold' },
    'PS1 Input Power (0x54)': { value: 'ok', type: 'threshold' },
    'HSBP PSOC (0x29)': { value: 'ok', type: 'threshold' },
    'BB Inlet Temp (0x20)': { value: 'ok', type: 'threshold' },
    'DIMM Thrm Mrgn 2 (0xb1)': { value: 'ok', type: 'threshold' },
    'P2 DTS Therm Mgn (0x84)': { value: 'ok', type: 'threshold' }
};

describe(require('path').basename(__filename), function () {
    var _;
    var samples;
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with renasar-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-sdr-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js')
        ]);

        _ = helper.injector.get('_');
        context.parser = helper.injector.get('JobUtils.IpmiCommandParser');
        context.Jobclass = helper.injector.get('Job.Poller.Alert.Ipmi.Sdr');
        var alertJob = new context.Jobclass({}, { graphId: uuid.v4() }, uuid.v4());
        context.determineAlert = alertJob._determineAlert;
        samples = _.cloneDeep(_samples);
    });

    describe('Base', function () {
        base.examples();
    });

    describe("ipmi-sdr-alert-job", function() {
        it("should not alert on empty sdr data", function() {
            return this.determineAlert(null).should.become(undefined);
        });

        it("should alert on the right sdr data thresholds", function() {
            samples['Test Threshold'] = { value: 'nr', type: 'threshold' };
            var data = {
                sdr: samples
            };
            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.property('thresholds').with.property('Test Threshold');
                expect(out.thresholds['Test Threshold'])
                    .to.have.property('value').that.equals('nr');
                expect(out.thresholds['Test Threshold'])
                    .to.have.property('type').that.equals('threshold');
                expect(_.keys(out)).to.have.length(1);
            });
        });
    });
});
