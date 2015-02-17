// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var path = require('path');


/**
*  set up di for testing
*/
var di = require('di');
var core = require('renasar-core')(di);
require('renasar-core/spec/helper');
global.dihelper = core.helper;

global.helper = {

    /**
     * instance of di module for the tests to use
     */
    di: di,

    /**
    * Helper for requiring files based on the cwd which is the root of the project.
    */
    require: function (file) {
        return require(this.relativeToRoot(file));
    },

    /**
     * Helper for glob requiring files based on the cwd which is the root of the project.
     */
    requireGlob: function (pathPattern) {
        return dihelper.requireGlob(this.relativeToRoot(pathPattern));
    },
    /**
    * Helper to generate a full path relative to the root directory.
    */
    relativeToRoot: function (file) {
        return path.normalize(process.cwd() + file);
    },
    /**
    * Most commonly used classes / modules, override or extend as needed
    * with child injector
    */
    baseInjector: new di.Injector(_.flatten([ // jshint ignore:line
        core.injectables
        ])),

    initializeWaterline: function (injector) {
        if (arguments.length === 0) {
            injector = this.baseInjector;
        }

        var waterline = injector.get('Services.Waterline');
        var config = injector.get('Services.Configuration');

        config.set('mongo', {
            adapter: 'mongo',
            host: 'localhost',
            port: 27017,
            database: 'renasar-pxe-test',
            user: '',
            password: ''
        });

        return waterline.start();
    },

    closeWaterline: function (injector) {
        if (arguments.length === 0) {
            injector = this.baseInjector;
        }

        var waterline = injector.get('Services.Waterline');

        return waterline.stop();
    },

    dropAndReinitialize: function(injector) {
        if (arguments.length === 0) {
            injector = this.baseInjector;
        }
        var Q = injector.get('Q');
        return helper.initializeWaterline(injector).then(function (waterline) { // jshint ignore:line
            /* drop doesn't actually return a promise, but leaving this Q.all in here in case
            * we need to switch to using destroy() */
            return Q.all(_.map(waterline, function (collection) { // jshint ignore:line
                if (typeof collection.drop === 'function') {
                    return collection.drop({});
                }
            })).then(function () {
                return waterline;
            });
        });
    }
};
