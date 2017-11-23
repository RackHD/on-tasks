// Copyright © 2017 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';

describe('JobUtils.Smb2Client', function() {
    var Smb2Client;
    var job;
    var sandbox = sinon.sandbox.create();
    var SMB2;

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/utils/job-utils/smb2-client.js')
            ])
        );
        Smb2Client = helper.injector.get('JobUtils.Smb2Client');
        SMB2 = require('smb2');
    });

    beforeEach(function() {
        job = new Smb2Client();
        sandbox.stub(SMB2.prototype, 'readFile');
        sandbox.stub(SMB2.prototype, 'writeFile');
        sandbox.stub(SMB2.prototype, 'unlink');
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('Should read file successfully', function(){
        expect(job.readFile('data.xml')).to.be.fulfilled;
    });

    it('Should write file successfully', function(){
        expect(job.writeFile('data.xml', 'data')).to.be.fulfilled;
    });

    it('Should delete file successfully', function(){
        expect(job.deleteFile('data.xml')).to.be.fulfilled;
    });
});
