
// Copyright 2017, Dell EMC, Inc.

'use strict';

var di = require('di');

module.exports = diagUpdateSpiRomFactory;
di.annotate(diagUpdateSpiRomFactory, new di.Provide('Job.Diag.Update.Spirom'));
di.annotate(diagUpdateSpiRomFactory, new di.Inject(
    'Job.Base',
    'JobUtils.DiagTool',
    'Logger',
    'Util',
    'Assert',
    'Promise',
    '_'
));

function diagUpdateSpiRomFactory(
    BaseJob,
    DiagTool,
    Logger,
    util,
    assert,
    Promise,
    _
) {
    var logger = Logger.initialize(diagUpdateSpiRomFactory);
    function DiagUpdateSpiRom(options, context, taskId) {
        DiagUpdateSpiRom.super_.call(this, logger, options, context, taskId);

        this.nodeId = this.context.target;
        this.settings = {};
        this.localImagePath = options.localImagePath;
        this.imageName = options.imageName;
        this.imageMode = options.imageMode;
        this.modeMapping = {
            'fullbios': '0',
            'bios': '1',
            'uefi': '2',
            'serdes': '3',
            'post': '4',
            'me': '5'
        };
    }
    util.inherits(DiagUpdateSpiRom, BaseJob);

    /**
     * @memberOf DiagUpdateSpiRom
     */
    DiagUpdateSpiRom.prototype._run = function() {
        var self = this;
        var diagTool;

        return Promise.try(function(){
            return self.getNodeIp();
        })
        .then(function(ip){
            self.settings.host = ip;
            diagTool = new DiagTool(self.settings, self.nodeId);
        })
        .then(function(){
            return diagTool.retrySyncDiscovery(5000, 6);
        })
        .then(function(){
            return diagTool.uploadImageFile(self.localImagePath);
        })
        .then(function(){
            return diagTool.getDeviceInfo();
        })
        .then(function(deviceInfo){
            var imageMode = parseInt(self.imageMode);
            if (_.isNaN(imageMode)){
                self.imageMode = self.modeMapping[self.imageMode];
            } else {
                self.imageMode = _(imageMode).toString();
            }
            return diagTool.updateSpiRom(deviceInfo.slot, self.imageName, self.imageMode)
            .then(function(){
                return deviceInfo.href;
            });
        })
        .then(function(deviceApi){
            return diagTool.getSpTestList(deviceApi);
        })
        .then(function(testList){
            var resetApi = diagTool.getTestApiByName('warm_reset', testList);
            return diagTool.executeSpTest(resetApi);
        })
        .then(function(){
            self._done();
        })
        .catch(function(err){
            self._done(err);
        });
    };

    DiagUpdateSpiRom.prototype.getNodeIp = function(){
        var ip = this.context.nodeIp;
        assert.isIP(ip, 4);
        return ip;
    };

    return DiagUpdateSpiRom;
}
