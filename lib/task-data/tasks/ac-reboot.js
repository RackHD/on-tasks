module.exports = {
    friendlyName: 'AC Reboot Node',
    injectableName: 'Task.Obm.Node.AcReboot',
    implementsTask: 'Task.Base.Obm.Node',
    options: {
        action: 'reboot',
        obmServiceName: 'panduit-obm-service'
    },
    properties: {
        power: {
            state: "reboot"
        }
    }
};
