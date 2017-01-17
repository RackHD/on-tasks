// Copyright 2017, EMC, Inc.

'use strict';
describe('Ucs Discovery Job', function () {
    var uuid = require('node-uuid'),
        sandbox = sinon.sandbox.create(),
        graphId = uuid.v4(),
        ucsJob,
        ucsTool,
        rackmountData,
        rootData,
        waterline = {},
        Error;

    var node = {
        id: 'abc',
        type: 'enclosure',
        name: 'Node',
        identifiers: [],
        relations: [
            { relationType: 'encloses', 
              targets: [ '/fake' ] },
            { relationType: 'enclosedBy', 
              targets: [ '/fake' ]}
        ]
    };
    
    before(function() { 
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ucs-discovery.js'),
            helper.require('/lib/utils/job-utils/ucs-tool.js'),
            helper.require('/lib/utils/job-utils/http-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline')
        ]);
        waterline.nodes = {
            create: sandbox.stub().resolves(node),
            needOne: sandbox.stub().resolves(node),
            updateOne: sandbox.stub().resolves(node)
        };
        Error = helper.injector.get('Errors');
    });
    
    afterEach(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        var Job = helper.injector.get('Job.Ucs.Discovery');
        ucsJob = new Job({
            uri:'https://1.1.1.1:7080/sys',
            username:'user',
            password:'pass',
            ucs:"1.1.1.1"
        }, {}, graphId);
        
        sandbox.stub(ucsJob.ucs);
        ucsTool = ucsJob.ucs;
        
        rootData = {
            body: {
                Chassis: [
                    {
                        "relative_path": "/sys/chassis-6"
                    }
                ],
                FEX: [
                    {
                        "relative_path": "/sys/fex-2"
                    }
                ],
                Servers: [
                    {
                        relative_path: "/sys/rack-unit-7"/* jshint ignore:line */
                    }
                ]
            }
        };
        rackmountData = {
            body:
                [
                    {
                        macs: ["00:00:FF:36:57:01", "00:00:FF:36:57:02"],
                    name: "rack-unit-7",
                    path: "sys/rack-unit-7"
                }
                ]

        };
    });
    
    describe('usc discovery', function() {
        it('should successfully run the job', function() {
            ucsTool.clientRequest.onCall(0).resolves(rootData);
            ucsTool.clientRequest.onCall(1).resolves(rackmountData);
            ucsJob._run()
            .then(function() {
                 expect(waterline.nodes.updateOne).to.be.called.once;
            });
        });

        it('should successfully log in', function() {
            ucsTool.clientRequest.onCall(0).resolves({"body":"cookie"});
            ucsJob.logIn()
                .then(function(data) {
                    expect(data).to.deep.equal("cookie");
                });
        });
    });



    
});
