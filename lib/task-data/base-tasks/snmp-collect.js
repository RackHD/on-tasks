module.exports = {
    "friendlyName": "Collect Snmp",
    "injectableName": "Task.Base.Snmp.Collect",
    "runJob": "Job.Snmp.Collect",
    "requiredOptions": [
        "host",
        "community",
        "mibs"
    ],
    "requiredProperties": {},
    "properties": {}
};
