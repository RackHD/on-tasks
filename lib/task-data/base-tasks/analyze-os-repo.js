// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Analyze OS Repository',
    injectableName: 'Task.Base.Os.Analyze.Repo',
    runJob: 'Job.Os.Analyze.Repo',
    optionsSchema: {
        properties: {
            version: {
                '$ref': 'types-installos.json#/definitions/Version'
            },
            repo: {
                '$ref': 'types-installos.json#/definitions/Repo'
            },
            osName: {
                'enum': ['ESXi']
            }
        },
        required: ['osName', 'repo', 'version']
    },
    requiredProperties: {
    },
    properties: {
    }
};
