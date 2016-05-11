// Copyright, 2016, EMC, Inc.
/* jshint node: true */

'use strict';
var nock = require('nock');

describe("HttpTool", function(){
    var httpTool;
    var siteGen = 'http://mysite.emc.com';
    var requestSettings = {};


    before(function(){
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/utils/job-utils/HTTP-tool.js')
            ])
        );
        httpTool = helper.injector.get('JobUtils.HttpTool');
    });

    it('Should handle basic auth', function(done){
        nock(siteGen).get('/basicAuth')
        .basicAuth({user:'hello', pass:'world'})
        .reply(200);

        requestSettings.url = siteGen + '/basicAuth';
        requestSettings.method = 'GET';
        requestSettings.credential = {username:'hello', password:'world'};

        httpTool.setupRequest(requestSettings)
        .then(httpTool.runRequest()
        .then(function(data){
            expect(data).to.have.property('httpStatusCode').to.equal(200);
            done();
        }));
    });

    it('can handle header change', function(done){
        nock(siteGen)
        .matchHeader('cookie', 'mySession')
        .get('/withCookie')
        .reply(200);

        requestSettings.url = siteGen + '/withCookie';
        requestSettings.method = 'GET';
        requestSettings.headers = {cookie: 'mySession'};
        
        httpTool.setupRequest(requestSettings)
        .then(httpTool.runRequest()
        .then(function(data){
            expect(data).to.have.property('httpStatusCode').to.equal(200);
            done();
        }));
    });

    it('can handle secure http and non-standard port', function(done){
        nock('https://mysite.emc.com:12345')
        .get('/non-standard-port/http-secure')
        .reply(200, 'You are good');
        
        requestSettings.url = 'https://mysite.emc.com:12345/non-standard-port/http-secure';
        requestSettings.method = 'GET';
        
        httpTool.setupRequest(requestSettings)
        .then(httpTool.runRequest()
        .then(function(data){
            expect(data).to.have.property('body').to.equal('You are good');
            done();
        }));
    });

    it('can handle object formatted url', function(done){
        nock(siteGen).get('/getWithObjUrl').reply(200);

        requestSettings.url = {
            protocol: "http",
            host: "mysite.emc.com",
            path: "/getWithObjUrl"
        };
        requestSettings.method = 'GET';

        httpTool.setupRequest(requestSettings)
        .then(httpTool.runRequest()
        .then(function(data){
            expect(data).to.have.property('httpStatusCode').to.equal(200); 
            done();
        }));
    });
    
    it('can put err into reject callback', function(done){
        nock(siteGen).get('/good-get').reply(200);

        requestSettings.url = siteGen + '/bad-get';
        requestSettings.method = 'GET';
        
        httpTool.setupRequest(requestSettings)
        .then(httpTool.runRequest()
        .catch(function(err){
            expect(err).to.have.property('status').to.equal(404);
            done();
        }));
    });

    it('can do DELETE', function(done){
        nock(siteGen).delete('/delete-good').reply(200, 'Delete Successfully');

        requestSettings.url = siteGen + '/delete-good';
        requestSettings.method = 'DELETE';

        httpTool.setupRequest(requestSettings)
        .then(httpTool.runRequest()
        .then(function(data){
            expect(data).to.have.property('body').to.equal('Delete Successfully');
            done();
        }));
    });

    it('can do successful POST', function(done){
        nock.cleanAll();
        nock(siteGen).matchHeader('content-type', 'application/xml').matchHeader('token', 'my-ssl-token').put('/header-post').reply(201, 'OK');

        requestSettings.url = siteGen + '/header-post';
        requestSettings.method = 'PUT';
        requestSettings.headers = {
            'Content-Type': 'appication/xml',
            'Token':'my-SSL-token'
        };
        requestSettings.data = '<data>My XML data</data>';
        console.log(requestSettings);

        httpTool.setupRequest(requestSettings)
        .then(httpTool.runRequest()
        .then(function(data){
            console.log(data);
            expect(data).to.have.property('body').to.equal('OK');
            done();
        })
        .catch(function(err){
            console.log('find error during request');
            console.log(err);
            done();
        })
        );
    });
});
