
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
        'Services.Waterline'
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
    waterline
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

        //OS repository analyze job may pass some options via shared context
        //The value from shared context will override the value in self options.
        self.options = _.assign(self.options, context.repoOptions);

        this._validateOptions();
        this._convertOptions();
        this._encryptPassword();
        this._provideUserCredentials();
    }
    util.inherits(InstallOsJob, BaseJob);


    /**
     * @memberOf InstallOsJob
     *
     * Validate the input options.
     */
    InstallOsJob.prototype._validateOptions = function() {
        assert.string(this.context.target);
        assert.string(this.options.completionUri);
        assert.string(this.options.profile);

        // Some of the install task (such as coreos) still hard coded the repo in
        // the profile/kickstart file, So we cannot assert repo&version here
        //
        // TODO: If all install tasks use the same options format,
        // then uncomment following  lines:
        // assert.string(this.options.repo);
        // assert.string(this.options.version);
        // assert.string(this.options.rootPassword);
        // assert.string(this.options.hostname);
        // assert.string(this.options.domain);

        if (this.options.networkDevices) {
            _.forEach(this.options.networkDevices, function(dev) {
                assert.string(dev.device);
                var vlanIds;
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

                    //support vlanId with 'deprecated' message
                    if(dev.ipv4.vlanId){
                        dev.ipv4.vlanIds = dev.ipv4.vlanIds || dev.ipv4.vlanId;
                        logger.deprecate("'vlanIds' is recommended instead of 'vlanId'");
                    }

                    if(dev.ipv4.vlanIds) {
                        vlanIds = dev.ipv4.vlanIds;
                        assert.array(vlanIds);
                        _.forEach(vlanIds, function(vlanId, index) {
                            vlanId = +vlanId;
                            if(parseInt(vlanId) === vlanId && 0 <= vlanId && vlanId <= 4095) {
                                //string vlanID will be convert to number
                                vlanIds[index] = parseInt(+vlanId);
                            } else {
                                throw new RangeError('VlanId must be between 0 and 4095.');
                            }
                        });
                    }
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

                    //support vlanId with 'deprecated' message
                    if(dev.ipv6.vlanId){
                        dev.ipv6.vlanIds = dev.ipv6.vlanIds || dev.ipv6.vlanId;
                        logger.deprecate("'vlanIds' is recommended instead of 'vlanId'");
                    }

                    if(dev.ipv6.vlanIds) {
                        vlanIds = dev.ipv6.vlanIds;
                        assert.array(vlanIds);
                        _.forEach(vlanIds, function(vlanId, index) {
                            vlanId = +vlanId;
                            if(parseInt(vlanId) === vlanId && 0 <= vlanId && vlanId <= 4095) {
                                vlanIds[index] = vlanId;
                            } else {
                                throw new RangeError('VlanId must be between 0 and 4095.');
                            }
                        });
                    }
                }
            });
        }
        if(this.options.users){
            var regex = /^[A-Za-z0-9_]/;
            _.forEach(this.options.users, function(user){
                if(user.name){
                    assert.string(user.name,"username must be a string");
                    if(!user.name.match(regex)){
                        throw new Error('username should be valid ');
                    }
                } else{
                    throw new Error('username is required');
                }

                if(user.password){
                    assert.string(user.password,"password must be a string");
                    if(user.password.length<5){
                        throw new Error('The length of password should larger than 4');
                    }
                } else{
                    throw new Error('password is required');
                }

                if(user.sshKey){
                    assert.string(user.sshKey,"sshKey must be a string");
                }

                if(user.uid !== undefined){
                    assert.number(user.uid,"uid must be a number");
                    if(user.uid<500 || user.uid>65535){
                        throw new Error('The uid should between 500 and 65535 (>=500, <=65535)');
                    }
                }
            });
        }

        if (this.options.installPartitions) {
            _.forEach(this.options.installPartitions, function(partition) {
                if(partition.mountPoint){
                    assert.string(partition.mountPoint, "mountPoint must be a string");
                } else {
                    throw new Error('mountPoint is required');
                }

                if(partition.size){
                    assert.string(partition.size, "size must be a string");
                    if(isNaN(+partition.size) && partition.size !== "auto") {
                        throw new Error('size must be a number string or "auto"');
                    }
                } else {
                    throw new Error('size is required');
                }

                if (partition.fsType) {
                    assert.string(partition.fsType, "fsType must be a string");
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
                privateKey: this.options.rootSshKey
            };
            this.context.users = _.compact((this.context.users || []).concat(rootUser));
        }
    };

    /**
     * @memberOf InstallOsJob
     *
     * Convert the options
     */
    InstallOsJob.prototype._convertOptions = function() {
        this.options.users = this.options.users || [];
        this.options.networkDevices = this.options.networkDevices || [];
        this.options.dnsServers = this.options.dnsServers || [];

        //kickstart file is happy to process the 'undefined' value, so change its value to
        //undefined if some optional value is false
        if (!this.options.rootSshKey) {
            delete this.options.rootSshKey;
        }
        // if option value included is "falsey", just remove it entirely
        // from the options list - set to undefined
        if (!this.options.kvm) {
            delete this.options.kvm;
        }
        _.forEach(this.options.users, function(user) {
            if (!user.sshKey) {
                delete user.sshKey;
            }
        });
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
                    //CentOS/RHEL uses the encrypted password;
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
     */
    InstallOsJob.prototype._run = function() {
        var self = this;
        return Promise.resolve().then(function() {
            return self._convertInstallDisk();
        }).then(function() {
            self._subscribeRequestProfile(function() {
                return self.profile;
            });

            self._subscribeRequestProperties(function() {
                return self.options;
            });

            self._subscribeHttpResponse(function(data) {
                assert.object(data);
                logger.debug('waiting for done signal');
                if (199 < data.statusCode && data.statusCode < 300) {
                    if(_.contains(data.url, self.options.completionUri)) {
                        logger.debug('finally got the done signal: ');
                        logger.debug(data.url);
                        self._done();
                    }
                }
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
