// Copyright 2014, Renasar Technologies Inc.
// Created by heckj on 7/10/14.
/* jshint node: true */


'use strict';

var injector;
var stdoutMocks = require('./stdout-helper');

describe("ipmi fru Task Parser", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse `ipmitool fru` output", function (done) {
        var esesCmd = 'sudo ipmitool fru';

        var tasks = [
            {
                cmd: esesCmd,
                stdout: stdoutMocks.ipmiFru,
                stderr: '',
                error: null
            }
        ];

        xmlParser(stdoutMocks.testesesR, function (err, jsonOut) {
            if (err) {
                done(err);
                return;
            }
            var parsePromises = taskParser.parseTasks(tasks);
            parsePromises[0]
                .then(function (result) {
                    expect(result.error).to.be.undefined;
                    expect(_.isEqual(result.data, jsonOut)).to.be.true;
                    expect(result.source).to.equal('test_eses');
                    // data specific format verification
                    expect(result.data.REVISION.exp).to.be.an("Array");
                    expect(result.data.REVISION.exp.length).to.equal(3);
                    _.forEach(result.data.REVISION.exp, function(devicedata) {
                        expect(devicedata).to.be.ok;
                        expect(devicedata.dev).to.be.an('Array');
                    });
                    done();
                });
        });
    });

});


