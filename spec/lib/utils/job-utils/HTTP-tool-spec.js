#! /usr/bin/env node

// Copyright, 2016, EMC, Inc.
/* jshint node: true */

'use strict';
var nock = require('nock'); // mock http request and its respond.

describe("HttpTool", function(){
    var httpTool;
    var urlGood = "http://test.com";
    var goodData = {good:true}; 
    var badData = {good:false};

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/utils/job-utils/HTTP-tool.js'),
                helper.di.requireWrapper('superagent', 'Superagent')
            ])
        );
        httpTool = helper.injector.get('JobUtils.HttpTool');
    });

    it('Should handle basic auth', function(done){
        nock(urlGood).get('/basicAuth')
        .basicAuth({user:'hello', pass: 'world'})
        .reply(200, goodData);

        httpTool.credential = {username:'hello', password:'world'};
        httpTool.get(urlGood+'/basicAuth', {}, function(err, res){
            expect(res).to.have.property('status').to.equal(200);
            done();
        });
    });

    it('Should handle cookie in header', function(done){
        nock(urlGood)
        .matchHeader('cookie','mySession')
        .get('/withCookie')
        .reply(200);

        httpTool.get(urlGood+'/withCookie', {cookie:'mySession'}, function(err, res){
            expect(res.status).to.equal(200);
            done();
        });
    });

    it("Should GET on Good URL", function(done) {
        nock(urlGood).get('/GET').reply(200, goodData);

        httpTool.get(urlGood+'/GET', {}, function(err, res){
            expect(res.status).to.equal(200);
            done();
        });
    });

    it("Should have err when GET bad URL", function(done){
        nock(urlGood).get('/badGET').reply(404, badData);
        httpTool.get(urlGood+'/badGET', {}, function(err){
                expect(err).to.have.property('status').to.equal(404);
                done();
            });
    });

    it('Should POST handle URL', function(done){
        nock(urlGood).post('/goodPOST').reply(201, {status:'happy'});
        httpTool.post(urlGood+'/goodPOST', 'application/json', 
                      '{data:"make me happy"}', {}, 
                      function (err, res){
            expect(res.body.status).to.equal('happy');
            done();
        });
    });

    it('Should POST handle content type', function(done){
        nock(urlGood).matchHeader('content-type', 'application/xml')
        .post('/header-post').reply(201, "You are good");
        
        httpTool.post(urlGood+'/header-post', 'application/xml', 
            '<data>"My xml Data"</data>', {}, 
        function (err, res){
            expect(res).to.have.property('text')
            .to.equal('You are good');
            done();
        });
    });

    it('Should PUT with given URL', function(done){
        nock(urlGood).put('/put-good').reply(204, 'Successfully get the put');
        
        httpTool.put(urlGood+'/put-good', 'application/json', 
            '{data: "put something"}', {}, 
            function(err, res){
                expect(res).to.have.property('text')
                .to.equal('Successfully get the put');
                expect(err).to.equal(null);
                
                done();
        });
    });

    it('Should DEL with given URL', function(done){
        nock(urlGood).delete('/del-good').reply(200, 'Delete Successfully');

        httpTool.del(urlGood+'/del-good', {}, function(err, res){
            expect(res).to.have.property('text')
            .to.equal('Delete Successfully');
            expect(err).to.equal(null);
            done();
        });
    });
});
