// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di'),
    XmlDOM = require('xmldom'),
    SMB2 = require('smb2');

module.exports = Smb2ClientFactory;
di.annotate(Smb2ClientFactory, new di.Provide('JobUtils.Smb2Client'));
di.annotate(Smb2ClientFactory, new di.Inject(
    'Logger',
    'Promise'
));

function Smb2ClientFactory(
    Logger,
    Promise
){
    var logger = Logger.initialize(Smb2ClientFactory);
    var xmldom,
        smb2Client,
        XMLSerializer,
        serializer;

    function Smb2Client(shareIP, shareName, userName, password){
        xmldom = XmlDOM.DOMParser;
        smb2Client = new SMB2({
            share: '\\\\'+ shareIP + '\\' + shareName,
            domain: 'DOMAIN',
            username: userName,
            password: password
        });
        XMLSerializer = XmlDOM.XMLSerializer;
        serializer = new XMLSerializer();
    }

    Smb2Client.prototype.readFile = function(fileName){
        logger.info("Smb2Client readFile function, fileName:" + fileName);
        return new Promise(function(resolve, reject){
            smb2Client.readFile(fileName, 'utf-8',function(readError, data) {
                if(readError){
                    reject(readError);
                }else{
                    resolve(data);
                }
            });
        });
    };

    Smb2Client.prototype.writeFile = function(fileName, doc){
        logger.info("Smb2Client writeFile function, fileName:" + fileName);
        return new Promise(function(resolve, reject){
            smb2Client.writeFile(fileName, serializer.serializeToString(doc), function (writeError){
                if (writeError){
                    reject(writeError);
                }else{
                    resolve('write file successfully');
                }
            });
        });
    };

    return Smb2Client;
}

