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
                expect(this.Jobclass.prototype).to.have.property('run');
            });

            it('members should have a cancel function', function() {
                expect(this.Jobclass.prototype).to.have.property('cancel');
            });

        });
    }
};
