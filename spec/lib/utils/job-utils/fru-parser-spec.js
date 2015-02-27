// Copyright 2014, Renasar Technologies Inc.
// Created by heckj on 7/10/14.
/* jshint node: true */

'use strict';

describe("ipmi fru Task Parser", function () {
    var stdoutMocks = require('./stdout-helper');
    var taskParser;

    before(function () {
        // create a child injector with renasar-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]);

        taskParser = helper.injector.get('JobUtils.CommandParser');

    });

    it("should parse `ipmitool fru` output", function () {
        var esesCmd = 'sudo ipmitool fru';

        var tasks = [
            {
                cmd: esesCmd,
                stdout: stdoutMocks.ipmiFru,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        return parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.data).to.be.ok;
                //console.log(result.data);
                expect(_.size(result.data)).to.equal(3);
                expect(result.data.AST2300).to.be.an.Object;
                expect(result.data.AST2300['Chassis Serial']).to.equal('QTFCEV4120280');
                expect(result.source).to.equal('ipmi-fru');
            });
    });
});


