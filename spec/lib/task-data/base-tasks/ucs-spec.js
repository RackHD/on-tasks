// Copyright 2017, Dell EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-task-data-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require(
            '/lib/task-data/base-tasks/ucs.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});
