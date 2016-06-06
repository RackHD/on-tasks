// Copyright 2015, EMC, Inc.

"use strict";

var di = require('di'),
    _ = require('lodash'),
    core = require('on-core')(di);

module.exports = {
    injectables: _.flattenDeep([
        core.helper.requireWrapper('ssh2', 'ssh', undefined, __dirname),
        require('./lib/task'),
        core.helper.requireGlob(__dirname + '/lib/jobs/*.js'),
        core.helper.requireGlob(__dirname + '/lib/utils/**/*.js'),
        core.helper.requireGlob(__dirname + '/lib/services/*.js'),
        core.helper.simpleWrapper(
            core.helper.requireGlob(__dirname + '/lib/task-data/**/*.js'),
            'Task.taskLibrary'
        )
    ]),
    taskSchemas: core.helper.requireGlob(__dirname + '/lib/task-data/schemas/*.json')
};
