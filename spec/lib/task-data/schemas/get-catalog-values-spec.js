/*jshint node: true*/

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'get-catalog-values.json';

    var canonical = {
        'requestedData': [
            {
                'source': 'ohai',
                'keys': {
                    'myKey': 'data.ipaddress'
                }
            }
        ]
    };

    var positiveSetParam = {
        'requestedData': [[
            {
                'source': 'name',
                'keys': {
                    'key1': 'path1',
                    'key2': 'path2'
                }
            },
            {
                'source': 'name1',
                'keys': {
                    'key3': 'path3'
                 }
            }
        ]]
    };

    var negativeSetParam = {
        'requestedData': [[
            {
                'source': 5,
                'keys': 5
            }, 
        ],
        [
            {
                'bad': 'property'
            }
        ]]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'requestedData'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
