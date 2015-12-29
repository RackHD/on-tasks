
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
                if (dev.ipv4) {
                    assert.string(dev.ipv4.ipAddr);
                    assert.string(dev.ipv4.gateway);
                    assert.string(dev.ipv4.netmask);
                }

                if (dev.ipv6) {
                    assert.string(dev.ipv6.ipAddr);
                    assert.string(dev.ipv6.gateway);
                    assert.string(dev.ipv6.netmask);
                }
            });
        }

        if (this.options.users) {
            _.forEach(this.options.users, function(user) {
                assert.string(user.name);
                assert.string(user.password);
                assert.number(user.uid);
            });
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
                if (199 < data.statusCode && data.statusCode < 300) {
                    if(_.contains(data.url, self.options.completionUri)) {
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
     * @param {Object} catalog - the catalog data of drive id
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
