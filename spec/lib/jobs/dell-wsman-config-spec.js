// Copyright 2017 Dell Inc. or its subsidiaries.  All Rights Reserved.

'use strict';

var uuid = require('node-uuid');

describe(require('path').basename(__filename), function() {
    var WsmanConfigJob;
    var wsmanConfigJob;
    var wsmanTool;
    var configuration;
    var sandbox = sinon.sandbox.create();
    var fs;

    var dellConfigs = {
        configServerPath: '/api/smi/uri'
    };

    var options = {
        configServer: '1.1.1.1'
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/dell-wsman-config.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/utils/job-utils/wsman-tool'),
            helper.require('/lib/jobs/dell-wsman-base-job.js')
        ]);
        WsmanConfigJob = helper.injector.get('Job.Dell.Wsman.Config');
        wsmanConfigJob = new WsmanConfigJob(options, {}, uuid.v4());
        configuration = helper.injector.get('Services.Configuration');
        wsmanTool = helper.injector.get('JobUtils.WsmanTool');
        fs = helper.injector.get('fs');
    });

    beforeEach(function() {
        sandbox.stub(configuration, 'get');
        sandbox.stub(wsmanTool.prototype, 'clientRequest');
        sandbox.stub(fs, 'writeFile');
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('_initJob', function() {
        it('should init dell config successfully', function() {
            configuration.get.withArgs('dell').returns(dellConfigs);
            wsmanConfigJob._initJob();
            return expect(wsmanConfigJob.dellConfigs.configServerPath).to.be.equal('/api/smi/uri');
        });

        it('should throw error if dell configuration is imcompleted', function() {
            configuration.get.withArgs('dell').returns({});
            return expect(function() {
                wsmanConfigJob._initJob();
            }).to.throw('Config server path for Dell web service is not defined in smiConfig.json.');
        });
    });

    describe('_handleSyncRequest', function() {
        it('should send request successfully', function() {
            configuration.get.withArgs('dell').returns(dellConfigs);
            wsmanConfigJob._initJob();
            wsmanTool.prototype.clientRequest.resolves({body: 'test'});
            return expect(wsmanConfigJob._handleSyncRequest()).to.be.fulfilled;
        });
    });

    describe('_handleSyncResponse', function() {
        it('should reject if response is invalid', function() {
            return expect(wsmanConfigJob._handleSyncResponse({})).to.
                be.rejectedWith('Response for wsman microservice configuration is invalid.');
        });

        it('should update microservice config successfully', function() {
            var response = {
                credentials: {
                    username: 'test',
                    password: 'test'
                },
                gateway: 'http://1.1.1.1',
                service: [
                    {
                        name: 'firmware',
                        endpoint: [
                            {
                                name: 'updater',
                                url: '/api/1.0/server/firmware/updater'
                            }
                        ]
                    }
                ]
            };
            fs.writeFile.yieldsAsync();
            return expect(wsmanConfigJob._handleSyncResponse(response)).to.be.fulfilled;
        });

        it('should reject if error occurs while update config file', function() {
            var response = {
                credentials: {
                    username: 'test',
                    password: 'test'
                },
                gateway: 'http://1.1.1.1',
                service: [
                    {
                        name: 'firmware',
                        endpoint: [
                            {
                                name: 'updater',
                                url: '/api/1.0/server/firmware/updater'
                            }
                        ]
                    }
                ]
            };
            fs.writeFile.yieldsAsync(new Error('test'));
            return expect(wsmanConfigJob._handleSyncResponse(response)).to.
                be.rejectedWith('Could not write wsman microservice configs to file');
        });
    });
});
