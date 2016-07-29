// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Check if Node is a VM',
    injectableName: 'Task.Base.Check.VM',
    runJob: 'Job.VM.Check',
    requiredOptions: [
        "rebootifNotVM"
    ],
    requiredProperties: {},
    properties: {}
};
