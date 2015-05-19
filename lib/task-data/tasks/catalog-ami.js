module.exports = {
    friendlyName: 'Catalog ami',
    injectableName: 'Task.Catalog.ami',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'cd /opt/ami; sudo ./afulnx_64 /S',
        ]
    },
    properties: {
        catalog: {
            type: 'ami'
        }
    }
};
