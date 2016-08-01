// Copyright 2016, EMC, Inc.

'use strict';
var di = require('di');
var path = require('path');

module.exports = taskOptionValidatorFactory;

di.annotate(taskOptionValidatorFactory, new di.Provide('TaskOption.Validator'));
di.annotate(taskOptionValidatorFactory, new di.Inject(
    'JsonSchemaValidator',
    '_',
    'Util'
));

function taskOptionValidatorFactory(
    JsonSchemaValidator,
    _,
    util
) {
    var defaultTaskSchemaFolder = path.resolve(__dirname, '../../lib/task-data/schemas');
    var defaultMetaSchemaFileName = 'rackhd-task-schema.json';
    // var defaultNameSpace = '/schemas/tasks/';
    var defaultNameSpace = ''; // TODO : figure out a suitable name space
    var contextPattern = /\{\{[\s\S]*context\.[\s\S]*\}\}/;

    function TaskOptionValidator () {
        JsonSchemaValidator.call(this, {
            allErrors: true,
            verbose: true,
            nameSpace: defaultNameSpace
        });
    }

    util.inherits(TaskOptionValidator, JsonSchemaValidator);

    /**
     * register the validator with all pre defined JSON schemas
     * @param  {String} [schemaDir=lib/task-data/schemas] - Directory for schemas
     * @param  {String} [metaSchemaName=rackhd-task-schema.json] - Meta Schema file name
     * @return {Promise}
     */
    TaskOptionValidator.prototype.register = function (schemaDir, metaSchemaName) {
        var self = this;
        return self.addSchemasByDir(
            schemaDir || defaultTaskSchemaFolder,
            metaSchemaName || defaultMetaSchemaFileName
        )
        .then(function () {
            self.customizeKeywords();
        });
    };

    /**
     * validate JSON data with given JSON schema
     * @param  {Object|String} schema  JSON schema Object or schema ref id
     * @param  {Object} data  JSON data to be validated
     * @return {Boolean}
     */
    TaskOptionValidator.prototype.validateContextSkipped = function (schema, data) {
        return this.validatePatternsSkipped(schema, data, contextPattern);
    };

    TaskOptionValidator.prototype.customizeKeywords = function () {
        // placehoder for readonly keyword validation
        // this.validator.addKeyword('readonly', { validate: function (sch, data) {
        //     return true;
        // }});
    };

    return new TaskOptionValidator();
}
