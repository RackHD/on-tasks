// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe('Linux Catalog Job', function () {
    var LinuxCatalogJob,
        catalogJob,
        waterline = { lookups: {}, catalogs: {} },
        lookup = {},
        parser = {},
        uuid;

    var commandUtil = {};
    function CommandUtil() { return commandUtil; }

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/linux-catalog'),
                helper.di.simpleWrapper(parser, 'JobUtils.CommandParser'),
                helper.di.simpleWrapper(lookup, 'Services.Lookup'),
                helper.di.simpleWrapper(CommandUtil, 'JobUtils.Commands'),
                helper.di.simpleWrapper(waterline, 'Services.Waterline')
            ])
        );
        this.sandbox = sinon.sandbox.create();
        LinuxCatalogJob = helper.injector.get('Job.Linux.Catalog');
        uuid = helper.injector.get('uuid');
    });

    describe('_run', function() {
        beforeEach(function() {
            commandUtil.buildCommands = sinon.stub().returns([]);
            catalogJob = new LinuxCatalogJob(
                { commands: [] },
                { target: 'testId' },
                uuid.v4()
            );
            this.sandbox.stub(catalogJob, '_subscribeRequestCommands');
            this.sandbox.stub(catalogJob, '_subscribeRespondCommands');
        });

        afterEach(function() {
            this.sandbox.restore();
        });
        it('should subcribe to command requests from a node', function() {
            catalogJob._run();
            expect(catalogJob._subscribeRequestCommands).to.have.been.calledOnce;
            expect(catalogJob._subscribeRequestCommands.args[0][0]).to.be
                .a('function');
        });

        it('should subcribe to command responses from a node', function() {
            catalogJob._run();
            expect(catalogJob._subscribeRespondCommands).to.have.been.calledOnce;
            expect(catalogJob._subscribeRespondCommands.args[0][0]).to.be
                .a('function');
        });
    });

    describe('request subscription callback', function() {
        beforeEach(function() {
            commandUtil.buildCommands = sinon.stub().returns([{cmd: 'testCommand'}]);
            catalogJob = new LinuxCatalogJob(
                { commands: [] },
                { target: 'testId' },
                uuid.v4()
            );
            this.sandbox.stub(catalogJob, '_subscribeRequestCommands');
            this.sandbox.stub(catalogJob, '_subscribeRespondCommands');
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should return an object with node id and commands', function() {

            catalogJob._run();
            expect(catalogJob._subscribeRequestCommands).to.have.been.calledOnce;
            expect(catalogJob._subscribeRequestCommands.args[0][0]()).to.deep
                .equal({
                    identifier: 'testId',
                    tasks: [{cmd: 'testCommand'}]
                });
        });
    });

    describe('response subscription callback', function() {
        var tasks,
            parsedTasks;

        beforeEach(function() {
            tasks = [{cmd: 'testCommand'}];
            parsedTasks = [{data: 'data', source: 'testCommand'}];
            commandUtil.buildCommands = sinon.stub().returns(tasks);
            catalogJob = new LinuxCatalogJob(
                { commands: [] },
                { target: 'testId' },
                uuid.v4()
            );
            parser.parseTasks = this.sandbox.stub().resolves(parsedTasks);
            commandUtil.handleRemoteFailure = this.sandbox.stub().resolves(tasks);
            commandUtil.catalogParsedTasks = this.sandbox.stub().resolves(parsedTasks);
            this.sandbox.stub(catalogJob, 'updateLookups').resolves([]);
            this.sandbox.stub(catalogJob, '_subscribeRequestCommands');
        });

        afterEach(function() {
            this.sandbox.restore();
        });
        it('should catalog parsed responses and update lookups', function(done) {

            this.sandbox.stub(catalogJob, '_subscribeRespondCommands', function(cb) {
                cb({tasks: tasks})
                .then(function() {
                    expect(parser.parseTasks).to.have.been.calledOnce.and
                        .calledWith(tasks);
                    expect(commandUtil.handleRemoteFailure).to.have.been.calledOnce
                        .and.calledWith(tasks);
                    expect(catalogJob.updateLookups).to.have.been.calledOnce
                        .and.calledWith(parsedTasks);
                    expect(commandUtil.catalogParsedTasks).to.have.been
                        .calledWithExactly(parsedTasks[0]);
                    done();
                })
                .catch(done);
            });
            catalogJob._run();
        });

        it('should finish with error if there is a remote error', function(done) {
            var error = new Error('remote error');
            commandUtil.handleRemoteFailure.rejects(error);
            this.sandbox.stub(catalogJob, '_done');
            this.sandbox.stub(catalogJob, '_subscribeRespondCommands', function(cb) {
                    cb({tasks: tasks})
                    .then(function() {
                        expect(catalogJob._done).to.be.calledWith(error);
                        done();
                    })
                    .catch(done);
            });
            catalogJob._run();
        });

        it('should finish with error if there is a parsing error', function(done) {
            var error = new Error('parsing error');
            commandUtil.catalogParsedTasks.throws(error);
            this.sandbox.stub(catalogJob, '_done');
            this.sandbox.stub(catalogJob, '_subscribeRespondCommands', function(cb) {
                    cb({tasks: tasks})
                    .then(function() {
                        expect(catalogJob._done).to.be.calledWith(error);
                        done();
                    })
                    .catch(done);
            });
            catalogJob._run();
        });
    });

    describe('updateLookups', function() {
        var parsedTasks;
        beforeEach(function() {
            parsedTasks = [
                {data: 'data', source: 'test'},
                {data: 'data', source: 'test', lookups: [
                    {mac: 'testMacAddress'}, {mac: 'testMac'}
                ]},
                {data: 'data', source: 'test', lookups: [
                    {ip: 'someIp', mac: 'someMacAddress'}, {ip: 'anIp', mac: 'someMac'}
                ]}
            ];
            commandUtil.buildCommands = sinon.stub().returns([]);
            catalogJob = new LinuxCatalogJob(
                { commands: [] },
                { target: 'testId' },
                uuid.v4()
            );
            lookup.setIpAddress = this.sandbox.stub().resolves();
            waterline.lookups.upsertNodeToMacAddress = this.sandbox.stub().resolves();
        });

        it('should setIpAddress given a mac and ip and upsert for just a mac', function() {
            return catalogJob.updateLookups(parsedTasks)
            .then(function() {
                expect(lookup.setIpAddress).to.be.calledTwice.and
                    .calledWithExactly('someIp', 'someMacAddress').and
                    .calledWithExactly('anIp', 'someMac');
                expect(waterline.lookups.upsertNodeToMacAddress).to.be.calledTwice
                    .and.calledWithExactly('testId', 'testMacAddress')
                    .and.calledWithExactly('testId', 'testMac');
            });
        });
    });
});

