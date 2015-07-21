module.exports = {
    "friendlyName": "Ping Snmp",
    "injectableName": "Task.Snmp.Ping",
    "implementsTask": "Task.Base.Snmp.Collect",
    "options": {
        "mibs": ["SNMPv2-MIB::sysDescr"]
    },
    "properties": {}
};
