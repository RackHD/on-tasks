// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell racadm get config catalog',
    injectableName: 'Task.Dell.Racadm.Get.Config.Catalog',
    implementsTask: 'Task.Base.Dell.Racadm.Get.Config.Catalog',
    options: {
        serverUsername: null,
        serverPassword: null,
        serverFilePath: null
    },
    properties: {}
};
