// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

module.exports = {
    before: function (arg1, arg2) {
        var description;
        var callback;
        if (typeof arg1 === 'string') {
            description = arg1;
            callback = arg2;
        } else {
            description = '';
            callback = arg1;
        }
        before(description, function () {
            callback(this);
        });
    },
    examples: function () {
        before("Base Job Examples before", function () {
            expect(this.Jobclass).to.be.ok;
            expect(this.Jobclass).to.be.a.function;
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
