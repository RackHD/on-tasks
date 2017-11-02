// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {

    friendlyName: 'Post Update Switch Firmware',
    injectableName: 'Task.Post.Update.Switch',
    implementsTask: 'Task.Base.Rest',
    options: {
        endpoint: '{{options.endpoint}}',
        switchModel: '{{options.switchModel}}',
        firmwareImages:'{{options.firmwareImages}}',

        url: 'http://{{ server.onNetwork.url }}/updateSwitch',
        method: 'POST',
        headers: {'Authorization':'Bearer {{ context.restData.body.token }}', 'Content-Type':'application/json'},
        recvTimeoutMs: 360000,
        data:{
            'endpoint': '{{options.endpoint}}',
            'firmwareImages':'{{options.firmwareImages}}',
            'switchModel': '{{options.switchModel}}'
        }
    },
    properties: {}

};

