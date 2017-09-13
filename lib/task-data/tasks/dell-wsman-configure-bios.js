// Copyright 2017, Dell, Inc.

'use strict';

module.exports = {
    friendlyName: "Dell Wsman Configure Bios",
    injectableName: "Task.Dell.Wsman.ConfigureBios",
    implementsTask: "Task.Base.Dell.Wsman.ConfigureBios",
    options: {
        serverIP: null,
        serverUsername: null,
        serverPassword: null,
        attributes: null,
        biosBootSequenceOrder: null,
        hddSequenceOrder: null,
        enableBootDevices: null,
        disableBootDevices: null,
        rebootJobType: null,
        scheduledStartTime: null,
        untilTime: null
    },
    properties: {}
};