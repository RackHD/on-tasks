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
    '_'
));

function commandUtilFactory(
    parser,
    Logger,
    assert,
    Promise,
    waterline,
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

