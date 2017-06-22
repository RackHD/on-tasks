// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');
var http = require('http');

module.exports = osRepoToolFactory;
di.annotate(osRepoToolFactory, new di.Provide('JobUtils.OsRepoTool'));
di.annotate(osRepoToolFactory, new di.Inject(
    'Assert',
    '_',
    'Promise'
));

function osRepoToolFactory(
    assert,
    _,
    Promise
){
    function OsRepoTool() {
    }

    /**
     * Download a file from external HTTP repository
     * @param {String} urlPath - The url path for specified file
     * @return {Promise} The promise that handle the downloading, the promise will be resolved by
     * the file content.
     */
    OsRepoTool.prototype.downloadViaHttp = function (urlPath) {
        var data = '';
        return new Promise(function (resolve, reject) {
            const req = http.get(urlPath, function(resp) {
                if (resp.statusCode < 200 || resp.statusCode > 299) {
                    reject(new Error('Fail to download ' + urlPath +
                                     ', statusCode=' + resp.statusCode.toString()));
                }
                resp.on('data', function(chunk) {
                    data += chunk;
                });
                resp.on('end', function() {
                   resolve(data);
                });
                resp.on('error', function() {
                    reject(new Error('Failed to download file from url ' + urlPath));
                });
            });
            req.on('error', function(err) {
                reject(new Error('Fail to download ' + urlPath + ', err=' + err.toString()));
            });
        });
    };

    /**
     * Parse the ESXi boot config file and extract the modules address
     * @memberof OsRepoTool
     * @param {String} fileData - The boot.cfg (BOOT.CFG) data that in the ESXi repository
     * @param {String} repo - The address of external repository
     * @return {Object} The object that contains all local path for ESXi modules
     */
    OsRepoTool.prototype.parseEsxBootCfgFile = function(fileData) {
        var params = [ {
                key: 'tbootFile',
                pattern: 'kernel='
            }, {
                key: 'moduleFiles',
                pattern: 'modules='
            }
        ];

        var result = {};
        _.forEach(params, function(param) {
            var value = _extractEsxBootCfgValue(fileData, param.pattern);
            result[param.key] = value.toLowerCase().replace(/\//g, '');
        });

        result.mbootFile ='mboot.c32';
        return result;
    };

    /**
     * Extract the value from a whole data by key.
     * @param {String} data - The whole data that cotains all key-value pairs
     * @param {String} key - The key for target value including the key-value delimiter
     * @return {String} The extracted value; If key is not exsited, return empty.
     * @example
     * // return "12xyz - pmq"
     * _extractEsxiBootCfgValue("key1=abc def\nkey2=12xyz - pmq\nkey3=pmq,abq", "key2=")
     */
    function _extractEsxBootCfgValue(data, pattern) {
        var pos = data.indexOf(pattern);
        if (pos >= 0) {
            pos += pattern.length;
            var lineEndPos = data.indexOf('\n', pos);
            if (lineEndPos >= 0) {
                return data.substring(pos, lineEndPos);
            }
        }
        return '';
    }

    return new OsRepoTool();
}
