// Copyright 2016, EMC, Inc
/* jshint node: true */

'use strict';

var nock = require('nock');
var uuid = require('node-uuid');

describe("REST-job", function(){
    var RestJob;
    var restJob;
    var testUrl = 'https://test.address.com:12345',
        taskId = uuid.v4(),
        options = {
            url: testUrl + '/full/put',
            method: 'PUT',
            credential: {username:"foo", password:"bar"},
            headers: {
                "content-type": "application/json",
                "some-token": "whatever-ssl-token"
                },
            data: "nobody cares"
        },
        context = {};

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/REST-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/utils/job-utils/HTTP-tool.js')
        ]);
        RestJob = helper.injector.get('Job.Rest');
    });

  
    // With all parameters provided, REST should be good 
    it('Should do REST with all parameters', function(done){
        nock(testUrl)
        .matchHeader('content-type', 'application/json')
        .matchHeader('some-token', 'whatever-ssl-token')
        .put('/full/put')
        .basicAuth({user: 'foo', pass: 'bar'})
        .reply(201, 'You are good');

        context = {};
        restJob = new RestJob(options, context, taskId);
        restJob.run().then(function(){
            expect(context.restData.httpStatusCode).to.equal(201);
            done();
        });
    });


    it('Should return with data on bad url', function(done){
        nock(testUrl)
        .get('/get/bad')
        .reply(404, 'boom');
        
        context = {};
        options = {};
        options.url = testUrl + '/get/bad';
        options.method = 'GET';

        restJob = new RestJob(options, context, taskId);
        restJob.run().then(function(){
            expect(context.restData.httpStatusCode).to.equal(404);
            done();
        });
    });

    it('Should reject on missing url', function(done){
        options.url = null;

        restJob = new RestJob(options, context, taskId);
        var err1 = 'Please provide at least url and method to use HTTP tool!';
        var err2 = 'Request is not setup properly, '+
            'please run setupRequest() first.';
        expect(restJob._deferred).to.eventually.be.rejectedWith(err1);
        expect(restJob.run()).to.eventually.be.rejectedWith(err2);
        done();
    });

    it('Should reject on missing method', function(done){
        options.url = testUrl + '/get/good';
        options.method = null;

        restJob = new RestJob(options, context, taskId);
        var err1 = 'Please provide at least url and method to use HTTP tool!';
        var err2 = 'Request is not setup properly, '+
            'please run setupRequest() first.';
        expect(restJob.run()).to.eventually.be.rejectedWith(err2);
        expect(restJob._deferred).to.eventually.be.rejectedWith(err1);

        done();
    });    
    
    it('Should reject on bad method', function(done){
        options.url = testUrl + '/get/good';
        options.method = 'HAPPY';
        
        restJob = new RestJob(options, context, taskId);
        var err1 = 'The method you provided is not valid!';
        var err2 = 'Request is not setup properly, '+
            'please run setupRequest() first.';
        expect(restJob.run()).to.eventually.be.rejectedWith(err2);
        expect(restJob._deferred).to.eventually.be.rejectedWith(err1);

        done();
    });
});
