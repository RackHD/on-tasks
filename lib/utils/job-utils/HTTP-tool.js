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
        
        // ********** Helper Functions/Members **********
        
        /**
        * Make sure that the method is a valid HTTP method
        * @param {string} - testMethod: the intended method that for 
        * http request.
        * @return {boolean} - Whether the testmethod is valid
        */
        var validMethod = {'GET': true, 'PUT': true, 'POST':true, 
            'DELETE':true, 'PATCH': true};
        
        this.isValidMethod = function(testMethod){
            return (testMethod in validMethod);
        };

        this.isSettingValid = function(settings){
            if (_.isEmpty(settings)) {
                return false;
            }
            if ( ! ('url' in settings && 'method' in settings)) {
                return false;
            }
            if (_.isEmpty(settings.url) || _.isEmpty(settings.method)) {
                return false;
            }
            return true;
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
                                     ' method to use HTTP tool!');
                reject(err);
            }
            else {
                if (self.isValidMethod(settings.method)) {
                    self.settings = settings;
                    resolve();
                }
                else {
                    err = new Error('The method you provided is ' +
                                        'not valid!');
                    reject(err);
                }
            }});
    };
    
    /**
    * Run the request based on checked result
    */ 
    HttpTool.prototype.runRequest = function() {
        var urlTool = require('url'),
            httpTool,
            self = this,
            urlObject = {},
            toolName = 'http';
        
        if (_.isEmpty(self.settings)) {
            throw new Error('Request is not setup properly,'+
                            ' please run setupRequest() first.');
        }

        // Parse the string into url options
        if (typeof (self.settings.url) === 'string') {
            urlObject = urlTool.parse(self.settings.url);
        }
        else {
            urlObject = self.settings.url;
        }

        // protocole needs to be 'http:' and module is 'http'
        if (urlObject.protocol.substr(-1) === ':') {
            toolName = urlObject.protocol.substr(0, urlObject.protocol.length - 1);
        }
        else {
            toolName = urlObject.protocol;
            urlObject.protocol = urlObject.protocol + ':';
        }
        httpTool = require(toolName);

        // set the rest parameters
        urlObject.method = self.settings.method;
        
        if (! _.isEmpty(self.settings.headers)){
            urlObject.headers = self.settings.headers;
        }
        if (! _.isEmpty(self.settings.credential)){
            urlObject.auth = self.settings.credential.username +':'+
                self.settings.credential.password;
        }
        urlObject.rejectUnauthorized = self.settings.verifySSL || false;
        urlObject.recvTimeoutMs = self.settings.recvTimeoutMs;

        return new Promise(function(resolve, reject) {
            var request  = httpTool.request(urlObject, function(response){
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
            
            if (urlObject.method === 'POST' || (
                urlObject.method === 'PUT' || urlObject.method === 'PATCH'
            )){
                
                if (_.isEmpty(self.settings.data)){
                    self.settings.data = '';
                }
                request.write(self.settings.data);
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
