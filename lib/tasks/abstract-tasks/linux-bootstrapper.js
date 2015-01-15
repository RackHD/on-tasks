// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Task.Linux.Bootstrapper'));
    di.annotate(factory,
    new di.Inject(
        'Task.Task',
        'Task.Jobs.BootstrapLinux',
        'Util'
    )
);
function factory(Task, bootstrapLinux, util) {
    function LinuxBootstrapTask(taskGraph, options, overrides) {
        LinuxBootstrapTask.super_.call(this, taskGraph, options, overrides);
    }
    util.inheritsAll(LinuxBootstrapTask, Task);

    LinuxBootstrapTask.requiredOptions = [
        'kernel',
        'initrd',
        'basefs',
        'overlayfs'
    ];

    LinuxBootstrapTask.properties = {
        os: {
            'linux': {
                type: 'microkernel'
            }
        }
    };

    LinuxBootstrapTask.prototype.run = function() {
        return bootstrapLinux(this.options);
    };

    return LinuxBootstrapTask;
}
