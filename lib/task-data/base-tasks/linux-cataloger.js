module.exports = {
    friendlyName: 'Linux Cataloger',
    injectableName: 'Task.Base.Linux.Catalog',
    runJob: 'Job.Linux.Catalog',
    requiredOptions: [
        'commands'
    ],
    properties: {
        catalog: {}
    }
};
