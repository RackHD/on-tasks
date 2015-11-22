// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

// Various data pieced together from EMC and local data and spit out of parseSdrData()
var _samples = [
    {
        sensorId: 'PSU2 Status (0xe1)',
        entityId: '10.2 (Power Supply)',
        sdrType: 'Discrete',
        sensorType: 'Power Supply (0x08)',
        sensorReading: '0h',
        eventMessageControl: 'Per-threshold',
        assertionsEnabled: [
            'Presence detected',
            'Failure detected',
            'Power Supply AC lost'
        ],
        deassertionsEnabled: [
            'Presence detected',
            'Failure detected',
            'Power Supply AC lost'
        ],
        oem: '0'
    },
    {
        sensorId: 'Temp_DIMM_AB (0xac)',
        entityId: '66.1 (Baseboard/Main System Board)',
        sdrType: 'Threshold',
        sensorType: 'Temperature (0x01)',
        sensorReading: '29 (+/- 0) % degrees C',
        status: 'ok',
        upperCritical: '85.000',
        upperNonCritical: '84.000',
        positiveHysteresis: 'Unspecified',
        negativeHysteresis: 'Unspecified',
        minimumSensorRange: 'Unspecified',
        maximumSensorRange: 'Unspecified',
        eventMessageControl: 'Per-threshold',
        readableThresholds: 'unc ucr',
        settableThresholds: 'unc ucr',
        thresholdReadMask: 'unc ucr',
        assertionsEnabled: [ 'unc+ ucr+' ],
        deassertionsEnabled: [ 'unc+ ucr+' ]
    }
];

describe(require('path').basename(__filename), function () {
    var _;
    var samples;
    var waterline = {};
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ipmi-sdr-alert-job.js'),
            helper.require('/lib/jobs/poller-alert-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
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
        var goodDiscreteTestSensor,
        badDiscreteTestSensor,
        goodThresholdTestSensor,
        badThresholdTestSensor,
        data,
        Errors;

        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
            waterline.workitems = {
                needByIdentifier: this.sandbox.stub().resolves(),
                update: this.sandbox.stub().resolves()
            };
            Errors = helper.injector.get('Errors');

            goodDiscreteTestSensor= {
                sensorId: 'good discrete sensor',
                entityId: '10.1 (Power Supply)',
                sdrType: 'Discrete',
                sensorType: 'Power Supply (0x08)',
                sensorReading: '0h',
                eventMessageControl: 'Per-threshold',
                assertionsEnabled: [
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                deassertionsEnabled:[
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                oem: '0'
            };

            badDiscreteTestSensor= {
                sensorId: 'bad discrete sensor',
                entityId: '10.1 (Power Supply)',
                sdrType: 'Discrete',
                sensorType: 'Power Supply (0x08)',
                sensorReading: 'ffh',
                eventMessageControl: 'Per-threshold',
                statesAsserted: [
                    'Power Supply AC lost'
                ],
                assertionsEnabled: [
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                deassertionsEnabled:[
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                oem: '0'
            };

            goodThresholdTestSensor= {
                sensorId: 'good threshold sensor',
                entityId: '66.2 (Baseboard/Main System Board)',
                sdrType: 'Threshold',
                sensorType: 'Temperature (0x01)',
                sensorReading: '65 (+/- 0) % degrees C',
                status: 'ok',
                upperCritical: '85.000',
                upperNonCritical: '84.000',
                positiveHysteresis: 'Unspecified',
                negativeHysteresis: 'Unspecified',
                minimumSensorRange: 'Unspecified',
                maximumSensorRange: 'Unspecified',
                eventMessageControl: 'Per-threshold',
                readableThresholds: 'unc ucr',
                settableThresholds: 'unc ucr',
                thresholdReadMask: 'unc ucr',
                assertionsEnabled: [ 'unc+ ucr+' ],
                deassertionsEnabled: [ 'unc+ ucr+' ]
            }

            badThresholdTestSensor= {
                sensorId: 'bad threshold sensor',
                entityId: '66.2 (Baseboard/Main System Board)',
                sdrType: 'Threshold',
                sensorType: 'Temperature (0x01)',
                sensorReading: '100 (+/- 0) % degrees C',
                status: 'Upper Critical',
                upperCritical: '85.000',
                upperNonCritical: '84.000',
                positiveHysteresis: 'Unspecified',
                negativeHysteresis: 'Unspecified',
                minimumSensorRange: 'Unspecified',
                maximumSensorRange: 'Unspecified',
                eventMessageControl: 'Per-threshold',
                readableThresholds: 'unc ucr',
                settableThresholds: 'unc ucr',
                thresholdReadMask: 'unc ucr',
                assertionsEnabled: [ 'unc+ ucr+' ],
                deassertionsEnabled: [ 'unc+ ucr+' ]
            }


            data = {
                host: 'host',
                user: 'user',
                password: 'pass',
                workItemId: '54d6cdff8db79442ddf33333',
                node: '560022c2c5ac58132c5d3cc5',
                sdr: samples
            };
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it("should alert and update the db when a threshold status becomes not okay", function() {
            var workitem = {
                config: {
                    command: 'sdr'
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {},
                    threshold: {
                        'bad threshold sensor': true
                    }
                }
            };

            data.sdr = samples.concat(badThresholdTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading')
                    .that.equals(badThresholdTestSensor);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(out[0]).to.have.property('inCondition').that.equals(true);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should alert and update the db when a discrete state is asserted", function() {
            var workitem = {
                config: {
                    command: 'sdr'
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'bad discrete sensor': {
                            'Power Supply AC lost': true
                        }
                    },
                    threshold: {}
                }
            };

            var expectedReading = {
                 sensorId: 'bad discrete sensor',
                 entityId: '10.1 (Power Supply)',
                 sdrType: 'Discrete',
                 sensorType: 'Power Supply (0x08)',
                 sensorReading: 'ffh',
                 eventMessageControl: 'Per-threshold',
                 assertionsEnabled: [
                     'Presence detected',
                     'Failure detected',
                     'Power Supply AC lost'
                 ],
                 deassertionsEnabled: [
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                 ],
                 oem: '0',
                 stateAsserted: 'Power Supply AC lost'
            };

            data.sdr = samples.concat(badDiscreteTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading')
                    .that.deep.equals(expectedReading);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(out[0]).to.have.property('inCondition').that.equals(true);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should alert and update the db when multiple discrete states are asserted", function() {
            var workitem = {
                config: {
                    command: 'sdr'
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'bad discrete sensor': {
                            'Power Supply AC lost': true,
                            'Failure detected': true
                        }
                    },
                    threshold: {}
                }
            };

            var expectedReading = {
                 sensorId: 'bad discrete sensor',
                 entityId: '10.1 (Power Supply)',
                 sdrType: 'Discrete',
                 sensorType: 'Power Supply (0x08)',
                 sensorReading: 'ffh',
                 eventMessageControl: 'Per-threshold',
                 assertionsEnabled: [
                     'Presence detected',
                     'Failure detected',
                     'Power Supply AC lost'
                 ],
                 deassertionsEnabled: [
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                 ],
                 oem: '0',
                 stateAsserted: ''
            };
            var expectedStateAsserted = ['Power Supply AC lost', 'Failure detected'];

            badDiscreteTestSensor.statesAsserted.push('Failure detected')
            data.sdr = samples.concat(badDiscreteTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(2);
                for (var i in out) {
                    expectedReading.stateAsserted = expectedStateAsserted[i];
                    expect(out[i]).to.have.property('reading')
                        .that.deep.equals(expectedReading);
                    expect(out[i]).to.have.property('host').that.equals(data.host);
                    expect(out[i]).to.have.property('node').that.equals(data.node);
                    expect(out[i]).to.have.property('inCondition').that.equals(true);
                }
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf })
            });
        });

        it("should alert and update the db when multiple discrete states are asserted and one is deasserted", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {
                            'bad discrete sensor': {
                                'Power Supply AC lost': true,
                                'Failure detected': true
                            }
                        },
                        threshold: {}
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'bad discrete sensor': {
                            'Power Supply AC lost': true,
                            'Failure detected': false
                        }
                    },
                    threshold: {}
                }
            };

            var expectedReading = [
                {
                     sensorId: 'bad discrete sensor',
                     entityId: '10.1 (Power Supply)',
                     sdrType: 'Discrete',
                     sensorType: 'Power Supply (0x08)',
                     sensorReading: 'ffh',
                     eventMessageControl: 'Per-threshold',
                     assertionsEnabled: [
                         'Presence detected',
                         'Failure detected',
                         'Power Supply AC lost'
                     ],
                     deassertionsEnabled: [
                        'Presence detected',
                        'Failure detected',
                        'Power Supply AC lost'
                     ],
                     oem: '0',
                     stateAsserted: 'Power Supply AC lost'
                },
                {
                     sensorId: 'bad discrete sensor',
                     entityId: '10.1 (Power Supply)',
                     sdrType: 'Discrete',
                     sensorType: 'Power Supply (0x08)',
                     sensorReading: 'ffh',
                     eventMessageControl: 'Per-threshold',
                     assertionsEnabled: [
                         'Presence detected',
                         'Failure detected',
                         'Power Supply AC lost'
                     ],
                     deassertionsEnabled: [
                        'Presence detected',
                        'Failure detected',
                        'Power Supply AC lost'
                     ],
                     oem: '0',
                     stateAsserted: 'Failure detected'
                },
            ];
            var expectedInCondition = [true, false];
            data.sdr = samples.concat(badDiscreteTestSensor);

            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.length(2);
                for (var i = 0; i < out.length; i++) {
                    expect(out[i]).to.have.property('reading')
                        .that.deep.equals(expectedReading[i]);
                    expect(out[i]).to.have.property('host').that.equals(data.host);
                    expect(out[i]).to.have.property('node').that.equals(data.node);
                    expect(out[i]).to.have.property('inCondition').that.equals(expectedInCondition[i]);
                }
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should alert and update the db when multiple discrete states are deasserted", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {
                            'bad discrete sensor': {
                                'Power Supply AC lost': true,
                                'Failure detected': true
                            }
                        },
                        threshold: {}
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'bad discrete sensor': {
                            'Power Supply AC lost': false,
                            'Failure detected': false
                        }
                    },
                    threshold: {}
                }
            };

            var expectedReading = [
                {
                     sensorId: 'bad discrete sensor',
                     entityId: '10.1 (Power Supply)',
                     sdrType: 'Discrete',
                     sensorType: 'Power Supply (0x08)',
                     sensorReading: 'ffh',
                     eventMessageControl: 'Per-threshold',
                     assertionsEnabled: [
                         'Presence detected',
                         'Failure detected',
                         'Power Supply AC lost'
                     ],
                     deassertionsEnabled: [
                        'Presence detected',
                        'Failure detected',
                        'Power Supply AC lost'
                     ],
                     oem: '0',
                     stateAsserted: 'Power Supply AC lost'
                },
                {
                     sensorId: 'bad discrete sensor',
                     entityId: '10.1 (Power Supply)',
                     sdrType: 'Discrete',
                     sensorType: 'Power Supply (0x08)',
                     sensorReading: 'ffh',
                     eventMessageControl: 'Per-threshold',
                     assertionsEnabled: [
                         'Presence detected',
                         'Failure detected',
                         'Power Supply AC lost'
                     ],
                     deassertionsEnabled: [
                        'Presence detected',
                        'Failure detected',
                        'Power Supply AC lost'
                     ],
                     oem: '0',
                     stateAsserted: 'Failure detected'
                },
            ];
            delete badDiscreteTestSensor.statesAsserted;
            data.sdr = samples.concat(badDiscreteTestSensor);

            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.length(2);
                for (var i in out) {
                    expect(out[i]).to.have.property('reading')
                        .that.deep.equals(expectedReading[i]);
                    expect(out[i]).to.have.property('host').that.equals(data.host);
                    expect(out[i]).to.have.property('node').that.equals(data.node);
                    expect(out[i]).to.have.property('inCondition').that.equals(false);
                }
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf })
            });
        });

        it("should alert and update the db when state assertions change.", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {
                            'bad discrete sensor': {
                                'Power Supply AC lost': true,
                                'Failure detected': true
                            }
                        },
                        threshold: {}
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'bad discrete sensor': {
                            'Power Supply AC lost': true,
                            'Predictive failure': true,
                            'Failure detected': false
                        }
                    },
                    threshold: {}
                }
            };

            var expectedReading = [
                {
                     sensorId: 'bad discrete sensor',
                     entityId: '10.1 (Power Supply)',
                     sdrType: 'Discrete',
                     sensorType: 'Power Supply (0x08)',
                     sensorReading: 'ffh',
                     eventMessageControl: 'Per-threshold',
                     assertionsEnabled: [
                         'Presence detected',
                         'Failure detected',
                         'Power Supply AC lost'
                     ],
                     deassertionsEnabled: [
                        'Presence detected',
                        'Failure detected',
                        'Power Supply AC lost'
                     ],
                     oem: '0',
                     stateAsserted: 'Power Supply AC lost'
                },
                {
                     sensorId: 'bad discrete sensor',
                     entityId: '10.1 (Power Supply)',
                     sdrType: 'Discrete',
                     sensorType: 'Power Supply (0x08)',
                     sensorReading: 'ffh',
                     eventMessageControl: 'Per-threshold',
                     assertionsEnabled: [
                         'Presence detected',
                         'Failure detected',
                         'Power Supply AC lost'
                     ],
                     deassertionsEnabled: [
                        'Presence detected',
                        'Failure detected',
                        'Power Supply AC lost'
                     ],
                     oem: '0',
                     stateAsserted: 'Predictive failure'
                },
                {
                     sensorId: 'bad discrete sensor',
                     entityId: '10.1 (Power Supply)',
                     sdrType: 'Discrete',
                     sensorType: 'Power Supply (0x08)',
                     sensorReading: 'ffh',
                     eventMessageControl: 'Per-threshold',
                     assertionsEnabled: [
                         'Presence detected',
                         'Failure detected',
                         'Power Supply AC lost'
                     ],
                     deassertionsEnabled: [
                        'Presence detected',
                        'Failure detected',
                        'Power Supply AC lost'
                     ],
                     oem: '0',
                     stateAsserted: 'Failure detected'
                },
            ];
            var expectedInCondition = [true, true, false];
            badDiscreteTestSensor.statesAsserted.push('Predictive failure');
            data.sdr = samples.concat(badDiscreteTestSensor);

            return this.determineAlert(data).then(function(out) {
                expect(out).to.have.length(3);
                for (var i = 0; i < out.length; i++) {
                    expect(out[i]).to.have.property('reading')
                        .that.deep.equals(expectedReading[i]);
                    expect(out[i]).to.have.property('host').that.equals(data.host);
                    expect(out[i]).to.have.property('node').that.equals(data.node);
                    expect(out[i]).to.have.property('inCondition').that.equals(expectedInCondition[i]);
                }
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should alert and update the db when a Status becomes okay", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {},
                        threshold: {
                            'good threshold sensor': true
                        }
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {},
                    threshold: {
                        'good threshold sensor': false
                    }
                }
            };

            data.sdr = samples.concat(goodThresholdTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading')
                    .that.equals(goodThresholdTestSensor);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(out[0]).to.have.property('inCondition').that.equals(false);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should alert and update the db when a state is de-asserted", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {
                            'good discrete sensor': {
                                'Power Supply AC lost': true
                            }
                        },
                        threshold: {}
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'good discrete sensor': {
                            'Power Supply AC lost': false
                        }
                    },
                    threshold: {}
                }
            };

            var expectedReading = {
                sensorId: 'good discrete sensor',
                entityId: '10.1 (Power Supply)',
                sdrType: 'Discrete',
                sensorType: 'Power Supply (0x08)',
                sensorReading: '0h',
                eventMessageControl: 'Per-threshold',
                assertionsEnabled: [
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                deassertionsEnabled:[
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                oem: '0',
                stateAsserted: 'Power Supply AC lost'
            };
            data.sdr = samples.concat(goodDiscreteTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading')
                    .that.deep.equals(expectedReading);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(out[0]).to.have.property('inCondition').that.equals(false);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });
        });

        it("should alert if state has not changed", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {},
                        threshold: {
                            'bad threshold sensor': true,
                            'good threshold sensor': false
                        }
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {},
                    threshold: {
                        'bad threshold sensor': true,
                        'good threshold sensor': false
                    }
                }
            };


            data.sdr = samples.concat(goodThresholdTestSensor).concat(badThresholdTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading').that.equals(badThresholdTestSensor);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(out[0]).to.have.property('inCondition').that.equals(true);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });

        });

        it("should not alert if no workitem is found", function() {
            waterline.workitems.needByIdentifier.rejects(new Errors.NotFoundError(
                        "test not found rejection"));
            return this.determineAlert({}).should.become(undefined);
        });

        it('should sanitize data before updating the database', function() {
            var workitem = {
                config: {
                    command: 'sdr'
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);
            data.sdr = [{
                'status': 'ucr',
                'sensorId': 'BB +1.5 P1MEM AB',
                'sdrType': 'Threshold',
                'sensorReading Units': undefined,
                'sensorReading': undefined,
                'normalMaximum': '1.570',
                'sensorType': 'Voltage',
                'upperNonCritical': '1.611',
                'nominalReading': '1.495',
                'entityId': '7.1',
                'entryIdName': 'System Board',
                'lowerNonCritical': '1.387',
                'lowerCritical': '1.339',
                'normalMinimum': '1.421',
                'upperCritical': '1.659'
            }];

            return this.determineAlert(data)
            .then(function(out) {
                expect(waterline.workitems.update.getCall(0).args[1]).to.deep.equal({
                    config: {
                        command: 'sdr',
                        inCondition: {
                            discrete: {},
                            threshold: {
                                'BB +1_5 P1MEM AB': true
                            }
                        }
                    }
                });
            });
        });

        it("should alert if discrete sensor state has not changed", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {
                        'bad discrete sensor': {
                            'Power Supply AC lost': true
                            },
                        'good discrete sensor': {
                                'Power Supply AC lost': false
                            }
                        },
                        threshold: {}
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'bad discrete sensor': {
                            'Power Supply AC lost': true
                            },
                        'good discrete sensor': {
                                'Power Supply AC lost': false
                            }
                    },
                    threshold: {}
                }
            };

            var expectedReading = {
                sensorId: 'bad discrete sensor',
                entityId: '10.1 (Power Supply)',
                sdrType: 'Discrete',
                sensorType: 'Power Supply (0x08)',
                sensorReading: 'ffh',
                eventMessageControl: 'Per-threshold',
                assertionsEnabled: [
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                deassertionsEnabled:[
                    'Presence detected',
                    'Failure detected',
                    'Power Supply AC lost'
                ],
                oem: '0',
                stateAsserted: 'Power Supply AC lost'
            };
            data.sdr = samples.concat(goodDiscreteTestSensor).concat(badDiscreteTestSensor);

            return this.determineAlert(data)
            .then(function(out) {
                expect(out).to.have.length(1);
                expect(out[0]).to.have.property('reading').that.deep.equals(expectedReading);
                expect(out[0]).to.have.property('host').that.equals(data.host);
                expect(out[0]).to.have.property('node').that.equals(data.node);
                expect(out[0]).to.have.property('inCondition').that.equals(true);
                expect(waterline.workitems.update).to.have.been
                    .calledWith({ id: data.workItemId }, { config: conf });
            });

        });

        it("should not alert if bad discrete sensor state has become okay", function() {
            var workitem = {
                config: {
                    command: 'sdr',
                    inCondition: {
                        discrete: {
                            'good discrete sensor': {
                                'Power Supply AC lost': false
                            }
                        },
                        threshold: {}
                    }
                }
            };
            waterline.workitems.needByIdentifier.resolves(workitem);

            var conf = {
                command: 'sdr',
                inCondition: {
                    discrete: {
                        'good discrete sensor': {
                            'Power Supply AC lost': false
                        }
                    },
                    threshold: {}
                }
            };


            data.sdr = samples.concat(goodDiscreteTestSensor);

            return this.determineAlert(data)
                .then(function(out) {
                    expect(waterline.workitems.update).to.have.been
                        .calledWith({ id: data.workItemId }, { config: conf });
                });

        });

    });
});
