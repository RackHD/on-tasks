// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Flash Quanta BMC',
    injectableName: 'Task.Linux.Flash.Quanta.Bmc',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        file: null,
        downloadDir: '/opt/downloads',
        commands: [
            // Backup files
            'sudo /opt/socflash/socflash_x64 -b /opt/uploads/bmc-backup.bin',
            'sudo curl -T /opt/uploads/bmc-backup.bin ' +
                '{{ api.files }}/{{ task.nodeId }}-bmc-backup.bin',
            // Flash files
            'sudo /opt/socflash/socflash_x64 -s option=x ' +
                'flashtype=2 if={{ options.downloadDir }}/{{ options.file }}',
        ]
    },
    properties: {
        flash: {
            type: 'bmc',
            vendor: {
                quanta: { }
            }
        }
    }
};
