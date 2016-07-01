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
    var defaultTaskSchemaFolder = path.resolve(__dirname, '../../lib/task-data/schemas');
    var defaultMetaSchemaFileName = 'rackhd-task-schema.json';
    var contextPattern = /\{\{[\s\S]*context\.[\s\S]*\}\}/;

    function TaskOptionValidator () {
        JsonSchemaValidator.call(this, { allErrors: true, verbose: true });
        this.loader = new FileLoader();
    }

    util.inherits(TaskOptionValidator, JsonSchemaValidator);

    /**
     * register the validator with all pre defined JSON schemas
     * @param  {String} schemaDir  Directory for schemas, 'lib/task-data/schemas'
     *                             by default if not specified
     * @param  {String} metaSchemaName  Meta Schema file name in schemaDir
     * @return {Promise}
     */
    TaskOptionValidator.prototype.register = function (schemaDir, metaSchemaName) {
        var self = this;
        schemaDir = schemaDir || defaultTaskSchemaFolder;
        metaSchemaName = metaSchemaName || defaultMetaSchemaFileName;

        return self.loader.getAll(schemaDir, false)
        .then(function (files) {
            return _.transform(files, function (result, v, k) {
                result[k] = JSON.parse(v.contents);
            }, {});
        })
        .tap(function (files) {
            // add meta schema
            var metaSchemaFile = files[metaSchemaName];
            self.addMetaSchema(metaSchemaFile);
            delete files[metaSchemaName];
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
            return !contextPattern.test(error.data + '');
        });

        if (_.isEmpty(errors)) {
            return true;
        } else {
            var err = new Error('JSON schema validation failed - ' + this._ajv.errorsText(errors));
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
