// Copyright 2016, EMC, Inc.

'use strict';
var uuid = require('node-uuid');

describe('copy-key job', function() {
    var waterline = { nodes: {}, catalogs: {} },
        CopyKeyJob,
        copyKeyJob,
        commandUtil = {};

    function CommandUtil() { return commandUtil; }

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/copy-publickey.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(CommandUtil, 'JobUtils.Commands'),
            helper.di.simpleWrapper({Client:function(){}}, 'ssh'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        this.sandbox = sinon.sandbox.create();
        CopyKeyJob = helper.injector.get('Job.CopySshKey');
    });

    describe('_run', function() {
        var sshSettings;

        beforeEach(function() {
            copyKeyJob = new CopyKeyJob({}, {target: 'nodeId'}, uuid.v4());
            commandUtil.sshExec = this.sandbox.stub().resolves({ stdout: 'success'});
            sshSettings = {
                host: 'the remote host',
                port: 22,
                username: 'someUsername',
                password: 'somePassword',
                publicKey: 'a somewhat long string',
                privateKey: 'a pretty long string',
            };
            waterline.nodes.needByIdentifier = this.sandbox.stub().resolves(
                {sshSettings: sshSettings}
            );
        });

        it('should use commandUtil.sshExec to copy a key to a remote node', function() {
            return copyKeyJob._run()
            .then(function() {
                expect(commandUtil.sshExec).to.be.calledTwice;
                expect(commandUtil.sshExec).to.be.calledWithExactly(
                        {cmd: 'mkdir -p .ssh'},
                        sshSettings,
                        {}
                );
                expect(commandUtil.sshExec).to.be.calledWithExactly(
                    {cmd: 'echo '+sshSettings.publicKey+' >> .ssh/authorized_keys'},
                    sshSettings,
                    {}
                );
            });
        });

        it('should fail if sshExec fails', function() {
            var error = new Error('remote error');
            commandUtil.sshExec.rejects(error);
            this.sandbox.stub(copyKeyJob, '_done').resolves();

            return copyKeyJob._run()
            .then(function() {
                expect(copyKeyJob._done).to.be.calledWith(error);
            });
        });
    });
});
