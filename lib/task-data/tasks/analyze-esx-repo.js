// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Analyze Esx Repository',
    injectableName: 'Task.Os.Esx.Analyze.Repo',
    implementsTask: 'Task.Base.Os.Analyze.Repo',
    options: {
        osName: 'esx',
        version: null,
        repo: null
    },
    properties: {}
};
