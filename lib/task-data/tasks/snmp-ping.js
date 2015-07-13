module.exports = {
    "friendlyName": "Ping Snmp",
    "injectableName": "Task.Snmp.Ping",
    "implementsTask": "Task.Base.Snmp.Ping",
    "options": {
        "host": '{{ options.host }}',
        "community": '{{options.community}}'
    },
    "properties": {}
};
