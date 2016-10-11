// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'download-file.json';

    var partialCanonical = {
        file: 'abc.txt',
        downloadDir: '/home/rackhd/tmp',
        fileMd5Uri: 'http://172.31.128.1:9080/api/2.0/files/abc.txt/md5',
        fileUri: 'http://172.31.128.1:9080/api/2.0/files/abc.txt/latest',
        outputPath: '/var/rackhd/abc-mod.txt'
    };

    var positiveSetParam = {
        file: ['abc', 'a']
    };

    var negativeSetParam = {
        file: ['', null],
        downloadDir: ['', null],
        fileMd5Uri: ['', null, 'abc'],
        fileUri: ['', null, 'abc'],
        outputPath: ['', null]
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'file',
        'downloadDir',
        'fileMd5Uri',
        'fileUri',
        'outputPath'
    ];

    var commonHelper = require('./linux-command-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, commonHelper.canonical);
    commonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
