// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Get Switch Version',
    injectableName: 'Task.Get.Switch.Version',
    implementsTask: 'Task.Base.Rest.Catalog',
    options: {
        endpoint: '{{options.endpoint}}',
        url: 'http://{{ server.onNetwork.url }}/switchVersion',
        method: 'POST',
        headers: {'Authorization':'Bearer {{ context.restData.body.token }}', 'Content-Type':'application/json'},
        recvTimeoutMs: 360000,
        data:{
            'endpoint': '{{options.endpoint}}'
        },
        source: 'version'
    },
    properties: {
        catalog: {
            type: 'version'
        }
    }
};
