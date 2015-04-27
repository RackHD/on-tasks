module.exports = {
    friendlyName: 'Catalog ohai',
    injectableName: 'Task.Catalog.ohai',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo /opt/chef/bin/ohai --directory /etc/ohai/plugins'
        ]
    },
    properties: {
        catalog: {
            type: 'ohai'
        }
    }
};
