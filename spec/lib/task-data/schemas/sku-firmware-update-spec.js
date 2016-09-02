// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'sku-firmware-update.json';

    var partialCanonical = {
        file: "test.zip" 
    };

    var positiveSetParam = {
        file: ['somefirmware.bin', 'bios/somefirmware.img', 'bmc/somfimware.ima', 
            'S2600KP_SFUP_BIOS01010016_ME030103021_BMC0143r9685_FRUSDR114.zip', 'bios/S2S_3A18.BIN']
    };

    var negativeSetParam = {
        file: [null, 23, 'somefirmware', '/home/onrack/somefirmware.zip']
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [
        'file',
        'commands'
    ];

    var commonHelper = require('./linux-command-schema-ut-helper');
    var canonical = _.defaults(partialCanonical, commonHelper.canonical);
    commonHelper.test(schemaFileName, canonical);

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, canonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
