// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    fs = require('fs'),
    path = require('path'),
    execFile = require('child_process').execFile;

module.exports = ChildProcessFactory;

di.annotate(ChildProcessFactory, new di.Provide('ChildProcess'));
di.annotate(ChildProcessFactory,
    new di.Inject(
        'Q', 'Logger', 'Assert', '_'
    )
);

/**
 * childProcessFactory returns a ChildProcess constructor
 * @param {Q} Q Promise Library
 * @param {Logger} Logger module
 * @param {Object} assert assertion module
 * @param {Object} _ lodash module
 * @private
 */
function ChildProcessFactory (Q, Logger, assert, _) {
    var logger = Logger.initialize(ChildProcessFactory);
    /**
     * ChildProcess provides a promise based mechanism to run shell commands
     * in a fairly secure manner.
     * @constructor
     */
    function ChildProcess () {
        this.hasBeenKilled = false;
        this.hasRun = false;
        this.spawnInstance = undefined;
        this.command = undefined;
    }

    ChildProcess.prototype.killSafe = function (signal) {
        if (!this.hasRun) {
            logger.warning("Attempted to kill child process but it has not " +
                    "been spawned yet");
        } else if (!this.hasBeenKilled &&
                    this.spawnInstance &&
                    _.isFunction(this.spawnInstance.kill)) {
            this.spawnInstance.kill(signal);
        } else {
            logger.warning("Attempted to kill child process but it has " +
                    "already been killed.", {
                signal: signal,
                command: this.command
            });
        }
    };

    /**
     * Runs the given command.
     * @param  {String} command File to run, with path or without.
     * @param  {String[]} args    Arguments to the file.
     * @param  {Object} env     Optional environment variables to provide.
     * @param  {Integer} code   Desired exit code, defaults to 0.
     * @return {Q.Promise}        A promise fulfilled with the stdout, stderr of
     * a successful command.
     */
    ChildProcess.prototype.run = function run (command, args, env, code) {
        var self = this;
        var deferred = Q.defer(),
            file = self._parseCommandPath(command),
            environment = env || {},
            exitCode = code || 0;

        self.hasRun = true;
        self.command = command;

        if (!_.isEmpty(args)) {
            try {
                assert.arrayOfString(args, 'ChildProcess command arguments');
            } catch (e) {
                return Q.reject(e);
            }
        }

        if (file) {
            self.spawnInstance = execFile(file, args, environment,
                    function (error, stdout, stderr) {
                if (error && error.code !== exitCode) {
                    self.hasBeenKilled = true;
                    logger.error('Error Running ChildProcess.', {
                        file: file,
                        argv: args,
                        stdout: stdout,
                        stderr: stderr,
                        error: error
                    });

                    deferred.reject(error);
                } else {
                    self.hasBeenKilled = true;
                    deferred.resolve({
                        stdout: stdout,
                        stderr: stderr,
                        killSafe: self.killSafe.bind(self)
                    });
                }
            })
            .on('close', function(code, signal) {
                if (signal) {
                    logger.warning("Child process received closing signal:", {
                        signal: signal,
                        argv: args
                    });
                }
                self.hasBeenKilled = true;
            })
            .on('error', function(code, signal) {
                logger.error("Child process received closing signal but has " +
                    "already been closed!!!", {
                    signal: signal,
                    argv: args
                });
            });
        } else {
            deferred.reject(new Error('Unable to locate command file (' + command +').'));
        }

        return deferred.promise;
    };

    /**
     * Internal method to identify the path to the command file.  It's essentially
     * unix which in JavaScript.
     * @private
     */
    ChildProcess.prototype._parseCommandPath = function _parseCommandPath (command) {
        var self = this;

        if (self._fileExists(command)) {
            return command;
        } else {
            var found = _.some(self._getPaths(), function (current) {
                var target = path.resolve(current + '/' + command);

                if (self._fileExists(target)) {
                    command = target;

                    return true;
                }
            });

            return found ? command : null;
        }
    };

    /**
     * Internal method to verify a file exists and is not a directory.
     * @private
     */
    ChildProcess.prototype._fileExists = function _fileExists (file) {
        return fs.existsSync(file) && !fs.statSync(file).isDirectory();
    };

    /**
     * Internal method to get an array of directories in the users path.
     * @private
     */
    ChildProcess.prototype._getPaths = function _getPaths () {
        var path = process.env.path || process.env.Path || process.env.PATH;

        return path.split(':');
    };

    return ChildProcess;
}
