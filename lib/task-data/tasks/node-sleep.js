// Copyright 2017, Dell EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Node sleep',
    injectableName: 'Task.Node.Sleep',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        duration: 10000, //in milliseconds
        commands: ['sudo sleep $(awk "BEGIN{print {{options.duration}}/1000}")']
    },
    properties: {}
};
