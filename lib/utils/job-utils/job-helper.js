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
    'Constants',
    'Promise'
));

function jobHelperFactory(
    assert,
    _,
    encryption,
    lookup,
    Constants,
    Promise
) {
    /**
     *
     * @param {Object} options
     * @returns {Promise}
     */
    function lookupHost (options) {
        if (options.host && Constants.Regex.MacAddress.test(options.host)) {
            return lookup.macAddressToIp(options.host).
                then(function (ipAddress){
                    options.host = ipAddress;
                    return options;
                });
        }else{
            return Promise.resolve(options);
        }
    }

    return {
        lookupHost: lookupHost
    };
}
