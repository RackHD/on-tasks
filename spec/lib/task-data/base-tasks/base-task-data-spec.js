// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

module.exports = {

    before: function (callback) {
        before(function () {
            callback(this);
        });
    },

    examples: function () {
        before(function () {
            expect(this.taskdefinition).to.be.ok;
            expect(this.taskdefinition).to.be.an.Object;
        });

        describe('expected properties', function() {

            it('should have a friendly name', function() {
                expect(this.taskdefinition).to.have.property('friendlyName');
                expect(this.taskdefinition.friendlyName).to.be.a('string');
            });

            it('should have an injectableName', function() {
                expect(this.taskdefinition).to.have.property('injectableName');
                expect(this.taskdefinition.injectableName).to.be.a('string');
            });

            it('should have a runJob', function() {
                expect(this.taskdefinition).to.have.property('runJob');
                expect(this.taskdefinition.runJob).to.be.a('string');
            });

            it('should have required properties', function() {
                expect(this.taskdefinition).to.have.property('requiredProperties');
                expect(this.taskdefinition.properties).to.be.an('Object');
            });

            it('should have properties', function() {
                expect(this.taskdefinition).to.have.property('properties');
                expect(this.taskdefinition.properties).to.be.an('Object');
            });

            it('should have correct optionsSchema', function() {
                if (this.taskdefinition.optionsSchema &&
                        !_.isString(this.taskdefinition.optionsSchema) &&
                        !_.isObject(this.taskdefinition.optionsSchema)) {
                    throw new Error('optionsSchema must be either string or object if it is not empty'); //jshint ignore: line
                }
            });

            it('should not have unknown property', function() {
                var validKeys = ['friendlyName', 'injectableName', 'runJob',
                    'properties', 'requiredProperties', 'optionsSchema',
                    'requiredOptions'];
                _.forOwn(this.taskdefinition, function(value, key) {
                    expect(validKeys).to.include(key);
                });
            });
        });
    }
};
