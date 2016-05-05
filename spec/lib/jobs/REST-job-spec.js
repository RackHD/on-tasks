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
<<<<<<< HEAD
<<<<<<< HEAD
    var context = {};
=======
>>>>>>> Initial commit of unit tests
=======
    var context = {};
>>>>>>> added unit test and modified the source code based on unit tests

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/REST-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/utils/job-utils/HTTP-tool.js'),
            helper.di.requireWrapper('superagent', 'Superagent')
        ]);
        RestJob = helper.injector.get('Job.Rest');
    });

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> added unit test and modified the source code based on unit tests
    it("Should do REST with all parameters", function(done){
        nock(testUrl)
        .matchHeader('content-type', 'application/json')
        .matchHeader('cookie','my-cookie')
        .put('/full-put')
        .basicAuth({user:'hello', pass: 'world'})
        .reply(201, "You are good!");
<<<<<<< HEAD
            
        context = {};
        var restJob = new RestJob(option, context, taskId);
        restJob.run().then(function(){
            expect(context).to.have.property('text')
            .to.equal('You are good!');
                
            done();
        });
    });

// Should proceed with REST request and return if optional parameter is missing
    it('Should do REST without basic auth parameter', function(done){
        nock(testUrl)
        .matchHeader('content-type', 'application/json')
        .matchHeader('cookie','my-cookie')
        .put('/no-auth-put')
        .reply(201, "You are good!");
           
        context = {};
        option.requestConfig.url = testUrl + '/no-auth-put';
        delete option.requestConfig.cred;

        var restJob = new RestJob(option, context, taskId);
        restJob.run().then(function(){
            expect(context).to.have.property('text')
            .to.equal('You are good!');
            done();
        });
    });

    it('Should handle REST without header parameter', function(done){
        nock(testUrl)
        .put('/no-header-put')
        .reply(201, "You are good!");
           
        context = {};
        option.requestConfig.url = testUrl + '/no-header-put';
        delete option.requestConfig.dataType;
        delete option.requestConfig.header;

        var restJob = new RestJob(option, context, taskId);
        restJob.run().then(function(){
            expect(context).to.have.property('text')
            .to.equal('You are good!');
            done();
        });
    });

// Should raise failure when necessary parameters are missing
    it('Should reject without URL', function(done){
        nock(testUrl).get('/simple-get').reply(200, "Here is get");

        context = {};
        delete option.requestConfig.url;
        option.requestConfig.method = 'GET';

        var restJob = new RestJob(option, context, taskId);
        expect(restJob.run())
        .to.be.rejectedWith('Please provide method and url to continue');
        done();
    });

    it('Should reject without REST method', function(done){
        context = {};
        option.requestConfig.url = testUrl + '/simple-get';
        delete option.requestConfig.method;
        
        var restJob = new RestJob(option, context, taskId);
        expect(restJob.run())
        .to.be.rejectedWith('Please provide method and url to continue');

        done();
    });

// Should return err on encountering http errors
    it ('Should return correct err when having http errors', function(done){
        nock(testUrl).get('/bad-link').reply(404, 'boom');

        option.requestConfig.url = testUrl + '/bad-link';
        option.requestConfig.method = 'GET';

        var restJob = new RestJob(option, context, taskId);
        var err = {
            status: 404,
            message: 'boom',
            header: {}
        };
        expect(restJob.run()).to.be.rejectedWith(err);
        done();
    });
=======
    it("Should be able to do REST with all parameters", 
        function(done){
            nock(testUrl)
            .matchHeader('content-type', 'application/json')
            .matchHeader('cookie','my-cookie')
            .put('/full-put')
            .basicAuth({user:'hello', pass: 'world'})
            .reply(201, "You are good!");
=======
>>>>>>> added unit test and modified the source code based on unit tests
            
        context = {};
        var restJob = new RestJob(option, context, taskId);
        restJob.run().then(function(){
            expect(context).to.have.property('text')
            .to.equal('You are good!');
                
            done();
        });
    });

// Should proceed with REST request and return if optional parameter is missing
    it('Should do REST without basic auth parameter', function(done){
        nock(testUrl)
        .matchHeader('content-type', 'application/json')
        .matchHeader('cookie','my-cookie')
        .put('/no-auth-put')
        .reply(201, "You are good!");
           
        context = {};
        option.requestConfig.url = testUrl + '/no-auth-put';
        delete option.requestConfig.cred;

        var restJob = new RestJob(option, context, taskId);
        restJob.run().then(function(){
            expect(context).to.have.property('text')
            .to.equal('You are good!');
            done();
        });
    });

    it('Should handle REST without header parameter', function(done){
        nock(testUrl)
        .put('/no-header-put')
        .reply(201, "You are good!");
           
        context = {};
        option.requestConfig.url = testUrl + '/no-header-put';
        delete option.requestConfig.dataType;
        delete option.requestConfig.header;

        var restJob = new RestJob(option, context, taskId);
        restJob.run().then(function(){
            expect(context).to.have.property('text')
            .to.equal('You are good!');
            done();
        });
    });

// Should raise failure when necessary parameters are missing
    it('Should reject without URL', function(done){
        nock(testUrl).get('/simple-get').reply(200, "Here is get");

<<<<<<< HEAD
            var restJob = new RestJob(option, context, taskId);
            restJob.run().then(function(){
                console.log(context);
                done();
            });});
>>>>>>> Initial commit of unit tests
=======
        context = {};
        delete option.requestConfig.url;
        option.requestConfig.method = 'GET';

        var restJob = new RestJob(option, context, taskId);
        expect(restJob.run())
        .to.be.rejectedWith('Please provide method and url to continue');
        done();
    });

    it('Should reject without REST method', function(done){
        context = {};
        option.requestConfig.url = testUrl + '/simple-get';
        delete option.requestConfig.method;
        
        var restJob = new RestJob(option, context, taskId);
        expect(restJob.run())
        .to.be.rejectedWith('Please provide method and url to continue');

        done();
    });

// Should return err on encountering http errors
    it ('Should return correct err when having http errors', function(done){
        nock(testUrl).get('/bad-link').reply(404, 'boom');

        option.requestConfig.url = testUrl + '/bad-link';
        option.requestConfig.method = 'GET';

        var restJob = new RestJob(option, context, taskId);
        var err = {
            status: 404,
            message: 'boom',
            header: {}
        };
        expect(restJob.run()).to.be.rejectedWith(err);
        done();
    });
>>>>>>> added unit test and modified the source code based on unit tests
});
