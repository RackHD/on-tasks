// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('add-misc-node-properties-job', function(){
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
            helper.require('/lib/jobs/add-misc-node-property-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        
        NodeUpsertor = helper.injector.get('Job.Add.Misc.Node.Properties');
        job = new NodeUpsertor(options, context, taskId);    
        waterline.nodes = {
            updateByIdentifier: sandbox.stub().resolves()
        };
    });

    afterEach(function(){
        waterline.nodes.updateByIdentifier.reset();
    });

    it('Should modify node collection via waterline', function(){
        return job.run().then(function(){
            var formatedData = {
                miscProperties:options.data
            };

            expect(waterline.nodes.updateByIdentifier)
            .to.have.been.calledWith(options.target, formatedData);
        });

    });
});
