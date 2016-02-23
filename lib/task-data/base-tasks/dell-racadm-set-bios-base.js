// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Dell Racadm',
    injectableName: 'Task.Base.Dell.Racadm.SetBIOS',
    runJob: 'Job.DellRacadm.SetBIOS',
    requiredOptions: [
        "username",
        "password",
        "filePath"
    ],
    requiredProperties: {},
    properties:{}
};

