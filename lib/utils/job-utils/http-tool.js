//Copyright 2016, EMC, Inc.

/*jshint node: true*/
/*jshint multistr: true*/ 

'use strict';

var di = require('di');

module.exports = HttpFactory;

di.annotate(HttpFactory, new di.Provide('JobUtils.HttpTool'));
di.annotate(HttpFactory, new di.Inject(
    'Assert',
    'Promise',
    '_'
));

function HttpFactory(assert, Promise, _) {
    
    /**
    * Tool class that does HTTP methods
    * @constructor
    */
    function HttpTool(){
        this.settings = {};
        this.urlObject = {};
        this.dataToWrite = '';
        // ********** Helper Functions/Members **********
        
        var validMethods = ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'];
        
        /**
        * Make sure that settings has at least property of url and method.
        * @return {boolean} whether settings is valid.
        */ 
        this.isSettingValid = function(settings){
            if (_.isEmpty(settings)) {
                return false;
            }
            if ( ! (settings.hasOwnProperty('url') && settings.hasOwnProperty('method'))) {
                return false;
            }
            if (_.isEmpty(settings.url) || _.isEmpty(settings.method)) {
                return false;
            }
            if (_.indexOf(validMethods, settings.method) === -1) {
                return false;    
            }

            return true;
        };

        /**
        * Parse and convert setting into a urlObject that suitable for 
        * http/https module in NodeJs.
        * @return {object} - the object that suitable for Node http/https module.
        */
        this.setupUrlOptions = function(settings) {
                
            var urlTool = require('url');
            var urlObject = {};

            // Parse the string into url options
            if (typeof (settings.url) === 'string') {
                urlObject = urlTool.parse(settings.url);
            }
            else {
                urlObject = settings.url;
            }
            // set the REST options
            urlObject.method = settings.method;
        
            // set up the REST headers
            if (! _.isEmpty(settings.headers)){
                urlObject.headers = settings.headers;
            }
            else {
                urlObject.headers = {};
            }
            
            urlObject.headers['Content-Length'] = 0;
            if (settings.hasOwnProperty('data')){
                switch (typeof settings.data) {
                    case 'object':
                        this.dataToWrite = JSON.stringify(settings.data);
                        urlObject.headers['Content-Type'] = 'application/json';
                        break;
                    case 'string':
                        this.dataToWrite = settings.data;
                        break;
                    default:
                        throw new TypeError("Data field can only be object or string," + 
                                            " but got " + (typeof settings.data));
                                        }
                urlObject.headers['Content-Length'] = Buffer.byteLength(this.dataToWrite);
            }
            
            if (! _.isEmpty(settings.credential)){
                if (!_.isEmpty(settings.credential.password) &&
                    _.isEmpty(settings.credential.username)) {
                    throw new Error('Please provide username and password '+
                                    'for basic authentication.');
                }
                else {
                    urlObject.auth = settings.credential.username +':'+
                    settings.credential.password;
                }
            }
            
            // set the protolcol paramter
            if (urlObject.protocol.substr(-1) !== ':') {
                urlObject.protocol = urlObject.protocol + ':';
            }

            urlObject.rejectUnauthorized = settings.verifySSL || false;
            urlObject.recvTimeoutMs = settings.recvTimeoutMs;

            return urlObject;
        };
    }
    
    /**
    * Set up the Request
    * @param {object} settings - the object that provides the infomation 
    * of all the works, example:
    * {
    *   url: "https://somewhat.website.com:some-port/some/path/to/file",
    *   method: "GET"/"PUT"/"POST"/"DELETE"/"PATCH",
    *   credential: {username: "foo", password: "bar"},
    *   headers: {"token":"whatever-cookie-file"},
    *   data: "Hello world",
    *   verifySSL: false,
    *   recvTimeoutMs: 2000
    * }
    * OR
    * {
    *   url: {
    *       protocol: "https",
    *       host: "somewhat.website.com",
    *       port: "some-port",
    *       path: "/some/path/to/file"
    *   },
    *   method: "GET"/"PUT"/"POST"/"DELETE"/"PATCH",
    *   credential: {username: "foo", password: "bar"},
    *   headers: {"token":"whatever-cookie-file"},
    *   data: "Hello world",
    *   verifySSL: false,
    *   recvTimeoutMs: 2000
    * }
    *
    * @return {Promise}
    *   resolve() - do whatever next
    *   reject(err) - do whatever you want with the err
    */

    HttpTool.prototype.setupRequest = function(settings) {
        var self = this;
        var err;
        return new Promise(function(resolve, reject) {
            if (! self.isSettingValid(settings)) {
                err = new Error('Please provide at least url and'+
                                     ' valid method to use HTTP tool!');
                reject(err);
            }
            else {
                self.settings = settings;
                resolve();
            }});
    };
    
    /**
    * Run the request based on checked result
    */ 
    HttpTool.prototype.runRequest = function() {
        var httpTool;
        var self = this;
        var toolName = 'http';
                 
        return new Promise(function(resolve, reject) {
            try {
                self.urlObject = self.setupUrlOptions(self.settings);
            } catch(err) {
                reject(err);
            }

            // naming requirements: module name = 'http', urlObjectName = 'http:'
            toolName = self.urlObject.protocol.substr(0, self.urlObject.protocol.length - 1);
            httpTool = require(toolName);

            var request  = httpTool.request(self.urlObject, function(response){
                var result = {
                    httpVersion : response.httpVersion,
                    httpStatusCode : response.statusCode,
                    headers: response.headers,
                    body : '',
                    trailers: response.trailers
                };
                response.on('data', function(chunk){
                    result.body += chunk;
                });
                response.on('end', function(){
                    resolve(result);
                });
            });            
            
            if (self.urlObject.method === 'POST' || (
                self.urlObject.method === 'PUT' || self.urlObject.method === 'PATCH'
            )){
                request.write(self.dataToWrite);
            }
            
            request.on('error', function(err){
                reject(err);
            });
            
            self.settings = {};
            request.end();
        });    
    };

    return HttpTool;
}
