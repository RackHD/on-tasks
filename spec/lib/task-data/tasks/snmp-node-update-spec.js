// Copyright 2015, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-tasks-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/tasks/snmp-node-update.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});
