// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-task-data-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require(
            '/lib/task-data/base-tasks/redfish-discovery.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});
