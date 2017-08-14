// Copyright 2017, Dell EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-tasks-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/tasks/redfish-ip-range-discovery.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});
