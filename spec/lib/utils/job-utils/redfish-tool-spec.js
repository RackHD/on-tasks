// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe("redfish-tool", function() {
    var redfishTool;
    var tlsEnv = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    
    before(function() {
         helper.setupInjector([
            helper.require('/lib/utils/job-utils/redfish-tool.js'),
        ]);
        redfishTool = helper.injector.get('JobUtils.RedfishTool');
    });

    after(function() {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = tlsEnv;
    });
    
    it("should initialize redfish client with no credentials", function() {
        return expect(redfishTool.clientInit({
            uri: 'http://testapi',
            verifySSL: true
        })).to.be.fullfilled;
    });
    
    it("should initialize redfish client with SSLVerify true", function() {
        return expect(redfishTool.clientInit({
            username:'user', 
            password:'password',
            uri: 'http://testapi',
            verifySSL: true
        })).to.be.fullfilled;
    });

    it("should initialize redfish client with SSLVerify undefined", function() {
        return expect(redfishTool.clientInit({
            username:'user', 
            password:'password',
            uri: 'http://testapi'
        })).to.be.fullfilled;
    });
    
    it("should cleanup redfish client with undefined ENV", function() {
        redfishTool.savedTLSEnv = undefined;
        redfishTool.clientDone();
        expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED)
            .to.equal(redfishTool.savedTLSEnv);
    });
    
    it("should cleanup redfish client with defined ENV", function() {
        redfishTool.savedTLSEnv = "1";
        redfishTool.clientDone();
        expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED)
            .to.equal(redfishTool.savedTLSEnv);
    });
    
    it("should set tls option", function() {
        redfishTool.setTLSEnv("0");
        expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).to.equal("0");
    });
    
    it("should get tls option", function() {
        redfishTool.setTLSEnv("1");
        var tls = redfishTool.getTLSEnv();
        expect(tls).to.equal("1");
    });
});
