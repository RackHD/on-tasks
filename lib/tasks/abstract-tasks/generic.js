// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = jsonTaskFactory;
di.annotate(jsonTaskFactory, new di.Provide('Task.Linux.Bootstrapper'));
    di.annotate(jsonTaskFactory,
    new di.Inject(
        'Task.Task',
        'Util',
        'Assert',
        '_',
        di.Injector
    )
);
function jsonTaskFactory(Task, util, assert, _, injector) {
    function TaskBuilder() {
    }

    function GenericTask(taskGraph, options, overrides) {
        GenericTask.super_.call(this, taskGraph, options, overrides);
    }
    util.inheritsAll(GenericTask, Task);

    TaskBuilder.prototype.buildTask = function(taskData) {
        assert.object(taskData);
        assert.string(taskData.job);

        GenericTask.prototype.run = function run() {
            var _taskData = taskData;
            var job = injector.get(_taskData.job);
            assert.ok(job);
            return job(this.options);
        };

        return GenericTask;
    };

    return new TaskBuilder();
}
