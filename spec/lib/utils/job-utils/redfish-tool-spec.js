#! /usr/bin/env node

// Copyright, 2017, EMC, Inc.
/* jshint node: true */

'use strict';

var nock = require('nock');

describe('RedfishTool', function(){
    var redfishTool,
        waterline = {}, 
        sandbox = sinon.sandbox.create();

    before(function(){
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        var Tool = helper.injector.get('JobUtils.RedfishTool');
        redfishTool = new Tool();
    });

    beforeEach(function() {
        waterline.obms = {
            findByNode: sandbox.stub().resolves(
                {
                    service: 'redfish-obm-service',
                    config: { uri: 'http://fake'}
                }
            )
        };
    });

    after(function(){
        sandbox.restore();
    });

    it("should setup settings", function() {
        return redfishTool.setup('abc')
        .then(function() {
            expect(waterline.obms.findByNode)
                .to.be.calledOnce;
            return;
        })
        .then(function() {
            expect(redfishTool.settings).to.deep.equal({
                uri: 'http://fake'
            });
        });
    });
            
    it("should fail to setup settings", function() {
        waterline.obms.findByNode = sandbox.stub()
            .resolves();
        return expect(redfishTool.setup('abc'))
            .to.be.rejectedWith('Failed to find Redfish settings');
    });

    it("should do ClientRequest on good setup", function(){
        nock("http://fake").get('/happy').reply(200, '{"Hello":"World"}');
        redfishTool.settings.protocol = 'http';
        redfishTool.settings.host = 'fake';
        
        return redfishTool.clientRequest('/happy', 'GET', '')
        .then(function(res){
            expect(res).to.have.property('body').to.have.property('Hello').to.deep.equal('World');
        });
    });

    it("should do ClientRequest for POST", function(){
        nock("https://localhost:12345")
        .post('/happy-post').reply(201, '{"data": "HAPPY"}');

        redfishTool.settings.protocol = 'https';
        redfishTool.settings.host = 'localhost';
        redfishTool.settings.port = "12345";

        return redfishTool.clientRequest("/happy-post", 'POST', '{data: "make me happy"}')
        .then(function(response){
            expect(response).to.have.property('httpStatusCode').to.equal(201);
        });
    });

    it("should reject on having http error", function(){
        var errorMsg = { error: '123456' };
        nock("https://fake:12345")
        .post('/this-should-fail')
        .reply(404, errorMsg);
        
        redfishTool.settings.protocol = 'https';
        redfishTool.settings.host = 'fake';
        redfishTool.settings.port = 12345;
        
        return expect(redfishTool
            .clientRequest('/this-should-fail', 'POST', 'My secret data'))
        .to.be.rejectedWith(errorMsg);
    });
});

