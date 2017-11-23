// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

var di = require('di'),
    XmlDOM = require('xmldom');

module.exports = NfsClientFactory;
di.annotate(NfsClientFactory, new di.Provide('JobUtils.NfsClient'));
di.annotate(NfsClientFactory, new di.Inject(
    'Logger',
    'Promise',
    'fs',
    'child_process'
));

function NfsClientFactory(
    Logger,
    Promise,
    fs,
    childProcess
){
    var logger = Logger.initialize(NfsClientFactory); // jshint ignore:line
    var XMLSerializer;
    var serializer;

    function NfsClient(shareIP, shareName, mountDir){
        var self = this;
        self.shareIP = shareIP;
        self.shareName = shareName;
        self.mountDir = mountDir;
        XMLSerializer = XmlDOM.XMLSerializer;
        serializer = new XMLSerializer();
    }

    NfsClient.prototype.mount = function(){
        var self = this;
        Promise.resolve().then(function(){
            childProcess.exec(
                'sudo mkdir -p ' + self.mountDir,
                function(mkdirError, stdout, stderr){
                    if(mkdirError){
                        throw mkdirError;
                    }
                    logger.debug('sudo mkdir -p ' + self.mountDir + ' successfully.');
                }
            );
        }).then(function(){
            childProcess.exec(
                'mount ' + self.shareIP + ':' + self.shareName + ' ' + self.mountDir,
                function(mountError, stdout, stderr){
                    if(mountError){
                        throw mountError;
                    }
                    logger.debug('mount ' + self.shareIP + ':' + self.shareName + ' ' + self.mountDir + ' successfully');
                }
            );
        }).catch(function(error){
            logger.error('Error occurs '+ error);
        });
    };

    NfsClient.prototype.umount = function(){
        var self = this;
        childProcess.exec(
            'umount ' + self.mountDir,
            function(umountError, stdout, stderr){
                if(umountError){
                    throw umountError;
                }
                logger.debug('umount ' + self.mountDir + ' successfully');
            }
        );
    };

    NfsClient.prototype.readFile = function(fileName){
        var self = this;
        return new Promise(function(resolve, reject){
            fs.readFile(self.mountDir + '/' + fileName, (readError, data) => {
                if(readError){
                    reject(readError);
                }else{
                    resolve(data);
                }
            });
        });
    };

    NfsClient.prototype.writeFile = function(fileName, doc){
        var self = this;
        return new Promise(function(resolve, reject){
            fs.writeFile(self.mountDir + '/' + fileName, serializer.serializeToString(doc), (writeError) => {
                if(writeError){
                    reject(writeError);
                }else{
                    resolve('successfully write file '+ fileName);
                }
            });
        });
    };

    NfsClient.prototype.deleteFile = function(fileName){
        var self = this;
        return new Promise(function(resolve, reject){
            fs.unlink(self.mountDir + '/' + fileName, (deleteError) => {
                if(deleteError){
                    reject(deleteError);
                }else{
                    resolve('successfully delete file ' + fileName);
                }
            });
        });
    };

    return NfsClient;
}

