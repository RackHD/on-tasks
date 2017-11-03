// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Get Switch Config',
    injectableName: 'Task.Get.Switch.Config',
    implementsTask: 'Task.Base.Rest.Catalog',
    options: {
        endpoint: '{{options.endpoint}}',
        loginToken: '{{options.loginToken}}',
        url: 'http://{{ server.onNetwork.url }}/switchConfig',
        method: 'POST',
        headers: {'Authorization':'{{options.loginToken}}', 'Content-Type':'application/json'},
        recvTimeoutMs: 360000,
        data:{
            'endpoint': '{{options.endpoint}}'
        },
        source: 'running-config'
    },
    properties: {
        catalog: {
            type: 'running-config'
        }
    }
};
