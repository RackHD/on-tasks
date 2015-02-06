module.exports = {
    friendlyName: 'Base Test Poller',
    injectableName: 'Task.Base.Test.Poller',
    runJob: 'Job.Poller.Test',
    requiredOptions: [
        'ipmiSdrRoutingKey',
        'snmpRoutingKey'
    ],
    requiredProperties: {},
    properties: {}
};
