// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: "General Redfish Client Catalog",
    injectableName: "Task.General.Redfish.Catalog",
    implementsTask: "Task.Base.General.Redfish.Catalog",
    options: {},
    properties: {
        catalog: {
            type: 'redfish'
        }
    }
};
