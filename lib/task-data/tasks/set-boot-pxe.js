// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Set Node Pxeboot',
    injectableName: 'Task.Obm.Node.PxeBoot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'setBootPxe',
        obmServiceName: 'ipmi-obm-service'
    },
    properties: {
        power: {}
    }
};
