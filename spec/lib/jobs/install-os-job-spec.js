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
    var waterline;
    var Promise;

    before(function() {
        helper.setupInjector(
            _.flatten([
                helper.require('/lib/jobs/base-job'),
                helper.require('/lib/jobs/install-os'),
                helper.require('/lib/utils/job-utils/catalog-searcher'),
                helper.di.simpleWrapper({ catalogs:  {} }, 'Services.Waterline')
            ])
        );

        InstallOsJob = helper.injector.get('Job.Os.Install');
        waterline = helper.injector.get('Services.Waterline');
        Promise = helper.injector.get('Promise');
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
                completionUri: '',
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

    it("should set up message subscribers", function() {
        var cb;
        return job._run().then(function() {
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
        });
    });

    describe('test _convertInstallDisk', function() {
        var catalog = {
            data: [
                {
                    identifier: 0,
                    linuxWwid: '/dev/test0',
                    esxiWwid: 't10.abcde'
                },
                {
                    identifier: 1,
                    linuxWwid: '/dev/test1',
                    esxiWwid: 'naa.rstuvw'
                },
                {
                    identifier: 2,
                    linuxWwid: '/dev/test2',
                    esxiWwid: 'naa.xyzopq'
                }
            ]
        };

        beforeEach(function() {
            job = new InstallOsJob(
                {
                    profile: 'testprofile',
                    completionUri: '',
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
                    dnsServers: null,
                    installDisk: 1,
                    osType: 'esx'
                },
                {
                    target: 'testid'
                },
                uuid.v4());
            waterline.catalogs.findMostRecent = sinon.stub().resolves(catalog);
        });

        afterEach(function() {
            waterline.catalogs.findMostRecent.reset();
        });

        it('should set correct installDisk esxi wwid', function() {
            return Promise.resolve().then(function() {
                return job._convertInstallDisk();
            }).then(function() {
                expect(job.options.installDisk).to.equal('naa.rstuvw');
            });
        });

        it('should set correct installDisk linux wwid', function() {
            job.options.osType = 'linux';
            return Promise.resolve().then(function() {
                return job._convertInstallDisk();
            }).then(function() {
                expect(job.options.installDisk).to.equal('/dev/test1');
            });
        });

        it('should not convert if installDisk is string', function() {
            job.options.osType = 'linux';
            job.options.installDisk = 'wwidabcd';
            return Promise.resolve().then(function() {
                return job._convertInstallDisk();
            }).then(function() {
                expect(job.options.installDisk).to.equal('wwidabcd');
            });
        });

        it('should not convert if installDisk is not either string or number', function() {
            job.options.osType = 'linux';
            job.options.installDisk = [1, 2];
            expect(function() {
                job._convertInstallDisk();
            }).to.throw(Error);
        });

        it('should do nothing if installDisk is not specified', function() {
            job.options.installDisk = null;
            expect(function() {
                job._convertInstallDisk();
            }).to.not.throw(Error);
        });

        it('should do conversion if installDisk is 0 (for ESXi)', function() {
            job.options.osType = 'esx';
            job.options.installDisk = 0;
            return Promise.resolve().then(function() {
                return job._convertInstallDisk();
            }).then(function() {
                expect(job.options.installDisk).to.equal('t10.abcde');
            });
        });

        it('should do conversion if installDisk is 0 (for Linux)', function() {
            job.options.osType = 'linux';
            job.options.installDisk = 0;
            return Promise.resolve().then(function() {
                return job._convertInstallDisk();
            }).then(function() {
                expect(job.options.installDisk).to.equal('/dev/test0');
            });
        });
    });
});

