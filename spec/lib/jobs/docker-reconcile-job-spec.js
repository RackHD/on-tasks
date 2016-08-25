// Copyright 2016, EMC, Inc.

'use strict';

var uuid = require('node-uuid');

describe('docker-reconciler-job', function() {
    var waterline = { nodes: {} },
        messenger = { },
        DockerReconcilerJob,
        dockerReconcilerJob;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/docker-reconciler-job.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline'),
            helper.di.simpleWrapper(messenger, 'Services.Messenger')
        ]);
        DockerReconcilerJob = helper.injector.get('Job.Docker.Reconciler');
    });

    var node,
        data,
        message,
        records = [{docker: {containerId: 'a'}}, {docker: {containerId: 'c'}}];

    beforeEach(function () {
        dockerReconcilerJob = new DockerReconcilerJob({}, {}, uuid.v4());
        waterline.nodes.findByTag = sinon.spy(function (tag) {
            return Promise.resolve(records);
        });
        waterline.nodes.create = sinon.spy(function (node) {
            return Promise.resolve(node);
        });
        waterline.nodes.updateOneById = sinon.spy(function (id, update) {
            return Promise.resolve(id);
        });
        waterline.nodes.destroyOneById = sinon.spy(function (id) {
            return Promise.resolve(id);
        });
        messenger.subscribe = sinon.spy(function (exch, key, cb) {
            return new Promise(function (resolve, reject) {
                cb(data, message = {
                    data: data,
                    resolve: sinon.spy(function () {
                        return resolve('subscription');
                    }),
                    reject: sinon.spy(function (err) {
                        return reject(err)
                    })
                });
            });
        });
    });

    describe('_run', function () {
        beforeEach(function (done) {
            data = {type: 'containers', value: [{Id: 'a'}, {Id: 'b'}]}
            dockerReconcilerJob._run().then(done);
        });

        it('finds compute-container nodes belonging to a host compute node', function () {
            expect(waterline.nodes.findByTag).to.have.been.calledOnce;
        });

        it('creates missing compute-containers', function () {
            expect(waterline.nodes.create).to.have.been.calledOnce;
        });

        it('updates updates existing compute-containers', function () {
            expect(waterline.nodes.updateOneById).to.have.been.calledOnce;
        });

        it('removes destroyed compute-containers', function () {
            expect(waterline.nodes.destroyOneById).to.have.been.calledOnce;
        });

        it('subscribes to docker-reconciler request messages', function () {
            expect(messenger.subscribe).to.have.been.calledOnce;
        });

        it('responds to messages requesting to reconcile docker containers belonging to a node', function () {
            expect(message.resolve).to.have.been.calledOnce;
        });
    });
});
