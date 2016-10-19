// Copyright 2015, EMC, Inc.
/* jshint node:true */
'use strict';

describe("Task", function () {
    var Task;
    var taskData;
    var noopTask;
    var baseNoopTask;
    var noopDefinition;
    var Promise;
    var Constants;
    var taskProtocol = {};
    var waterline;
    var env;
    var Errors;
    var catalogSearch;
    var _;
    var validator;

    function literalCompare(objA, objB) {
        _.forEach(objA, function(v, k) {
            if (_.contains(['renderContext', 'timer'], k)) {
                return;
            }
            if (typeof v === 'object') {
                literalCompare(v, objB[k]);
            } else {
                expect(v).to.deep.equal(objB[k]);
            }
        });
    }

    before('task-spec before', function() {
        this.timeout(5000);
        var taskModule = helper.require('/index');
        helper.setupInjector([
            taskModule.injectables,
            helper.di.simpleWrapper({}, 'Protocol.Events'),
            helper.di.simpleWrapper(taskProtocol, 'Protocol.Task')
        ]);
        Constants = helper.injector.get('Constants');
        Promise = helper.injector.get('Promise');
        var Logger = helper.injector.get('Logger');
        env = helper.injector.get('Services.Environment');
        Logger.prototype.log = sinon.spy();
        Task = helper.injector.get('Task.Task');
        _ = helper.injector.get('_');
        taskData = helper.injector.get('Task.taskLibrary');
        waterline = helper.injector.get('Services.Waterline');
        Errors = helper.injector.get("Errors");
        catalogSearch = helper.injector.get('JobUtils.CatalogSearchHelpers');
        validator = helper.injector.get('TaskOption.Validator');

        _.forEach(taskData, function(definition) {
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

    beforeEach('task-spec beforeEach', function() {
        this.sandbox = sinon.sandbox.create();
        this.sandbox.stub(env, 'get').withArgs('config', {}, ['global']).resolves();
        this.sandbox.stub(Task.prototype, 'getSkuId').resolves();
        this.sandbox.stub(validator, 'validate').returns(true);
        this.sandbox.stub(validator, 'validateContextSkipped').returns(true);
        this.sandbox.stub(validator, 'getSchema').returns({describeJob: 'Job.noop'});
    });

    afterEach('task-spec beforeEach', function() {
        this.sandbox.restore();
    });

    describe("option rendering", function() {
        var definition;

        before(function() {
            definition = _.cloneDeep(noopDefinition);
        });

        beforeEach(function() {
            definition.options = null;
        });

        it("should render definition options", function() {
            definition.options = {
                testRenderVal: 'test rendered',
                toRenderVal: 'val: {{ options.testRenderVal }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderVal).to.equal(
                        'val: ' + definition.options.testRenderVal);
                });
            });
        });

        it("should render options using the '|' helper encapsulated by spaces", function() {
            definition.options = {
                toRenderVal: 'val: {{ options.doesNotExist | DEFAULT }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderVal).to.equal('val: DEFAULT');
                });
            });
        });

        it("should render options using the '||' helper", function() {
            definition.options = {
                toRenderVal: 'val: {{ options.doesNotExist || DEFAULT }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function () {
                    expect(task.options.toRenderVal).to.equal('val: DEFAULT');
                });
            });
        });

        it("should render options using the '|' helper not encapsulated by spaces", function() {
            definition.options = {
                toRenderVal: 'val: {{ options.doesNotExist|DEFAULT }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderVal).to.equal('val: DEFAULT');
                });
            });
        });

        it("should render options with multiple '|' helpers", function() {
            definition.options = {
                toRenderVal: 'val: {{ options.doesNotExist | options.stillNotThere | DEFAULT }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderVal).to.equal('val: DEFAULT');
                });
            });
        });

        it("should render options with multiple '|' helpers, spaces, and newlines", function() {
            definition.options = {
                toRenderVal: 'val: {{ ' +
                'options.doesNotExist | ' +
                'options.stillNotThere | ' +
                'DEFAULT }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderVal).to.equal('val: DEFAULT');
                });
            });
        });

        it("should render values from a nested option definition", function() {
            definition.options = {
                renderOptions: {
                    testRenderVal: 'test rendered'
                },
                toRenderVal: 'val: {{ options.renderOptions.testRenderVal }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderVal)
                        .to.equal('val: ' + definition.options.renderOptions.testRenderVal);
                });
            });
        });

        it("should render values from an array", function() {
            definition.options = {
                testRenderVal1: 'test rendered 1',
                testRenderVal2: 'test rendered 2',
                toRenderVal: [
                    'val1: {{ options.testRenderVal1 }}',
                    'val2: {{ options.testRenderVal2 }}'
                ]
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderVal).to.deep.equal([
                        'val1: ' + definition.options.testRenderVal1,
                        'val2: ' + definition.options.testRenderVal2
                    ]);
                });
            });
        });

        it("should render values within a nested option definition", function() {
            definition.options = {
                testRenderVal1: 'test rendered 1',
                testRenderVal2: 'test rendered 2',
                toRenderObject: {
                    toRenderArray: [
                        'val1: {{ options.testRenderVal1 }}',
                        'val2: {{ options.testRenderVal2 }}'
                    ],
                    toRenderVal: {
                        toRenderValNested: '{{ options.testRenderVal1 }}'
                    }
                }
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.toRenderObject.toRenderArray).to.deep.equal([
                        'val1: ' + definition.options.testRenderVal1,
                        'val2: ' + definition.options.testRenderVal2
                    ]);
                    expect(task.options.toRenderObject.toRenderVal.toRenderValNested)
                        .to.equal(definition.options.testRenderVal1);
                });
            });
        });

        it("should render own instance values", function() {
            var test = this;
            definition.options = {
                instanceId: '{{ task.instanceId }}',
                nodeId: '{{ task.nodeId }}'
            };
            return Task.create(definition, {}, { target: 'testnodeid' })
            .then(function(task) {
                var subscription = {dispose: test.sandbox.stub()};
                taskProtocol.subscribeActiveTaskExists = test.sandbox.stub().resolves(subscription);
                return task.run().then(function() {
                    expect(task.options.instanceId).to.be.ok.and.to.equal(task.instanceId);
                    expect(task.options.nodeId).to.be.ok.and.to.equal(task.nodeId);
                });
            });
        });

        it("should defer context rendering if compileOnly is true", function() {
            definition.options = {
                bar: 'baz',
                testRenderVal1: '{{ context.foo }}',
                testRenderVal2: '{{ options.bar }} - {{ context.foo }}',
                testRenderVal3: '{{ context.foo }} - {{ options.bar }}',
                testRenderVal4: '{{ context.foo }} - {{ options.bar }} - {{ context.foo }}',
                testRenderVal5: '{{ context.foo || options.bar }}',
                testRenderVal6: '{{ options.testRenderVal1 }}',
                testRenderVal7: '{{ options.testRenderVal4 }}',
            };

            return Task.create(definition, { compileOnly: true }, {})
            .then(function(task) {
                expect(task.options.testRenderVal1).to.equal('{{context.foo}}');
                expect(task.options.testRenderVal2).to.equal('baz - {{context.foo}}');
                expect(task.options.testRenderVal3).to.equal('{{context.foo}} - baz');
                expect(task.options.testRenderVal4).to.equal(
                    '{{context.foo}} - baz - {{context.foo}}');
                expect(task.options.testRenderVal5).to.equal('{{context.foo || options.bar}}');
                expect(task.options.testRenderVal6).to.equal('{{context.foo}}');
                expect(task.options.testRenderVal7).to.equal(
                    '{{context.foo}} - baz - {{context.foo}}');
            });
        });

        it("should render api, server and fileServer values", function() {
            Task.configCache = {
                testConfigValue: 'test config value',
                apiServerAddress: '10.1.1.1',
                apiServerPort: '80',
                fileServerAddress: '10.2.2.2',
                fileServerPort: '8000',
                fileServerPath: '/'
            };

            var server = 'http://%s:%s'.format(
                Task.configCache.apiServerAddress,
                Task.configCache.apiServerPort
            );

            var fileServerUri = 'http://10.2.2.2:8000';

            definition.options = {
                server: '{{ api.server }}',
                fileServer: '{{ file.server }}',
                baseRoute: '{{ api.base }}',
                templatesRoute: '{{ api.templates }}',
                profilesRoute: '{{ api.profiles }}',
                lookupsRoute: '{{ api.lookups }}',
                filesRoute: '{{ api.files }}',
                nodesRoute: '{{ api.nodes }}',
                testConfigValue: 'test: {{ server.testConfigValue }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.server).to.equal(server);
                    expect(task.options.fileServer).to.equal(fileServerUri);
                    expect(task.options.baseRoute).to.equal(server + '/api/current');
                    expect(task.options.templatesRoute).to.equal(server + '/api/current/templates');
                    expect(task.options.profilesRoute).to.equal(server + '/api/current/profiles');
                    expect(task.options.lookupsRoute).to.equal(server + '/api/current/lookups');
                    expect(task.options.filesRoute).to.equal(server + '/api/current/files');
                    expect(task.options.nodesRoute).to.equal(server + '/api/current/nodes');
                    expect(task.options.testConfigValue)
                        .to.equal('test: ' + Task.configCache.testConfigValue);
                });
            });
        });

        it("should render proxy api, server and fileServer values", function() {
            Task.configCache = {
                testConfigValue: 'test config value',
                apiServerAddress: '10.1.1.1',
                apiServerPort: '80',
                fileServerAddress: '10.2.2.2',
                fileServerPort: '8000',
                fileServerPath: '/'
            };

            var proxy = 'http://12.1.1.1:8080';
            var fileServerUri = 'http://10.2.2.2:8000';

            definition.options = {
                server: '{{ api.server }}',
                fileServer: '{{ file.server }}',
                baseRoute: '{{ api.base }}',
                filesRoute: '{{ api.files }}',
                nodesRoute: '{{ api.nodes }}',
                testConfigValue: 'test: {{ server.testConfigValue }}'
            };
            return Task.create(definition, {}, {proxy: proxy})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.server).to.equal(proxy);
                    expect(task.options.fileServer).to.equal(fileServerUri);
                    expect(task.options.baseRoute).to.equal(proxy + '/api/current');
                    expect(task.options.filesRoute).to.equal(proxy + '/api/current/files');
                    expect(task.options.nodesRoute).to.equal(proxy + '/api/current/nodes');
                    expect(task.options.testConfigValue)
                        .to.equal('test: ' + Task.configCache.testConfigValue);
                });
            });
        });

        it("should render nested templates", function() {
            definition.options = {
                sourceValue: 'source value',
                nested1: '{{ options.sourceValue }}',
                nested2: '{{ options.nested1 }}',
                nested3: '{{ options.nested2 }}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.nested1).to.equal(definition.options.sourceValue);
                    expect(task.options.nested2).to.equal(definition.options.sourceValue);
                    expect(task.options.nested3).to.equal(definition.options.sourceValue);
                });
            });
        });

        it("should render iteration templates", function() {
            definition.options = {
                testList: [
                    {
                        name: 'item 1'
                    },
                    {
                        name: 'item 2'
                    },
                    {
                        name: 'item 3'
                    }
                ],
                testVal: '{{#options.testList}}{{ name }}.{{/options.testList}}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                var tempList = _.transform(definition.options.testList, function (result, n) {
                    result.push(n.name);
                });
                return task.run().then(function() {
                    expect(task.options.testVal).to.equal(tempList.join('.') + '.');
                });
            });
        });

        it("should render condition templates", function() {
            definition.options = {
                testSrc1: 'Test source 1 exist',
                testVal1: '{{#options.testSrc1}}{{ options.testSrc1 }}{{/options.testSrc1}}',
                testVal2: '{{#options.testSrc2}}{{ options.testSrc2 }}{{/options.testSrc2}}'
            };
            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.options.testVal1).to.equal(definition.options.testSrc1);
                    expect(task.options.testVal2).to.equal('');
                });
            });
        });

        describe('errors', function() {
            var TemplateRenderError;
            var definition;
            var task;

            beforeEach(function () {
                definition = _.cloneDeep(noopDefinition);
                return Task.create(definition, {}, {})
                .then(function(_task) {
                    task = _task;
                });
            });

            before('Task option rendering errors', function() {
                TemplateRenderError = helper.injector.get('Errors').TemplateRenderError;
            });

            it("should throw an error if the render key does not exist in context", function() {
                definition.options = {
                    nonExistantValue: '{{ options.doesNotExist }}'
                };
                expect(function(){
                    task.renderOwnOptions(definition.options);
                }).to.throw(TemplateRenderError, /Value does not exist/);
            });

        });
    });

    describe("serialization", function() {
        it("should serialize to a JSON object", function() {
            return Task.create(_.cloneDeep(noopDefinition), {}, {})
            .then(function(task) {
                expect(task).to.have.property('serialize');
                literalCompare(task, task.serialize());
            });
        });

        it("should serialize to a JSON string", function() {
            var taskJson;
            return Task.create(_.cloneDeep(noopDefinition), {}, {})
            .then(function(task) {
                expect(task).to.have.property('serialize').that.is.a('function');
                expect(function() {
                    taskJson = JSON.stringify(task);
                }).to.not.throw(Error);
                var parsed = JSON.parse(taskJson);
                //expect(task).to.deep.equal(parsed);
                literalCompare(task, parsed);
            });
        });

        it("should serialize a job for an instance", function() {
            return Task.create(_.cloneDeep(noopDefinition), {}, {})
            .then(function(task) {
                task.instantiateJob();
                expect(task.serialize().job).to.deep.equal(task.job.serialize());
            });
        });
    });

    describe("getSkuId", function() {
        var definition;
        var _nodeId;

        beforeEach(function () {
            definition = _.cloneDeep(noopDefinition);
        });

        it("should get undefined from getSkuId if nodeId is null", function () {
            Task.prototype.getSkuId.restore();
            _nodeId = null;
            return Task.create(definition, {}, {target: _nodeId})
            .then(function(task) {
                return task.getSkuId(_nodeId).then(function (node) {
                    expect(typeof(node)).to.equal('undefined');
                });
            });
        });

        it("should get sku Id if node.sku exists", function() {
            Task.prototype.getSkuId.restore();
            var node = {
                "id": "47bd8fb80abc5a6b5e7b10df",
                "sku": "56f8db46c6dc1d8e2e562bdd"
            };
            waterline.nodes = {
                needByIdentifier: sinon.stub()
            };
            waterline.nodes.needByIdentifier.resolves(node);
            _nodeId = '47bd8fb80abc5a6b5e7b10df';
            return Task.create(definition, {}, {target: _nodeId})
            .then(function(task) {
                return task.getSkuId(_nodeId).then(function (node) {
                    expect(waterline.nodes.needByIdentifier).to.have.been.calledWith(_nodeId);
                    expect(node.sku).to.equal(node.sku);
                });
            });
        });
    });

    describe("sku and env rendering", function() {
        var definition;
        var _nodeId;

        beforeEach(function() {
            definition = _.cloneDeep(noopDefinition);
        });

        it("should render env options if sku id isn't valid", function() {
            env.get.withArgs(
                'config', {}, ['global']).resolves(
                {
                    "vendorName": 'emc',
                    "detailedInfo":
                    {
                        "partNumber": "PN12345",
                        "serialNumber":  "SN12345",
                        "users":
                        {
                            "sex": "male",
                            "name": "Frank"
                        }
                    }
                }
            );
            definition.options = {
                testRenderVal:  'test rendered',
                vendor: '{{env.vendorName}}',
                partNumber: '{{env.detailedInfo.partNumber}}',
                userName: '{{env.detailedInfo.users.name}}'
            };
            _nodeId = '47bd8fb80abc5a6b5e7b10df';
            return Task.create(definition, {}, {target: _nodeId})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.getSkuId).to.have.been.calledOnce;
                    expect(env.get).to.have.been.calledOnce;
                    expect(task.options.vendor).to.equal('emc');
                    expect(task.options.partNumber).to.equal('PN12345');
                    expect(task.options.userName).to.equal('Frank');
                });
            });
        });

        it("should render sku and env options if sku id is valid", function() {
            env.get.withArgs('config', {}, ['sku12345']).resolves(
                {
                    "productName":'viper',
                    "chassisInfo": {
                        "chassisType": 'DAE',
                        "diskInfo":
                        {
                            "diskNumber":'24',
                            "diskType":"SSD"
                        }
                    }
                }
            );
            env.get.withArgs('config', {}, ['sku12345', 'global']).resolves(
                {
                    "vendorName":'emc',
                    "detailedInfo":
                    {
                        "partNumber":"PN12345",
                        "serialNumber": "SN12345",
                        "users":
                        {
                            "sex":"female",
                            "name":"Francesca"
                        }
                    }
                }
            );

            Task.prototype.getSkuId.resolves('sku12345');

            definition.options = {
                testRenderVal: 'test rendered',
                vendor: '{{env.vendorName}}',
                partNumber:  '{{env.detailedInfo.partNumber}}',
                userName: '{{env.detailedInfo.users.name}}',
                productName: '{{sku.productName}}',
                chassisType: '{{sku.chassisInfo.chassisType}}',
                diskNumber: '{{sku.chassisInfo.diskInfo.diskNumber}}'

            };
            _nodeId = '47bd8fb80abc5a6b5e7b10df';

            return Task.create(definition, {}, {target: _nodeId})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.getSkuId).to.have.been.calledOnce;
                    expect(env.get).to.have.been.calledTwice;
                    expect(task.options.vendor).to.equal('emc');
                    expect(task.options.partNumber).to.equal('PN12345');
                    expect(task.options.userName).to.equal('Francesca');
                    expect(task.options.productName).to.equal('viper');
                    expect(task.options.chassisType).to.equal('DAE');
                    expect(task.options.diskNumber).to.equal('24');
                });
            });
        });

    });

    describe("timer", function() {
        it("should have a default timeout with null or unsupported values", function() {
            var definition = _.cloneDeep(noopDefinition);

            function testTimeout(val) {
                definition.options._taskTimeout = val;
                return Task.create(definition, {}, {})
                .then(function(task) {
                    task.job = { run: sinon.stub() };
                    task._run();
                    return task;
                });
            }

            return Promise.map([null, undefined, 'test', [], {}], function(val) {
                return testTimeout(val)
                .then(function(task) {
                    expect(task).to.have.property('timer').that.is.an('object');
                    expect(task._taskTimeout).to.equal(24 * 60 * 60 * 1000);
                });
            });
        });

        it("should not timeout when value is 0", function() {
            var definition = _.cloneDeep(noopDefinition);
            definition.options._taskTimeout = 0;
            definition.options.delay = 1;
            return Task.create(definition, {}, {})
            .then(function(task) {
                task.renderAll = sinon.stub().resolves();
                sinon.spy(task, 'cancel');
                return task.run().then(function() {
                    expect(task.state).to.equal('succeeded');
                    expect(task.error).to.equal(null);
                });
            });
        });

        it("should not timeout when value is -1", function() {
            var definition = _.cloneDeep(noopDefinition);
            definition.options._taskTimeout = -1;
            definition.options.delay = 1;
            return Task.create(definition, {}, {})
            .then(function(task) {
                task.renderAll = sinon.stub().resolves();
                sinon.spy(task, 'cancel');
                return task.run().then(function() {
                    expect(task.state).to.equal('succeeded');
                    expect(task.error).to.equal(null);
                });
            });
        });

        it("should timeout with options._taskTimeout", function() {
            var definition = _.cloneDeep(noopDefinition);
            definition.options._taskTimeout = 1;
            definition.options.delay = 2;
            return Task.create(definition, {}, {})
            .then(function(task) {
                task.renderAll = sinon.stub().resolves();
                sinon.spy(task, 'cancel');
                return task.run().then(function() {
                    expect(task.state).to.equal('timeout');
                    expect(task.error).to.be.an.instanceof(Errors.TaskTimeoutError);
                    expect(task.error.message).to.equal("Task did not complete within 1ms");
                    expect(task.cancel).to.have.been.calledOnce;
                });
            });
        });

        it("should timeout with options.schedulerOverrides", function() {
            var definition = _.cloneDeep(noopDefinition);
            definition.options.schedulerOverrides = { timeout: 1 };
            definition.options.delay = 2;
            return Task.create(definition, {}, {})
            .then(function(task) {
                task.renderAll = sinon.stub().resolves();
                sinon.spy(task, 'cancel');
                return task.run().then(function() {
                    expect(task.state).to.equal('timeout');
                    expect(task.error).to.be.an.instanceof(Errors.TaskTimeoutError);
                    expect(task.error.message).to.equal("Task did not complete within 1ms");
                    expect(task.cancel).to.have.been.calledOnce;
                });
            });
            });
    });

    describe("cancellation/completion", function() {
        var task;
        var eventsProtocol;
        var subscriptionStub;
        var Errors;

        before('task-spec cancellation before', function() {
            eventsProtocol = helper.injector.get('Protocol.Events');
            eventsProtocol.publishTaskFinished = sinon.stub().resolves();
            subscriptionStub = { dispose: sinon.stub().resolves() };
            Errors = helper.injector.get('Errors');
        });

        beforeEach('task-spec-cancellation beforeEach', function() {
            subscriptionStub.dispose.reset();
            eventsProtocol.publishTaskFinished.reset();

            return Task.create(_.cloneDeep(noopDefinition), {}, {})
            .then(function(_task) {
                task = _task;
                var subscription = {dispose: sinon.stub()};
                taskProtocol.subscribeActiveTaskExists = sinon.stub().resolves(subscription);
                sinon.spy(task, 'cancel');
                sinon.spy(task, 'stop');
            });
        });

        describe("of task", function() {
            it("should cancel before it has been set to run", function(done) {
                var error = new Errors.TaskCancellationError('test error');
                task.cancel(error);

                setImmediate(function() {
                    try {
                        expect(task.state).to.equal('cancelled');
                        expect(task.error).to.equal(error);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });

            it("should cancel", function() {
                task.instantiateJob();
                var error = new Errors.TaskCancellationError('test error');
                task.instantiateJob = function() {
                    task.cancel(error);
                };

                sinon.spy(task.job, 'cancel');
                task.job._run = function() {
                    return Promise.delay(1000);
                };

                return task.run().then(function() {
                    expect(task.state).to.equal('cancelled');
                    expect(task.error).to.equal(error);
                    expect(task.job.cancel).to.have.been.calledOnce;
                });
            });

            it("should cancel on failure to instantiate a job", function() {
                var error = new Error('test instantiate job error');
                task.job = undefined;
                task.instantiateJob = sinon.stub().throws(error);

                return task.run().then(function() {
                    expect(task.state).to.equal('failed');
                    expect(task.error).to.equal(error);
                });
            });
        });

        describe("of job", function() {
            beforeEach('task-spec-job-cancellation beforeEach', function() {
                task.instantiateJob();
                sinon.spy(task.job, 'cancel');
                sinon.spy(task.job, '_done');
                task.job._run = function() {
                    return Promise.delay(100);
                };
            });

            it("should cancel a job", function() {
                var error = new Errors.TaskCancellationError('test error');
                task.instantiateJob = function() {
                    task.cancel(error);
                };

                return task.run().then(function() {
                    expect(task.job.cancel).to.have.been.calledOnce;
                    expect(task.job.cancel).to.have.been.calledWith(error);
                    expect(task.job._done).to.have.been.calledOnce;
                    expect(task.job._done).to.have.been.calledWith(error);
                });
            });

            it("should manage subscription resource creation and deletion", function() {
                task.instantiateJob = function() {
                    task.cancel(new Errors.TaskCancellationError('test error'));
                };
                task.job.context.target = 'testtarget';
                var subscription = {dispose: this.sandbox.stub()};
                taskProtocol.subscribeActiveTaskExists = sinon.stub().resolves(subscription);
                task.job._subscribeActiveTaskExists = sinon.stub().resolves();
                var jobSubscriptionStub = { dispose: sinon.stub().resolves() };
                task.job.subscriptions = [
                    jobSubscriptionStub, jobSubscriptionStub, jobSubscriptionStub
                ];


                return task.run().then(function() {
                    expect(task.job._subscribeActiveTaskExists).to.have.been.calledOnce;
                    expect(jobSubscriptionStub.dispose).to.have.been.calledThrice;
                });
            });
        });
    });

    describe('task schema', function() {
        it("should throw error if schema validation (skip context) fails", function() {
            var definition = _.cloneDeep(noopDefinition);
            validator.validateContextSkipped.restore();
            this.sandbox.stub(validator, 'validateContextSkipped')
                .throws(new Error('validation fail'));

            return expect(Task.create(definition, {compileOnly: true}, {}))
                .to.be.rejectedWith('validation fail');
        });

        it("should fail task if schema full validation fails", function() {
            var error = new Error('validation fail');
            var definition = _.cloneDeep(noopDefinition);
            validator.validate.restore();
            this.sandbox.stub(validator, 'validate')
                .throws(error);

            return Task.create(definition, {}, {})
            .then(function(task) {
                return task.run().then(function() {
                    expect(task.state).to.equal('failed');
                    expect(task.error).to.equal(error);
                    expect(validator.validate).to.be.calledOnce;
                });
            });
        });
    });
});
