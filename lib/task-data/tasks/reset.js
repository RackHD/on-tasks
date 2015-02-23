module.exports = {
    friendlyName: 'Reset Node',
    injectableName: 'Task.Obm.Node.Reset',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'reset'
    },
    properties: {
        power: {
            state: "reset"
        }
    }
};
