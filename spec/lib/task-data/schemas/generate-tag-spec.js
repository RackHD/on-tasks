// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'generate-tag.json';

    var canonical = {
        "nodeIds": []
    };

    var negativeSetParam = {
        "nodeIds": [ "test", [ "test", 1234 ] ]
    };

    var positiveSetParam = {
        "nodeIds": [
            [ ],
            [ "579b7de7a39b92ee0da4f26a" ],
            [ "579b7de7a39b92ee0da4f26a", "579b7e47dc1c6c180e39d458" ],
            [ "579b7de7a39b92ee0da4f26a", "579b7e47dc1c6c180e39d458", "579b7de7a39b92ee0da4f26a" ]
        ]
    };

    var negativeUnsetParam = [ "nodeIds" ];

    var positiveUnsetParam = [];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical, null, null).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
