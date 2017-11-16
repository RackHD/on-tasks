// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

module.exports = {
    friendlyName: "Dell Wsman Delete Volume Xml",
    injectableName: "Task.Dell.Wsman.Delete.Volume.Xml",
    implementsTask: "Task.Base.Dell.Wsman.Delete.Volume.Xml",
    optionsSchema: 'dell-wsman-delete-volume.json',
    options: {
        volumeId: "",
        shutdownType: 0
    },
    properties: {}
};
