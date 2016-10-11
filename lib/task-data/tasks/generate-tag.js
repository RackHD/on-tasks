// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Generate Tag',
    injectableName: 'Task.Catalog.GenerateTag',
    implementsTask: 'Task.Base.Catalog.GenerateTag',
    schemaRef: 'generate-tag.json',
    options: {
        nodeIds: []
    },
    properties: {}
};
