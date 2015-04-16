// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true, newcap: false */
'use strict';

var di = require('di');

module.exports = mockLoggerFactory;

di.annotate(mockLoggerFactory, new di.Provide('Logger'));
di.annotate(mockLoggerFactory,
    new di.Inject(
        'Constants',
        'Assert',
        '_'
    )
);

function mockLoggerFactory(Constants, assert, _) {

    /**
     * Logger is a logger class which provides methods for logging based
     * on log levels with mesages & metadata provisions. This logger is a stub for the real
     * logger used that doesn't persist or publish logs over AMQP.
     *
     * Usage:
     *
     *     var logger=Logger.initialize(yourFunctionOrInjectable)
     *     logger.info('Your message here...', { hello: 'world', arbitrary: 'meta data object'});
     *
     * @constructor
     */
    function Logger (module) {
        // Set the intiial module to the provided string value if present.
        this.module = module !== undefined ? module.toString() : 'No Module';

        // If the module is a function then we'll look for di.js annotations to get the
        // provide string.
        if (_.isFunction(module)) {
            if (module.annotations && module.annotations.length) {
                // Detect DI provides
                var provides = _.detect(module.annotations, function (annotation) {
                    return _.has(annotation, 'token');
                });

                // If provides is present use that.
                if (provides) {
                    this.module = provides.token;
                    return;
                }
            }

            // If no provides then use the function.
            if (module.name) {
                this.module = module.name;
            }
        }
    }

    /**
     * _log
     * @param {string} level Log Level
     * @param {string} message Log Message
     * @param {object} [context] Log Metadata
     * @private
     */
    Logger.prototype.log = function () {
    };

    // Iterate the available levels and create the appropriate prototype function.
    _.keys(Constants.Logging.Levels).forEach(function(level) {
        /**
         * level - Helper method to allow logging by using the specific level
         * as the method instead of calling log directly.
         * @param {string} message Log Message
         * @param {object} [context] Log Metadata
         */
        Logger.prototype[level] = function (message, context) {
            this.log(level, message, context);
        };
    });

    Logger.initialize = function (module) {
        return new Logger(module);
    };

    return Logger;
}

