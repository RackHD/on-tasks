// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe('CommonNetworkTool', function() {
    var CommonNetworkTool;

    before('snmp tool before', function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/common-network-tool'),
            helper.require('/lib/utils/job-utils/common-network-parser')
        ]);

        CommonNetworkTool = helper.injector.get('JobUtils.CommonNetworkTool');
    });

    describe('Base', function() {
        it('should exist', function() {
            should.exist(CommonNetworkTool);
        });

        it('should be a function', function() {
            CommonNetworkTool.should.be.a('function');
        });
    });

    describe('tool', function() {
        var tool;

        before(function() {
            tool = new CommonNetworkTool();
        });

        describe('ping', function() {
            beforeEach(function() {
                this.sandbox = sinon.sandbox.create();
            });

            afterEach(function() {
                this.sandbox.restore();
            });

            it('exists', function() {
                should.exist(tool.ping);
            });
            it('is a function', function() {
                expect(tool.ping).is.a('function');
            });
            it('should ping the host', function() {
                this.sandbox.stub(tool, 'runCommand').resolves();
                return tool.ping()
                .then(function() {
                    expect(tool.runCommand).to.have.been.calledOnce;
                });
            });
            it('should fail if host cannot be reached', function() {
                this.sandbox.stub(tool, 'runCommand').rejects();
                return tool.ping().should.be.rejected;
            });
        });
    });
});
