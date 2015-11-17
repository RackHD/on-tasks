// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var result = require("./../sample.js")().foo;

describe('sample fail of this issue', function () {
        it('should return empty function if not found handler', function() {
            var emptyfunction = function() {};
            expect(result).to.be.instanceof(Function);
            expect(result.toString()).to.equal(emptyfunction.toString());
       });
});
