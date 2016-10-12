// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog Ip',
    injectableName: 'Task.Ssh.Catalog.Ip',
    implementsTask: 'Task.Base.Ssh',
    schemaRef: 'linux-catalog.json',
    options: {
        commands: [
            {
                "command": "sudo ip -d addr show; sudo ip -d link show",
                "catalog": {"source": "ip"}
            }
        ]
    },
    properties: {}
};
