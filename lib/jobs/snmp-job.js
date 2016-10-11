// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = snmpJobFactory;
di.annotate(snmpJobFactory, new di.Provide('Job.Snmp'));
di.annotate(snmpJobFactory, new di.Inject(
    'Job.Base',
    'JobUtils.Snmptool',
    'Constants',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_',
    'Services.Waterline',
    di.Injector,
    'JobUtils.PollerHelper',
    'anchor',
    'Services.Environment',
    'Protocol.Task'
));

function snmpJobFactory(
    BaseJob,
    SnmpTool,
    Constants,
    Logger,
    util,
    assert,
    Promise,
    _,
    waterline,
    injector,
    pollerHelper,
    anchor,
    env,
    taskProtocol
) {
    var logger = Logger.initialize(snmpJobFactory);

    /**
     *
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function SnmpJob(options, context, taskId) {
        SnmpJob.super_.call(this, logger, options, context, taskId);
        this.concurrent = {};
        this.resultCache = {};
        this.maxConcurrent = 1;
        this.routingKey = context.graphId;
        assert.uuid(this.routingKey, 'routing key uuid');
    }

    util.inherits(SnmpJob, BaseJob);

    SnmpJob.prototype.concurrentRequests = function(host, workItemId) {
        assert.string(host);
        assert.string(workItemId);
        if(!_.has(this.concurrent, host)){
            this.concurrent[host] = {};
        }
        if(!_.has(this.concurrent[host], workItemId)){
            this.concurrent[host][workItemId] = 0;
        }
        if(this.concurrent[host][workItemId] >= this.maxConcurrent){
            return true;
        } else {
            return false;
        }
    };

    SnmpJob.prototype.addConcurrentRequest = function(host, workItemId) {
        assert.number(this.concurrent[host][workItemId]);
        this.concurrent[host][workItemId] += 1;
    };

    SnmpJob.prototype.removeConcurrentRequest = function(host, workItemId) {
        assert.number(this.concurrent[host][workItemId]);
        this.concurrent[host][workItemId] -= 1;
    };

    SnmpJob.prototype._snmpCommandCallback = function(data) {
        var self = this;

        if (self.concurrentRequests(data.host, data.workItemId)) {
            return;
        }
        self.addConcurrentRequest(data.host, data.workItemId);

        return Promise.try(function() {
            assert.object(data.config, 'SNMP poller data config');
            assert.ok(data.config.metric || data.config.oids, 'Unknown poller implementation');
            return waterline.nodes.needByIdentifier(data.node);
        })
        .then(function(nodeObj) {
            if(nodeObj && nodeObj.sku) {
                return env.get('config.snmp', {}, [ nodeObj.sku ]);
            }
            return {};
        })
        .then(function(skuConfig) {
            self.skuSnmpConfig = skuConfig;
            var keyName = [ data.workItemId, (data.config.metric || 'oids') ].join('.');
            var prevSample = _.cloneDeep(_.get(self.resultCache, keyName, {}));

            if (data.config.metric) {
                return self._collectMetricData(data)
                .then(function(result) {
                    data.result = result;
                    self._publishMetricResult(self.routingKey, data.config.metric, data);
                    return prevSample;
                });
            } else if (data.config.oids){
                data.config.oids = _.union(data.config.oids, skuConfig.oids);
                var snmptool = new SnmpTool(data.host, data.community);
                var options = { numericOutput: true };
                return snmptool.collectHostSnmp(data.config.oids, options)
                .then(function(result) {
                    data.result = result;
                    _.set(self.resultCache, keyName, _.reduce(result, function(res, obj) {
                        _.forEach(obj.values, function(val, key) {
                            res[key] = val;
                        });
                        return res;
                    }, {}));
                    self._publishSnmpCommandResult(self.routingKey, data);
                    return prevSample;
                });
            } else {
                throw new Error("Unknown poller implementation.  No recognized config keys");
            }
        })
        .then(function(lastSample) {
            return self._determineAlert(data, lastSample);
        })
        .then(function() {
            return waterline.workitems.findOne({ id: data.workItemId });
        })
        .then(function(workitem) {
            return pollerHelper.getNodeAlertMsg(workitem.node, workitem.state, "accessible")
            .tap(function(message){
                return waterline.workitems.setSucceeded(null, message, workitem);
            });
        })
        .catch(function (err) {
            logger.warning("Failed to capture data through SNMP.", {
                data: data,
                error: err
            });
            return waterline.workitems.findOne({ id: data.workItemId})
            .then(function(workitem) {
                return pollerHelper.getNodeAlertMsg(workitem.node, workitem.state, "inaccessible")
                .tap(function(message){
                    return waterline.workitems.setFailed(null, message, workitem);
                });
            });
        })
        .finally(function() {
            self.removeConcurrentRequest(data.host, data.workItemId);
        });
    };

    /**
     * @memberOf SnmpJob
     */
    SnmpJob.prototype._run = function() {
        // NOTE: this job will run indefinitely absent user intervention
        var self = this;

        return waterline.workitems.update({name: "Pollers.SNMP"}, {failureCount: 0})
        .then(function() {
            self._subscribeRunSnmpCommand(self.routingKey, self._snmpCommandCallback.bind(self));
        })
        .catch(function(err) {
            logger.error("Failed to initialize job", { error:err });
            self._done(err);
        });
    };
    
    /**
     * @memberOf SnmpJob
     */
    SnmpJob.prototype._collectMetricData = function(data) {
        var self = this;
        assert.object(data);
        assert.object(data.config);
        assert.string(data.config.metric);
        var Metric, metric;
        if(!_.has(self.resultCache, data.workItemId)) {
            self.resultCache[data.workItemId] = {};
            self.resultCache[data.workItemId][data.config.metric] = {};
        }
        switch (data.config.metric) {
            case Constants.WorkItems.Pollers.Metrics.SnmpInterfaceBandwidthUtilization:
                Metric = injector.get('JobUtils.Metrics.Snmp.InterfaceBandwidthUtilizationMetric');
                metric = new Metric(data.node, data.host, data.community, data.pollInterval);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpInterfaceState:
                Metric = injector.get('JobUtils.Metrics.Snmp.InterfaceStateMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpProcessorLoad:
                Metric = injector.get('JobUtils.Metrics.Snmp.ProcessorLoadMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpMemoryUsage:
                Metric = injector.get('JobUtils.Metrics.Snmp.MemoryUsageMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpPduPowerStatus:
                Metric = injector.get('JobUtils.Metrics.Snmp.PduPowerMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpPduSensorStatus:
                Metric = injector.get('JobUtils.Metrics.Snmp.PduSensorMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpTxRxCounters:
                Metric = injector.get('JobUtils.Metrics.Snmp.TxRxCountersMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            case Constants.WorkItems.Pollers.Metrics.SnmpSwitchSensorStatus:
                Metric = injector.get('JobUtils.Metrics.Snmp.SwitchSensorMetric');
                metric = new Metric(data.node, data.host, data.community);
                break;
            default:
                throw new Error("Unknown poller metric name: " + data.config.metric);
        }
        
        var dataCopy = _.cloneDeep(data);
        dataCopy.cache = self.resultCache;
        dataCopy.routingKey = self.routingKey;
        return metric.collectMetricData(dataCopy)
        .then(function(results) {
            self.resultCache[data.workItemId][data.config.metric] = _.cloneDeep(results);
            return results; 
        });
    };

    function doesMatch(stringOrRegex, inString) {
        try {
            return stringOrRegex.test(inString);
        } catch (err) {
            return (stringOrRegex === inString);
        }
    }


    function dotNotation(obj, tgt, path) {
        tgt = tgt || {};
        path = path || [];
        Object.keys(obj).forEach(function(key) {
            if (Object(obj[key]) === obj[key] && 
               (Object.prototype.toString.call(obj[key]) === '[object Object]') || 
               Object.prototype.toString.call(obj[key]) === '[object Array]') {
                return dotNotation(obj[key], tgt, path.concat(key));
            } else {
                tgt[path.concat(key).join('.')] = obj[key];
            }
        });
        return tgt;
    }

    function convertToRegex(str) {
        if(_.isString(str) && str[0] === '/' && _.last(str) === '/') {
            var regexString = str.slice(1, str.length-1);
            var regex = new RegExp(regexString);
            return regex;
        }
        return str;
    }

    function convertFromRegex(str) {
        if(_.isString(str)) {
            return str;
        }
        return str.toString();
    }

    SnmpJob.prototype._determineAlert = function _determineAlert(data, previous) {
        var self = this;
        var alerts = _.reduce( _.merge({}, _.get(self.skuSnmpConfig, 'alerts', {}), data.config.alerts),
            function(result, val) {
                _.keys(val).forEach(function(key) {
                    result.push({
                        oidMatch: convertToRegex(key),
                        valMatch: convertToRegex(val[key])
                    });
                });
                return result;
            }, []);
        
        var currentData = data.result;
        if(data.config.oids) {
            currentData = _.reduce(data.result, function(result, obj) {
                _.forEach(obj.values, function(val, key) {
                    result[key] = val;
                });
                return result;
            }, {});
        }

        if (_.isEmpty(alerts) || !currentData) {
            return Promise.resolve([]);
        }

        // Transform the current data into a dot notation representation
        // and compare between any input previous result set to alert on change
        // or new keys.
        var dotPre = dotNotation(previous || {});
        var dottedResult = _.reduce(dotNotation(currentData), function(result, val, key) {
            if(_.has(dotPre, key)) {
                if(!(_.isEqual(dotPre[key], val) || (_.isNaN(dotPre[key]) && _.isNaN(val)))) {
                    result[key] = val;
                }
            } else {
                result[key] = val;
            }
            return result;
        }, {});

        var alertMatches = _.reduce(_.keys(dottedResult), function(result, key) {
            _.forEach(alerts, function(alert) {
                if(doesMatch(alert.oidMatch, key)) {
                    if(_.isRegExp(alert.valMatch) || _.isString(alert.valMatch)) {
                        if(doesMatch(alert.valMatch, dottedResult[key]) ) {
                            result.push({
                                oid: key,
                                value: dottedResult[key],
                                matched: convertFromRegex(alert.valMatch)
                            });
                        }
                    } else if(_.isObject(alert.valMatch)) {
                        if(_.isEmpty(anchor(dottedResult[key]).to(_.omit(alert.valMatch, ['severity', 'desc'])) || [])) {
                            result.push(_.merge({
                                oid: key,
                                value: dottedResult[key],
                                matched: _.omit(alert.valMatch, ['severity', 'desc'])
                            }, _.pick(alert.valMatch, ['severity', 'desc'])));
                        }
                    }
                }
            });
            return result;
        }, []);

        return Promise.each(alertMatches, function(alertMatch) {
            var alertVal = {
                host: data.host,
                oid: alertMatch.oid,
                value: alertMatch.value,
                nodeRef: '/nodes/' + data.node,
                dataRef: '/pollers/' + data.workItemId + '/data/current',
                matched: alertMatch.matched
            };
            if(alertMatch.severity) {
                if(alertMatch.severity === 'ignore') {
                    return;
                }
                alertVal.severity = alertMatch.severity;
            }
            if(alertMatch.desc) {
                alertVal.description = alertMatch.desc;
            }
            if(data.config.metric) {
                alertVal.metric = data.config.metric;
            }
            return taskProtocol.publishPollerAlert(self.routingKey, 'snmp', alertVal);
        });
    };

    return SnmpJob;
}
