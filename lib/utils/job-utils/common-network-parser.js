// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = parseCommonNetworkCommandFactory;
di.annotate(parseCommonNetworkCommandFactory,
        new di.Provide('JobUtils.CommonNetworkCommandParser'));
di.annotate(parseCommonNetworkCommandFactory, new di.Inject(
    'Assert',
    '_'
));

function parseCommonNetworkCommandFactory(
    assert,
    _
) {

    function parsePingData(data) {
        return _.transform(data.split(','),function (result, line) {
            if (line.indexOf('packet loss') >= 0) {
                result['packet loss'] = line.trim().split(' ')[0];
            }
        }, {});
    }

    return {
        parsePingData: parsePingData
    };
}
