// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

module.exports = {
    friendlyName: "Dell Wsman GetComponent for delete volume",
    injectableName: "Task.Dell.Wsman.Delete.Volume.getComponent",
    implementsTask: "Task.Base.Dell.Wsman.getComponent",
    optionsSchema: 'dell-wsman-delete-volume.json',
    options: {
        volumeId: "",
        shutdownType: 0
    },
    properties: {}
};
