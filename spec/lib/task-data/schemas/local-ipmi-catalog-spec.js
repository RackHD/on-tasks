// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'local-ipmi-catalog.json';
    var commonHelper = require('./linux-command-schema-ut-helper');
    commonHelper.testCommand(schemaFileName);
});

