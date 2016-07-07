// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'noop',
    implementsTask: 'Task.Base.noop',
    injectableName: 'Task.noop',
    schemaRef: 'rackhd/schemas/v1/tasks/noop-task',
    options: {
        option1: 1,
        option2: 2,
        option3: 3,
        delay: 0
    },
    properties: {
        noop: {
            foo: 'bar'
        }
    }
};
