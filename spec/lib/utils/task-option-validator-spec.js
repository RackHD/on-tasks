// Copyright 2016, EMC

'use strict';

describe("TaskOption Validator", function () {
    var taskOptionValidator;
    var testSchema1 = { 
        properties: {
            repo: {
                type: 'string',
                format: 'uri'
            }
        }
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/utils/task-option-validator')
        ]);
        taskOptionValidator = helper.injector.get('TaskOption.Validator');
    });

    describe('register', function() {
        it('should load all JSON schemas under /lib/task-data/schemas', function() {
            var schemaId = 'rackhd/schemas/v1/tasks/install-os-common';
            return taskOptionValidator.register().then(function () {
                var schema = taskOptionValidator.getSchema(schemaId);
                expect(schema).to.have.property('id', schemaId);
                expect(schema).to.have.property('title', 'Install OS Common');
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
                taskOptionValidator.validateContextSkipped(testSchema1,{ repo : 'abc' });
            }).to.throw(Error, 'data.repo should match format "uri"');
        });

        it('should throw validation error with task option not rendered', function () {
            var task = require('../../../lib/task-data/tasks/install-centos.js');
            expect(function () {
                taskOptionValidator.validateContextSkipped(task.schemaRef, task.options);
            }).to.throw(Error, 'JSON schema validation failed');
        });
    });
});
