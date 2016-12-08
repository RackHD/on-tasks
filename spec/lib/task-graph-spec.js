// Copyright 2016, EMC, Inc.
'use strict';

describe('Task Graph', function () {
    var TaskGraph;
    var store;
    var getDefinitions;
    var definitions;
    var Task;
    var taskLibrary;
    var Promise;
    var Constants;
    var messenger;
    var uuid = require('node-uuid');
    var waterline;

    before(function() {
        getDefinitions = require('./test-definitions').get;
        helper.setupInjector([
            helper.require('/lib/task-graph.js'),
            helper.require('/lib/task.js'),
            helper.require('/lib/utils/task-option-validator.js'),
            helper.di.simpleWrapper([], 'Task.taskLibrary'),
            helper.di.simpleWrapper({graphobjects: {findOne: sinon.stub()}}, 'Services.Waterline'),
            helper.di.simpleWrapper({
                getTaskDefinition: sinon.stub().resolves(),
                persistTaskDependencies: sinon.stub().resolves(),
                persistGraphObject: sinon.stub().resolves(),
                publishGraphRecord: sinon.stub().resolves()
            }, 'TaskGraph.Store')
        ]);
        Constants = helper.injector.get('Constants');
        Promise = helper.injector.get('Promise');
        TaskGraph = helper.injector.get('TaskGraph.TaskGraph');
        Task = helper.injector.get('Task.Task');
        taskLibrary = helper.injector.get('Task.taskLibrary');
        store = helper.injector.get('TaskGraph.Store');
        messenger = helper.injector.get('Task.Messenger');
        waterline = helper.injector.get('Services.Waterline');
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach(function() {
        this.sandbox.stub(TaskGraph.prototype, 'renderTasks', function() {
            return this;
        });
        this.sandbox.stub(Task, 'validateDefinition').returns();
        definitions = getDefinitions();
        while (taskLibrary.length) {
            taskLibrary.pop();
        }
        taskLibrary.push(definitions.baseTask);
        taskLibrary.push(definitions.testTask);
        taskLibrary.push(definitions.baseTaskEmpty);
    });

    afterEach(function() {
        this.sandbox.restore();
        store.getTaskDefinition.reset();
        store.persistTaskDependencies.reset();
        store.persistGraphObject.reset();
    });

    describe('instantiation', function() {
        beforeEach(function() {
            store.getTaskDefinition.resolves(definitions.testTask);
        });

        it('should not modify the definition by reference', function() {
            // Ensure the waitOn properties of the definition object aren't changed, since
            // TaskGraph should clone the object and change the waitOn properties to UUIDs
            // on the clone.
            expect(definitions.graphDefinition.tasks[1].waitOn).to.have.property('test-1');
            return TaskGraph.create(undefined, { definition: definitions.graphDefinition })
            .then(function() {
                expect(definitions.graphDefinition.tasks[1].waitOn).to.have.property('test-1');
            });
        });

        it('should use the default domain', function() {
            return TaskGraph.create(undefined, { definition: definitions.graphDefinition })
            .then(function(graph) {
                expect(graph.domain).to.equal(Constants.Task.DefaultDomain);
            });
        });

        it('should use an instanceId override in options', function() {
            return TaskGraph.create('domain', {
                definition: definitions.graphDefinition,
                options: { instanceId: 'testid' }
            })
            .then(function(graph) {
                expect(graph.instanceId).to.equal('testid');
            });
        });

        it('should have a node property when context.target exists', function() {
            var definitions = getDefinitions();
            return TaskGraph.create('domain', {
                definition: definitions.graphDefinition,
                context: { target: 'testnode' }
            })
            .then(function(graph) {
                expect(graph).to.have.property('node').that.equals('testnode');
            });
        });

        it('should have a node property when definition.options.nodeId exists', function() {
            var definitions = getDefinitions();
            return TaskGraph.create('domain', {
                definition: definitions.graphDefinition,
                options: { nodeId: 'testnode' }
            })
            .then(function(graph) {
                expect(graph).to.have.property('node').that.equals('testnode');
            });
        });

        it('should create a graph with an inline task definition', function() {
            return TaskGraph.create('domain', { definition: definitions.graphDefinitionInline })
            .then(function(graph) {
                expect(graph).to.be.okay;
            });
        });
    });

    describe('Validation', function() {
        beforeEach(function() {
            store.getTaskDefinition.resolves(definitions.testTask);
        });

        it('should return this', function() {
            return TaskGraph.create('domain', { definition: definitions.graphDefinition })
            .then(function(graph) {
                expect(graph).to.be.an.instanceof(TaskGraph);
            });
        });

        it('should fail on an invalid task definition', function() {
            this.sandbox.stub(TaskGraph.prototype, '_validateTaskDefinition')
                .throws(new Error('test'));
            var p1 = expect(TaskGraph.create('domain', { definition: definitions.graphDefinition }))
                .to.be.rejectedWith(/test/);
            var p2 = expect(TaskGraph.create('domain',
                    { definition: definitions.graphDefinitionInline }))
                .to.be.rejectedWith(/test/);
            return Promise.all([p1, p2]);
        });

        it('should fail on invalid task properties', function() {
            this.sandbox.stub(TaskGraph.prototype, '_validateProperties')
                .throws(new Error('test'));
            var p1 = expect(TaskGraph.create('domain', { definition: definitions.graphDefinition }))
                .to.be.rejectedWith(/test/);
            var p2 = expect(TaskGraph.create('domain',
                    { definition: definitions.graphDefinitionInline }))
                .to.be.rejectedWith(/test/);
            return Promise.all([p1, p2]);
        });

        it('should fail on invalid task options', function() {
            this.sandbox.stub(TaskGraph.prototype, '_validateOptions')
                .throws(new Error('test'));
            var p1 = expect(TaskGraph.create('domain', { definition: definitions.graphDefinition }))
                .to.be.rejectedWith(/test/);
            var p2 = expect(TaskGraph.create('domain',
                    { definition: definitions.graphDefinitionInline }))
                .to.be.rejectedWith(/test/);
            return Promise.all([p1, p2]);
        });

        it('should not fail option validation on falsey option values', function() {
            definitions.testTask.options.option1 = 0;
            definitions.graphDefinitionInline.tasks[0].taskDefinition.options.option1 = 0;

            return Promise.all([
                expect(TaskGraph.create('domain',
                        { definition: definitions.graphDefinition })).to.be.fulfilled,
                expect(TaskGraph.create('domain',
                    { definition: definitions.graphDefinitionInline })).to.be.fulfilled
            ])
            .then(function() {
                definitions.testTask.options.option1 = false;
                definitions.graphDefinitionInline.tasks[0].taskDefinition.options.option1 = false;

                return Promise.all([
                    expect(TaskGraph.create('domain',
                            { definition: definitions.graphDefinition })).to.be.fulfilled,
                    expect(TaskGraph.create('domain',
                        { definition: definitions.graphDefinitionInline })).to.be.fulfilled
                ]);
            })
            .then(function() {
                definitions.testTask.options.option1 = '';
                definitions.graphDefinitionInline.tasks[0].taskDefinition.options.option1 = '';

                return Promise.all([
                    expect(TaskGraph.create('domain',
                            { definition: definitions.graphDefinition })).to.be.fulfilled,
                    expect(TaskGraph.create('domain',
                        { definition: definitions.graphDefinitionInline })).to.be.fulfilled
                ]);
            });
        });

        it('should fail on task duplicate labels', function() {
            definitions.graphDefinition.tasks.push({
                'label': 'test-duplicate'
            });
            definitions.graphDefinition.tasks.push({
                'label': 'test-duplicate'
            });
            var promise = TaskGraph.create('domain', { definition: definitions.graphDefinition });
            return expect(promise).to.be.rejectedWith(
                /The task label \'test-duplicate\' is used more than once in the graph definition/
            );
        });

        it('should fail on non-existant waitOn task labels', function() {
            definitions.graphDefinition.tasks[1].waitOn.NA = 'succeeded';
            var promise = TaskGraph.create('domain', { definition: definitions.graphDefinition });
            return expect(promise).to.be.rejectedWith('Task to wait on does not exist: NA');
        });

        it('should fail on missing task object keys', function() {
            delete definitions.graphDefinition.tasks[0].taskName;
            var promise = TaskGraph.create('domain', { definition: definitions.graphDefinition });
            return expect(promise).to.be.rejectedWith(
                'All TaskGraph tasks should have either a taskName or taskDefinition property');
        });

        it('should get a base task', function() {
            expect(TaskGraph.prototype._getBaseTask(definitions.testTask))
                .to.deep.equal(definitions.baseTask);
        });

        it('should throw if a base task does not exist', function() {
            definitions.testTask.implementsTask = 'Task.Base.doesNotExist';
            expect(function() {
                TaskGraph.prototype._getBaseTask(definitions.testTask);
            }).to.throw(/Base task definition.*should exist/);
        });

        it('should validate a task definition', function() {
            expect(function() {
                TaskGraph.prototype._validateTaskDefinition(definitions.testTask);
            }).to.not.throw(Error);

            _.forEach(_.keys(definitions.testTask), function(key) {
                expect(function() {
                    var _definition = _.omit(definitions.testTask, key);
                    TaskGraph.prototype._validateTaskDefinition(_definition);
                }).to.throw(Error);
            });

            _.forEach(_.keys(definitions.testTask), function(key) {
                expect(function() {
                    var _definition = _.cloneDeep(definitions.testTask);
                    // Assert bad types, we won't expect any of our values to be functions
                    _definition[key] = function() {};
                    TaskGraph.prototype._validateTaskDefinition(_definition);
                }).to.throw(/required/);
            });
        });

        it('should validate task properties', function() {
            taskLibrary.push(definitions.baseTask1);
            taskLibrary.push(definitions.baseTask2);
            taskLibrary.push(definitions.baseTask3);
            taskLibrary.push(definitions.testTask1);
            taskLibrary.push(definitions.testTask2);
            taskLibrary.push(definitions.testTask3);

            var context = {};

            expect(function() {
                TaskGraph.prototype._validateProperties(definitions.testTask1, context);
            }).to.not.throw();

            expect(context).to.have.property('properties')
                .that.deep.equals(definitions.testTask1.properties);

            // baseTask2 adds a bunch of required properties provided by testTask1
            expect(function() {
                TaskGraph.prototype._validateProperties(definitions.testTask2, context);
            }).to.not.throw();

            // baseTask3 adds some of required properties that are not provided
            expect(function() {
                TaskGraph.prototype._validateProperties(definitions.testTask3, context);
            }).to.throw(/expected property \[does\] to be supplied for task/);
        });
    });

    describe('Object Construction', function() {
        it('should populate the dependencies of its tasks', function() {
            return TaskGraph.create('domain', { definition: definitions.graphDefinition })
            .then(function(graph) {
                expect(graph.tasks).to.be.ok;
                expect(_.keys(graph.tasks)).to.have.length(2);

                var taskWithDependencies,
                    taskWithNoDependencies;

                _.forEach(graph.tasks, function(v) {
                    if (_.isEmpty(v.waitingOn)) {
                        taskWithNoDependencies = v;
                    } else {
                        taskWithDependencies = v;
                    }
                });
                expect(taskWithDependencies).to.be.ok;
                expect(taskWithNoDependencies).to.be.ok;

                expect(taskWithDependencies.label).to.be.ok;
                expect(taskWithNoDependencies.label).to.be.ok;

                expect(taskWithDependencies.instanceId).to.be.a.uuid;
                expect(taskWithNoDependencies.instanceId).to.be.a.uuid;

                expect(taskWithNoDependencies.waitingOn).to.be.empty;
                expect(taskWithDependencies.waitingOn).to.have.property(
                    taskWithNoDependencies.instanceId
                ).that.deep.equals(['finished']);
            });
        });

        it('should apply options to a graph', function() {
            var options = {
                defaults: {
                    foo: 'bar'
                }
            };
            return TaskGraph.create('domain', {
                definition: definitions.graphDefinition,
                options: options
            })
            .then(function(graph) {
                expect(graph.definition.options).to.deep.equal(options);
            });
        });

        it('should apply context to a graph', function() {
            var context = {
                target: 'test'
            };
            return TaskGraph.create('domain', {
                definition: definitions.graphDefinition,
                context: context
            })
            .then(function(graph) {
                expect(graph.context).to.deep.equal(context);
            });
        });

        describe('graph level options', function() {
            var firstTask, secondTask, thirdTask, fourthTask, fifthTask;

            beforeEach('Graph level options beforeEach', function() {
                return TaskGraph.create('domain',
                    { definition: definitions.graphDefinitionOptions })
                .then(function(graph) {
                    _.forEach(graph.tasks, function(task) {
                        if (task.options.testName === 'firstTask') {
                            firstTask = task;
                        } else if (task.options.testName === 'secondTask') {
                            secondTask = task;
                        } else if (task.options.testName === 'thirdTask') {
                            thirdTask = task;
                        } else if (task.options.testName === 'fourthTask') {
                            fourthTask = task;
                        } else if (task.options.testName === 'fifthTask') {
                            fifthTask = task;
                        }
                    });
                });
            });

            it('should have tasks with expected keys', function() {
                _.forEach([firstTask, secondTask, thirdTask, fourthTask], function(task) {
                    expect(task).to.have.property('options');
                });
            });

            it('should pass default options only to tasks that require those options', function() {
                expect(firstTask.options).to.have.property('option1').that.equals('same for all');
                expect(firstTask.options).to.have.property('option2').that.equals('same for all');
                expect(firstTask.options).to.have.property('option3').that.equals(3);
                expect(firstTask.options).to.not.have.property('optionNonExistant');
            });

            it('should pass task-specific options and override existing options', function() {
                expect(secondTask.options).to.have.property('option1').that.equals('same for all');
                expect(secondTask.options).to.have.property('option2')
                    .that.equals('overridden default option for test-2');
                expect(secondTask.options).to.have.property('option3').that.equals(3);
                expect(secondTask.options).to.have.property('overrideOption')
                    .that.equals('overridden for test-2');
                expect(secondTask.options).to.not.have.property('optionNonExistant');
            });

            it('should pass options to inline tasks definitions', function() {
                // These aren't in the inline definition, so this asserts that we didn't error
                // out on them being missing from options during the requiredOptions check
                expect(thirdTask.options).to.have.property('option1').that.equals('same for all');
                expect(thirdTask.options).to.have.property('option2').that.equals('same for all');
                // Assert that inline task definitions also work with graph options
                expect(thirdTask.options).to.have.property('option3').that.equals(3);
                expect(thirdTask.options).to.have.property('inlineOptionOverridden')
                    .that.equals('overridden inline option for test-3');
                expect(thirdTask.options).to.not.have.property('optionNonExistant');
            });

            it('should pass in options to a task with no required options', function() {
                expect(fourthTask.options).to.have.property('nonRequiredOption')
                    .that.equals('add an option to an empty base task');
            });

            it('should pass correct options to task definition that has schema', function() {
                expect(fifthTask.options).to.have.property('optionNonExistant')
                    .that.equals('not in any');
                expect(fifthTask.options).to.have.property('option1')
                    .that.equals('same for all');
                expect(fifthTask.options).to.have.property('option2')
                    .that.equals('overidden all');
                expect(fifthTask.options).to.not.have.property('option3');
                expect(fifthTask.options).to.not.have.property('option4');
                expect(fifthTask.options).to.have.property('option5')
                    .that.equals('default value of option 5');
            });
        });
    });

    describe('Task object creation', function() {
        it('should create no dependency objects when waitingOn is empty', function() {
            var obj = TaskGraph.prototype.createTaskDependencyObject(definitions.testTask);
            expect(obj).to.deep.equal([]);
        });

        it('should create a simple task dependency object with array or string types', function() {
            definitions.testTask.waitingOn = {
                'a': 'succeeded',
                'b': ['finished']
            };
            var obj = TaskGraph.prototype.createTaskDependencyObject(definitions.testTask);
            expect(obj).to.have.length(1);
            expect(obj[0]).to.deep.equal({
                'a': 'succeeded',
                'b': 'finished'
            });
        });

        it('should create task dependency branches with OR definitions', function() {
            definitions.testTask.waitingOn = {
                'a': ['succeeded', 'timeout'],
                'b': 'finished'
            };
            var obj = TaskGraph.prototype.createTaskDependencyObject(definitions.testTask);
            expect(obj).to.have.length(2);
            expect(obj[0]).to.deep.equal({
                'a': 'succeeded',
                'b': 'finished'
            });
            expect(obj[1]).to.deep.equal({
                'a': 'timeout',
                'b': 'finished'
            });
        });

        it('should create task dependency branches with many OR definitions', function() {
            definitions.testTask.waitingOn = {
                'a': ['succeeded', 'timeout', 'failed'],
                'b': ['succeeded', 'timeout', 'failed'],
                'c': ['succeeded', 'timeout']
            };
            var obj = TaskGraph.prototype.createTaskDependencyObject(definitions.testTask);
            expect(obj).to.have.length(18);
            var combinations = [
                { a: 'succeeded', b: 'succeeded', c: 'succeeded' },
                { a: 'timeout', b: 'succeeded', c: 'succeeded' },
                { a: 'failed', b: 'succeeded', c: 'succeeded' },
                { a: 'succeeded', b: 'timeout', c: 'succeeded' },
                { a: 'timeout', b: 'timeout', c: 'succeeded' },
                { a: 'failed', b: 'timeout', c: 'succeeded' },
                { a: 'succeeded', b: 'failed', c: 'succeeded' },
                { a: 'timeout', b: 'failed', c: 'succeeded' },
                { a: 'failed', b: 'failed', c: 'succeeded' },
                { a: 'succeeded', b: 'succeeded', c: 'timeout' },
                { a: 'timeout', b: 'succeeded', c: 'timeout' },
                { a: 'failed', b: 'succeeded', c: 'timeout' },
                { a: 'succeeded', b: 'timeout', c: 'timeout' },
                { a: 'timeout', b: 'timeout', c: 'timeout' },
                { a: 'failed', b: 'timeout', c: 'timeout' },
                { a: 'succeeded', b: 'failed', c: 'timeout' },
                { a: 'timeout', b: 'failed', c: 'timeout' },
                { a: 'failed', b: 'failed', c: 'timeout' }
            ];
            _.forEach(_.zip(obj, combinations), function(pair) {
                expect(pair[0]).to.deep.equal(pair[1]);
            });
        });

        it('should create task dependency items', function() {
            return TaskGraph.create('domain', { definition: definitions.graphDefinition })
            .then(function(graph) {
                var items = graph.createTaskDependencyItems();
                expect(items.length).to.equal(2);
                expect(_.has(graph.tasks, items[0].taskId)).to.equal(true);
                expect(_.has(graph.tasks, items[1].taskId)).to.equal(true);
                expect(items[0].ignoreFailure).to.equal(true);
                expect(items[1].ignoreFailure).to.equal(false);
                var noDepsTask = _.find(items, function(item) {
                    return _.isEmpty(item.dependencies);
                });
                var depsTask = _.find(items, function(item) {
                    return !_.isEmpty(item.dependencies);
                });
                expect(noDepsTask).to.be.ok;
                expect(depsTask).to.be.ok;
                expect(depsTask.dependencies).to.have.property(noDepsTask.taskId)
                    .that.equals('finished');
            });
        });
    });

    describe('Persistence', function() {
        before(function() {
            store.persistTaskDependencies.resolves(definitions.testTask);
        });

        it('should persist itself', function() {
            return TaskGraph.create('domain', {
                definition: definitions.graphDefinition
            })
            .then(function(graph) {
                return [graph, graph.persist()];
            })
            .spread(function(graph, _graph) {
                expect(graph).to.equal(_graph);
                expect(store.persistGraphObject).to.have.been.calledOnce;
                expect(store.persistGraphObject).to.have.been.calledWith(graph);
                expect(store.persistTaskDependencies.callCount)
                    .to.equal(_.keys(graph.tasks).length);
                var taskItems = graph.createTaskDependencyItems();
                _.forEach(taskItems, function(item) {
                    expect(store.persistTaskDependencies)
                        .to.have.been.calledWith(item, graph.instanceId);
                });
            });
        });
    });

    describe('Graph progress update', function() {
        var graphId = uuid.v4(),
            taskId = uuid.v4(),
            _progressData,
            progressData,
            graphObject = {
            definition: {friendlyName: 'Test graph'},
            tasks: {}
        };
        
        beforeEach(function() {
            this.sandbox.stub(messenger, 'publishProgressEvent').returns();
            progressData = {
                graphId: graphId,
                graphName: "Test graph",
                progress: {
                    //percentage: "50%",
                    description: "task completed",
                    value: "2",
                    maximum: "4"
                },
                taskProgress: {
                    taskId: taskId,
                    taskName: "test task",
                    progress: {
                        //percentage: "100%",
                        description: "Task completed",
                        value: "100",
                        maximum: "100"
                    }
                }
            };
            _progressData = _.cloneDeep(progressData);
            graphObject.tasks[taskId] = {friendlyName: "test task"};
        });
        
        afterEach(function(){
            waterline.graphobjects.findOne.reset();
            this.sandbox.restore();
        });

        it('should update graph progress normally', function(){
            progressData.progress.percentage = '50%';
            progressData.taskProgress.progress.percentage = 'any';
            waterline.graphobjects.findOne.resolves(graphObject);
            
            return TaskGraph.updateGraphProgress(graphId, progressData)
            .then(function(){
                expect(messenger.publishProgressEvent).to.be.calledOnce;
                expect(messenger.publishProgressEvent).to.be.calledWith(progressData);
                expect(waterline.graphobjects.findOne).to.be.calledOnce;
                expect(waterline.graphobjects.findOne).to.be.calledWith({instanceId: graphId});
            });
        });

        it('should update graph progress and calculate percentage number', function(){
            _progressData = _.omit(_progressData, ['graphName', 'graphId']);
            _progressData.progress.maximum = '3';
            delete _progressData.taskProgress.taskId;
            delete _progressData.taskProgress.taskName;
            progressData.progress.maximum = '3';
            progressData.progress.percentage = '67%';
            progressData.taskProgress.progress.percentage = '100%';
            delete progressData.taskProgress.taskId;
            delete progressData.taskProgress.taskName;
            waterline.graphobjects.findOne.resolves(graphObject);
            
            return TaskGraph.updateGraphProgress(graphId, _progressData)
            .then(function(){
                expect(messenger.publishProgressEvent).to.be.calledOnce;
                expect(messenger.publishProgressEvent).to.be.calledWith(progressData);
                expect(waterline.graphobjects.findOne).to.be.calledOnce;
                expect(waterline.graphobjects.findOne).to.be.calledWith({instanceId: graphId});
            });
        });

        it('should graph progress with percentage Not Available', function(){
            _progressData.progress.maximum = null;
            delete _progressData.taskProgress.taskName;
            progressData.progress.maximum = null;
            progressData.progress.percentage = 'Not Available';
            progressData.taskProgress.progress.percentage = '100%';
            waterline.graphobjects.findOne.resolves(graphObject);
            return TaskGraph.updateGraphProgress(graphId, _progressData)
            .then(function(){
                expect(messenger.publishProgressEvent).to.be.calledOnce;
                expect(messenger.publishProgressEvent).to.be.calledWith(progressData);
                expect(waterline.graphobjects.findOne).to.be.calledOnce;
                expect(waterline.graphobjects.findOne).to.be.calledWith({instanceId: graphId});
            });
        });

        it('should graph progress without taskProgress', function(){
            delete _progressData.taskProgress;
            delete progressData.taskProgress;
            progressData.progress.percentage = '50%';
            waterline.graphobjects.findOne.resolves(graphObject);
            return TaskGraph.updateGraphProgress(graphId, _progressData)
            .then(function(){
                expect(messenger.publishProgressEvent).to.be.calledOnce;
                expect(messenger.publishProgressEvent).to.be.calledWith(progressData);
            });
        });

        it('should graph progress without taskName and graphName', function(){
            delete _progressData.taskProgress.taskName;
            delete _progressData.graphName;
            delete progressData.taskProgress.taskName;
            delete progressData.graphName;
            progressData.progress.percentage = '50%';
            progressData.taskProgress.progress.percentage = '100%';
            waterline.graphobjects.findOne.resolves();
            return TaskGraph.updateGraphProgress(graphId, _progressData)
            .then(function(){
                expect(messenger.publishProgressEvent).to.be.calledOnce;
                expect(messenger.publishProgressEvent).to.be.calledWith(progressData);
            });
        });

    });
});
