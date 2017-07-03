// Copyright 2016, EMC, Inc
/* jshint node: true */

'use strict';

var nock = require('nock');
var uuid = require('node-uuid');

describe("REST-job", function(){
    var RestJob;
    var waterline, configuration;
    var restJob;
    var testUrl = 'https://test.address.com:12345',
        taskId = uuid.v4(),
        options = {
            url: testUrl + '/full/put',
            method: 'POST',
            credential: {username:"foo", password:"bar"},
            "data":{
                "Context": "context string",
                "Description": "Event Subscription Details",
                "Destination": "https://11.111.11.111:8443/api/2.0/notification/alerts",
                "EventTypes": [
                    "StatusChange",
                    "Alert"
                ],
                "Id": "id",
                "Name": "name",
                "Protocol": "Redfish"
            }
        },
        context = {};

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/rest-job.js'),
            helper.require('/lib/jobs/redfish-enable-alerts-job.js'),
            helper.require('/lib/jobs/base-job.js')
        ]);
        waterline = helper.injector.get('Services.Waterline');
        configuration = helper.injector.get('Services.Configuration');
        RestJob = helper.injector.get('Job.Redfish.Alert.Enable');
        this.sandbox = sinon.sandbox.create();
        waterline.obms = {
            findByNode: sinon.stub()
        };
        sinon.stub(configuration, 'get').returns("test.address.com");
    });


    // With all parameters provided, REST should be good
    it('Should do REST with all parameters', function(){
        nock(testUrl)
            .matchHeader('content-type', 'application/json')
            .post('/full/put')
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
            .post('/full/put')
            .reply(404, 'boom');

        context = {};
        options.method = 'POST';
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
        var err = 'Nock: No match for request POST https://test.address.com:12345/get/good ' +
            '{"Context":"context string","Description":"Event Subscription Details",' +
            '"Destination":"https://11.111.11.111:8443/api/2.0/notification/alerts",' +
            '"EventTypes":["StatusChange","Alert"],"Id":"id","Name":"name","Protocol":"Redfish"}';
        return expect(restJob.run()).to.be.rejectedWith(err);
    });

    it('Should reject on bad method', function(){
        options.url = testUrl + '/get/good';
        options.method = 'HAPPY';

        restJob = new RestJob(options, context, taskId);
        var err = 'Nock: No match for request POST https://test.address.com:12345/get/good ' +
            '{"Context":"context string","Description":"Event Subscription Details",' +
            '"Destination":"https://11.111.11.111:8443/api/2.0/notification/alerts",' +
            '"EventTypes":["StatusChange","Alert"],"Id":"id","Name":"name","Protocol":"Redfish"}';

        expect(restJob.run()).to.be.rejectedWith(err);
    });

    it('Should do the subscription without any given parameters', function(){
        this.sandbox.restore();
            taskId = uuid.v4(),
            options = {
                url: testUrl + '/full/put',
                method: 'POST',
                "data":{
                }
            };
        waterline.obms.findByNode.onCall(0).resolves(
            {config: {host: "10.240.19.226", user: "foo", password:"bar"}});
        nock(testUrl)
            .post('/full/put')
            .basicAuth({user: 'foo', pass: 'bar'})
            .reply(201, 'You are good');

        context = {};
        restJob = new RestJob(options, context, taskId);

        return restJob.run().then(function(){
            expect(context.restData.httpStatusCode).to.equal(201);
        });
    });

    it('Should do the subscription without any given parameters', function(){
        this.sandbox.restore();
            taskId = uuid.v4(),
            options = {
                url: testUrl + '/full/put',
                method: 'POST',
                "data":{
                }
            };
        waterline.obms.findByNode.onCall(0).resolves();
        nock(testUrl)
            .post('/full/put')
            .basicAuth({user: 'foo', pass: 'bar'})
            .reply(201, 'You are good');

        context = {};
        restJob = new RestJob(options, context, taskId);

        expect(restJob.run()).to.be.rejectedWith(
            "Couldn't find redfish obm  setting for node undefined");

    });
});
