// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

describe('JobUtils.NfsClient', function() {
    var NfsClient;
    var job;
    var sandbox = sinon.sandbox.create();
    var child_process;
    var fs;

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/utils/job-utils/nfs-client.js')
            ])
        );
        NfsClient = helper.injector.get('JobUtils.NfsClient');
        child_process = helper.injector.get('child_process');
        fs = helper.injector.get('fs');
    });

    beforeEach(function() {
        job = new NfsClient();
        sandbox.stub(child_process, 'exec');
        sandbox.stub(fs, 'readFile');
        sandbox.stub(fs, 'writeFile');
        sandbox.stub(fs, 'unlink');
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('Should mount successfully', function(){
        expect(job.mount()).to.be.fulfilled;
    });

    it('Should umount successfully', function(){
        expect(job.umount()).to.be.fulfilled;
    });

    it('Should read file successfully', function(){
        expect(job.readFile('test.xml')).to.be.fulfilled;
    });

    it('Should write file successfully', function(){
        expect(job.writeFile('test.xml', 'data')).to.be.fulfilled;
    });

    it('Should delete file successfully', function(){
        expect(job.deleteFile('test.xml')).to.be.fulfilled;
    });
});
