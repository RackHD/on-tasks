// Copyright 2014, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

module.exports = {
    before: function (callback) {
        before(function () {
            callback(this);
        });
    },
    examples: function () {
        before(function () {
            expect(this.Jobclass).to.be.ok;
            expect(this.Jobclass).to.be.an.function;
        });

        describe('Instance Methods', function() {

            it('members should have a run function', function() {
                expect(this.Jobclass).to.respondTo('run');
            });

            it('members should have a cancel function', function() {
                expect(this.Jobclass).to.respondTo('cancel');
            });

        });

        describe('Class Methods', function () {
            it('should have a create static method', function() {
                expect(this.Jobclass).itself.to.respondTo('create');
            });
        });
    }
};
