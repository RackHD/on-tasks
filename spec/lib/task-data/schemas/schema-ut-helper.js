// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var Ajv = require('ajv');

var metaSchemaFile = '/lib/task-data/schemas/rackhd-task-schema.json';

function SchemaUnitTestHelper(testfile) {
    this.ajv = new Ajv();
    this.subjectFilePath = testfile;
}

SchemaUnitTestHelper.prototype.init = function() {
    var self = this;
    this.subjectSchema = helper.require(self.subjectFilePath);

    describe('basic check', function() {
        it('should meet basic task schema requirement', function() {
            expect(self.subjectSchema).to.be.a('object');
            expect(self.subjectSchema).to.have.property('id').to.be.a('string');
            expect(self.subjectSchema).to.have.property('describeJob').to.be.a('string');
            expect(self.subjectSchema).to.have.property('copyright').to.be.a('string');
            expect(self.subjectSchema).to.have.property('title').to.be.a('string');
            expect(self.subjectSchema).to.have.property('description').to.be.a('string');
        });
    });

    var metaSchema = helper.require(metaSchemaFile);
    self.ajv.addMetaSchema(metaSchema);

    var schemas = helper.requireGlob('/lib/task-data/schemas/*.json');
    schemas.forEach(function(schema) {
        if (schema.id !== metaSchema.id) {
            self.ajv.addSchema(schema);
        }
    });

    return self;
};

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

    describe('validation schema ' + self.subjectSchema.id, function() {
        _.forEach(datas, function(data, i) {
            it(itMessage + i.toString(), function(done) {
                var result = self.ajv.validate(self.subjectSchema.id, data);
                if (!result && expected || result && !expected) {
                    if (!result) {
                        var error = new Error(self.ajv.errorsText());
                        done(error);
                    }
                    else {
                        done(new Error('fail to get expected schema validation result.'));
                    }
                }
                else {
                    done();
                }
            });
        });
    });
};

module.exports = SchemaUnitTestHelper;
