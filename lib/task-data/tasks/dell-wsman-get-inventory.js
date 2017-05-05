// Copyright 2016, Dell, Inc.

'use strict';

module.exports = {
    friendlyName: "Wsman Client Inventory",
    injectableName: "Task.Dell.Wsman.GetInventory",
    implementsTask: "Task.Base.Dell.Wsman.GetInventory",
    options: {
    	callback: false,
    	verifySSL: false,
    	_taskTimeout: 900000,
    	domain: 'wsman'
    },
    properties: {}
};
