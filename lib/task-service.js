// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Services.Task'));
di.annotate(factory, new di.Inject(
    'TaskOption.Validator'
));

function factory(validator) {
    function TaskService() {}

    TaskService.prototype.start = function() {
        return validator.register();
    };

    TaskService.prototype.stop = function() {
        return validator.reset();
    };

    return new TaskService();
}
