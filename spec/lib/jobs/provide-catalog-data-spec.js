// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe('Provide Catalog Data Job', function () {
    var uuid;
    var waterline;
    var base = require('./base-spec');

    base.before(function (context) {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/provide-catalog-data.js'),
            helper.require('/lib/utils/job-utils/catalog-searcher.js'),
            helper.di.simpleWrapper({ catalogs:  {} }, 'Services.Waterline')
        ]);

        context.Jobclass = helper.injector.get('Job.Catalogs.ProvideData');
        uuid = helper.injector.get('uuid');
        waterline = helper.injector.get('Services.Waterline');
        waterline.catalogs.findMostRecent = function() {};
    });

    beforeEach(function() {
        this.sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sandbox = sinon.sandbox.restore();
    });

    describe('Base', function () {
        base.examples();
    });

    describe('Run', function() {
        it('should provide a catalog value to the shared context', function() {
            this.sandbox.stub(waterline.catalogs, 'findMostRecent').resolves({
                data: {
                    'foo': {
                        'bar': {
                            'baz': 'foobarbazvalue'
                        }
                    }
                }
            });

            var job = new this.Jobclass(
                { source: 'test', path: 'foo.bar.baz' },
                { target: 'testtarget' },
                uuid.v4()
            );

            job._run();

            return job._deferred.then(function() {
                expect(waterline.catalogs.findMostRecent)
                    .to.have.been.calledWith({
                        node: job.nodeId,
                        source: job.options.source
                    });
                expect(job.context)
                    .to.have.property('test')
                    .with.property('foo.bar.baz')
                    .that.equals('foobarbazvalue');
            });
        });

        it('should fail if there is no catalog for provided source', function() {
            this.sandbox.stub(waterline.catalogs, 'findMostRecent').resolves();

            var job = new this.Jobclass(
                { source: 'notExist', path: 'a.b.c' },
                { target: 'testtarget' },
                uuid.v4()
            );

            job._run();

            return expect(job._deferred).to.be.rejectedWith(
                /Could not find a catalog entry for notExist/);
        });

        it('should fail if there is no value for the provided path', function() {
            this.sandbox.stub(waterline.catalogs, 'findMostRecent').resolves({
                data: {
                    'foo': 'bar'
                }
            });

            var job = new this.Jobclass(
                { source: 'test', path: 'a.b.c' },
                { target: 'testtarget' },
                uuid.v4()
            );

            job._run();

            return expect(job._deferred).to.be.rejectedWith(
                /Could not find value at path 'a.b.c' in catalog 'test'/);
        });
    });
});
