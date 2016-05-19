// Copyright 2016, EMC, Inc
/* jshint node: true */

'use strict';

var nock = require('nock');
var uuid = require('node-uuid');

describe("REST-job", function(){
    var RestJob;
<<<<<<< HEAD
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
=======
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
>>>>>>> modified HTTP-tool to use Node default http lib

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/REST-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/utils/job-utils/HTTP-tool.js')
        ]);
        RestJob = helper.injector.get('Job.Rest');
    });
<<<<<<< HEAD

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
=======
   
    // With all parameters provided, REST should be good 
    it('Should do REST with all parameters', function(done){
        nock(testUrl)
        .matchHeader('content-type', 'application/json')
        .matchHeader('some-token', 'whatever-ssl-token')
        .put('/full/put')
        .basicAuth({user: 'foo', pass: 'bar'})
        .reply(201, 'You are good');
>>>>>>> modified HTTP-tool to use Node default http lib

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

<<<<<<< HEAD
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
=======
    it('Should reject on missing url', function(done){
        options.url = null;
>>>>>>> modified HTTP-tool to use Node default http lib

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
>>>>>>> added unit test and modified the source code based on unit tests
});
