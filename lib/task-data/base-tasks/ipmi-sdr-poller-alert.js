module.exports = {
    friendlyName: 'Ipmi Sdr Poller Alerts',
    injectableName: 'Task.Base.Poller.Alert.Ipmi.Sdr',
    runJob: 'Job.Poller.Alert.Ipmi.Sdr',
    requiredOptions: [
        'subscriptionMethodName',
        'publishMethodName',
        'ipmiSdrRoutingKey'
    ],
    requiredProperties: {},
    properties: {}
};
