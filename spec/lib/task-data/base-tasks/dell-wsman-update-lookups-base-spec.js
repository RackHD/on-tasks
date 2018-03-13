// Copyright © 2018 Dell Inc. or its subsidiaries. All Rights Reserved. 

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-task-data-spec');

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/base-tasks/dell-wsman-update-lookups-base.js');
    });

    describe('task-data', function () {
        base.examples();
    });

});

