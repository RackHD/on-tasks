// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-tasks-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require(
            '/lib/task-data/tasks/dell-wsman-add-hotspare-updatexml.js'
        );
    });

    describe('task-data', function () {
        base.examples();
    });
});
