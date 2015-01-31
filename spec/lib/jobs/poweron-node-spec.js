// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe(__filename, function () {

    var injector;
    var base = require('./base-spec');
    var Q = helper.baseInjector.get('Q');
    var uuid = helper.baseInjector.get('uuid');
    var _ = helper.baseInjector.get('_');

    // mock up the ChildProcess injectable to capture calls before they go to a local shell
    var mockChildProcessFactory = function(Logger) {
        var logger = Logger.initialize(mockChildProcessFactory);
        function MockChildProcess() {}
        MockChildProcess.prototype.run = function run (command, args, env, code) {
            // logger.info("CHILD PROCESS MOCK!");
            // logger.info("command: "+command);
            // logger.info("args: "+args);
            // logger.info("env: "+env);
            // logger.info("code: "+code);
            if ((command === 'ipmitool') && _.contains(args, 'status')) {
                // power status call, return a "success"
                return Q.resolve({
                    stdout: 'Chassis Power is on'
                });
            }
        };
        return MockChildProcess;
    };
    helper.di.annotate(mockChildProcessFactory, new helper.di.Provide('ChildProcess'));
    helper.di.annotate(mockChildProcessFactory, new helper.di.Inject('Logger'));

    // mock up the Services.Waterline injectable to subvert model lookups for our tests
    var mockWaterlineFactory = function() {
        function MockWaterline() {}
        MockWaterline.prototype.nodes = {};
        MockWaterline.prototype.nodes.findByIdentifier = function (nodeId) {
                //return instance of a node with settings in it...
                return Q.resolve({
                    obmSettings: [
                        {
                            service: 'ipmi-obm-service',
                            config: {
                                'user': 'ADMIN',
                                'password': 'ADMIN',
                                'host': '192.192.192.192'
                            }
                        }
                    ],
                    id: nodeId
                });
        };
        return new MockWaterline();
    };
    helper.di.annotate(mockWaterlineFactory, new helper.di.Provide('Services.Waterline'));

    base.before(function (context) {
        var _ = helper.baseInjector.get('_');
        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            mockChildProcessFactory,
            mockWaterlineFactory,
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/obm-control.js')
        ]));

        context.Jobclass = injector.get('Job.Obm.Node');
    });

    describe('Base', function () {
        base.examples();
    });

    describe("poweron-node-job", function(done) {
        it('invoke a run function', function() {
            //this.timeout(60000);
            var job = new this.Jobclass({ action: 'powerOn' }, { target: '123456' }, uuid.v4());
            job.on('done', function() {
                done();
            });
            job.run();
        });
        it('invoke a cancel function', function(done) {
            var job = new this.Jobclass({ action: 'powerOn' }, { target: '123456' }, uuid.v4());
            job.on('done', function() {
                done();
            });
            job.cancel();
        });
    });

});
