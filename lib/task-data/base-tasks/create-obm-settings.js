module.exports = {
    friendlyName: 'Create OBM settings',
    injectableName: 'Task.Base.Obm.CreateSettings',
    runJob: 'Job.Obm.CreateSettings',
    requiredOptions: [
        'service',
        'config'
    ],
    requiredProperties: {},
    properties: {
        obm: {}
    }
};
