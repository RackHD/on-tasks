// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('upsert-node-job', function(){
    var job,
    NodeUpsertor, 
    taskId = uuid.v4(),
    context = {},
    options = {
        target: "some:test:node",
        data: { 
            key1:{
                ip: "123.456.789.012",
                port: "12345",
                key2: {
                    key3: "value"
                }
            }
        } 
    },
    sandbox = sinon.sandbox.create(),
    waterline = {};

    before(function(){
        helper.setupInjector([
            helper.require('/lib/jobs/upsert-node-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        
        NodeUpsertor = helper.injector.get('Job.Upsert.Node.Attribute');
        job = new NodeUpsertor(options, context, taskId);    
        waterline.nodes = {
            updateByIdentifier: sandbox.stub().resolves()
        };
    });

    it('Should modify node collection via waterline', function(){
        // console.log(waterline.nodes.updateByIdentifier);
        return job.run().then(function(){
            expect(waterline.nodes.updateByIdentifier)
            .to.have.been.calledWith(options.target, options.data);
        });

    });
});
