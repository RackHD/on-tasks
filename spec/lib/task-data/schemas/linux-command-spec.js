// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'linux-command.json';

    var canonical = {
        commands: [
            'touch foo.txt',
            {
                command: 'sudo ipmitool lan print',
                acceptedResponseCodes: [-1, 0, 1, 200],
                catalog: {
                    source: 'bmc',
                    format: 'json'
                },
                retries: 10,
                downloadUrl: '/api/current/foo/ipmitool',
                timeout: 100
            },
            {
                command: 'ls /usr/bin'
            }
        ],
        runOnlyOnce: true
    };

    var positiveSetParam = {
        'commands': ['', 'touch abc', [], { command: 'touch abc' }],
        'commands[1]': 'touch foo.txt', //allow duplicated command
        'commands[1].downloadUrl': ['/foo', '/foo123/123/bar'],
        'commands[1].timeout': [0, 1, 100000],
        'commands[1].retries': [0, 1, 100000],
        'commands[1].acceptedResponseCodes': [[0]],
        'commands[1].catalog.format': ['raw'],
        'runOnlyOnce': false
    };

    var negativeSetParam = {
        'commands': [null, {}, {timeout: 100}],
        'commands[0]': [null],
        'commands[1].acceptedResponseCodes': [[], 0, 1, -1],
        'commands[1].downloadUrl': ['', 'foo', 'http://abc.com/abc'],
        'commands[1].timeout': [-1, 2.5],
        'commands[1].retries': [-1, 2.5],
        'commands[1].catalog.format': ['JSON', 'RAW', 'xml', 'html'], //now only support json & raw
        'runOnlyOnce': [null, 'true', 1]
    };

    var positiveUnsetParam = [
        'commands[1].acceptedResponseCodes',
        'commands[1].catalog',
        'commands[1].catalog.format',
        'commands[1].retries',
        'commands[1].downloadUrl',
        'commands[1].timeout',
        'runOnlyOnce'
    ];

    var negativeUnsetParam = [
        'commands',
        'commands[1].command',
        'commands[1].catalog.source',
        'commands[2].command'
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
