// Copyright 2015, EMC, Inc.

"use strict";

var di = require('di'),
    _ = require('lodash'),
    core = require('on-core')(di);

module.exports = {
    injectables: _.flattenDeep([
        require('./lib/task'),
        core.helper.requireGlob(__dirname + '/lib/jobs/*.js'),
        core.helper.requireGlob(__dirname + '/lib/utils/**/*.js'),
        core.helper.requireGlob(__dirname + '/lib/services/*.js'),
        core.helper.simpleWrapper(
            core.helper.requireGlob(__dirname + '/lib/task-data/**/*.js'),
            'Task.taskLibrary'
        )
    ])
};
