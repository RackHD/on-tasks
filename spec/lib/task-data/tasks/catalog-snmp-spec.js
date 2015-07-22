'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-tasks-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/tasks/catalog-snmp.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});
