// Copyright 2015, EMC, Inc.

'use strict';

module.exports = ansibleJobFactory;
var di = require('di'),
    os = require('os'),
    path = require('path');

di.annotate(ansibleJobFactory, new di.Provide('Job.Ansible.Playbook'));
di.annotate(ansibleJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'JobUtils.Ansible.Playbook',
    'Assert',
    'Services.Waterline',
    'Promise',
    'fs'
    )
);

function ansibleJobFactory(
        BaseJob,
        util,
        Logger,
        AnsibleTool,
        assert,
        waterline,
        Promise,
        nodeFs
) {
    var logger = Logger.initialize(ansibleJobFactory);
    var fs = Promise.promisifyAll(nodeFs);

    function AnsibleJob(options, context, taskId) {
        AnsibleJob.super_.call(this, logger, options, context, taskId);
        this.ansibleCmd = undefined;
        this.nodeId = this.context.target;
        this.routingKey = context.graphId;
        this.taskKey = taskId;
        // file for Ansible playbook to write results to:
        this.outFileName = path.join(os.tmpdir(),'ansible-' + this.taskKey + '.out'); 

        if(options.vars === undefined) {
            this.extraVars = '{"ansibleResultFile":"' + this.outFileName + '"}';
        } else {
            this.extraVars = options.vars;
            this.extraVars.ansibleResultFile = this.outFileName;
            this.extraVars = JSON.stringify(this.extraVars);
        }
        if (this.context.ansibleResultFile === undefined) {
            this.context.ansibleResultFile = [];
        }
        logger.debug("ansible job", {
                options: options,
                extraVars: this.extraVars || 'none'
            });
        assert.uuid(this.routingKey);
    }
    util.inherits(AnsibleJob, BaseJob);

    /**
     * @memberOf AnsibleJob
     */
    AnsibleJob.prototype._run = function run() {
        var self = this;

        waterline.nodes.findByIdentifier(self.nodeId)
        .then(function (node) {
            assert.ok(node, "Node should exist to be a target of ansible playbooks");

            self.ansibleCmd = new AnsibleTool();
            return [node,
                    self.ansibleCmd.runPlaybook(node.id,
                                                self.options.playbook,
                                                self.extraVars )
                   ];
        })
        .spread(function(node, result) {
            var data = {
                host: node,
                result: result
            };
            return self._publishAnsibleResult(self.routingKey, data);
        })
        .then(function() {
            return loadResultFile(self.outFileName,self.context);
        })
        .then(function() {
            self.ansibleCmd = undefined;
            self._done();
        })
        .catch(function(err) {
            self.ansibleCmd = undefined;
            if(err.code === 'ENOENT') {
                logger.warning("Result file not found. " + err.message);
                self._done();
            } else {
                return loadResultFile(self.outFileName,self.context)
                .then(function() {
                    self._done(err);
                })
                .catch(function(err2) {
                    logger.error("Error loading result file. " +
                        err2.message);
                    self._done(err);
                });
            }
        });
    };

    function loadResultFile(resultFile,thisContext) {
        return fs.readFileAsync(resultFile, 'utf8')
        .then(function(contents) {
            assert.arrayOfString(thisContext.ansibleResultFile);
            thisContext.ansibleResultFile.push(contents);
            fs.unlink(resultFile, function(err) {
                if (err) {
                    logger.warning("Failed to delete " + resultFile);
                }
            });
        });
    }

    /**
     * @memberOf AnsibleJob
     */
     AnsibleJob.prototype._cleanup = function cleanup() {
        if(this.ansibleCmd) {
            this.ansibleCmd.kill();
        }
    };
    return AnsibleJob;
}
