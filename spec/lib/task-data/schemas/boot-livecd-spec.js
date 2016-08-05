// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'boot-livecd.json';

    var canonical = {
        'version': 'livecd',
        'repo': 'http://10.1.2.3/LiveCD/someOS',
        'profile': 'boot-livecd.ipxe',
        'completionUri': 'someUriPattern'
    };

    var negativeSetParam = {
        'version': [null, 123, true],
        'repo': [null, '/foo/bar'],
        'profile': [null, '', 123],
        'completionUri': [null, '', 123]
    };

    var positiveSetParam = {
        'version': ['5.5', 'trusty'],
        'repo': ['http://vmware.com/esxi/5.5']
    };

    var negativeUnsetParam = [
        'version',
        'repo',
        'profile',
        'completionUri'
    ];

    var positiveUnsetParam = [
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
