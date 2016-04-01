#! /usr/bin/env node

//Copyright 2016, EMC, Inc.

/*jshint node: true*/
/*jshint multistr: true*/

'use strict';

var di = require('di');

module.exports = RestFactory;

<<<<<<< HEAD
<<<<<<< HEAD
di.annotate(RestFactory, new di.Provide('JobUtils.RestTool'));
di.annotate(RestFactory, new di.Inject(
=======
di.annotate(RestFactory, new di.Provide('JobUtils.Resttool'));
di.annotate(RestFactory, new di.inject(
>>>>>>> added REST-tool.js
=======
di.annotate(RestFactory, new di.Provide('JobUtils.RestTool'));
di.annotate(RestFactory, new di.Inject(
>>>>>>> fixed some bugs
            'Assert',
            'Superagent',
            'Promise',
            '_'
));

<<<<<<< HEAD
function RestFactory(assert, Superagent, Promise, _) {
=======
function RestFactory(assert, superagent, promise, _) {
>>>>>>> added REST-tool.js
    /**
    * Just a quick class doing all the REST works
    * @constructor
    * @param {object} cred - The credential that is enough for all the 
    * behaviors required. Format: cred = {username:"foo", password:
    * "mysterious words"} 
<<<<<<< HEAD
   */
    function RestTool(cred) {
        if (! _.isEmpty(cred)){ 
            this.credential = cred;
            }
        this.request = Superagent;
        this.credential = {username:'', password:''};
    }
=======
    */
    function RestTool(cred) {
        this.credential = {username:'', password:''};
        if (! _.isEmpty(cred)){ 
            this.credential = cred;
            }
        this.request = require(superagent);
        }
>>>>>>> added REST-tool.js

    /**
    * Do the GET.
    * @param {string} uri - The URL that you want GET.
<<<<<<< HEAD
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.get = function(uri, header, callback){
=======
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.get = function(uri){
>>>>>>> added REST-tool.js
        assert.string(uri);
        this.request.get(uri)
                    .auth(this.credential.username,
                          this.credential.password)
<<<<<<< HEAD
                    .set(header)
                    .end(function (err, res){
                        callback(err,res);
                    });
=======
                    .end(function (err, res) {
                            if (err) {
                                throw new Error("Unable to GET with \
                                    credential for {0}, respond status \
                                    ${1}".format(uri, err.status));
                                }
                            else {
                                return res;
                                }
                            }
                        );
>>>>>>> added REST-tool.js
    };
    
    /**
    * Do the POST
    * @param {string} uri - The URL that POST to.
    * @param {strint} type - The type of data in your body like
        'application/json' or 'application/xml'
    * @param {string} body - The body of the POST request
<<<<<<< HEAD
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.post = function(uri, type, body, header, callback){
        assert.string(uri);
        assert.string(body);
        assert.string(type);
        assert.object(header);
=======
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.post = function(uri, type, body){
        assert.string(uri);
        assert.string(body);
        assert.string(type);
>>>>>>> added REST-tool.js

        this.request.post(uri)
                    .type(type)
                    .send(body)
                    .auth(this.credential.username,
<<<<<<< HEAD
                          this.credential.password)
                    .set(header)
                    .end(function(err, res) {
                            callback(err, res);
                            });
=======
                          this.credential.password) 
                    .end(function(err, res) {
                            if (err) {
                                throw new Error("Unable to POST to {0}, \
                                    response status is {1}"
                                    .format(uri, err.status));
                            }
                            else {
                                return res;
                            }
                        }
                    );
>>>>>>> added REST-tool.js
    };

    /**
    * Do the PUT
    * @param {string} uri - The URL that PUT to.
    * @param {strint} type - The type of data in your body like
        'application/json' or 'application/xml'
    * @param {string} body - The body of the PUT request 
<<<<<<< HEAD
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.put = function(uri, type, body, header, callback){
=======
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.put = function(uri, type, body){
>>>>>>> added REST-tool.js
        assert.string(uri);
        assert.string(body);
        assert.string(type);

        this.request.put(uri)
                    .type(type)
                    .send(body)
                    .auth(this.credential.username,
                          this.credential.password) 
<<<<<<< HEAD
                    .set(header)
                    .end(function(err, res) {
                        callback(err, res);
                            }); 
=======
                    .end(function(err, res) {
                            if (err) {
                                throw new Error("Unable to PUT to {0}, \
                                    response status is {1}"
                                    .format(uri, err.status));
                            }
                            else {
                                return res;
                            }
                        }
                    ); 
>>>>>>> added REST-tool.js
    };
    
    /**
    * Do the Delete
    * @param {string} uri - The URL that DELETE operates on.
<<<<<<< HEAD
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.del = function(uri, header, callback){
=======
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.del = function(uri){
>>>>>>> added REST-tool.js
        assert.string(uri); 
        this.request.del(uri)
                    .auth(this.credential.username,
                          this.credential.password)
<<<<<<< HEAD
                    .set(header)
                    .end(function (err, res) {
                        callback(err, res);
                        });
    };
    return new RestTool();
=======
                    .end(function (err, res) {
                    if (err) {
                        throw new Error('Unable to DELETE with \
                            credential for url ${0}, \
                            returnd ${1}'.format(uri, err.status)); 
                        }    
                    else {
                        return res;
                        }
                            }
                        );
    };
<<<<<<< HEAD
>>>>>>> added REST-tool.js
=======

    return RestTool;
>>>>>>> fixed some bugs
}

