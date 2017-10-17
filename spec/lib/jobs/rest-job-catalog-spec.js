// Copyright 2016, EMC, Inc
/* jshint node: true */

'use strict';

var nock = require('nock');
var uuid = require('node-uuid');
var waterline = {};
var sandbox = sinon.sandbox.create();

describe("REST-job-catalog", function(){
    var RestJobCatalog;
    var restJobCatalog;
    var testUrl = 'https://test.address.com:12345',
        taskId = uuid.v4(),
        options = {
            url: testUrl + '/full/post',
            method: 'POST',
            credential: {username:"foo", password:"bar"},
            headers: {
                //"content-type": "application/json",
                "some-token": "whatever-ssl-token"
            },
            data: {tester: "testee"},
            source: "not me"
        },
        context = {};

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/rest-catalog.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        RestJobCatalog = helper.injector.get('Job.Rest.Catalog');
    });

    beforeEach(function() {
        waterline.catalogs = {
            findOrCreate: sandbox.stub().resolves({id: "fakeCatalogID"}),
            updateByIdentifier: sandbox.stub().resolves()
        };
    });


    // With all parameters provided, REST should be good
    it('Should do REST with all parameters', function(){
        nock(testUrl)
        .matchHeader('content-type', 'application/json')
        .matchHeader('some-token', 'whatever-ssl-token')
        .post('/full/post', {
            tester: "testee",
        })
        .basicAuth({user: 'foo', pass: 'bar'})
        .reply(201, 'You are good');

        context = {};
        restJobCatalog = new RestJobCatalog(options, context, taskId);

        return restJobCatalog.run().then(function(){
            expect(context.restData.httpStatusCode).to.equal(201);
        });
    });

    it('Should return with data on bad url', function(){
        nock(testUrl)
        .get('/get/bad')
        .reply(404, 'boom');

        options.url = testUrl + '/get/bad';
        options.method = 'GET';

        restJobCatalog = new RestJobCatalog(options, context, taskId);
        return restJobCatalog.run().then(function(){
            expect(context.restData.httpStatusCode).to.equal(404);
        });
    });

    it('Should reject on missing url', function(){
        options.url = null;

        restJobCatalog = new RestJobCatalog(options, context, taskId);
        var errMsg = 'Please provide at least url and valid method to use HTTP tool!';
        return expect(restJobCatalog.run()).to.be.rejectedWith(errMsg);
    });

    it('Should reject on missing method', function(){
        options.url = testUrl + '/get/good';
        options.method = null;

        restJobCatalog = new RestJobCatalog(options, context, taskId);
        var err = 'Please provide at least url and valid method to use HTTP tool!';
        return expect(restJobCatalog.run()).to.be.rejectedWith(err);
    });

    it('Should reject on bad method', function(){
        options.url = testUrl + '/get/good';
        options.method = 'HAPPY';

        restJobCatalog = new RestJobCatalog(options, context, taskId);
        var err = 'Please provide at least url and valid method to use HTTP tool!';

        expect(restJobCatalog.run()).to.be.rejectedWith(err);
    });
});
