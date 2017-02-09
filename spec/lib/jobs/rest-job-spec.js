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
            helper.require('/lib/jobs/rest-job.js'),
            helper.require('/lib/jobs/base-job.js')
        ]);
        RestJob = helper.injector.get('Job.Rest');
    });

  
    // With all parameters provided, REST should be good 
    it('Should do REST with all parameters', function(){
        nock(testUrl)
        .matchHeader('content-type', 'application/json')
        .matchHeader('some-token', 'whatever-ssl-token')
        .put('/full/put')
        .basicAuth({user: 'foo', pass: 'bar'})
        .reply(201, 'You are good');

        context = {};
        restJob = new RestJob(options, context, taskId);

        return restJob.run().then(function(){
            expect(context.restData.httpStatusCode).to.equal(201);
        });
    });

    it('Should return with data on bad url', function(){
        nock(testUrl)
        .get('/get/bad')
        .reply(404, 'boom');
        
        context = {};
        options = {};
        options.url = testUrl + '/get/bad';
        options.method = 'GET';

        restJob = new RestJob(options, context, taskId);
        return restJob.run().then(function(){
            expect(context.restData.httpStatusCode).to.equal(404);
        });
    });

    it('Should reject on missing url', function(){
        options.url = null;

        restJob = new RestJob(options, context, taskId);
        var errMsg = 'Please provide at least url and valid method to use HTTP tool!';
        return expect(restJob.run()).to.be.rejectedWith(errMsg);
    });

    it('Should reject on missing method', function(){
        options.url = testUrl + '/get/good';
        options.method = null;

        restJob = new RestJob(options, context, taskId);
        var err = 'Please provide at least url and valid method to use HTTP tool!';
        return expect(restJob.run()).to.be.rejectedWith(err);
    });    

    it('Should reject on bad method', function(){
        options.url = testUrl + '/get/good';
        options.method = 'HAPPY';
        
        restJob = new RestJob(options, context, taskId);
        var err = 'Please provide at least url and valid method to use HTTP tool!';

        expect(restJob.run()).to.be.rejectedWith(err);
    });
});
