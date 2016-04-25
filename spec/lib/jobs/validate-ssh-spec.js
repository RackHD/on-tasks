// Copyright 2015, EMC, Inc.

'use strict';
var uuid = require('node-uuid');
describe('Validate Ssh', function() {
    var waterline = { lookups: {}, nodes: {} },
        ValidateSshJob,
        validateSshJob,
        Emitter = require('events').EventEmitter,
        users,
        lookups,
        sshSettings,
        mockSsh = new Emitter(),
        MockSsh = {};

    MockSsh.Client = function() {
        return mockSsh;
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/validate-ssh.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(MockSsh, 'ssh'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        this.sandbox = sinon.sandbox.create();
        ValidateSshJob = helper.injector.get('Job.Ssh.Validation');
    });

    describe('_run', function() {

        beforeEach(function() {
            lookups = [
                {ipAddress: '1.1.1.1', macAddress: 'someMac'},
                {ipAddress: '2.2.2.2', macAddress: 'someMac'},
                {ipAddress: '3.3.3.3', macAddress: 'someMac'},
            ];
            sshSettings = {
                username: 'a username',
                password: 'a password',
                privateKey: 'a pretty long string'
            };
            users = [
                {name: 'someUser', password: 'somePassword'},
                {name: 'anotherUser', password: 'anotherPassword'},
                {name: 'aUser', password: 'aPassword'},
            ];
            validateSshJob = new ValidateSshJob({users: users}, {target: 'nodeId'}, uuid.v4());
            waterline.lookups.findByTerm = this.sandbox.stub().resolves(lookups);
            waterline.nodes.updateByIdentifier = this.sandbox.stub().resolves();
            this.sandbox.stub(validateSshJob, 'testCredentials').resolves(sshSettings);
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should use lookups to test ssh credentials and update a node with valid sshSettings',
        function() {
            return validateSshJob._run()
            .then(function() {
                expect(validateSshJob.testCredentials).to.be.calledOnce
                    .and.calledWithExactly(lookups, users, 2, 1000);
                expect(waterline.lookups.findByTerm).to.be.calledOnce
                    .and.calledWithExactly('nodeId');
                expect(waterline.nodes.updateByIdentifier).to.be.calledOnce
                    .and.calledWithExactly('nodeId', {sshSettings: sshSettings});
            });
        });

        it('should fail if credential tests fail', function() {
            var error = new Error('no connections');
            validateSshJob.testCredentials.rejects(error);
            this.sandbox.stub(validateSshJob, '_done').resolves();
            return validateSshJob._run()
            .then(function() {
                expect(validateSshJob._done).to.be.calledWith(error);
            });
        });

        it('should skip and succeed if no users are defined', function() {
            validateSshJob.users = null;
            this.sandbox.stub(validateSshJob, '_done').resolves();
            return validateSshJob._run()
            .then(function() {
                expect(validateSshJob._done).to.be.calledOnce;
                expect(validateSshJob._done).to.be.calledWith();
            });
        });
    });

    describe('attemptConnection', function() {

        beforeEach(function() {
            validateSshJob = new ValidateSshJob({users: users}, {target: 'nodeId'}, uuid.v4());
            mockSsh.end = this.sandbox.stub();
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should take an ip and user credentials and resolve a promise for valid sshSettings',
        function() {
            mockSsh.connect = function() {
                var self = this;
                setImmediate(function() {
                    self.emit('ready');
                });
            };
            return expect(
                validateSshJob.attemptConnection(
                    '1.2.3.4',
                    {name:'user', password: 'pass', sshKey: 'key'}
                )
            )
            .to.eventually.deep.equal({
                host: '1.2.3.4',
                username:'user',
                password: 'pass',
                privateKey: 'key'
            });
        });

        it('should reject on error', function() {
            var error = new Error('auth methods failed');
            mockSsh.connect = function() {
                var self = this;
                setImmediate(function() {
                    self.emit('error', error);
                });
            };
            return expect(
                validateSshJob.attemptConnection(
                    '1.2.3.4',
                    {name:'user', password: 'pass', sshKey: 'key'}
                )
            ).to.be.rejectedWith(/auth methods failed/);
        });
    });

    describe('testCredentials', function() {

        beforeEach(function() {
            lookups = [
                {ipAddress: '1.1.1.1', macAddress: 'someMac'},
                {ipAddress: '2.2.2.2', macAddress: 'someMac'},
                {ipAddress: '3.3.3.3', macAddress: 'someMac'},
            ];

            users = [
                {name: 'someUser', password: 'somePassword'},
                {name: 'anotherUser', password: 'anotherPassword'},
                {name: 'aUser', password: 'aPassword'},
            ];

            validateSshJob = new ValidateSshJob({users: users}, {target: 'nodeId'}, uuid.v4());
            mockSsh.end = this.sandbox.stub();
            this.sandbox.stub(validateSshJob, 'attemptConnection').rejects(new Error('failed'));
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should test ssh for a set of lookup entry ip addresses and users', function() {
            validateSshJob.attemptConnection.onCall(9).resolves(
                {host: '3.3.3.3', username: 'aUser', password: 'aPassword'}
            );
            return validateSshJob.testCredentials(lookups, users, 2, 1)
            .then(function(out) {
                expect(out).to.deep.equal(
                    {host: '3.3.3.3', username: 'aUser', password: 'aPassword'}
                );
            });
        });

        it('should fail if after retries there are no successful connections', function() {
            return expect(validateSshJob.testCredentials(lookups, users, 2, 1))
                .to.be.rejected;
        });
    });
});
