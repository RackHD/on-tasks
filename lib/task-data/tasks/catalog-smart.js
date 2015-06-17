module.exports = {
    friendlyName: 'Catalog S.M.A.R.T',
    injectableName: 'Task.Catalog.smart',
    implementsTask: 'Task.Base.Linux.Catalog',
    options: {
        commands: [
		    'sudo /opt/scripts/get_smart.sh'
        ]
    },
    properties: {
        catalog: {
            type: 'smart'
        }
    }
};
