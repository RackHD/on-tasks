#! /usr/bin/env node

// Copyright 2016, EMC, Inc
/* jshint node: true */

'use strict';

var nock = require('nock'); // mock http request and its respond.
var uuid = require('node-uuid');

describe("REST-job", function(){
    var RestJob;
    var testUrl = 'http://test.address.com';
    var taskId = uuid.v4();
    var option = {
        requestConfig:{
        url: testUrl + '/full-put',
        method:'PUT',
        cred:{username:'hello',password:'world'},
        dataType:'application/json',
        data:'whatever',
        header:{cookie:'my-cookie'}
        }
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/REST-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/utils/job-utils/REST-tool.js'),
            helper.require('/node_modules/superagent/superagent.js'),
            helper.di.requireWrapper('superagent', 'Superagent')
        ]);
        RestJob = helper.injector.get('Job.Rest');
    });

    it("Should be able to do REST with all parameters", 
        function(done){
            nock(testUrl)
            .matchHeader('content-type', 'application/json')
            .matchHeader('cookie','my-cookie')
            .put('/full-put')
            .basicAuth({user:'hello', pass: 'world'})
            .reply(201, "You are good!");
            
            var context = {};
            
            console.log(typeof(taskId));

            var restJob = new RestJob(option, context, taskId);
            restJob.run().then(function(){
                console.log(context);
                done();
            });});
});
