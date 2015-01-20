// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe(__filename, function () {
    var base = require('./base-task-data-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/base-tasks/noop-task.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});