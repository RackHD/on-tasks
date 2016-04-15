#! /usr/bin/env node

//Copyright 2016, EMC, Inc.

/*jshint node: true*/
/*jshint multistr: true*/

'use strict';

var di = require('di');

module.exports = RestFactory;

di.annotate(RestFactory, new di.Provide('JobUtils.RestTool'));
di.annotate(RestFactory, new di.Inject(
            'Assert',
            'Superagent',
            'Promise',
            '_'
));

function RestFactory(assert, Superagent, Promise, _) {
    /**
    * Just a quick class doing all the REST works
    * @constructor
    * @param {object} cred - The credential that is enough for all the 
    * behaviors required. Format: cred = {username:"foo", password:
    * "mysterious words"} 
   */
    function RestTool(cred) {
        if (! _.isEmpty(cred)){ 
            this.credential = cred;
            }
        this.request = Superagent;
        this.credential = {username:'', password:''};
    }

    /**
    * Do the GET.
    * @param {string} uri - The URL that you want GET.
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.get = function(uri, header, callback){
        assert.string(uri);
        this.request.get(uri)
                    .auth(this.credential.username,
                          this.credential.password)
                    .set(header)
                    .end(function (err, res){
                        callback(err,res);
                    });
    };
    
    /**
    * Do the POST
    * @param {string} uri - The URL that POST to.
    * @param {strint} type - The type of data in your body like
        'application/json' or 'application/xml'
    * @param {string} body - The body of the POST request
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.post = function(uri, type, body, header, callback){
        assert.string(uri);
        assert.string(body);
        assert.string(type);
        assert.object(header);

        this.request.post(uri)
                    .type(type)
                    .send(body)
                    .auth(this.credential.username,
                          this.credential.password)
                    .set(header)
                    .end(function(err, res) {
                            callback(err, res);
                            });
    };

    /**
    * Do the PUT
    * @param {string} uri - The URL that PUT to.
    * @param {strint} type - The type of data in your body like
        'application/json' or 'application/xml'
    * @param {string} body - The body of the PUT request 
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.put = function(uri, type, body, header, callback){
        assert.string(uri);
        assert.string(body);
        assert.string(type);

        this.request.put(uri)
                    .type(type)
                    .send(body)
                    .auth(this.credential.username,
                          this.credential.password) 
                    .set(header)
                    .end(function(err, res) {
                        callback(err, res);
                            }); 
    };
    
    /**
    * Do the Delete
    * @param {string} uri - The URL that DELETE operates on.
    * @param {object} header - Customized header for this request
    * @param {callback} callback - function(err, res)
    */
    RestTool.prototype.del = function(uri, header, callback){
        assert.string(uri); 
        this.request.del(uri)
                    .auth(this.credential.username,
                          this.credential.password)
                    .set(header)
                    .end(function (err, res) {
                        callback(err, res);
                        });
    };
    return new RestTool();
}

