// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'flash-ami.json';

    var partialCanonical = {
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

    var commonHelper = require('./linux-command-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, commonHelper.canonical);
    commonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
