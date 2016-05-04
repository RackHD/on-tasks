// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');
module.exports = commandUtilFactory;

di.annotate(commandUtilFactory, new di.Provide('JobUtils.Commands'));
di.annotate(commandUtilFactory, new di.Inject(
    'JobUtils.CommandParser',
    'Logger',
    'Assert',
    'Promise',
    'Services.Waterline',
    'Services.Lookup',
    'Services.Encryption',
    '_'
));

function commandUtilFactory(
    parser,
    Logger,
    assert,
    Promise,
    waterline,
    lookup,
    cryptService,
    _
) {
    var logger = Logger.initialize(commandUtilFactory);

    function CommandUtil(target) {
        this.nodeId = target;
    }

    CommandUtil.prototype.parseResponse = function(tasks) {
        var self = this;

        logger.debug("Received remote command output from node.", {
            id: self.nodeId,
        });

        var catalogTasks = [],
            unknownTasks = [];

         _.forEach(tasks, function(task) {
            logger.debug('task result', {data:task});
            if (task.catalog) {
                task.format ? unknownTasks.push(task) : catalogTasks.push(task);
            }
        });

         return Promise.all([
                 parser.parseTasks(catalogTasks),
                 parser.parseUnknownTasks(unknownTasks)
         ])
        .spread(function(parsed, unknown) {
            return _.compact([].concat(parsed).concat(unknown));
        })
        .catch(function(err) {
            logger.error("Job error processing catalog output.", {
                error: err,
                id: self.nodeId,
                taskContext: self.context
            });
            throw err;
        });

    };

    CommandUtil.prototype.handleRemoteFailure = function(tasks) {
        var self = this;
        return Promise.map(tasks, function(task){
            if (!_.isEmpty(task.error) &&
                !_.contains(task.acceptedResponseCodes, task.error.code)) {

                var runType = task.cmd ? 'command' : 'downloadUrl';

                logger.error("Failure running %s: '%s'"
                .format(
                    runType, task.cmd || task.downloadUrl),
                    { id: self.nodeId, response: task }
                );
                throw new Error("Encountered a failure running remote commands");
            } else {
                return task;
            }
        });
    };

    CommandUtil.prototype.catalogParsedTasks = function() {
        var self = this;
        return Promise.map(Array.prototype.slice.call(arguments), function(result) {
            if (result.error) {
                logger.error("Failed to parse data for " +
                    result.source + ', ' + result.error,
                    { error: result });
            } else if (result.store) {
                return waterline.catalogs.create({
                    node: self.nodeId,
                    source: result.source || 'unknown',
                    data: result.data
                });
            } else {
                logger.info("Catalog result for " + result.source +
                    " has not been marked as significant. Not storing.");
            }
        });
     };

    CommandUtil.prototype.sshExec = function(cmdObj, sshSettings, sshClient) {
        return new Promise(function(resolve, reject) {
            if(cmdObj.timeout) {
                setTimeout(function() {
                    var seconds = cmdObj.timeout / 1000;
                    reject(new Error('The remote operation timed out after '+
                                 seconds + ' seconds'));
                }, cmdObj.timeout);
            }
            var ssh = sshClient;
            ssh.on('ready', function() {
                ssh.exec(cmdObj.cmd, function(err, stream) {
                    if (err) { reject(err); }
                    stream.on('close', function(code) {
                        cmdObj.exitCode = code;
                        ssh.end();
                    }).on('data', function(data) {
                        cmdObj.stdout = ( cmdObj.stdout || '' ) + data.toString();
                    }).stderr.on('data', function(data) {
                        cmdObj.stderr = ( cmdObj.stderr || '' ) + data.toString();
                    });
                });
            })
            .on('error', function(err) {
                logger.error('ssh error', {
                    error: err,
                    host: sshSettings.host,
                    task: cmdObj,
                    level: err.level,
                    description: err.description
                });
                reject(err);
            })
            .on('close', function(hasErr) {

                if (hasErr || (cmdObj.exitCode &&
                    !_.contains(cmdObj.acceptedResponseCodes, cmdObj.exitCode))) {
                    logger.error("Failure running remote command", {task:cmdObj});

                    reject(new Error(
                            "Encountered a failure running "+cmdObj.cmd+
                            "on remote host"+ sshSettings.host
                    ));
                } else {
                    resolve(cmdObj);
                }
            });
            ssh.connect({
                host: sshSettings.host,
                port: sshSettings.port || 22,
                username: sshSettings.user,
                password: cryptService.decrypt(sshSettings.password),
                privateKey: cryptService.decrypt(sshSettings.privateKey)
            });
        });
    };

    CommandUtil.prototype.updateLookups = function(parsedTasks) {
        var self = this;
        return Promise.map(parsedTasks, function(result){
            return _.map(result.lookups, function(lookupEntry) {
                if (lookupEntry && lookupEntry.mac && lookupEntry.ip) {
                    return lookup.setIpAddress(lookupEntry.ip, lookupEntry.mac);
                } else if (lookupEntry && lookupEntry.mac) {
                    return waterline.lookups.upsertNodeToMacAddress(
                                self.nodeId, lookupEntry.mac);
                }
            });
        });
    };

    CommandUtil.prototype.buildCommands = function(commands) {
        return _.map(_.flatten([commands]), function(cmd) {
            if (typeof cmd === 'string') {
                return { cmd: cmd };
            }
            return _.transform(cmd, function(cmdObj, v, k) {
                if (k === 'catalog') {
                    cmdObj.source = v.source;
                    cmdObj.format = v.format;
                    cmdObj.catalog = true;
                } else if (k === 'command') {
                    cmdObj.cmd = v;
                } else if (k === 'retries') {
                    cmdObj.retries = v;
                } else if (k === 'downloadUrl') {
                    cmdObj.downloadUrl = v;
                } else if (k === 'acceptedResponseCodes') {
                    cmdObj[k] = v;
                } else if (k === 'timeout'){
                    cmdObj.timeout = v;
                } else if ( !_.contains(['source', 'format'], k) ){
                    throw new Error(k + ' option is not supported');
                }
            }, {});
        });
    };

    return CommandUtil;
}

