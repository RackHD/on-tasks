
// Copyright 2016, EMC
/* jshint node: true */

'use strict';

var jobHelper;

describe("Job Helper", function () {
    var encryption;
    var lookup;

    before("Job Helper before", function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/job-helper')
        ]);
        lookup = helper.injector.get('Services.Lookup');
        encryption = helper.injector.get('Services.Encryption');
        jobHelper = helper.injector.get('JobUtils.JobHelpers');
    });

    describe('lookupHost', function() {
        beforeEach(function() {
            this.sandbox = sinon.sandbox.create();
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it("should convert a host mac address to an IP", function() {
            var macToIP = this.sandbox.stub(lookup, 'macAddressToIp');
            macToIP.resolves(
                '10.1.1.2'
            );
            var data = {
                host: '7a:c0:7a:c0:be:ef'
            };
            return jobHelper.lookupHost(data).should.become({ host: '10.1.1.2'});
        });

        it("should not convert a mac address without the key host to an IP", function() {
            var data = {
                ip: '7a:c0:7a:c0:be:ef'
            };
            return jobHelper.lookupHost(data).should.become({ ip: '7a:c0:7a:c0:be:ef'});
        });

        it("should not convert a none-mac address with the key host to an IP", function() {
            var data = {
                host: '1.2;3.4'
            };
            return jobHelper.lookupHost(data).should.become({ host: '1.2;3.4'});
        });

    });
});
