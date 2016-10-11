// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'linux-command.json';
    var commonHelper = require('./linux-command-schema-ut-helper');
    commonHelper.test(schemaFileName);
});

