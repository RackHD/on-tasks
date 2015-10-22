// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');

describe('Install OS Job', function () {
    var InstallOsJob;
    var subscribeRequestProfileStub;
    var subscribeRequestPropertiesStub;
    var subscribeHttpResponseStub;
    var job;

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/install-os')
            ])
        );

        InstallOsJob = helper.injector.get('Job.Os.Install');
        subscribeRequestProfileStub = sinon.stub(
            InstallOsJob.prototype, '_subscribeRequestProfile');
        subscribeRequestPropertiesStub = sinon.stub(
            InstallOsJob.prototype, '_subscribeRequestProperties');
        subscribeHttpResponseStub = sinon.stub(
            InstallOsJob.prototype, '_subscribeHttpResponse');
    });

    beforeEach(function() {
        subscribeRequestProfileStub.reset();
        subscribeRequestPropertiesStub.reset();
        subscribeHttpResponseStub.reset();
        job = new InstallOsJob(
            {
                profile: 'testprofile',
                completionUri: 'esx-ks',
                version: '7.0',
                repo: 'http://127.0.0.1:8080/myrepo/7.0/x86_64',
                rootPassword: 'rackhd',
                rootSshKey: null,
                users: [
                    {
                        name: 'test',
                        password: 'testPassword',
                        uid: 100,
                        sshKey: ''
                    }
                ],
                dnsServers: null
            },
            {
                target: 'testid'
            },
            uuid.v4());
        job._subscribeActiveTaskExists = sinon.stub().resolves();
    });

    after(function() {
        subscribeRequestProfileStub.restore();
        subscribeRequestPropertiesStub.restore();
        subscribeHttpResponseStub.restore();
    });

    it("should have a nodeId value", function() {
        expect(job.nodeId).to.equal('testid');
    });

    it("should have a profile value", function() {
        expect(job.profile).to.equal('testprofile');
    });

    it("should generate correct password", function() {
        expect(job.options.rootEncryptedPassword).to.match(/^\$6\$*\$*/);
        expect(job.options.users[0].encryptedPassword).to.match(/^\$6\$*\$*/);
    });

    it("should remove empty ssh key", function() {
        expect(job.options).to.not.have.property('rootSshKey');
        expect(job.options.users[0]).to.not.have.property('sshKey');
    });

    it("should convert some option to empty array", function() {
        expect(job.options.dnsServers).to.have.length(0);
    });

    it("should set up message subscribers", function(done) {
        var cb;
        job._preHandling = sinon.stub().resolves();
        job._run();
        process.nextTick(function() {
            expect(subscribeRequestProfileStub).to.have.been.called;
            expect(subscribeRequestPropertiesStub).to.have.been.called;
            expect(subscribeHttpResponseStub).to.have.been.called;

            cb = subscribeRequestProfileStub.firstCall.args[0];
            expect(cb).to.be.a.function;
            expect(cb.call(job)).to.equal(job.profile);

            cb = subscribeRequestPropertiesStub.firstCall.args[0];
            expect(cb).to.be.a.function;
            expect(cb.call(job)).to.equal(job.options);

            cb = subscribeHttpResponseStub.firstCall.args[0];
            expect(cb).to.be.a.function;

            done();
        });
    });

    it("should fetch correct ESXi options from external repository (upper case)", function(done) {
        var repo = 'http://abc.xyz/repo/test';
        job.options.completionUri = 'esx-ks';
        job.options.repo = repo;

        job._downloadEsxBootCfg = sinon.stub().resolves({
            data: 'bootstate=0\ntitle=Loading ESXi installer\n' +
                       'kernel=/tBoot.b00\nkernelopt=runweasel\n' +
                       'modules=/b.b00 --- /jumpSTRt.gz --- /useropts.gz\nbuild=\nupdated=0',
            upperCase: true
        });
        job._preHandling().then(function() {
            expect(job.options.mbootFile).to.equal(repo + '/MBOOT.C32');
            expect(job.options.tbootFile).to.equal(repo + '/TBOOT.B00');
            expect(job.options.moduleFiles).to.equal(repo + '/B.B00 --- ' + repo +
                                                     '/JUMPSTRT.GZ --- ' + repo +
                                                     '/USEROPTS.GZ');
            done();
        });
    });

    it("should fetch correct ESXi options from external repository (lower case)", function(done) {
        var repo = 'http://abc.xyz/repo/test';
        job.options.completionUri = 'esx-ks';
        job.options.repo = repo;

        job._downloadEsxBootCfg = sinon.stub().resolves({
            data: 'bootstate=0\ntitle=Loading ESXi installer\n' +
                       'kernel=/tBoot.b00\nkernelopt=runweasel\n' +
                       'modules=/b.b00 --- /jumpSTRt.gz --- /useropts.gz\nbuild=\nupdaTEd=0',
            upperCase: false
        });
        job._preHandling().then(function() {
            expect(job.options.mbootFile).to.equal(repo + '/mboot.c32');
            expect(job.options.tbootFile).to.equal(repo + '/tboot.b00');
            expect(job.options.moduleFiles).to.equal(repo + '/b.b00 --- ' + repo +
                                                     '/jumpstrt.gz --- ' + repo +
                                                     '/useropts.gz');
            done();
        });
    });
 });
