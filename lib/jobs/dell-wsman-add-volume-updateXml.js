// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di'),
    xmldom = require('xmldom').DOMParser;
module.exports = WsmanAddVolumeXmlFactory;
di.annotate(WsmanAddVolumeXmlFactory, new di.Provide('Job.Dell.Wsman.Add.Volume.UpdateXml'));
di.annotate(WsmanAddVolumeXmlFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Assert',
    'Util',
    'Services.Configuration',
    'Errors',
    'JobUtils.Smb2Client',
    'JobUtils.NfsClient'
));

function WsmanAddVolumeXmlFactory(
    BaseJob,
    Logger,
    assert,
    util,
    configuration,
    errors,
    Smb2Client,
    NfsClient
) {
    var logger = Logger.initialize(WsmanAddVolumeXmlFactory);

    function WsmanAddVolumeXmlJob(options, context, taskId) {
        WsmanAddVolumeXmlJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(WsmanAddVolumeXmlJob, BaseJob);

    WsmanAddVolumeXmlJob.prototype._run = function () {
        var self = this;
        self.dell = configuration.get('dell');
        if (!self.dell.shareFolder) {
            throw new errors.NotFoundError('The shareFolder is not defined in smiConfig.json.');
        }
        if(self.options.drivers === ""){
            throw new errors.NotFoundError('The drivers can not be empty string.');
        }
        self.parseXmlFileForRAID();
    };

    WsmanAddVolumeXmlJob.prototype.parseXmlFileForRAID = function(){
        logger.info("Parse xml file for delete volume operation.");
        var self = this;
        var fileName = self.context.graphId +".xml";
        var client;
        if(self.dell.shareFolder.shareType === 0){
            client = new NfsClient(
                self.dell.shareFolder.address,

                self.dell.shareFolder.shareName,
                self.context.mountDir
            );
        }else if(self.dell.shareFolder.shareType === 2){
            client = new Smb2Client(
                self.dell.shareFolder.address,
                self.dell.shareFolder.shareName,
                self.dell.shareFolder.username,
                self.dell.shareFolder.password
            );
        }else{
            throw new Error('The shareType must be 0 or 2.');
        }
        return client.readFile(fileName).then(function(data){
            return self.updateXml(
                data,
                self.options.drivers,
                self.options.raidLevel,
                self.options.name,
                self.options.stripeSize,
                self.options.writePolicy
            );
        }).then(function(doc){
            return client.writeFile(fileName, doc);
        }).then(function(){
            self._done();
        }).catch(function(error){
            logger.error('Error occurs', error);
            self._done(error);
        });
    };

    WsmanAddVolumeXmlJob.prototype.updateXml = function(data, drivers, raidLevel, name, stripeSize, writePolicy){
        var self = this;
        var xmlFile = String.fromCharCode.apply(null, new Uint16Array(data));
        var doc = new xmldom().parseFromString(xmlFile, 'application/xml');
        var components = doc.getElementsByTagName('Component');
        var index = [], enclosureIndex = [], bayIndex = [], insertIndex;
        var attributes = [
            {
                "name": "RAIDaction",
                "textContent": "Create"
            },
            {
                "name": "LockStatus",
                "textContent": "Unlocked"
            },
            {
                "name": "RAIDinitOperation",
                "textContent": "None"
            },
            {
                "name": "DiskCachePolicy",
                "textContent": "Default"
            },
            {
                "name": "RAIDdefaultWritePolicy",
                "textContent": writePolicy
            },
            {
                "name": "RAIDdefaultReadPolicy",
                "textContent": "NoReadAhead"
            },
            {
                "name": "Name",
                "textContent": name
            },
            {
                "name": "Size",
                "textContent": "0"
            },
            {
                "name": "StripeSize",
                "textContent": stripeSize
            },
            {
                "name": "SpanDepth",
                "textContent": "1"
            },
            {
                "name": "SpanLength",
                "textContent": "2"
            },
            {
                "name": "RAIDTypes",
                "textContent": raidLevel
            }
        ];
        var driversArray = drivers.split(',');
        for(var i = 0; i < driversArray.length; i++){
            attributes.push({
                "name": 'IncludedPhysicalDiskID',
                "textContent": driversArray[i]
            });
        }
        for(var i = 0; i < components.length; i++){
            var fqdd = components[i].getAttribute('FQDD');
            if(fqdd.split('.')[0] === 'Disk' && fqdd.indexOf('Enclosure') === -1){
                index.push(i);
            }
            if(driversArray.indexOf(fqdd) !== -1){
                enclosureIndex.push(i);
            }
            if(fqdd.split('.')[0] === 'Enclosure'){
                insertIndex = i;
            }
            if(fqdd.indexOf('Disk.Bay') !== -1 && driversArray.indexOf(fqdd) === -1){
                bayIndex.push(i);
            }
        }
        for(var i = 0; i < index.length; i++){
            doc.documentElement.removeChild(components[index[i]]);
        }
        for(var i = 0; i< bayIndex.length; i++){
            doc.documentElement.removeChild(components[bayIndex[i]]);
        }
        var ele  = doc.createElement("Component");
        var driver = self.options.drivers.split(',')[0];
        var fqddName = 'Disk.Virtual:' + driver.slice(driver.lastIndexOf(':')+1, driver.length);
        ele.setAttribute('FQDD', fqddName);
        doc.insertBefore(ele, components[insertIndex]);
        for(var i = 0; i < attributes.length; i++){
            var newNode = doc.createElement("Attribute");
            newNode.setAttribute('Name', attributes[i].name);
            var textNode = doc.createTextNode(attributes[i].textContent);
            newNode.appendChild(textNode);
            ele.appendChild(newNode);
        }
        for(var i = 0; i < enclosureIndex.length; i++){
            var newNodeForStatus = ele.getElementsByTagName('Attribute')[0].cloneNode(true);
            newNodeForStatus.setAttribute('Name', 'RAIDHotSpareStatus');
            newNodeForStatus.childNodes[0].textContent = 'No';
            var newNodeForState = ele.getElementsByTagName('Attribute')[0].cloneNode(true);
            newNodeForState.setAttribute('Name', 'RAIDPDState');
            newNodeForState.childNodes[0].textContent = 'Ready';
            components[enclosureIndex[i]].appendChild(newNodeForStatus);
            components[enclosureIndex[i]].appendChild(newNodeForState);
        }
        return doc;
    };
    return WsmanAddVolumeXmlJob;
}
