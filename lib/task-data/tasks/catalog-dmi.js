module.exports = {
    friendlyName: 'Catalog dmi',
    injectableName: 'Task.Catalog.dmi',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo /opt/chef/bin/ohai --directory /etc/ohai/plugins'
        ]
    },
    properties: {
        catalog: {
            type: 'dmi'
        }
    }
};
