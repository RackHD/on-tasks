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

    before(function() {
        helper.setupInjector([
            helper.require('/lib/utils/task-option-validator')
        ]);
    });

    beforeEach(function () {
        taskOptionValidator = helper.injector.get('TaskOption.Validator');
    });

    describe('register', function() {
        beforeEach(function () {
            taskOptionValidator.loader.getAll = sinon.stub().resolves({
                'testSchema1.json': {
                    contents: JSON.stringify(testSchema1),
                    path: '/home/test/testSchema1.json'
                },
                'testSchema2.json': {
                    contents: JSON.stringify(testSchema2),
                    path: '/home/test/testSchema2.json'
                }
            });
        });

        afterEach(function () {
            taskOptionValidator.loader.getAll.reset();
        });

        it('should load all JSON schemas in specific folder', function() {
            return taskOptionValidator.register('/home', 'testSchema1.json')
            .then(function () {
                expect(taskOptionValidator.loader.getAll).to.be.calledOnce;
                expect(taskOptionValidator.getSchema('test1')).to.deep.equal(testSchema1);
                expect(taskOptionValidator.getSchema('test2')).to.deep.equal(testSchema2);
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
