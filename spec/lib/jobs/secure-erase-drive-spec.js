// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe(require('path').basename(__filename), function () {
    var SEJob,
        job,
        diskInfo,
        paramArray,
        uuid = require('node-uuid'),
        nodeId = '561885426cb1f2ea4486589d',
        sandbox = sinon.sandbox.create(),
        cataSearchMock = {},
        cmdUtlMock = {};
    function cmdUtlFacMock() { return cmdUtlMock; }

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job'),
            helper.require('/lib/jobs/secure-erase-drive'),
            helper.di.simpleWrapper(cmdUtlFacMock, 'JobUtils.Commands'),
            helper.di.simpleWrapper(cataSearchMock, 'JobUtils.CatalogSearchHelpers')
        ]);

        SEJob = helper.injector.get('Job.Drive.SecureErase');
    });

    describe('User option validation', function() {

        it('should fail if option does not have eraseSettings', function() {
            expect(function() {
                return new SEJob({}, { target: nodeId }, uuid.v4());
            }).to.throw(Error.AssertionError, 'eraseSettings ([object]) is required');
        });

        it('should fail if eraseSettings is not an array', function() {
            var options = {
                eraseSettings: { disks: "abc" }
            };

            expect(function() {
                return new SEJob(options, { target: nodeId }, uuid.v4());
            }).to.throw(Error.AssertionError, 'eraseSettings ([object]) is required');
        });

        it('should fail if eraseSettings does not have disks', function() {
            var options = {
                eraseSettings: [
                    {
                        test: "abc"
                    }
                ]
            };

            job = new SEJob(options, { target: nodeId }, uuid.v4());

            expect(function() { job._validateOptions(); })
                .to.throw(Error.AssertionError, 'disks (array) is required');
         });

         it('should fail if disks is an empty array', function() {
            var options = {
                eraseSettings: [
                    {
                        disks: []
                    }
                ]
            };

            job = new SEJob(options, { target: nodeId }, uuid.v4());

            expect(function() { job._validateOptions(); })
                .to.throw('disks should not be empty');
         });

         it('should fail if arg is not a string', function() {
            var options = {
                eraseSettings: [
                    {
                        disks: ['sda'],
                        arg: {}
                    }
                ]
            };

            job = new SEJob(options, { target: nodeId }, uuid.v4());

            expect(function() { job._validateOptions(); })
                .to.throw(Error.AssertionError, 'arg (string) is required');
         });

         it('should fail if no specified tool when there is arg', function() {
            var options = {
                eraseSettings: [
                    {
                        disks: ['sda'],
                        arg: 'test'
                    }
                ]
            };

            job = new SEJob(options, { target: nodeId }, uuid.v4());

            expect(function() { job._validateOptions(); })
                .to.throw(Error.AssertionError, 'tool (string) is required');
         });

         it('should fail if tool is not a string', function() {
            var options = {
                eraseSettings: [
                    {
                        disks: ['sda'],
                        tool: {},
                        arg: 'test'
                    }
                ]
            };

            job = new SEJob(options, { target: nodeId }, uuid.v4());

            expect(function() { job._validateOptions(); })
                .to.throw(Error.AssertionError, 'tool (string) is required');
         });

         it('should fail if the tool does not support the arg', function() {
            var options = {
                eraseSettings: [
                    {
                        disks: ['1'],
                        tool: 'hdparm',
                        arg: '1'
                    }
                ]
            };

            job = new SEJob(options, { target: nodeId }, uuid.v4());

            expect(function() { job._validateOptions(); })
                .to.throw('hdparm doesn\'t support arg 1' );
         });

         it('should change disk number to string', function() {
            var options = {
                eraseSettings: [
                    {
                        disks: ['sda', 2],
                        tool: 'hdparm',
                        arg: 'secure-erase'
                    },
                    {
                        disks: ['1']
                    }
                ]
            };

            var eraseSettings= [
                {
                    disks: ['sda', '2'],
                    tool: 'hdparm',
                    arg: 'secure-erase'
                },
                {
                    disks: ['1']
                }
            ];

            job = new SEJob(options, { target: nodeId }, uuid.v4());

            expect(job._validateOptions())
                .to.deep.equal(eraseSettings);
         });
    });

    describe('Format inputs for catalog search', function() {

        beforeEach('Secure erase job format catalog search input', function() {
            job = new SEJob({eraseSettings:[]}, { target: nodeId }, uuid.v4());
        });

        it('should make sure the input format is correct', function() {
            job.eraseSettings = [
                {
                    disks: ['sda', '2'],
                    tool: 'hdparm',
                    arg: 'secure-erase'
                },
                {
                    disks: ['sdb']
                }
            ];

            var input = {'sda':1, '2':1, 'sdb':1};
            expect(job._collectDisks()).to.deep.equal(input);
        });
    });

    describe('Marshal the result of catalog search', function() {

        beforeEach('Secure erase job marshal catalog data', function() {
            job = new SEJob({eraseSettings:[]}, { target: nodeId }, uuid.v4());
            diskInfo = [{
                "devName": "sda",
                "deviceIds": [ 23 ],
                "physicalDisks": [{ "protocol": "SAS"}],
                "esxiWwid": "naa.6001636001940a481ddebecb45264d4a",
                "identifier": 1,
                "scsiId": "0:2:0:0",
                "slotIds": [ "/c0/e36/s0" ],
                "virtualDisk": "/c0/v0",
                "controllerVendor": "lsi"
            }];
        });

        it('should verify the tool cannot support the disk (disk is string)', function() {
            job.eraseSettings = [
                {
                    disks: ['sda'],
                    tool: 'hdparm'
                }
            ];

            expect(function(){ job._marshalParams(diskInfo); })
                .to.throw('hdparm doesn\'t support disk sda (SAS)');
        });

        it('should verify the tool cannot support the disk (disk is number)', function() {
            job.eraseSettings = [
                {
                    disks: ['1'],
                    tool: 'hdparm'
                }
            ];

            expect(function(){ job._marshalParams(diskInfo); })
                .to.throw('hdparm doesn\'t support disk 1 (SAS)');
        });

        it('should verify the tool cannot support the disk (disk is SATADOM)', function() {
            diskInfo[0].esxiWwid = "/dev/disk/by-id/ata-SATADOM-SV_3SE_20150522AA9992050074";
            job.eraseSettings = [
                {
                    disks: ['1'],
                    tool: 'sg_sanitize'
                }
            ];

            expect(function(){ job._marshalParams(diskInfo); })
                .to.throw('sg_sanitize doesn\'t support disk 1 (SATADOM)');
        });

        it('should throw error if no catalog info matches eraseSetting', function() {
            job.eraseSettings = [
                {
                    disks: ['2'],
                    tool: 'sg_sanitize'
                }
            ];

            expect(function(){ job._marshalParams(diskInfo); })
                .to.throw('Cannot find info in catalogs for drive 2');
        });

        it('should verify the tool cannot support the disk (disk is eUSB)', function() {
            diskInfo = [{
                "devName": "sdb", "virtualDisk": "",
                "esxiWwid": "naa.6001", "identifier": 3, "scsiId": "0:2:0:1"
            }],

            job.eraseSettings = [
                {
                    disks: ['sdb'],
                    tool: 'sg_sanitize'
                }
            ];

            expect(function(){ job._marshalParams(diskInfo); })
                .to.throw('sg_sanitize doesn\'t support disk sdb (undefined)');
        });

        it('should verify scrub can support the disk (disk is eUSB)', function() {
            diskInfo = [{
                "devName": "sdb", "virtualDisk": "",
                "esxiWwid": "naa.6001", "identifier": 3, "scsiId": "0:2:0:1"
            }],

            job.eraseSettings = [
                {
                    disks: ['sdb'],
                    tool: 'scrub'
                }
            ];

            var array = [{
                disks: [{
                    diskName: "/dev/sdb",
                    virtualDisk: "",
                    scsiId: "0:2:0:1"
                }],
                tool: 'scrub',
            }];

            expect(job._marshalParams(diskInfo)).to.deep.equal(array);
        });

        it('should marshall eraseSettings correctly', function() {
            job.eraseSettings = [
                {
                    disks: ['sda', 'sdg'],
                    tool: 'hdparm',
                    arg: 'secure-erase'
                },
                {
                    disks: ['3']
                }
            ];

            diskInfo = [
                {
                    "devName": "sda", "deviceIds": [ 23 ], "physicalDisks": [{ "protocol": "SATA"}],
                    "esxiWwid": "naa.6001636001940a481ddebecb45264d4a", "identifier": 1,
                    "scsiId": "0:2:0:0", "slotIds": [ "/c0/e36/s0" ],
                    "virtualDisk": "/c0/v0", "controllerVendor": "lsi"
                },
                {
                    "devName": "sdb", "virtualDisk": "",
                    "esxiWwid": "naa.6001", "identifier": 3, "scsiId": "0:2:0:1"
                },
                {
                    "devName": "sdg", "virtualDisk": "",
                    "esxiWwid": "t10.ATA_____SATADOM2DSV_3SE_20150522AA9992050074",
                    "identifier": 0, "linuxWwid": "i", "scsiId": "10:0:0:0",
                },
            ];

            paramArray = [
                {
                    disks: [
                        {
                            diskName: "/dev/sda",
                            virtualDisk: "/c0/v0",
                            scsiId: "0:2:0:0",
                            deviceIds: [23],
                            slotIds: ["/c0/e36/s0"]
                        },
                        {
                            diskName: "/dev/sdg",
                            virtualDisk: "",
                            scsiId: "10:0:0:0"
                        }
                    ],
                    tool: 'hdparm',
                    arg: 'secure-erase',
                    vendor: 'lsi'
                },
                {
                    disks: [{
                        diskName: "/dev/sdb",
                        virtualDisk: "",
                        scsiId: "0:2:0:1"
                    }],
                    tool: 'scrub',
                }
            ];

            expect(job._marshalParams(diskInfo)).to.deep.equal(paramArray);
        });
    });

    describe('format commands', function() {

        beforeEach('Secure erase job format commands', function() {
            job = new SEJob({eraseSettings:[]}, { target: nodeId }, uuid.v4());
        });

        it('should format commands correctly', function() {
            var result = [
                {
                    "cmd": "sudo python secure_erase.py -d \'{\"diskName\":\"/dev/sda\"," +
                            "\"virtualDisk\":\"/c0/v0\",\"scsiId\":\"0:2:0:0\"," +
                            "\"deviceIds\":[23],\"slotIds\":[\"/c0/e36/s0\"]}\'" +
                            " -d \'{\"diskName\":\"/dev/sdg\",\"virtualDisk\":\"\"," +
                            "\"scsiId\":\"10:0:0:0\"}\'" +
                            " -t hdparm -o secure-erase -v lsi",
                    "downloadUrl": "/api/1.1/templates/secure_erase.py"
                },
                {
                    "cmd": "sudo python secure_erase.py -d \'{\"diskName\":\"/dev/sdb\"," +
                            "\"virtualDisk\":\"\",\"scsiId\":\"0:2:0:1\"}\' -t scrub"
                }
            ];

            job._formatCommands(paramArray);
            expect(job.commands).to.deep.equal(result);
        });
    });

    describe('handle command request', function() {

        beforeEach('Secure erase job handle request', function() {
            job = new SEJob({eraseSettings:[]}, { target: nodeId }, uuid.v4());
        });

        it('should not sent command if has been sent before', function() {
            job.hasSentCommands = true;
            expect(job.handleRequest()).to.equal(undefined);
        });

        it('should sent command if has not been sent before', function() {
            job.commands = [{cmd:'cmd'}, 'cmd1'];
            expect(job.handleRequest()).to.deep.equal({identifier: nodeId, tasks: job.commands});
            expect(job.hasSentCommands).to.equal(true);
        });
    });

    describe('should run the job in correct asynchronous manner', function() {

        var cataDiskInfo;

        beforeEach('Secure erase job check run sequence', function() {
            cataDiskInfo = [{
                "devName": "sda",
                "esxiWwid": "t10.ATA_____SATADOM2DSV_3SE__",
                "identifier": 0,
                "linuxWwid": "i",
                "scsiId": "10:0:0:0",
                "virtualDisk": ""
            }];

            job = new SEJob({eraseSettings:[{disks: ['sda']}]}, { target: nodeId }, uuid.v4());
            cataSearchMock.getDriveIdCatalogExt = sandbox.stub().resolves(cataDiskInfo);

            sandbox.stub(job, '_subscribeActiveTaskExists').resolves();
            sandbox.stub(job, '_subscribeRequestProperties').resolves();
        });

        afterEach('Secure erase job check run sequence', function() {
            sandbox.restore();
        });

        it('_run should be called in expected sequence', function() {
            var marshalOutput = [{
                "disks": [{
                    "diskName": "/dev/sda",
                    "virtualDisk": "",
                    "scsiId": "10:0:0:0"
                }],
                "tool": "scrub"
            }];

            sandbox.stub(job, '_subscribeRequestCommands');
            sandbox.stub(job, '_subscribeRespondCommands');
            sandbox.spy(job, '_marshalParams');
            sandbox.spy(job, '_formatCommands');

            return job._run()
            .then(function() {
                expect(cataSearchMock.getDriveIdCatalogExt)
                    .to.have.been.calledWith(nodeId, {'sda':1});
                expect(job._marshalParams).to.have.been.calledOnce;
                expect(job._marshalParams).to.have.been.calledWith(cataDiskInfo);
                expect(job._formatCommands).to.have.been.calledWith(marshalOutput);
                expect(job._subscribeRequestCommands).to.have.been.calledOnce;
                expect(job._subscribeRespondCommands).to.have.been.calledOnce;
            });
        });

        it('_run should delegate requests to handleRequest', function() {
            sandbox.spy(job, 'handleRequest');
            sandbox.stub(job, '_subscribeRespondCommands');
            sandbox.stub(job, '_subscribeRequestCommands', function(cb) { cb(); });

            return job._run()
            .then(function() {
                expect(job.handleRequest).to.have.been.calledOnce;
            });
        });

        it('_run should delegate response to handleRemoteFailure', function() {
            cmdUtlMock.handleRemoteFailure = sandbox.stub().resolves([]);
            sandbox.stub(job, '_subscribeRequestCommands');
            sandbox.stub(job, '_subscribeRespondCommands', function(cb) { cb({tasks:'a'}); });

            return job._run()
            .then(function() {
                expect(cmdUtlMock.handleRemoteFailure).to.have.been.calledOnce;
            });
        });

        it('_run should catch error on remote error', function(done) {
            cmdUtlMock.handleRemoteFailure = sandbox.stub().rejects(['error']);
            sandbox.stub(job, '_subscribeRequestCommands');
            sandbox.stub(job, '_subscribeRespondCommands', function(cb) { cb({tasks:'a'}); });

            sandbox.stub(job, '_done', function(err) {
                try {
                    expect(err).to.deep.equal(['error']);
                    done();
                } catch (e) {
                    done(e);
                }
            });

            job._run();
        });

    });
});
