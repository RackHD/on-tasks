// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function () {
    var base = require('./base-spec');

    // mock up the ChildProcess injectable to capture calls before they go to a local shell
    var mockChildProcessFactory = function() {
        //var logger = Logger.initialize(mockChildProcessFactory);
        function MockChildProcess() {}
        MockChildProcess.prototype.run = function run (command, args) {
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

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.di.simpleWrapper(mockChildProcessFactory, 'ChildProcess'),
            helper.di.simpleWrapper(mockWaterlineFactory, 'Services.Waterline'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/obm-control.js')
        ]);

        context.Jobclass = helper.injector.get('Job.Obm.Node');
        context.Jobclass.prototype._subscribeActiveTaskExists = sinon.stub().resolves();
    });

    describe('Base', function () {
        base.examples();
    });

    describe("poweron-node-job", function(done) {
        var options = {
            action: 'powerOn',
            obmServiceName: 'noop-obm-service'
        };

        it('invoke a run function', function() {
            //this.timeout(60000);
            var job = new this.Jobclass(options, { target: '123456' }, uuid.v4());
            job.on('done', function() {
                done();
            });
            job.run();
        });
        it('invoke a cancel function', function(done) {
            var job = new this.Jobclass(options, { target: '123456' }, uuid.v4());
            job.on('done', function() {
                done();
            });
            job.cancel();
        });
    });

});
