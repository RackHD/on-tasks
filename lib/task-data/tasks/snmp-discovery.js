// Copyright 2015, EMC, Inc.

module.exports = {
    "friendlyName": "Snmp Discovery Collect",
    "injectableName": "Task.Snmp.Collect.Discovery",
    "implementsTask": "Task.Base.Snmp.Collect",
    "options": {
        "snmpQueryType": "bulkwalk",
        "oids": [
            "1"
        ]
    },
    "properties": {}
};
