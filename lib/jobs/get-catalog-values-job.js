'use strict';

var di = require('di');

module.exports = getCatalogValuesJobFactory;
di.annotate(getCatalogValuesJobFactory, new di.Provide('Job.Get.Catalog.Values'));
di.annotate(getCatalogValuesJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Services.Waterline',
    'Util',
    '_'
));

function getCatalogValuesJobFactory(
    BaseJob,
    Logger,
    waterline,
    util,
    _
){
    var logger = Logger.initialize(getCatalogValuesJobFactory);

    /**
     * This job finds one or more requested values from one or more specified catalogs.
     * The catalog values are made available in the shared context in an object that 
     * maps the catalog values to requester provided keys.
     *
     * Example requestedData array:
     * [{
     *   "source": "ohai",
     *   "keys": {
     *     "myIPAddrKeyName": "data.ipaddress"
     *   }
     * }]
     *
     * Adds to context.data:
     * {
     *   "myIPAddrKeyName": <catalog value>
     * }
     *
     * @param options
     * @param context
     * @param taskId
     * @constructor
     */

    function GetCatalogValuesJob(options, context, taskId){
        GetCatalogValuesJob.super_.call(this, logger, options, context, taskId);
        this.nodeId = context.target;
        this.options = options;
        this.logger = logger;
    }

    util.inherits(GetCatalogValuesJob, BaseJob);

    /**
     * @memberOf GetCatalogValuesJob
     */
    GetCatalogValuesJob.prototype._run = function _run(){
        var self = this,
            newObj = {};

        // Get the correct catalog based on source
        _.forEach(self.options.requestedData, function(catalogInfo){
            waterline.catalogs.findOne({
                'node': self.nodeId, 'source': catalogInfo.source
            })
                .then(function(catalog){
                    _.assign(newObj, _.mapValues(catalogInfo.keys, function(val){
                        return _.get(catalog, val, '');
                    }));
                })
                .then(function(){
                    self.context.data = newObj;
                    self._done();
                })
                .catch(function(err){
                    self._done(err);
                });
        });
    };

    return GetCatalogValuesJob;
}
