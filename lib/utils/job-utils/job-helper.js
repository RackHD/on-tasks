// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = jobHelperFactory;
di.annotate(jobHelperFactory, new di.Provide('JobUtils.JobHelpers'));
di.annotate(jobHelperFactory, new di.Inject(
    'Assert',
    '_',
    'Services.Encryption',
    'Services.Lookup',
    'Constants'
));

function jobHelperFactory(
    assert,
    _,
    encryption,
    lookup,
    Constants
) {
    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function revealSecrets (options) {
        if (options.password) {
            options.password = encryption.decrypt(options.password);
        }

        if (options.community) {
            options.community = encryption.decrypt(options.community);
        }
        return options;
    }

    function lookupHost (options) {
        if (options.host && Constants.Regex.MacAddress.test(options.host)) {
            return lookup.macAddressToIp(options.host).
                then(function (ipAddress){
                    options.host = ipAddress;
                    return options;
            });
        }

        return options;
    }

    return {
        revealSecrets: revealSecrets,
        lookupHost: lookupHost
    };
}
