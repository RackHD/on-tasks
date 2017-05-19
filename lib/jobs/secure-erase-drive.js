// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = secureEraseJobFactory;
di.annotate(secureEraseJobFactory, new di.Provide('Job.Drive.SecureErase'));
    di.annotate(secureEraseJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Promise',
        'Assert',
        'Util',
        '_',
        'JobUtils.Commands',
        'JobUtils.CatalogSearchHelpers'
    )
);

function secureEraseJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    _,
    CommandUtil,
    catalogSearch
) {
    var logger = Logger.initialize(secureEraseJobFactory);
    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function SecureEraseJob(options, context, taskId) {
        SecureEraseJob.super_.call(this, logger, options, context, taskId);

        assert.string(this.context.target);
        assert.arrayOfObject(this.options.eraseSettings, 'eraseSettings');

        this.commandUtil = new CommandUtil(this.context.target);
        this.nodeId = this.context.target;
        this.eraseSettings = this.options.eraseSettings;
        this.commands = [];
        this.hasSentCommands = false;
    }

    util.inherits(SecureEraseJob, BaseJob);

    SecureEraseJob.prototype.driveConst = Object.freeze({
        hdparm: {
            protocol: ['SATA'],
            args: ['security-erase', 'secure-erase-enhanced']
        },
        sg_sanitize: { //jshint ignore:line
            protocol: ['SAS'],
            args: ['block', 'crypto', 'fail']
        },
        sg_format: { //jshint ignore:line
            protocol: ['SAS'],
            args: ['0', '1']
        },
        scrub: {
            protocol: undefined,
            args: ['nnsa', 'dod', 'fillzero', 'random', 'random2', 'fillff', 'gutmann',
                'schneier', 'bsi', 'pfitzner7', 'pfitzner33', 'usarmy', 'old', 'fastold',
                /custom=\w+/]
        }
    });

    /**
     * @memberOf SecureEraseJob
     * @function _run
     */
    SecureEraseJob.prototype._run = function() {
        var self = this;

        self.eraseSettings = self._validateOptions();
        return Promise.resolve()
        .then(self._collectDisks.bind(self))
        .then(function(disks){
            return catalogSearch.getDriveIdCatalogExt(self.nodeId, disks);
        })
        .tap(self._validateDiskEsxiWwid.bind(self))
        .then(self._marshalParams.bind(self))
        .then(self._formatCommands.bind(self))
        .then(function() {

            self._subscribeRequestCommands(function() {
                return self.handleRequest();
            });

            self._subscribeRequestProperties(function() {
                return self.options;
            });

            self._subscribeRespondCommands(function(data) {
                logger.debug("Received command payload from node.", {
                    id: self.nodeId,
                    data: data
                });

                self.commandUtil.handleRemoteFailure(data.tasks)
                .spread(function() {
                    self._done();
                })
                .catch(function(err) {
                    self._done(err);
                });
            });
        }).catch(function(err) {
            logger.error('Fail to run drive secure erase job', {
                node: self.nodeId,
                error: err,
                options: self.options
            });
            self._done(err);
        });
    };

    /**
     * @memberOf SecureEraseJob
     * @function _validateOptions
     * @description check whether user's option is valid
     */
    SecureEraseJob.prototype._validateOptions = function() {
        var self = this;
        return _.transform(self.eraseSettings, function(result, entry) {
            assert.array(entry.disks, 'disks');
            if (entry.disks.length === 0) {
                throw new Error('disks should not be empty');
            }
            if (entry.hasOwnProperty('arg')) {
                assert.string(entry.arg, 'arg');
                assert.string(entry.tool, 'tool');
                var match = true;
                // Verify the arg is supported in the specified tool
                if (!_.includes(self.driveConst[entry.tool].args, entry.arg)) {
                    match = false;
                    _.forEach(self.driveConst[entry.tool].args, function(arg) {
                        if (util.isRegExp(arg) && (entry.arg.match(arg))) {
                            match = true;
                            // Exit the loop
                            return false;
                        }
                    });
                }
                if (match === false) {
                    throw new Error(entry.tool + " doesn't support arg " + entry.arg);
                }
            }
            result.push(entry);
        }, []);
    };

    /**
     * @memberOf SecureEraseJob
     * @function _collectDisks
     * @description prepare parameters for catalog search function
     */
    SecureEraseJob.prototype._collectDisks = function() {
        var self = this;
        return _.transform(self.eraseSettings, function(result, entry) {
            _.forEach(entry.disks, function(disk) {
                result.push(disk);
            });
        }, []);
    };

    /**
     * @memberOf SecureEraseJob
     * @function _marshalParams
     * @description Use info from catalogSearch to form the parameters
     *              in json format for secure_erase.py running on node
     */
    /* driveIdExt example:
     [
        {
            "devName": "sdg",
            "esxiWwid": "t10.ATA_____SATADOM2DSV_3SE______201505292050074",
            "identifier": 0,
            "linuxWwid": "/dev/disk/by-id/ata-SATADOM-SV_3SE_20150574",
            "scsiId": "10:0:0:0",
            "virtualDisk": ""
        },
        {
            "devName": "sda",
            "deviceIds": [
                23
            ],
            "pyhsicalDisks": [
                {
                    "deviceId": 23,
                    "model": "ST3600057SS ",
                    "protocol": "SAS",
                    "size": "558.406 GB",
                    "slot": "36:0",
                    "type": "HDD"
                }
            ],
            "esxiWwid": "naa.6001636001940a481ddebecb45264d4a",
            "identifier": 1,
            "linuxWwid": "/dev/disk/by-id/scsi-3600163b45264d4a",
            "scsiId": "0:2:0:0",
            "size": "558.406 GB",
            "slotIds": [
                "/c0/e36/s0"
            ],
            "type": "RAID0",
            "virtualDisk": "/c0/v0"
        }
    ]
    eraseSettings example:
    [
        {
            'disks': ['sda', 'sdb'],
            'tool': 'hdparm',
            'arg': 'secure-erase'
        },
        {
            'disks': [1],
            'tool': 'sg_format'
        },
        {
            'disks': ['sdc']
        }
    ]

    The output parameter will be:
    [
        {
            "disks":
                {
                    "diskName": "/dev/sda",
                    "virtualDisk": "/c0/v0",
                    "scsiId": "0:2:0:0",
                    "deviceIds": [23],
                    "slotIds": ["/c0/e36/s0"]
                },
                ...
            ],
            "tool": "hdparm",
            "arg": "secure-erase",
            "vendor": "lsi"
        }
        ...
    ]
    */
    SecureEraseJob.prototype._marshalParams = function(driveIdExt) {
        var self = this;
        return _.transform(self.eraseSettings, function(result, entry) {
            /* entry ex:
            {
                'disks': ['sda', 'sdb'],
                'tool': 'hdparm',
                'arg': 'secure-erase'
            }
            */
            if (!entry.tool) { entry.tool = "scrub"; }
            _.forEach(entry.disks, function(disk, index) {
                // disk ex: 'sda'
                var diskCatalog = _.find(driveIdExt, function(info){
                    return info.devName === disk || info.identifier ===disk;
                });
                if (!diskCatalog) {
                    throw new Error("Cannot find info in catalogs for drive " + disk);
                }
                self._validateDiskProtocol(entry.tool, diskCatalog, disk);
                entry.disks[index] = {
                    'diskName': '/dev/' + diskCatalog.devName,
                    'virtualDisk': diskCatalog.virtualDisk,
                    'scsiId': diskCatalog.scsiId,
                };
                // Add virtual disk info if any
                if (diskCatalog.virtualDisk !== "") {
                    entry.disks[index].deviceIds = diskCatalog.deviceIds;
                    entry.disks[index].slotIds = diskCatalog.slotIds;
                }
                if (diskCatalog.hasOwnProperty('controllerVendor') && !entry.vendor) {
                    entry.vendor = diskCatalog.controllerVendor;
                }
            });
            result.push(entry);
        }, []);
    };

    /**
     * @memberOf SecureEraseJob
     * @function _formatCommands
     * @description serialize the json format of script's parameter
     * param is:
     [
        {
            "disks": [
                {
                    "diskName": "/dev/sda",
                    "virtualDisk": "/c0/v0",
                    "scsiId": "0:2:0:0",
                    "deviceIds": [23],
                    "slotIds": ["/c0/e36/s0"]
                }
                ...
            ],
            "tool": "hdparm",
            "arg": "secure-erase"
            "vendor": "lsi"
        },
        ...
    ]
    output will be:
    [
        {
            downloadUrl: "{{ api.templates }}/secure_erase.py?nodeId={{ task.nodeId }}",
            cmd: "sudo python secure_erase.py -d '{\"diskName\": \"/dev/sda\",
                \"virtualDisk\": \"/c0/v0\",\"deviceIds\": [23],
                \"scsiId\": \"0:2:0:0\", \"slotIds\": [\"/e252/s5\"]}' -d...
                -t hdpam -o secure-erase -v lsi"
        },
        { cmd: "..." },
        ...
    ]
    */
    SecureEraseJob.prototype._formatCommands = function(params) {
        var self = this;
        this.commands =  _.transform(params, function(result, param) {
            var formatCmd = {cmd: "sudo python secure_erase.py"};
            var notificationUrl = self.options.baseUri + '/api/current/notification/progress';
            formatCmd.cmd += ' -i ' + self.taskId + ' -s ' + notificationUrl + ' -t ' + param.tool;
            _.forEach(param.disks, function(disk) {
                formatCmd.cmd += ' -d ' + '\'' + JSON.stringify(disk) + '\'';
            });

            if (param.hasOwnProperty('arg')) {
                formatCmd.cmd += ' -o ' + param.arg;
            }

            if (param.hasOwnProperty('vendor')) {
                formatCmd.cmd += ' -v ' + param.vendor;
            }
            result.push(formatCmd);

        }, []);

        // add script's url in the first command
        this.commands[0].downloadUrl = this.options.baseUri +
            '/api/current/templates/secure_erase.py?nodeId=' + this.nodeId;
    };

    /**
     * @memberOf SecureEraseJob
     * @function handleRequest
     * @description send command to node when required
     */
    SecureEraseJob.prototype.handleRequest = function() {
        var self = this;
        if (self.hasSentCommands) {
            logger.debug("Ignoring command request from node because commands " +
                    "have already been sent.", {
                        id: self.nodeId,
                        instanceId: self.taskId
                    });
            return;
        }

        self.hasSentCommands = true;
        logger.debug("Received command request from node. Sending commands.", {
            id: self.nodeId,
            commands: self.commands
        });
        return {
            identifier: self.nodeId,
            tasks: self.commands
        };
    };

    /**
     * @memberOf SecureEraseJob
     * @function _validateDiskProtocol
     * @description validate protocol against erase tool for a disk.
     */
    SecureEraseJob.prototype._validateDiskProtocol= function(tool, diskInfo, disk) {
        // Verify the specified tool (except scrub, which supports all protocols)
        // supports the disk's protocol
        var protocols = [undefined];
        var self = this;
        if (tool === "scrub") { return; }
        if (diskInfo.hasOwnProperty('physicalDisks')) {
            protocols = [];
            _.forEach(diskInfo.physicalDisks, function(pd) {
                protocols.push(pd.protocol);
            });
        } else {
            if (diskInfo.linuxWwid.indexOf('ata') > 0 ||
                diskInfo.linuxWwid.indexOf('wwwn') >0) {
                protocols[0] = 'SATA';
            } else if (diskInfo.linuxWwid.indexOf('scsi') > 0) {
                protocols[0] = 'SAS';
            } else if (diskInfo.linuxWwid.indexOf('nvme') > 0) {
                protocols[0] = 'NVME';
            } else if (diskInfo.linuxWwid.indexOf('usb') > 0) {
                protocols[0] = 'USB';
            }
        }
        _.forEach(protocols, function(protocol){
            if (!_.contains(self.driveConst[tool].protocol, protocol)) {
                throw new Error(tool + " doesn't support disk " + disk +
                                ' (' + protocol + ')');
            }
        });
    };

    /**
     * @memberOf SecureEraseJob
     * @function _validateDiskWwid
     * @description validate extended disk esxiWwid information against cached driveId catalogs
     */
    SecureEraseJob.prototype._validateDiskEsxiWwid= function(driveIdExt) {
        //driveId catalog will be refresh before secure erase job
        //driveId catalog will be cached in graph context before refreshing
        //cached catalog and refreshed driveId catalogs are compared on esxiWwid to make sure
        //  disk configuration (mainly RAID) is not changed
        var driveWwidCache = {};
        var driveIdCache = this.context.data && this.context.data.driveId;
        if(_.isEmpty(driveIdCache)) {
                throw new Error("No driveId catalog cached in context");
        }
        _.forEach(driveIdCache, function(disk){
            driveWwidCache[disk.devName] = disk.esxiWwid;
        });
        _.forEach(driveIdExt, function(disk){
            if (driveWwidCache[disk.devName] !== disk.esxiWwid) {
                throw new Error("Drive id catalog does not match user input data, " +
                                "drive re-cataloging is required");
            }
        });
    };

    return SecureEraseJob;
}
