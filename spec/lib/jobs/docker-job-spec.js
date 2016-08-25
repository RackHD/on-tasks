// Copyright 2016, EMC, Inc.

'use strict';

var uuid = require('node-uuid');

describe('docker-job', function() {
    var waterline = { lookups: {}, nodes: {} },
        messenger = {},
        DockerJob,
        dockerJob;

    function Docker(options) {
        this.options = options;
    }

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/docker-job.js'),
            helper.di.simpleWrapper(Docker, 'Docker'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper(messenger, 'Services.Messenger')
        ]);
        DockerJob = helper.injector.get('Job.Docker');
    });

    var options,
        lookup,
        nodes = {};

    beforeEach(function () {
        options = {
            ca: 'ca',
            cert: 'cert',
            exec: [],
            host: 'host',
            key: 'key',
            port: 'port',
            protocol: 'protocol'
        };
        dockerJob = new DockerJob(options, {target: 'nodeId'}, uuid.v4());
        waterline.nodes.needByIdentifier = sinon.spy(function (id) {
            if (id === 'nodeId') {
                return Promise.resolve(nodes.target);
            }
            return Promise.resolve(nodes.host);
        });
        waterline.lookups.findOneByTerm = sinon.spy(function (id) {
            return Promise.resolve(lookup);
        });
        Docker.prototype.listContainers = sinon.spy(function (opts, cb) {
            cb(null, []);
        });
        messenger.request = sinon.spy(function (exch, key, object, type, timeout) {
            return Promise.resolve();
        });
    });

    describe('on a compute node', function () {
        beforeEach(function () {
            nodes.target = {
                type: 'compute'
            };
            options.exec = [
                {"method": "list", "args": [{"all": 1}]}
            ];
        });

        describe('without a lookup', function () {
            beforeEach(function (done) {
                lookup = null;
                options.exec[0].emit = {"docker-reconciler": {"type": "containers", "ref": 0}};
                dockerJob._run().then(done);
            });

            it('will execute docker commands', function () {
                expect(Docker.prototype.listContainers).to.have.been.calledOnce;
            });

            it('and emit messenger requests', function () {
                expect(messenger.request).to.have.been.calledOnce;
            });
        });

        describe('with a lookup', function () {
            beforeEach(function (done) {
                lookup = {ipAddress: 'lookup'};
                options.exec[0].store = {"containers": 0};
                dockerJob._run().then(done);
            });

            it('will execute docker commands', function () {
                expect(Docker.prototype.listContainers).to.have.been.calledOnce;
            });
        });

        describe('with hostOptions', function () {
            beforeEach(function (done) {
                lookup = null;
                nodes.target.docker = {
                    hostOptions: {
                        ca: 'hostCa',
                        cert: 'hostCert',
                        host: 'hostHost',
                        key: 'hostKey',
                        port: 'hostPort',
                        protocol: 'hostProtocol'
                    }
                }
                dockerJob._run().then(done);
            });

            it('will execute docker commands', function () {
                expect(Docker.prototype.listContainers).to.have.been.calledOnce;
            });
        });
    });

    describe('on a compute container node', function () {
        beforeEach(function (done) {
            lookup = {ipAddress: 'lookup'};
            nodes.target = {
                type: 'compute-container',
                relations: [{relationType: 'dockerHost', targets: ['host']}]
            };
            nodes.host = {
                type: 'compute'
            };
            options.exec = [
                {"method": "list", "args": [{"all": 1}]}
            ];
            dockerJob._run().then(done);
        });

        it('will execute docker commands', function () {
            expect(Docker.prototype.listContainers).to.have.been.calledOnce;
        });
    });

    describe('api', function () {
        var mockContainer = {
            attach: sinon.spy(function (opts, cb) { cb(); }),
            inspect: sinon.spy(function (opts, cb) { cb(); }),
            kill: sinon.spy(function (opts, cb) { cb(); }),
            logs: sinon.spy(function (opts, cb) { cb(); }),
            remove: sinon.spy(function (opts, cb) { cb(); }),
            restart: sinon.spy(function (opts, cb) { cb(); }),
            start: sinon.spy(function (opts, cb) { cb(); }),
            stop: sinon.spy(function (opts, cb) { cb(); })
        };

        var mockDocker = {
            getContainer: sinon.spy(function () {
                return mockContainer;
            }),

            createContainer: sinon.spy(function (opts, cb) {
                cb(null, mockContainer);
            }),

            listContainers: sinon.spy(function (opts, cb) {
                cb(null, [{Labels: {}}]);
            }),

            modem: {
              followProgress: sinon.spy(function (stream, finish, progress) {
                  progress();
                  finish();
              })
            },

            pull: sinon.spy(function (image, opts, cb) {
                cb();
            })
        };

        var api = null;

        beforeEach(function () {
            api = DockerJob.createDockerAPI(mockDocker);
        });

        it('can attach', function (done) {
            api.attach('id', {}, done);
        });

        it('can create', function (done) {
            api.create({}, done)
        });

        it('can inspect', function (done) {
            api.inspect('id', {}, done);
        });

        it('can kill', function (done) {
            api.kill('id', {}, done);
        });

        it('can list', function (done) {
            api.list({}, done);
        });

        it('can logs', function (done) {
            api.logs('id', {}, done);
        });

        it('can pull', function (done) {
            api.pull('image', {}, done);
        });

        it('can remove', function (done) {
            api.remove('id', {}, done);
        });

        it('can restart', function (done) {
            api.restart('id', {}, done);
        });

        it('can run', function (done) {
            api.run('image', {}, done);
        });

        it('can start', function (done) {
            api.start('id', {}, done);
        });

        it('can stop', function (done) {
            api.stop('id', {}, done);
        });
    });
});
