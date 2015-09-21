// Copyright 2015, EMC, Inc.
/* jshint: node:true */

"use strict";

var di = require('di'),
    _ = require('lodash'),
    core = require('on-core')(di);

module.exports = {
    injectables: _.flatten([
        require('./lib/task'),
        core.helper.requireGlob(__dirname + '/lib/jobs/*.js'),
        core.helper.requireGlob(__dirname + '/lib/utils/**/*.js'),
        core.helper.requireGlob(__dirname + '/lib/services/*.js')
    ]),
    taskData: core.helper.requireGlob(__dirname + '/lib/task-data/**/*.js')
};
