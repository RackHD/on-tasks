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
        'Services.Encryption'
    )
);

function installOsJobFactory(
    BaseJob,
    Logger,
    assert,
    util,
    _,
    encrypt
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

        InstallOsJob._validateOptions();
        InstallOsJob._convertOptions();
        InstallOsJob._encryptPassword();
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
     * @memberOf InstallOsJob
     */
    InstallOsJob.prototype._run = function() {
        this._subscribeRequestProfile(function() {
            return this.profile;
        });

        this._subscribeRequestProperties(function() {
            return this.options;
        });

        this._subscribeHttpResponse(function(data) {
            assert.object(data);
            if (199 < data.statusCode && data.statusCode < 300) {
                if(_.contains(data.url, this.options.completionUri)) {
                    this._done();
                }
            }
        });
    };

    return InstallOsJob;
}
