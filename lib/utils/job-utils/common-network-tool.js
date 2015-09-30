// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

//var fs = require('fs');

var di = require('di');

module.exports = commonNetowrkToolFactory;
di.annotate(commonNetowrkToolFactory, new di.Provide('JobUtils.CommonNetworkTool'));
di.annotate(commonNetowrkToolFactory, new di.Inject(
    'Promise',
    'ChildProcess'
));

function commonNetowrkToolFactory(
    Promise,
    ChildProcess
) {
    function CommonNetowrkTool() {}

    CommonNetowrkTool.prototype.runCommand = function(command, args) {
        var env = {};
        var maxBuffer = 3000 * 1024;
        var childProcess = new ChildProcess(command, args, env, 1, maxBuffer);
        return childProcess.run();
    };

    CommonNetowrkTool.prototype.ping = function(host) {
        return this.runCommand("/bin/ping", ['-c', '5', host]);
    };

    return CommonNetowrkTool;
}
