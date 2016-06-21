// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Windows',
    injectableName: 'Task.Os.Install.Win',
    implementsTask: 'Task.Base.Os.Install',
    options: {
            osType: 'windows', //readonly option, should avoid change it

            profile: 'windows.ipxe',
            completionUri: 'winpe-kickstart.ps1',
            version: null,
            hostname: 'localhost',
            domain: 'rackhd',
            password: "RackHDRocks!",
            rootSshKey: null,
            username: "onrack",
            "networkDevices": [],
            dnsServers: [],
            installDisk: null,
            smbUser: null,
            smbPassword: null,
            repo: "\\\\{{ config.apiServerAddress }}\\windowsServer2012",// the samba mount point
            productkey: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"

    },
    properties: {
        os: {
            windows: {
                type: 'server'
            }
        }
    }
};