module.exports = {
    friendlyName: 'isc-dhcp leases poller',
    implementsTask: 'Task.Base.IscDhcpLeasePoller',
    injectableName: 'Task.IscDhcpLeasePoller',
    options: {
        leasesFile: null
    },
    properties: {}
};
