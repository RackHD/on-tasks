// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

var _ = require('lodash');

function literalCompare(objA, objB) {
    _.forEach(objA, function(v, k) {
        if (typeof v === 'object' && !(v instanceof Date)) {
            literalCompare(v, objB[k]);
        } else {
            expect(v).to.deep.equal(objB[k]);
        }
    });
}

// The only values currently that won't compare accurately from JSON to
// object are Date objects, so do some manual conversion there.
function deserializeJson(json) {
    _.forEach(json.stats, function(v, k) {
        if (v) {
            json.stats[k] = new Date(v);
        }
    });
}

describe("Task", function () {
    before(function() {
        this.timeout(5000);
        var taskModule = helper.require('/index');
        this.injector = helper.baseInjector.createChild(
            _.flatten([
                taskModule.injectables
            ])
        );
        this.Task = this.injector.get('Task.Task');
        this.taskData = taskModule.taskData;
    });

    describe("serialization", function() {
        var noopTask, baseNoopTask, noopDefinition;

        before(function() {
            _.forEach(this.taskData, function(definition) {
                if (definition.injectableName === 'Task.noop') {
                    noopTask = definition;
                } else if (definition.injectableName === 'Task.Base.noop') {
                    baseNoopTask = definition;
                }
            });

            expect(noopTask).to.not.be.empty;
            expect(baseNoopTask).to.not.be.empty;

            noopDefinition = _.merge(noopTask, baseNoopTask);
        });

        it("should serialize to a JSON object", function() {
            var task = this.Task.create(noopDefinition, {}, {});
            expect(task).to.have.property('serialize');

            literalCompare(task, task.serialize());
        });

        it("should serialize to a JSON string", function() {
            var taskJson;
            var task = this.Task.create(noopDefinition, {}, {});

            expect(task).to.have.property('serialize');
            expect(function() {
                taskJson = JSON.stringify(task);
            }).to.not.throw(Error);

            var parsed = JSON.parse(taskJson);

            deserializeJson(parsed);

            literalCompare(task, parsed);
        });
    });
});
