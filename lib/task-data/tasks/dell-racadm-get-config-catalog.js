// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell racadm get config catalog',
    injectableName: 'Task.Dell.Racadm.GetConfigCatalog',
    implementsTask: 'Task.Base.Dell.Racadm.Catalog',
    options: {
        action: 'getConfigCatalog'
    },
    properties: {}
};
