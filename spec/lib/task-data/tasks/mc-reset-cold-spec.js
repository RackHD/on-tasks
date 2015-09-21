// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('MC Reset Cold', function () {
    var base = require('./base-tasks-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/tasks/mc-reset-cold.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});
