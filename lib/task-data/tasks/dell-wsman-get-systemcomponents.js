// Copyright 2017, Dell, Inc.

'use strict';

module.exports = {
    friendlyName: "Dell Wsman Get System Configuration Components",
    injectableName: "Task.Dell.Wsman.GetSystemConfigComponents",
    implementsTask: "Task.Base.Dell.Wsman.GetSystemConfigComponents",
    options: {
        serverIP:null,
        serverUsername:null,
        serverPassword:null,
        shareType:null,
        shareAddress:null,
        shareName:null,
        fileName:null,
        shutdownType: null,
        componentNames: null
    },
    properties: {}
};