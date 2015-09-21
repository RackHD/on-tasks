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

            it('should have an implementsTask', function() {
                expect(this.taskdefinition).to.have.property('implementsTask');
                expect(this.taskdefinition.implementsTask).to.be.a('string');
            });

            it('should have options', function() {
                expect(this.taskdefinition).to.have.property('options');
                expect(this.taskdefinition.options).to.be.an('Object');
            });

            it('should have properties', function() {
                expect(this.taskdefinition).to.have.property('properties');
                expect(this.taskdefinition.properties).to.be.an('Object');
            });

        });
    }
};
