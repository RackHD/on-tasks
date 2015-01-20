// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe(__filename, function () {
    var base = require('./base-tasks-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/tasks/catalog-bmc.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});