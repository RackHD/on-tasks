// Copyright 2016, EMC, Inc.

'use strict';
var di = require('di');
var path = require('path');

module.exports = taskOptionValidatorFactory;

di.annotate(taskOptionValidatorFactory, new di.Provide('TaskOption.Validator'));
di.annotate(taskOptionValidatorFactory, new di.Inject(
    'JsonSchemaValidator',
    'FileLoader',
    '_',
    'Util'
));

function taskOptionValidatorFactory(
    JsonSchemaValidator,
    FileLoader,
    _,
    util
) {
    var TaskSchemaFolder = path.resolve(__dirname, '../../lib/task-data/schemas');
    var MetaSchemaFileName = 'rackhd-task-schema.json';
    var ContextPattern = /\{\{[\s\S]*context\.[\s\S]*\}\}/;

    function TaskOptionValidator () {
        JsonSchemaValidator.call(this, { allErrors: true, verbose: true });
        this.loader = new FileLoader();
    }

    util.inherits(TaskOptionValidator, JsonSchemaValidator);

    /**
     * register the validator with all pre defined JSON schema
     * @return {Promise}
     */
    TaskOptionValidator.prototype.register = function () {
        var self = this;
        return self.loader.getAll(TaskSchemaFolder, false)
        .then(function (files) {
            return _.transform(files, function (result, v, k) {
                result[k] = JSON.parse(v.contents);
            }, {});
        })
        .tap(function (files) {
            // add meta schema
            var metaSchemaFile = files[MetaSchemaFileName];
            self.addMetaSchema(metaSchemaFile);
            delete files[MetaSchemaFileName];
        })
        .then(function (files) {
            // add all other schemas
            self.addSchema(_.values(files));
        })
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
        if (this._ajv.validate(schema, data)) {
            return true;
        }

        var errors = _.filter(this._ajv.errors, function(error) {
            return !ContextPattern.test(error.data + '');
        });

        if (_.isEmpty(errors)) {
            return true;
        } else {
            var err = new Error('JSON schema validation failed - ' + this._ajv.errorsText());
            err.errorList = errors;
            throw err;
        }
    };

    TaskOptionValidator.prototype.customizeKeywords = function () {
        // placehoder for readonly keyword validation
        // this.validator.addKeyword('readonly', { validate: function (sch, data) {
        //     return true;
        // }});
    };

    return new TaskOptionValidator();
}
