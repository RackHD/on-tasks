// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var Ajv = require('ajv');
var _unset = require('lodash.unset');
var _toString = require('lodash.tostring');

/**
 * load all jobs' injectable names
 * @return {Array<String>} all jobs' injectable names
 */
function loadJobNames() {
    var injectables = _.reduce(helper.requireGlob('/lib/jobs/*.js'), function(acc, i) {
         _.forEach(i.annotations, function(a) {
             if (typeof a.token === 'string') { //provided token, the job injectableName
                if (a.token !== 'Job.Base') { //ignore BaseJob as it is not a real job
                    acc.push(a.token);
                }
                return false; //skip earlier as the injectableName has been found
             }
         });
         return acc;
    }, []);

    return  injectables;
}

/**
 * load all schemas into the validator to resolve all schema references
 * @param {Object} ajv - The Ajv instance
 * @return {Object} the input Ajv instance
 */
function loadSchemas(ajv) {
    var metaSchema = helper.require('/lib/task-data/schemas/rackhd-task-schema.json');
    ajv.addMetaSchema(metaSchema);
    var schemas = helper.requireGlob('/lib/task-data/schemas/*.json');
    schemas.forEach(function(schema) {
        if (schema.id !== metaSchema.id) {
            ajv.addSchema(schema);
        }
    });
    return ajv;
}

/**
 * the initialization for all schema unit-test, it only need run once
 * @return {Object} all job injectable names and the initialized validator.
 */
var init = _.once(function() {
    var jobNames = loadJobNames();
    var validator = loadSchemas(new Ajv());
    return {
        jobNames: jobNames,
        validator: validator
    };
});

/**
 * validate the data against a schema
 * @param {Object} validator - The JSON-Schema validator instance
 * @param {String} schemaId - The schema id
 * @param {Object} data - The data that to be validated
 * @param {Boolean} expected - true if expect data conforms to schema, otherwise expect violation.
 * @return {undefined | Error} - return undefined if the validation gets expected result; Otherwise
 * throw error.
 */
function validateData(validator, schemaId, data, expected) {
    var result = validator.validate(schemaId, data);
    if (!result && expected || result && !expected) {
        if (!result) {
            return new Error(validator.errorsText());
        }
        else {
            return new Error('expected schema violation, but get conformity.');
        }
    }
}

/**
 * Check whether the input schema is valid task schema
 *
 * @param {Object} schema - The schema definition
 * @param {Array<String>} jobNames - All job injectable names, it is used to check whether the
 *  schema's describedJob points to an existing job.
 */
function validateSchemaDefinition(schema, jobNames) {
    before('Check schema definition', function() {
        expect(schema).to.be.a('object');
        expect(schema).to.have.property('id').to.be.a('string');
        expect(schema).to.have.property('describeJob').to.be.a('string');
        expect(schema).to.have.property('copyright').to.be.a('string');
        expect(schema).to.have.property('title').to.be.a('string');
        expect(schema).to.have.property('description').to.be.a('string');
        if (jobNames.indexOf(schema.describeJob) < 0) {
            throw new Error("The describeJob " + schema.describeJob + " doesn't exist!");
        }
    });
}

/**
 * A Helper Class for Schema Unit-Testing
 * @param {String} testfile - The file path of target schema
 * @param {Object} [canonicalData] - The canonical data for target schema
 * @param {Boolean} [skipTaskSchemaDefValidation=false] - True to skip the validation for task
 * schema definition itself.
 * @param {Boolean} [skipCommonOptionsValidation=false] - True to skip the common task options
 * validation, this depends the the canonical data is specified
 */
function SchemaUnitTestHelper(testfile, canonicalData, skipTaskSchemaDefValidation,
                              skipCommonOptionsValidation) {
    var result = init();
    var self = this;
    this.validator = result.validator;
    this.schema = helper.require(testfile);
    this.canonicalData = canonicalData;

    if (!skipTaskSchemaDefValidation) {
        validateSchemaDefinition(this.schema, result.jobNames);
    }

    if (this.canonicalData) {
        before('Validate canonical data', function(done) {
            self._validate(self.canonicalData, true, done);
        });

        if (!skipCommonOptionsValidation) {
            self.validateCommonOptions();
        }
    }
}

/**
 * validate data against the target schema
 * @memberof SchemaUnitTestHelper
 * @param {Object} data - The data to be validated.
 * @param {Boolean} expected - true if expect data conforms to schema, otherwise expect violation.
 * @param {Function} done - The mocha unit-test hook "done" function
 */
SchemaUnitTestHelper.prototype._validate = function(data, expected, done) {
    return done(validateData(this.validator, this.schema.id, data, expected));
};

/**
 * validate task common options
 * @memberof SchemaUnitTestHelper
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.validateCommonOptions = function(overrideCanonicalData) {
    var self = this;
    var canonical = overrideCanonicalData || self.canonicalData;
    describe('validate task common options', function() {
        [36000, 0, -1].forEach(function(value) {
            it("should success if '_timeout'=" + JSON.stringify(value), function(done) {
                var data = _.defaults({ _timeout: value }, canonical);
                self._validate(data, true, done);
            });

            it("should success if 'schedulerOverrides.timeout'=" + JSON.stringify(value),
                function(done) {
                    var data = _.defaults({ schedulerOverrides: { timeout: value } }, canonical);
                    self._validate(data, true, done);
                }
            );
        });

        [-2, 1.5, "100"].forEach(function(value) {
            it("should fail if '_timeout'=" + JSON.stringify(value), function(done) {
                var data = _.defaults({ _timeout: value }, canonical);
                self._validate(data, false, done);
            });

            it("should fail if 'schedulerOverrides.timeout'=" + JSON.stringify(value),
                function(done) {
                    var data = _.defaults({ schedulerOverrides: { timeout: value } }, canonical);
                    self._validate(data, false, done);
                }
            );
        });
    });
};

/**
 * Create test suite to validate the input data with target schema
 * @memberof SchemaUnitTestHelper
 * @param {Object|Array<Object>} datas - the input data to be validated, one more multiple data
 * @param {Boolean} [expected=true] - true if expect data conforms to schema,
 *                                    otherwise expect violation.
 */
SchemaUnitTestHelper.prototype.test = function(datas, expected) {
    var self = this;
    var itMessage;

    if (!expected && expected !== false) {
        expected = true;
    }

    if (expected) {
        itMessage = 'should conform to the schema #';
    }
    else {
        itMessage = 'should violate the schema #';
    }

    if (!_.isArray(datas)) {
        datas = [datas];
    }
    describe('validate schema ' + self.schema.id, function() {
        _.forEach(datas, function(data, i) {
            it(itMessage + i.toString(), function(done) {
                self._validate(data, expected, done);
            });
        });
    });
};

/**
 * Set partial canonical data to validate schema
 *
 * For example,
 * assume canonicalData = { a: 1, b: 'foo' },
 *        setParams = { a: [2, 3], b: ['bar'] }
 * This function will amend the canonical data to multiple test data by iterate the setParams, there
 * will be 3 generated data:
 *     #1: { a: 2, b: 'foo' }  //change a to first data 2 and keep b
 *     #2: { a: 3, b: 'foo' }  //change a to second (last) data 3 and keep b
 *     #3: { a: 1, b: 'bar' }  //keep a and change b to the only data 'bar'
 * Then the function will create a test case for each generated test data, each test case will
 * validate the corresponding data with target schema.
 *
 * @memberof SchemaUnitTestHelper
 * @param {Object} setParams - The setting parameters
 * @param {Boolean} expected - true if expect data conforms to schema, otherwise expect violation.
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.setTest = function(setParams, expected, overrideCanonicalData) {
    var self = this;
    var canonicalData = overrideCanonicalData || self.canonicalData;
    var prefixText = expected ? "positive" : "negative";

    describe('schema ' + prefixText + ' set testing', function() {
        if (overrideCanonicalData) {
            it('should pass validation for canonical data', function(done) {
                self._validate(canonicalData, true, done);
            });
        }

        _.forOwn(setParams, function(setValues, key) {
            if (!_.isArray(setValues)) {
                setValues = [setValues];
            }
            _.forEach(setValues, function(val) {
                it('should ' + (expected ? 'conform to ' : 'violate ') + 'the schema if ' +
                        key + '=' + _toString(val), function(done) {
                    if (_.get(canonicalData, key) === undefined) {
                        return done(new Error("The path " + key + "doesn't exist!"));
                    }
                    var data = _.cloneDeep(canonicalData);
                    _.set(data, key, val);
                    self._validate(data, expected, done);
                });
            });
        });
    });
};

/**
 * Unset partial canonical data to validate schema
 *
 * For example,
 * assume canonicalData = { a: 1, b: { c: 2, d: 3} },
 *        unsetParams = ['a', 'b.c', 'b.d', ['a', 'b.c']]
 * This function will amend the canonical data to multiple test data by iterate the unsetParams,
 * there will be 3 generated data:
 *     #1: { b: { c: 2, d: 3 } }  //amend by first param, remove only key 'a'
 *     #2: { a: 1, b: { d: 3 } }  //amend by second param, remove only key 'b.c'
 *     #3: { a: 2, b: { c: 2 } }  //amend by third param, remove only key 'b.d'
 *     #4: { b: { d: 3 } }        //amend by last param, remove both key 'a' and 'b.c'
 * Then the function will create a test case for each generated test data, each test case will
 * validate the corresponding data with target schema.
 *
 * @memberof SchemaUnitTestHelper
 * @param {Array<String|Array<String>>} unsetParams - The unsetting parameters
 * @param {Boolean} expected - true if expect data conforms to schema, otherwise expect violation.
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.unsetTest = function(unsetParams, expected, overrideCanonicalData) {
    var self = this;
    var canonicalData = overrideCanonicalData || self.canonicalData;
    var prefixText = expected ? "positive" : "negative";

    describe('schema ' + prefixText + ' unset testing', function() {
        if (overrideCanonicalData) {
            it('should pass validation for canonical data', function(done) {
                self._validate(canonicalData, true, done);
            });
        }

        _.forEach(unsetParams, function(unsetParam) {
            it('should ' + (expected ? 'conform to ' : 'violate ') + 'the schema if ' +
                    _toString(unsetParam) + " is unset" , function(done) {

                if (!_.isArray(unsetParam)) {
                    unsetParam = [unsetParam];
                }

                var data = _.cloneDeep(canonicalData);
                var faultedFlag = false;
                _.forEach(unsetParam, function(path) {
                    if (_.get(data, path) === undefined) {
                        done(new Error("The path " + path + "doesn't exist!"));
                        faultedFlag = true;
                        return false;
                    }
                    _unset(data, path);
                });
                if (!faultedFlag) {
                    self._validate(data, expected, done);
                }
            });
        });
    });
};

/**
 * Amend canonical data by setting partial content to expect the result data conforms to schema
 * @memberof SchemaUnitTestHelper
 * @param {Object} params - the setting parameters
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.positiveSetTest = function(params, overrideCanonicalData) {
    return this.setTest(params, true, overrideCanonicalData);
};

/**
 * Amend canonical data by setting partial content to expect the result data violates schema
 * @memberof SchemaUnitTestHelper
 * @param {Object} params - the setting parameters
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.negativeSetTest = function(params, overrideCanonicalData) {
    return this.setTest(params, false, overrideCanonicalData);
};

/**
 * Amend canonical data by unsetting partial content to expect the result data conforms to schema
 * @memberof SchemaUnitTestHelper
 * @param {Object} params - the unsetting parameters
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.positiveUnsetTest = function(params, overrideCanonicalData) {
    return this.unsetTest(params, true, overrideCanonicalData);
};

/**
 * Amend canonical data by unsetting partial content to expect the result data violates the schema
 * @memberof SchemaUnitTestHelper
 * @param {Object} params - the unsetting parameters
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.negativeUnsetTest = function(params, overrideCanonicalData) {
    return this.unsetTest(params, false, overrideCanonicalData);
};

/**
 * Amend canonical data by setting or unsetting partial content to expect the result data conforms
 * to or violates the schema
 * @memberof SchemaUnitTestHelper
 * @param {Object} positiveSetParam - the setting parameters to expect conforms to schema
 * @param {Object} negativeSetParam - the setting parameters to expect violates the schema
 * @param {Array<String|Array<String>>} positiveUnsetParam - The unsetting parameters to expect
 * conforms to schema
 * @param {Array<String|Array<String>>} negativeUnsetParam - The unsetting parameters to expect
 * violates the schema
 * @param {Object} [overrideCanonicalData] - A particular canonical data to override the default one
 */
SchemaUnitTestHelper.prototype.batchTest = function(positiveSetParam, negativeSetParam,
    positiveUnsetParam, negativeUnsetParam, overrideCanonicalData)
{
    if (!_.isEmpty(positiveSetParam)) {
        this.positiveSetTest(positiveSetParam, overrideCanonicalData);
    }
    if (!_.isEmpty(negativeSetParam)) {
        this.negativeSetTest(negativeSetParam, overrideCanonicalData);
    }
    if (!_.isEmpty(positiveUnsetParam)) {
        this.positiveUnsetTest(positiveUnsetParam, overrideCanonicalData);
    }
    if (!_.isEmpty(negativeUnsetParam)) {
        this.negativeUnsetTest(negativeUnsetParam, overrideCanonicalData);
    }
};

module.exports = SchemaUnitTestHelper;
