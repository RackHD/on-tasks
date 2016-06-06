// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var SchemaUtHelper = require('./schema-ut-helper');
    var schemaHelper = new SchemaUtHelper('/lib/task-data/schemas/obm-control-schema.json');
    schemaHelper.init();

    var datas = [
        {
            "action": "powerOn",
            "obmService": "ipmi-obm-service"
        },
        {
            "action": "reboot",
            "obmService": "noop-obm-service"
        }
    ];
    schemaHelper.test(datas, true);

    datas = [
        {
            "action": "foo",
            "obmService": "ipmi-obm-service"
        },
        {
            "action": "powerOn",
            "obmService": "bar"
        }
    ];
    schemaHelper.test(datas, false);
});
