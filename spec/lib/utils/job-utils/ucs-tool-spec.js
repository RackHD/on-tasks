#! /usr/bin/env node

// Copyright, 2017, EMC, Inc.
/* jshint node: true */

'use strict';

var nock = require('nock');

describe('UcsTool', function(){
    var ucsTool,
        waterline = {}, 
        sandbox = sinon.sandbox.create();

    before(function(){
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/ucs-tool.js'),
            //helper.require('/lib/utils/job-utils/http-tool.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        var Tool = helper.injector.get('JobUtils.UcsTool');
        ucsTool = new Tool();
    });

    beforeEach(function() {
        waterline.obms = {
            findByNode: sandbox.stub().resolves(
                {
                    service: 'ucs-obm-service',
                    config: { uri: 'http://fake'}
                }
            )
        };
    });

    after(function(){
        sandbox.restore();
    });

    it("should do ClientRequest on good setup", function(){
        nock("http://fake").get('/happy').reply(200, '{"Hello":"World"}');
        ucsTool.settings.protocol = 'http';
        ucsTool.settings.host = 'fake';

        ucsTool.settings.ucsHost = 'fake';
        ucsTool.settings.ucsUser = 'user';
        ucsTool.settings.ucsPassword = 'password';

        return ucsTool.clientRequest('/happy', 'GET', '')
        .then(function(res){
            expect(res).to.have.property('body').to.have.property('Hello').to.deep.equal('World');
        });
    });

    it("should reject on having http error", function(){
        var errorMsg = { error: '123456' };
        nock("https://fake:12345")
            .post('/this-should-fail')
            .reply(404, errorMsg);

        ucsTool.settings.protocol = 'https';
        ucsTool.settings.host = 'fake';
        ucsTool.settings.port = 12345;

        return expect(ucsTool
            .clientRequest('/this-should-fail', 'POST', 'My secret data'))
            .to.be.rejectedWith(errorMsg);
    });
});

