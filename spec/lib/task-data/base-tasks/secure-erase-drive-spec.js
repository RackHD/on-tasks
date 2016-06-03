// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-task-data-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/base-tasks/linux-commands.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});
