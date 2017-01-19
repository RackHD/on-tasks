
// Copyright 2015, EMC, Inc.
'use strict';

var di = require('di');

module.exports = installOsJobFactory;
di.annotate(installOsJobFactory, new di.Provide('Job.Os.Install'));
    di.annotate(installOsJobFactory,
    new di.Inject(
        'Job.Base',
        'Logger',
        'Assert',
        'Util',
        '_',
        'Services.Encryption',
        'Promise',
        'JobUtils.CatalogSearchHelpers',
        'Services.Waterline',
        'Task.Messenger'
    )
);

function installOsJobFactory(
    BaseJob,
    Logger,
    assert,
    util,
    _,
    encrypt,
    Promise,
    catalogSearch,
    waterline,
    taskMessenger 
) {
    var logger = Logger.initialize(installOsJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function InstallOsJob(options, context, taskId) {
        var self = this;
        InstallOsJob.super_.call(self, logger, options, context, taskId);

        self.nodeId = self.context.target;
        self.profile = self.options.profile;
        self.taskId = taskId;

        //OS repository analyze job may pass some options via shared context
        //The value from shared context will override the value in self options.
        self.options = _.assign(self.options, context.repoOptions);

        this._validateOptions();
        this._encryptPassword();
        this._provideUserCredentials();
    }
    util.inherits(InstallOsJob, BaseJob);


    /**
     * @memberOf InstallOsJob
     *
     * Validate the input options, only implement validation that task-schema cannot cover
     */
    InstallOsJob.prototype._validateOptions = function() {
        assert.string(this.context.target);

        if (this.options.networkDevices) {
            _.forEach(this.options.networkDevices, function(dev) {
                assert.string(dev.device);
                if (dev.ipv4) {
                    assert.isIP(dev.ipv4.ipAddr, 4);
                    assert.isIP(dev.ipv4.gateway, 4);
                    assert.string(dev.ipv4.netmask);
                    _.forEach(dev.ipv4.netmask.split('.'), function(item) {
                        item = +item ? +item : parseInt(item, 16);
                        //judge if a number is like '11110000' or '0' which a netmask is.
                        /* jshint ignore:start */
                        if (item !== 0 && (item - 1 | item) !== 255) {
                            throw new Error('Invalid ipv4 netmask.');
                        }
                        /* jshint ignore:end */
                    });
                }

                if (dev.ipv6) {
                    assert.isIP(dev.ipv6.ipAddr, 6);
                    assert.isIP(dev.ipv6.gateway, 6);
                    assert.string(dev.ipv6.netmask);
                    _.forEach(dev.ipv6.netmask.split('.'), function(item) {
                        item = +item ? +item : parseInt(item, 16);
                        /* jshint ignore:start */
                        if(item !== 0 && (item - 1 | item) !== 65535) {
                            throw new Error('Invalid ipv6 netmask.');
                        }
                        /* jshint ignore:end */
                    });
                }
            });
        }

        if (this.options.installPartitions) {
            _.forEach(this.options.installPartitions, function(partition) {
                if(isNaN(+partition.size) && partition.size !== "auto") {
                    throw new Error('size must be a number string or "auto"');
                }

                if (partition.fsType) {
                    if(partition.mountPoint === 'swap') {
                        if(partition.fsType !== 'swap') {
                            logger.warning("fsType should be 'swap' if mountPoint is 'swap'");
                            // if fsType is not swap, correct it.
                            partition.fsType = 'swap';
                        }
                    }
                }
            });
        }
    };

    InstallOsJob.prototype._provideUserCredentials = function() {
        this.context.users = this.options.users;

        if (this.options.rootPassword || this.options.rootSshKey) {
            var rootUser = {
                name: 'root',
                password: this.options.rootPassword,
                publicKey: this.options.rootSshKey
            };
            this.context.users = _.compact((this.context.users || []).concat(rootUser));
        }
    };

    /**
     * @memberOf InstallOsJob
     *
     * Encypt the input password.
     */
    InstallOsJob.prototype._encryptPassword = function() {
        var hashAlgorithm = 'sha512';

        if (this.options.users) {
            _.forEach(this.options.users, function(user) {
                if (user.password) {
                    //CentOS/RHEL/CoreOS uses the encrypted password;
                    //ESXi uses the plain password.
                    user.plainPassword = user.password; //plain password to ESXi installer
                    user.encryptedPassword = encrypt.createHash(user.password, hashAlgorithm);
                }
            });
        }

        if (this.options.rootPassword) {
            this.options.rootPlainPassword = this.options.rootPassword;
            this.options.rootEncryptedPassword = encrypt.createHash(this.options.rootPassword,
                                                                    hashAlgorithm);
        }
    };

    /**
     * @memberof InstallOsJob
     *
     * Convert the installDisk to correct format
     */
    InstallOsJob.prototype._convertInstallDisk = function() {
        var self = this;
        var disk = self.options.installDisk;

        //If disk is string, it means user directly input the drive wwid, so don't need conversion.
        if (_.isString(disk) && !_.isEmpty(disk)) {
            return Promise.resolve(disk);
        }
        //If disk is not number and not empty value, it should be reject for incorrect format
        if (!_.isNumber(disk) && !_.isEmpty(disk)) {
            return Promise.reject(new Error('The installDisk format is not correct'));
        }

        return waterline.catalogs.findMostRecent({
            node: self.nodeId,
            source: 'driveId'
        }).then(function(catalog) {
            var isEsx = /^esx$/i.test(self.options.osType);
            var wwid = isEsx ? 'firstdisk' : 'sda';
            // use default value for installDisk when drive id catalog do not exist
            if (!catalog || !catalog.hasOwnProperty('data') || catalog.data.length === 0) {
                return wwid;
            }
            //if disk is integer, we think it is drive index, so we need to lookup the database
            //to map the drive index to drive WWID
            if (_.isNumber(disk)) {
                wwid = catalogSearch.findDriveWwidByIndex(catalog.data, isEsx, disk);

                if (!wwid) {
                    return Promise.reject(new Error('Fail to find the WWID for installDisk'));
                }
            }
            //when disk is empty, set wwid of SATADOM if exist,
            //otherwise, use first item of driveId catalog
            else {
                wwid = self._findDriveWwidOfSataDom(catalog.data, isEsx);

                if (!wwid) {
                    wwid = isEsx ? catalog.data[0].esxiWwid : catalog.data[0].linuxWwid;
                }
            }
            return wwid;
        }).then(function(wwid) {
            logger.debug('find the wwid for install disk:' + wwid);
            self.options.installDisk = wwid;
            return Promise.resolve(wwid);
        });
    };

    /**
     * @memberOf InstallOsJob
     * Progress update after installation steps
     */
    InstallOsJob.prototype.updateProgress = function(descript, value) {
        var progressData = {
                progress: {value: null, maximum: null, description: descript},
                taskProgress: {
                    taskId: this.taskId,
                    progress: {
                        value: value, maximum: this.options.totalSteps, description: descript
                    }
                }
        };
        return taskMessenger.publishProgressEvent(this.context.graphId, progressData);
    };

    /**
     * @memberOf InstallOsJob
     */
    InstallOsJob.prototype._run = function() {
        var self = this;
        return Promise.resolve().then(function() {
            return self._convertInstallDisk();
        }).then(function() {
            self._subscribeRequestProfile(function() {
                var description = "Reboot suceeded, starting kernel download.";
                return self.updateProgress(description, 1)
                .then(function(){
                    return self.profile;
                });
            });

            self._subscribeRequestProperties(function() {
                return self.options;
            });

            self._subscribeNodeNotification(self.nodeId, function(data) {
                assert.object(data);
                var description = "Installation completed, starting first boot";
                return self.updateProgress(description, self.options.totalSteps)
                .then(function(){
                    self._done();
                });
            });
        }).catch(function(err) {
            logger.error('Fail to run install os job', {
                node: self.nodeId,
                error: err,
                options: self.options
            });
            self._done(err);
        });
    };

     /**
     * Search the driveid catalog and lookup the corresponding drive WWID of SATADOM
     * @param {Array} catalog - the catalog data of drive id
     * @param {Boolean} isEsx - True to return the ESXi formated wwid,
     *                          otherwise linux format wwid.
     * @return {String} The WWID of SATADOM. If failed, return null
     */
    InstallOsJob.prototype._findDriveWwidOfSataDom = function(catalog, isEsx) {
        var wwid = null;
        _.forEach(catalog, function(drive) {
            if (drive.esxiWwid.indexOf('t10') === 0) {
                wwid = isEsx ? drive.esxiWwid : drive.linuxWwid;
                return false;
            }
        });
        return wwid;
    };

    return InstallOsJob;
}
