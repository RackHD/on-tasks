// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Create IPMI OBM settings',
    injectableName: 'Task.Obm.Ipmi.CreateSettings',
    implementsTask: 'Task.Base.Obm.Ipmi.CreateSettings',
    options: {
        ipmichannel: null,
        user: "monorail",
        password: "monorail"
    },
    properties: {}
};
