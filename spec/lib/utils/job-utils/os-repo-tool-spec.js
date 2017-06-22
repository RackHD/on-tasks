// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

var uuid = require('node-uuid');
var nock = require('nock'); //mock http request and response

describe("os-repo-tool", function () {
    var repoTool;

    before('os-repo-tool before', function () {
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/os-repo-tool.js')
        ]);

        repoTool = helper.injector.get('JobUtils.OsRepoTool');
    });

    describe("test downloadViahttp", function() {
        it("should successfully download file from http server", function () {
            var randData = uuid.v4(); //generate random data
            nock('http://testrepo.com').get('/BOOT.CFG').reply(200, randData);
            return expect(repoTool.downloadViaHttp('http://testrepo.com/BOOT.CFG'))
                    .eventually.equal(randData);
        });

        it("should throw error if http status code is not correct", function() {
            nock('http://testrepo.com').get('/BOOT.CFG').reply(404);
            return expect(repoTool.downloadViaHttp('http://testrepo.com/BOOT.CFG'))
                    .to.be.rejectedWith(Error);
        });

        it("should handle case-sensitive url path", function() {
            nock('http://testrepo.com')
                .get('/BOOT.CFG').reply(200, 'abcABC123')
                .get('/boot.cfg').reply(404);

            return Promise.all([
                expect(repoTool.downloadViaHttp('http://testrepo.com/BOOT.CFG'))
                    .eventually.equal('abcABC123'),
                expect(repoTool.downloadViaHttp('http://testrepo.com/boot.cfg'))
                    .to.be.rejectedWith(Error)
            ]);
        });

        it("should handle invalid address", function () {
            return expect(repoTool.downloadViaHttp('http://testrepo.com/BOOT.CFG'))
                .to.be.rejectedWith(Error);
        });
    });

    describe('test parseEsxBootCfgFile', function() {
        it("should get correct result after parsing", function() {
            var fileData =  'bootstate=0\ntitle=Loading ESXi installer\n' +
                            'kernel=/tBoot.b00\nkernelopt=runweasel\n' +
                            'modules=/B.B00 --- /jumpSTRt.gz --- /useropts.gz\nbuild=\nupdated=0';
            var result = repoTool.parseEsxBootCfgFile(fileData);
            expect(result).to.have.property('tbootFile').to.equal('tboot.b00');
            expect(result).to.have.property('mbootFile').to.equal('mboot.c32');
            expect(result).to.have.property('moduleFiles').to.equal('b.b00 --- ' +
                                                                    'jumpstrt.gz --- ' +
                                                                    'useropts.gz');
        });
    });
});
