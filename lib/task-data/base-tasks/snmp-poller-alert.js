module.exports = {
    friendlyName: 'Snmp Poller Alerts',
    injectableName: 'Task.Base.Poller.Alert.Snmp',
    runJob: 'Job.Poller.Alert.Snmp',
    requiredOptions: [
        'subscriptionMethodName',
        'publishMethodName',
        'snmpRoutingKey'
    ],
    requiredProperties: {},
    properties: {}
};
