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
        this.timeout = options.timeout || 10000;
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
            return waterline.nodes.updateByIdentifier(
                self.nodeId,
                {sshSettings: sshSettings}
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
                username: credentials.name,
                password: credentials.password,
                privateKey: credentials.sshKey
            };
            conn.on('ready', function() {
                conn.end();
                resolve(sshSettings);
            })
            .on('error', function(err) {
                conn.end();
                reject(err);
            });
            var connSettings = _.defaults({readyTimeout: self.timeout}, sshSettings);
            conn.connect(connSettings);
        });
    };

    return ValidationJob;
}


