// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("Common network command parser", function () {
    var commandData;
    var parser;

    before('common network command parser before', function () {
        commandData = require('./stdout-helper').ping;
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/common-network-parser.js')
        ]);

        parser = helper.injector.get('JobUtils.CommonNetworkCommandParser');
    });

    it("should parse ping output data", function () {
        var output = parser.parsePingData(commandData);
        expect(output).to.deep.equal(
            { 'packet loss': '0%' }
        );
    });
});
