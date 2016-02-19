// Copyright 2015, EMC, Inc.

/* jshint node: true */

'use strict';

describe("ipmi fru Task Parser", function () {
    var stdoutMocks;
    var taskParser;

    before('fru task parser before', function () {
        this.timeout(5000);
        stdoutMocks = require('./stdout-helper');
        // create a child injector with on-core and the base pieces we need to test this
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

        return taskParser.parseTasks(tasks)
        .spread(function (result) {
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


