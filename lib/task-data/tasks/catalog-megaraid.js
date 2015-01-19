module.exports = {
    friendlyName: 'Catalog megaraid',
    injectableName: 'Task.Catalog.megaraid',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
            'sudo /opt/MegaRAID/storcli/storcli64 /c0 show all J',
            'sudo /opt/MegaRAID/storcli/storcli64 show ctrlcount J',
            'sudo /opt/MegaRAID/storcli/storcli64 /c0 /vall show all J'
        ]
    },
    properties: {
        catalog: {
            type: 'megaraid'
        }
    }
};
