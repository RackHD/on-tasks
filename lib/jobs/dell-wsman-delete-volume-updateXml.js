// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di'),
    xmldom = require('xmldom').DOMParser;
module.exports = WsmanDeleteVolumeXmlFactory;
di.annotate(WsmanDeleteVolumeXmlFactory, new di.Provide('Job.Dell.Wsman.Delete.Volume.UpdateXml'));
di.annotate(WsmanDeleteVolumeXmlFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Assert',
    'Util',
    'Services.Configuration',
    'Errors',
    'JobUtils.Smb2Client',
    'JobUtils.NfsClient'
));

function WsmanDeleteVolumeXmlFactory(
    BaseJob,
    Logger,
    assert,
    util,
    configuration,
    errors,
    Smb2Client,
    NfsClient
) {
    var logger = Logger.initialize(WsmanDeleteVolumeXmlFactory);

    function WsmanDeleteVolumeXmlJob(options, context, taskId) {
        WsmanDeleteVolumeXmlJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(WsmanDeleteVolumeXmlJob, BaseJob);

    WsmanDeleteVolumeXmlJob.prototype._run = function () {
        var self = this;
        self.dell = configuration.get('dell');
        if (!self.dell.shareFolder) {
            throw new errors.NotFoundError('The shareFolder is not defined in smiConfig.json.');
        }
        if(self.options.volumeId === ""){
            throw new errors.NotFoundError('The volumeId can not be empty string.');
        }
        self.parseXmlFileForRAID();
    };

    WsmanDeleteVolumeXmlJob.prototype.parseXmlFileForRAID = function(){
        logger.info("Parse xml file for delete volume operation.");
        var self = this;
        var fileName = self.context.graphId +".xml";
        var volumeId = self.options.volumeId;
        if(self.dell.shareFolder.shareType === '0'){
            var nfsClient = new NfsClient(
                self.dell.shareFolder.address,
                self.dell.shareFolder.shareName,
                self.context.mountDir
            );
            return nfsClient.readFile(fileName).then(function(data){
                return self.updateXml(data, volumeId);
            }).then(function(doc){
                return nfsClient.writeFile(fileName, doc);
            }).then(function(){
                self._done();
            }).catch(function(error){
                logger.error('Error occurs', error);
                self._done(error);
            });
        }else{
            var smb2Client = new Smb2Client(
                self.dell.shareFolder.address,
                self.dell.shareFolder.shareName,
                self.dell.shareFolder.username,
                self.dell.shareFolder.password
            );
            return smb2Client.readFile(fileName).then(function(data){
                return self.updateXml(data, volumeId);
            }).then(function(doc){
                return smb2Client.writeFile(fileName, doc);
            }).then(function(){
                self._done();
            }).catch(function(error){
                logger.error('Error occurs', error);
                self._done(error);
            });
        }
    };

    WsmanDeleteVolumeXmlJob.prototype.updateXml = function(fileData, volumeId){
        var xmlFile = String.fromCharCode.apply(null, new Uint16Array(fileData));
        var doc = new xmldom().parseFromString(xmlFile, 'application/xml');
        var components = doc.getElementsByTagName('Component');
        var deleteIndex = [];
        for(var i = 0; i < components.length; i++){       //jshint ignore:line
            var fqdd = components[i].getAttribute('FQDD');
            if(fqdd.split('.')[0] === 'Disk' && fqdd.indexOf('Enclosure') === -1){
                if(fqdd === volumeId){
                    components[i].getElementsByTagName('Attribute')[0].childNodes[0].textContent = "Delete";
                }else{
                    deleteIndex.push(i);
                }
            }
        }
        for(var i = 0; i < deleteIndex.length; i++){       // jshint ignore:line
            doc.documentElement.removeChild(components[deleteIndex[i]]);
        }
        return doc;
    };

    return WsmanDeleteVolumeXmlJob;
}
