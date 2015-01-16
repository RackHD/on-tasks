// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

"use strict";

var di = require('di'),
    _ = require('lodash'),
    core = require('renasar-core')(di);

module.exports = {
    injectables: _.flatten([
        require('./lib/task'),
        core.helper.requireGlob(__dirname + '/lib/jobs/*.js'),
        core.helper.requireGlob(__dirname + '/lib/utils/*.js'),
    ]),
    taskData: core.helper.requireGlob(__dirname + '/lib/task-data/**/*.js')
};
