// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Clear Drives Partition',
    injectableName: 'Task.Drive.Clear.Partition',
    implementsTask: 'Task.Base.Drive.Partition.Control',
    options: {
        action: 'clear',
        driveIds: [], //example: [
                      // '/dev/disk/by-id/wwn-0x6001636001940aa01dd55961a20fb847',
                      // '/dev/sda',
                      // '/dev/disk/by-id/ata-SATADOM-SV_3SE_20150522AA999091007C'
                      // ]
        partitionType: 'gpt' //See the full list of partitionType from the parted mklabel command:
                             //https://www.gnu.org/software/parted/manual/html_node/mklabel.html
    },
    properties: {}
};
