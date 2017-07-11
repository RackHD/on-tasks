// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Set Interfaces',
    injectableName: 'Task.Set.Interfaces',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        commands: [
            {
                command: 'sudo python set_interfaces.py',
                downloadUrl: '{{ api.templates }}/set_interfaces.py?nodeId={{ task.nodeId }}'
            }
        ]
    },
    properties: {
        os: {
            linux: {
                type: 'microkernel'
            }
        }
    }
};

