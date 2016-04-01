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

function RestFactory(assert, superagent, promise, _) {
    /**
    * Just a quick class doing all the REST works
    * @constructor
    * @param {object} cred - The credential that is enough for all the 
    * behaviors required. Format: cred = {username:"foo", password:
    * "mysterious words"} 
    */
    function RestTool(cred) {
        this.credential = {username:'', password:''};
        if (! _.isEmpty(cred)){ 
            this.credential = cred;
            }
        this.request = require(superagent);
        }

    /**
    * Do the GET.
    * @param {string} uri - The URL that you want GET.
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.get = function(uri){
        assert.string(uri);
        this.request.get(uri)
                    .auth(this.credential.username,
                          this.credential.password)
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
    };
    
    /**
    * Do the POST
    * @param {string} uri - The URL that POST to.
    * @param {strint} type - The type of data in your body like
        'application/json' or 'application/xml'
    * @param {string} body - The body of the POST request
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.post = function(uri, type, body){
        assert.string(uri);
        assert.string(body);
        assert.string(type);

        this.request.post(uri)
                    .type(type)
                    .send(body)
                    .auth(this.credential.username,
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
    };

    /**
    * Do the PUT
    * @param {string} uri - The URL that PUT to.
    * @param {strint} type - The type of data in your body like
        'application/json' or 'application/xml'
    * @param {string} body - The body of the PUT request 
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.put = function(uri, type, body){
        assert.string(uri);
        assert.string(body);
        assert.string(type);

        this.request.put(uri)
                    .type(type)
                    .send(body)
                    .auth(this.credential.username,
                          this.credential.password) 
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
    };
    
    /**
    * Do the Delete
    * @param {string} uri - The URL that DELETE operates on.
    * @return {response} The response objcet from superagent
    */
    RestTool.prototype.del = function(uri){
        assert.string(uri); 
        this.request.del(uri)
                    .auth(this.credential.username,
                          this.credential.password)
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

    return RestTool;
}

