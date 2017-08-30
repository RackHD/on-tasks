
// Copyright 2017, EMC, Inc.

'use strict';

var di = require('di');
module.exports = UcsCatalogJobFactory;
di.annotate(UcsCatalogJobFactory, new di.Provide('Job.Ucs.Catalog'));
di.annotate(UcsCatalogJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.UcsTool'
));

function UcsCatalogJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    UcsTool
) {
    var logger = Logger.initialize(UcsCatalogJobFactory);


    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function UcsCatalogJob(options, context, taskId) {
        UcsCatalogJob.super_.call(this,
            logger,
            options,
            context,
            taskId);
        this.nodes = _.union( this.context.physicalNodeList, this.context.logicalNodeList);
        if(_.isEmpty(this.nodes)) {
            this.nodes = [ this.context.target ];
        }
        this.ucs = new UcsTool();
        this.boardChildrenToExtend = [
            //"disk-collection",
            "memarray-collection"
        ];
    }

    util.inherits(UcsCatalogJob, BaseJob);

    /**
     * @memberOf UcsCatalogJob
     */
    UcsCatalogJob.prototype._run = function() {
        var self = this;
        return Promise.map(this.nodes, function(node) {
            return self.catalogServers(node);
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };

    /**
     * @memberOf UcsCatalogJob
     * @param {String} dn: distinguished name of ucs managed object
     * @param {Boolean} withSelfData: boolean value to indicate if to include self data of dn
     * @return {Object}: JSON data got from ucs service
     */
    UcsCatalogJob.prototype._getDataByDN = function (dn, withSelfData) {
        var self = this;
        var groupingPattern = /^(.*)-\d{1,2}$/;
        var url = "/catalog?identifier=" + dn;
        var result = {};
        return self.ucs.clientRequest(url)
        .then(function(res) {
            return res.body;
        })
        .map(function(data) {
            var matched;
            matched = data.rn.match(groupingPattern);

            if(dn === data.dn){
                if(!withSelfData) {
                    return;
                } else {
                    result[data.rn] = data;
                }
            } else {
                if(matched) {
                    var name = matched[1] + "-collection";
                    result[name] = result[name] || [];
                    result[name].push(data);
                } else {
                    result[data.rn] = data;
                }
            }
        })
        .then(function() {
            return result;
        });
    };

    /**
     * @memberOf UcsCatalogJob
     * @param {Object | arrayOfObject} collection: board children object data
     * @return {Object}: JSON data got from ucs service
     */
    UcsCatalogJob.prototype._extendBoardChildCatalog = function(collection) {
        var self = this;
        var _collection;
        if (!_.isArray(collection)) {
            _collection = [collection];
        } else {
            _collection = collection;
        }
        return Promise.map(_collection, function(item) {
            return self._getDataByDN(item.dn)
            .then(function(result) {
                item.children = result;
            });
        });
    };

    /**
     * @memberOf UcsCatalogJob
     * @param {Object} board: board object data
     * @return {Promise}
     */
    UcsCatalogJob.prototype._extendBoardCatalog = function(board) {
        var self = this;
        var extendPromiseList = [];
        var boardKeys = _.keys(board);
        return Promise.try(function(){
            var boardChildrenToExtend = _.cloneDeep(self.boardChildrenToExtend);
            _.forEach(boardKeys, function(key){
                if (_.startsWith(key, "storage-")) {
                    boardChildrenToExtend.push(key);
                }
            });
            _.forEach(boardChildrenToExtend, function(boardChild){
                var boardChildData = board[boardChild];
                extendPromiseList.push(self._extendBoardChildCatalog(boardChildData));
            });
            return Promise.all(extendPromiseList);
        });
    };

    /**
     * @memberOf UcsCatalogJob
     * @param {string} nodeId: node ID
     * @return {Promise}
     */
    UcsCatalogJob.prototype.catalogServers = function(nodeId) {
        var self = this;
        var nodeName = '';
        return self.ucs.setup(nodeId)
        .then(function(){
            return waterline.nodes.getNodeById(nodeId);
        })
        .then(function(node){
            nodeName = node.name;
            return Promise.all([
                self._getDataByDN(nodeName, true),
                self._getDataByDN(nodeName + '/board')
            ])
            .spread(function(nodeResult, boardResult) {
                if(nodeResult.board) {
                    // Get more details under rn="board" as hardware info like memory,
                    // disk, cpu are under rn="board"
                    nodeResult.board.children = boardResult;
                    return self._extendBoardCatalog(boardResult)
                    .then(function() {
                        return nodeResult;
                    });
                }
                return nodeResult;
            });
        })
        .then(function(data) {
            return _.map(data, function(value, key) {
                return waterline.catalogs.create({
                    node: nodeId,
                    source: (value.dn === nodeName) ? 'UCS' : 'UCS:' + key,
                    data: value
                });
            });
        })
        .all(function() {
            return nodeId;
        })
        .catch(function(err) {
            logger.error('Ucs Servers', { error:err });
            if(err.message !== 'No Servers Members') {
                throw err;
            }
            return nodeId; // allow
        });
    };
    return UcsCatalogJob;
}
