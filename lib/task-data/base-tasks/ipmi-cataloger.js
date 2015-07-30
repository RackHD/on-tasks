module.exports = {
    friendlyName: 'IPMI Cataloger',
    injectableName: 'Task.Base.Ipmi.Catalog',
    runJob: 'Job.Ipmi.Catalog',
    requiredOptions: [
        'commands'
    ],
    requiredProperties: {
    },
    properties: {
        catalog: {}
    }
};
