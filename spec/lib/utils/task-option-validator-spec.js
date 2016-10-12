// Copyright 2016, EMC

'use strict';

describe("TaskOption Validator", function () {
    var taskOptionValidator;
    var testSchema1 = {
        id: 'test1',
        properties: {
            repo: {
                type: 'string',
                format: 'uri'
            }
        }
    };
    var testSchema2 = {
        id: 'test2',
        test: 'test meta schema required property',
        definitions: {
            VlanId: {
                type: 'integer',
                minimum: 0,
                maximum: 4095
            }
        },
        properties: {
            vlanId: {
                $ref: '#/definitions/VlanId'
            },
            vesrion: {
                type: 'string'
            }
        }
    };

    var testMetaSchema = {
        properties: {
            test: {
                type: 'string'
            }
        },
        required: ['test']
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/utils/task-option-validator')
        ]);
        taskOptionValidator = helper.injector.get('TaskOption.Validator');
    });

    describe('register', function() {
        var nodeFs;
        before(function () {
            nodeFs = helper.injector.get('fs');
            sinon.stub(nodeFs, 'readdirAsync');
            sinon.stub(nodeFs, 'readFileAsync');            
        });

        beforeEach(function () {
            nodeFs.readdirAsync.reset();
            nodeFs.readFileAsync.reset();
        });

        afterEach(function () {
            taskOptionValidator.reset();
            delete testSchema2.$schema;            
        });

        after(function () {
            nodeFs.readdirAsync.restore();
            nodeFs.readFileAsync.restore();
        });

        it('should load all JSON schemas in default folder', function() {
            testSchema2.$schema = 'rackhd-task-schema.json';
            nodeFs.readdirAsync.resolves([
                'testSchema1.json',
                'testSchema2.json',
                'rackhd-task-schema.json'
            ]);
            nodeFs.readFileAsync.onCall(0).resolves(JSON.stringify(testSchema1));
            nodeFs.readFileAsync.onCall(1).resolves(JSON.stringify(testSchema2));
            nodeFs.readFileAsync.onCall(2).resolves(JSON.stringify(testMetaSchema));
            return taskOptionValidator.register()
            .then(function () {
                expect(nodeFs.readdirAsync).to.be.calledOnce;
                expect(nodeFs.readFileAsync).to.have.calledThrice;
                expect(taskOptionValidator.getSchema('testSchema1.json')).to.have.property('id')
                    .that.equals('testSchema1.json');
                expect(taskOptionValidator.getSchema('testSchema2.json')).to.have.property('id')
                    .that.equals('testSchema2.json');
            });
        });

        it('should load all JSON schemas in specific folder', function() {
            nodeFs.readdirAsync.resolves([
                'testSchema2.json',
                'testMetaSchema.json'
            ]);
            nodeFs.readFileAsync.onCall(0).resolves(JSON.stringify(testSchema2));
            nodeFs.readFileAsync.onCall(1).resolves(JSON.stringify(testMetaSchema));
            return taskOptionValidator.register('/home', 'testMetaSchema.json')
            .then(function () {
                expect(nodeFs.readdirAsync).to.be.calledOnce;
                expect(nodeFs.readFileAsync).to.have.calledTwice;
                expect(taskOptionValidator.getSchema('testSchema2.json')).to.have.property('id')
                    .that.equals('testSchema2.json');
            });
        });
    });

    describe('validateContextSkipped', function () {
        it('should return true when validation pass', function () {
            var result = taskOptionValidator.validateContextSkipped(testSchema1,
                { repo : '/172.31.128.1/mirrors' });
            expect(result).to.be.true;
        });

        it('should return true and skip error with context render', function () {
            var result = taskOptionValidator.validateContextSkipped(testSchema1,
                { repo : '{{ context.baseUrl }}/abc' });
            expect(result).to.be.true;
        });

        it('should throw validation error with incorrect data format', function () {
            expect(function () {
                taskOptionValidator.validateContextSkipped(testSchema1, { repo : 'abc' });
            }).to.throw(Error, 'data.repo should match format "uri"');
        });

        it('should throw validation error with task option not rendered', function () {
            expect(function () {
                taskOptionValidator.validateContextSkipped(testSchema1,
                    { repo: '{{ option.installScriptUrl }}'});
            }).to.throw(Error, 'data.repo should match format "uri"');
        });
    });
});
