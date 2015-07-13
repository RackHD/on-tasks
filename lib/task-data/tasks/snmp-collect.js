module.exports = {
    "friendlyName": "Collect Snmp",
    "injectableName": "Task.Snmp.Collect",
    "implementsTask": "Task.Base.Snmp.Collect",
    "options": {
        "host": '{{ options.host }}',
        "community": '{{options.community}}'
    },
    "properties": {}
};
