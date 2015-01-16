// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */

"use strict";

var di = require('di');
var core = require('renasar-core')(di);

module.exports = {
    injectables: [
        require('./lib/task'),
        require('./lib/jobs'),
        require('./lib/utils'),
    ],
    taskData: core.helper.requireGlob(__dirname + '/lib/task-data/**/*.js')
};

var m = module.exports();
debugger;
