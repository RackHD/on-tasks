// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'flash-megaraid.json';

    var partialCanonical = {
        file: 'megaraid-firmware.bin',
        downloadDir: '/home/rackhd/tmp',
        adapter: 1
    };

    var positiveSetParam = {
        file: 'megaraid-firmware',
        adapter: ["1", "0", "ALL", 0, 1]
    };

    var negativeSetParam = {
        file: ['', null, 123],
        downloadDir: ['', null, 123],
        adapter: ['', null, -1, 1.2, '00a', 'abc', '1.j']
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'file',
        'downloadDir',
        'adapter'
    ];

    var commonHelper = require('./linux-command-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, commonHelper.canonical);
    commonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
