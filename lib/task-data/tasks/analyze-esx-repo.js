// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Analyze Esx Repository',
    injectableName: 'Task.Os.Esx.Analyze.Repo',
    implementsTask: 'Task.Base.Os.Analyze.Repo',
    schemaRef: 'analyze-os-repo.json',
    options: {
        osName: 'esx',
        repo: '{{api.server}}/esxi/{{options.version}}'
    },
    properties: {}
};
