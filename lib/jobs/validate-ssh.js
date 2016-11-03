// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
module.exports = validationJobFactory;

di.annotate(validationJobFactory, new di.Provide('Job.Ssh.Validation'));
di.annotate(validationJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'Assert',
    'Promise',
    'Services.Waterline',
    'Services.Encryption',
    'ssh',
    '_'
));

function validationJobFactory(
    BaseJob,
    util,
    Logger,
    assert,
    Promise,
    waterline,
    encryption,
    ssh,
    _
) {
    var logger = Logger.initialize(validationJobFactory);

    /**
     * A job to test the user credentials and host Ip provided though graph options
     * and/or context and update the target node with the first valid ssh setting
     *
     * @param {Object[]} options.users - An array of user credential objects provided
     * as options to the graph
     *
     * @param {Object[]} context.users - An array of user credential objects provided
     * through the context
     *
     * @constructor
     */
    function ValidationJob(options, context, taskId) {
        ValidationJob.super_.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
        assert.ok(options.users || this.context.users);
        this.timeout = options.timeout || 20000;
        this.retries = options.retries || 2;
        this.backoffDelay = options.backoffDelay || 1000;
        this.users = _.compact([].concat(options.users).concat(this.context.users));
    }
    util.inherits(ValidationJob, BaseJob);

    ValidationJob.prototype._run = function run() {
        var self = this;
        if (_.isEmpty(self.users)) {
            logger.warning("Skipping SSH validation as no users are defined", {
                node: self.nodeId
            });
            return self._done();
        }
        return waterline.lookups.findByTerm(self.nodeId)
        .then(function(lookups) {
            return self.testCredentials(lookups, self.users, self.retries, self.backoffDelay);
        })
        .then(function(sshSettings) {
            var config = {
                host: sshSettings.host,
                user: sshSettings.user || sshSettings.username
            };
            if (sshSettings.password !== null && sshSettings.password !== undefined) {
                config.password = encryption.encrypt(sshSettings.password);
            }
            if (sshSettings.privateKey !== null && sshSettings.privateKey !== undefined) {
                config.privateKey = encryption.encrypt(sshSettings.privateKey);
            }
            return waterline.ibms.upsertByNode(
                self.nodeId,
                { service: 'ssh-ibm-service', config: config }
            );
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };

    ValidationJob.prototype.testCredentials = function(lookups, users, retries, delay) {
        var self = this;
        return Promise.any(_.map(users, function(user) {
            return Promise.any(_.map(lookups, function(lookup) {
                return self.attemptConnection(lookup.ipAddress, user);
            }));
        }))
        .catch(function(err) {
            if(retries <= 0) {
                return Promise.reject(err);
            } else {
                return Promise.delay(delay)
                .then(function() {
                    return self.testCredentials(lookups, users, retries - 1, delay * 2);
                });
            }
        });
    };

    ValidationJob.prototype.attemptConnection = function(addr, credentials) {
        var self = this;
        return new Promise(function(resolve, reject) {
            var conn = new ssh.Client();
            var sshSettings = {
                host: addr,
                user: credentials.name,
                password: credentials.password,
                privateKey: credentials.sshKey,
                tryKeyboard: true
            };
            conn.on('ready', function() {
                conn.end();
                if(sshSettings.host === null){
                    reject('host ip is not defined in this lookup.');
                }
                resolve(sshSettings);
            })
            .on('keyboard-interactive', function() {
                // Do this as a last resort if other authentication methods fail.
                // ESXi only works with this method, and likely some switch OSes
                // as well.
                var args = Array.prototype.slice.call(arguments);
                var finish = _.last(args);
                finish([credentials.password]);
            })
            .on('error', function(err) {
                conn.end();
                reject(err);
            });
            conn.connect(_.defaults({
                    readyTimeout: self.timeout,
                    username: sshSettings.user
                }, sshSettings)
            );
        });
    };

    return ValidationJob;
}


