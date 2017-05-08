// Copyright 2016, Dell, Inc.

'use strict';

module.exports = {
    friendlyName: "Wsman Client Bios",
    injectableName: "Task.Dell.Wsman.GetBios",
    implementsTask: "Task.Base.Dell.Wsman.GetBios",
    options: {
    	target: null,
    	verifySSL: false,
    	domain: 'wsman'
    },
    properties: {}
};
