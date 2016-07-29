// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Check if Node is a VM',
    injectableName: 'Task.Check.VM',
    implementsTask: 'Task.Base.Check.VM',
    options: {
        rebootifNotVM: true
    },
    properties: {}
};
