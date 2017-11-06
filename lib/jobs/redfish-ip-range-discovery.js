// Copyright 2017, DELL EMC, Inc.

'use strict';

var di = require('di');

module.exports = RedfishIpRangeDiscoveryJobFactory;
di.annotate(RedfishIpRangeDiscoveryJobFactory, new di.Provide('Job.Redfish.Ip.Range.Discovery'));
di.annotate(RedfishIpRangeDiscoveryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    '_',
    'HttpTool',
    'Errors',
    'validator',
    'JobUtils.RedfishTool'
));

function RedfishIpRangeDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    _,
    HttpTool,
    errors,
    validator,
    RedfishTool
) {
    var logger = Logger.initialize(RedfishIpRangeDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function RedfishIpRangeDiscoveryJob(options, context, taskId) {
        RedfishIpRangeDiscoveryJob.super_.call(this,
            logger,
            options,
            context,
            taskId);

        assert.object(this.options);
        this.context.discoverList = [];
        this.redfish = new RedfishTool();
    }

    util.inherits(RedfishIpRangeDiscoveryJob, BaseJob);


    /**
     * @memberOf RedfishIpRangeDiscoveryJob
     */
    RedfishIpRangeDiscoveryJob.prototype._run = function () {
        var self = this;
        return Promise.resolve(self.discover())
            .then(function (){
                self._done();
            })
            .catch(function(err){
                self._done(err);
            });
    };

    RedfishIpRangeDiscoveryJob.prototype.discover = function() {
        var self = this;

        self.options.ranges.forEach(function(entry){
            if (!validator.isIP(entry.startIp)) {
                throw new Error('Invalid IP : (' + entry.startIp + ')');
            }
            if (!entry.endIp) {
                entry.endIp = entry.startIp;
            } else {
                if (!validator.isIP(entry.endIp)) {
                    throw new Error('Invalid IP : (' + entry.endIp + ')');
                }
            }
        });

        var discoverIpList = [];
        self.options.ranges.forEach(function(range){
            if(!range.credentials || !range.credentials.userName || !range.credentials.password) {
                if(!self.options.credentials || !self.options.credentials.userName || !self.options.credentials.password) {
                    throw new Error('No credentials provided for IPs');
                } else {
                    range.credentials = self.options.credentials;
                }
            }
            var subIpList = self.getIpv4List(range);

            discoverIpList = discoverIpList.concat(subIpList);
        });

        // Now test every IP in the range, save valid ones to an array

        return Promise.map(discoverIpList, function (endpoint) {
            return (self.isRedfishEndpoint(endpoint))
            .then(function() {
                var redfishOptions = {
                    uri: endpoint.protocol + '://' + endpoint.host + ':' + endpoint.port + '/redfish/v1',
                    username: endpoint.username,
                    password: endpoint.password
                };

                self.context.discoverList.push(redfishOptions);
                logger.debug('Found valid endpoint at: ' + redfishOptions.uri);
            })
            .catch(function () {
                // endPoint was not found, so continue to the next one
                logger.debug('Did not find valid endpoint at: '+ endpoint.host);
            });
        });
    };


    RedfishIpRangeDiscoveryJob.prototype.getIpv4List = function(entry) {
        var _lastIp = entry.endIp.split(".");
        var _firstIp = entry.startIp.split(".");

        var current;
        var last;
        var ipList = [];

        for(var i=0; i<=3; i=i+1) {
            current |= (parseInt(_firstIp[i])) << ((3-i)*8); // jshint ignore:line
            last    |= (parseInt( _lastIp[i])) << ((3-i)*8); // jshint ignore:line
        }

        while(current <= last){
            var ipAddr = [];

            var ipEntry = {
                host: '',
                port: 0,
                protocol: '',
                username: '',
                password: ''
            };

            for (i = 0; i <= 3; i=i+1) {
                ipAddr[i] = (current >> ((3 - i) * 8)) & 0xff; // jshint ignore:line
            }

            ipEntry.host = ipAddr.join('.');
            ipEntry.username = entry.credentials.userName;
            ipEntry.password = entry.credentials.password;
            ipEntry.port = entry.port || 443;
            ipEntry.protocol = entry.protocol || 'https';

            ipList.push(ipEntry);

            current += 1;
        }

        return ipList;
    };

    RedfishIpRangeDiscoveryJob.prototype.isRedfishEndpoint = function(endpoint) {
        var setups = {};
        setups.url = {};
        setups.url.protocol = endpoint.protocol;
        setups.url.host = endpoint.host;
        setups.url.port = endpoint.port;
        setups.url.path = '/redfish/v1';

        setups.method = 'GET';
        setups.credential = {
            username: endpoint.username || '',
            password: endpoint.password || ''
        };
        setups.verifySSl = false;
        setups.headers = {'Content-Type': 'application/json'};
        setups.recvTimeoutMs = 1800000;
        setups.data = '';

        var http = new HttpTool();

        return http.setupRequest(setups)
            .then(function(){
                return http.runRequest();
            })
            .then(function(response){
                if (response.httpStatusCode > 206) {
                    throw new Error(response.body);
                }

                return response.body;
            })
            .catch(function (error) {
                throw new errors.NotFoundError(error.message);
            });
    };

    return RedfishIpRangeDiscoveryJob;
}

