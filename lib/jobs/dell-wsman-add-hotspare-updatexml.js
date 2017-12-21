// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di'),
    xmldom = require('xmldom').DOMParser;

module.exports = WsmanAddHotspareUpdateXmlFactory;

di.annotate(WsmanAddHotspareUpdateXmlFactory, new di.Provide('Job.Dell.Wsman.Add.Hotspare.UpdateXml'));
di.annotate(WsmanAddHotspareUpdateXmlFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Assert',
    'Util',
    'Services.Configuration',
    'Errors',
    'JobUtils.Smb2Client',
    'JobUtils.NfsClient',
    'Promise',
    '_'
));

function WsmanAddHotspareUpdateXmlFactory(
    BaseJob,
    Logger,
    assert,
    util,
    configuration,
    errors,
    Smb2Client,
    NfsClient,
    Promise,
    _
) {
    var logger = Logger.initialize(WsmanAddHotspareUpdateXmlFactory);

    function WsmanAddHotspareUpdateXmlJob(options, context, taskId) {
        WsmanAddHotspareUpdateXmlJob.super_.call(this, logger, options, context, taskId);
    }

    util.inherits(WsmanAddHotspareUpdateXmlJob, BaseJob);

    WsmanAddHotspareUpdateXmlJob.prototype._run = function() {
        var self = this;
        if(!self.options.driveId) {
            throw new errors.NotFoundError('The driveId should not be empty.');
        }
        self.dell = configuration.get('dell');
        if(!self.dell || !self.dell.shareFolder) {
            throw new errors.NotFoundError('Share folder is not defined in smiConfig.json');
        }
        return self.updateXmlForRaid();
    };

    WsmanAddHotspareUpdateXmlJob.prototype.updateXmlForRaid = function() {
        var self = this;
        var fileName = self.context.graphId + '.xml';
        var client;
        return Promise.try(function() {
            if(self.dell.shareFolder.shareType === 0) {
                client = new NfsClient(
                    self.dell.shareFolder.address,
                    self.dell.shareFolder.shareName,
                    self.context.mountDir
                );
            } else if(self.dell.shareFolder.shareType === 2) {
                client = new Smb2Client(
                    self.dell.shareFolder.address,
                    self.dell.shareFolder.shareName,
                    self.dell.shareFolder.username,
                    self.dell.shareFolder.password
                );
            } else {
                throw new Error('Invalid shareType in smiConfig.json. The shareType should be 0 or 2.');
            }
            return client.readFile(fileName);
        })
        .then(function(data) {
            return self.updateXml(data);
        })
        .then(function(doc) {
            return client.writeFile(fileName, doc);
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            logger.error('An error occurred while updating component xml.', { error: err });
            self._done(err);
        });
    };

    WsmanAddHotspareUpdateXmlJob.prototype.updateXml = function(data) {
        var self = this;
        var xmlFile = String.fromCharCode.apply(null, new Uint16Array(data));
        var doc = new xmldom().parseFromString(xmlFile, 'application/xml');
        if(self.options.hotspareType === 'dhs') {
            self.updateVolumeElement(doc);
        } else {
            self.updateDiskElement(doc);
        }
        return doc;
    };

    /*
     * Dedicated hotspare should be added into corresponding volume
     */
    WsmanAddHotspareUpdateXmlJob.prototype.updateVolumeElement = function(doc) {
        var self = this;
        if(!self.options.volumeId) {
            throw new errors.NotFoundError('The volumeId should not be empty.');
        }
        var components = doc.getElementsByTagName('Component');
        _.forEach(components, function(component) {
            var volumeFQDD = component.getAttribute('FQDD');
            if(volumeFQDD === self.options.volumeId) {
                var newNode = doc.createElement('Attribute');
                newNode.setAttribute('Name', 'RAIDdedicatedSpare');
                newNode.textContent = self.options.driveId;
                component.appendChild(newNode);
                var breakLineChild = doc.createTextNode('\n');
                component.appendChild(breakLineChild);
                return false;
            }
        });
    };

    /*
     * Update hotspare status of specified drive
     */
    WsmanAddHotspareUpdateXmlJob.prototype.updateDiskElement = function(doc) {
        var self = this;
        var components = doc.getElementsByTagName('Component');
        _.forEach(components, function(component) {
            var diskFQDD = component.getAttribute('FQDD');
            if(diskFQDD === self.options.driveId) {
                //create a new drive node, to replace the original one
                var newDriveNode = doc.createElement('Component');
                newDriveNode.setAttribute('FQDD', diskFQDD);

                //create children nodes for the new drive node
                var statusChild = doc.createElement('Attribute');
                statusChild.setAttribute('Name', 'RAIDHotSpareStatus');
                statusChild.textContent = 'Global';
                var stateChild = doc.createElement('Attribute');
                stateChild.setAttribute('Name', 'RAIDPDState');
                stateChild.textContent = 'Ready';

                //create and insert break line child into new drive node,
                //before inserting each attribute child
                var breakLineChild = doc.createTextNode('\n');
                newDriveNode.appendChild(breakLineChild);
                newDriveNode.appendChild(statusChild);

                breakLineChild = doc.createTextNode('\n');
                newDriveNode.appendChild(breakLineChild);
                newDriveNode.appendChild(stateChild);

                breakLineChild = doc.createTextNode('\n');
                newDriveNode.appendChild(breakLineChild);

                //replace the original drive node
                doc.replaceChild(newDriveNode, component);
                return false;
            }
        });
    };

    return WsmanAddHotspareUpdateXmlJob;
}
