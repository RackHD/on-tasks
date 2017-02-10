// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'flash-ami.json';

    var canonical = {
        file: 'amifirmware.bin',
        downloadDir: '/home/rackhd/tmp',
        backupFile: 'amirom.bin'
    };

    var positiveSetParam = {
        file: 'amifirmware'
    };

    var negativeSetParam = {
        file: ['', null, 123],
        downloadDir: ['', null, 123],
        backupFile: ['', null, 123]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'file',
        'downloadDir',
        'backupFile'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
