// Copyright 2017, Dell EMC, Inc.

'use strict';

describe('Redfish IP range discovery Job', function () {
    var uuid = require('node-uuid'),
        sandbox = sinon.sandbox.create(),
        graphId = uuid.v4(),
        redfishJob,
        Job,
        HttpTool,
        Error;

    var request = require('requestretry');

    var badResponse = {
        "httpVersion": "1.0",
        "httpStatusCode": 207,
    };

    var response = {
        "httpVersion": "1.0",
        "httpStatusCode": 200,
        "body": {
            "@odata.context": "/redfish/v1/$metadata#ServiceRoot",
            "@odata.id": "/redfish/v1",
            "@odata.type": "#ServiceRoot.1.0.0.ServiceRoot",
            "AccountService": {
                "@odata.id": "/redfish/v1/Managers/iDRAC.Embedded.1/AccountService"
            },
            "Chassis": {
                "@odata.id": "/redfish/v1/Chassis"
            },
            "Description": "Root Service",
            "Name": "Root Service",
        }
    };

    before(function () {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/redfish-ip-range-discovery.js'),
            helper.require('/lib/utils/job-utils/redfish-tool.js')
        ]);
        Error = helper.injector.get('Errors');
        HttpTool = helper.injector.get('HttpTool');
    });

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        Job = helper.injector.get('Job.Redfish.Ip.Range.Discovery');
        redfishJob = new Job({
            "ranges": [{
                "port": "123",
                "protocol": "http",
                "startIp": "1.2.3.4",
                "endIp": "1.2.3.8",
                "credentials": {
                    "userName": "abc",
                    "password":"xyz"
                }
            }]
        }, {}, graphId);

        sandbox.stub(request, "get");
    });

    describe('IP range', function () {
        it('should return a list of Redfish endpoint objects', function () {
            request.get.resolves(response);
            redfishJob._run();
            return redfishJob._deferred
                .then(function () {
                    expect(redfishJob.context.discoverList).to.be.an('Array').with.length(5);
                });
        });

        it('should return an empty array if response is bad', function () {
           request.get.resolves(badResponse);
            redfishJob._run();
            return redfishJob._deferred
                .then(function () {
                    expect(redfishJob.context.discoverList).to.be.an('Array').with.length(0);
                });
        });
    });
});