module.exports = {
    friendlyName: 'Soft Reset Node',
    injectableName: 'Task.Obm.Node.Reset.Soft',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'softReset'
    },
    properties: {
        power: {
            state: "softReset"
        }
    }
};
