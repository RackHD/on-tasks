// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Dell Racadm Update Firmware Base',
    injectableName: 'Task.Base.Dell.Racadm.Update.Firmware',
    runJob: 'Job.Dell.RacadmTool',
    requiredOptions: [
        "action"
    ],
    requiredProperties: {},
    properties:{}
};
