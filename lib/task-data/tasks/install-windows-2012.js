// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Install Windows',
    injectableName: 'Task.Os.Install.Win',
    implementsTask: 'Task.Base.Os.Install',
    optionsSchema: 'install-windows.json',
    options: {
        osType: 'windows', //readonly option, should avoid change it

        profile: 'windows.ipxe',
        hostname: 'localhost',
        domain: 'rackhd',
        password: "RackHDRocks!",
        username: "onrack",
        smbRepo: "\\\\{{ config.apiServerAddress }}\\windowsServer2012",// the samba mount point
        repo :'{{file.server}}/winpe',
        productkey: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        firewallDisable: false
    },
    properties: {
        os: {
            windows: {
                type: 'server'
            }
        }
    }
};
