// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Node shell reboot',
    injectableName: 'Task.Base.ShellReboot',
    runJob: 'Job.Linux.ShellReboot',
    requiredOptions: [
        'rebootCode'
    ],
    requiredProperties: {
        'os.linux.type': 'microkernel'
    },
    properties: {}
};
