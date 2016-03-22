// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe("JobUtils.RedfishTool", function() {
    var redfishTool,
        waterline = {},
        sandbox = sinon.sandbox.create();
        
    before(function() {
         helper.setupInjector([
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        var Tool = helper.injector.get('JobUtils.RedfishTool');
        redfishTool = new Tool();
    });
    
    beforeEach(function() {
        waterline.nodes = {
            needByIdentifier: sandbox.stub().resolves({
                obmSettings: [{
                    service: 'redfish-obm-service',
                    config: { uri: 'http://fake' }
                }]
            })
        };
    });
    
    after(function() {
        sandbox.restore();
    });
    
    it("should setup settings", function() {
        return redfishTool.setup('abc')
        .then(function() {
            expect(waterline.nodes.needByIdentifier)
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
        waterline.nodes.needByIdentifier = sandbox.stub()
            .resolves({obmSettings:[]});
        return expect(redfishTool.setup('abc'))
            .to.be.rejectedWith('Failed to find Redfish settings');
    });
    
    it("should require http library", function() {
        return expect(redfishTool.requireHttpLib('http'))
            .to.be.fullfilled;
    });
    
    it("should require https library", function() {
        return expect(redfishTool.requireHttpLib('https'))
            .to.be.fullfilled;
    });
    
    it("should throw on invalid http protocol ", function() {
        return expect(redfishTool.requireHttpLib.bind(redfishTool, 'fake'))
            .to.throw('Unsupported HTTP Protocol: fake');
    });
    
    it("should generate valid auth token", function() {
        var token = new Buffer('user'+':'+'pass').toString('base64');
        return expect(redfishTool.getAuthToken('user', 'pass'))
            .to.equal('Basic ' + token);
    });
    
    it("should generate invalid auth token", function() {
        return expect(redfishTool.getAuthToken())
            .to.equal(undefined);
    });
    
    it("should send http request methods", function() {
        var response = {
            setEncoding: sandbox.stub().resolves(),
            on: sandbox.spy(function(event, callback) {
                callback();
            })
        };
        var request = {
            on: sandbox.stub().resolves(),
            write: sandbox.stub().resolves(),
            end: sandbox.stub().resolves()
        };  
        redfishTool.requireHttpLib = sandbox.stub().returns({
            request: sandbox.spy(function(options, callback) {
                callback(response);
                return request;
            })
        });
        
        _.forEach(['GET','POST','PATCH','PUT'], function(method) {
            return expect(redfishTool.request({method:method}, 'http', {}))
                .to.be.fullfilled;
        });
    });
    
    it("should fail to http request", function() {
        var response = {
            setEncoding: sandbox.stub().resolves(),
            on: sandbox.stub().resolves()
        };
        var request = {
            on: sandbox.spy(function(event, callback) {
                if (event === 'error') {
                    callback(new Error('some error'));
                }
            })
        };  
        redfishTool.requireHttpLib = sandbox.stub().returns({
            request: sandbox.spy(function(options, callback) {
                callback(response);
                return request;
            })
        });
        return expect(redfishTool.request())
            .to.be.rejectedWith('some error');
    });
    
    it("should send client request", function() {
        redfishTool.settings = {
            root: '/', 
            username:'user', 
            password: 'pass'
        };
        redfishTool.request = sandbox.stub().resolves({
            httpStatusCode:200, 
            body: '{"data":"true"}'
        });
        return redfishTool.clientRequest('/', 'POST', {data:true})
        .then(function(res) {
            expect(res.httpStatusCode).to.equal(200);
            expect(res.body).to.deep.equal({data:'true'});
        }); 
    });
    
    it("should fail to send client request", function() {
        redfishTool.request = sandbox.stub().resolves({
            httpStatusCode:400
        });
        return expect(redfishTool.clientRequest())
            .to.be.rejectedWith('Unknown Error');
    });
});
