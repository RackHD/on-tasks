// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */


'use strict';

var injector;
var stdoutMocks = require('./stdout-helper');
var xmlParser = require('xml2js').parseString;

describe("Task Parser", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should return an error for an unknown command", function (done) {
        var tasks = [
            {cmd: 'UNKNOWN COMMAND'}
        ];
        var error = new Error("No parser exists for command " + tasks[0].cmd);

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error.toString()).to.equal(error.toString());
                done();
            });
    });

    it("should return an error when there is a task error", function (done) {
        var error = new Error("command failure");
        var tasks = [
            {
                cmd: 'sudo /opt/chef/bin/ohai --directory /etc/ohai/plugins',
                stdout: '',
                stderr: '',
                error: error
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error.toString()).to.equal(error.toString());
                done();
            });
    });
});

describe("lshw, lspci parsers", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse lspci -nn -vmm", function (done) {
        var lspciCmd = 'sudo lspci -nn -vmm';
        var tasks = [
            {
                cmd: lspciCmd,
                stdout: stdoutMocks.lspciOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(_.isEqual(_.keys(result.data[0]).sort(),
                    ['Slot', 'Class', 'Vendor', 'Device', 'Rev'].sort()))
                    .to.be.true;
                expect(_.isEqual(_.keys(result.data[1]).sort(),
                    ['Slot', 'Class', 'Vendor', 'Device', 'Rev', 'ProgIf'].sort()))
                    .to.be.true;
                expect(_.isEqual(_.keys(result.data[2]).sort(),
                    ['Slot', 'Class', 'Vendor', 'Device'].sort()))
                    .to.be.true;
                expect(_.isEqual(_.keys(result.data[3]).sort(),
                    ['Slot', 'Class', 'Vendor', 'Device', 'SVendor', 'SDevice', 'Rev'].sort()))
                    .to.be.true;
                expect(_.isEqual(_.keys(result.data[4]).sort(),
                    ['Slot', 'Class', 'Vendor', 'Device'].sort()))
                    .to.be.true;
                expect(_.isEqual(_.keys(result.data[5]).sort(),
                    ['Slot', 'Class', 'Vendor', 'Device', 'ProgIf'].sort()))
                    .to.be.true;
                expect(_.isEqual(_.keys(result.data[6]).sort(),
                    ['Slot', 'Vendor', 'Device', 'Rev'].sort()))
                    .to.be.true;
                expect(_.isEqual(_.keys(result.data[7]).sort(),
                    ['Slot', 'Class', 'Vendor', 'Device', 'ProgIf'].sort()))
                    .to.be.true;
                _.forEach(result.data, function (entry) {
                    _.forEach(entry, function (v, k) {
                        expect(k).to.not.be.empty;
                    });
                });
                expect(result.source).to.equal('lspci');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should parse lshw -json", function (done) {
        var lshwCmd = 'sudo lshw -json';
        var tasks = [
            {
                cmd: lshwCmd,
                stdout: stdoutMocks.lshwOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(_.isEqual(result.data,
                    JSON.parse(stdoutMocks.lshwOutput))).to.be.true;
                expect(result.source).to.equal('lshw');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });
});

describe("lssci parser", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse lsscsi --size", function (done) {
        var lsscsiCmd = 'sudo lsscsi --size';
        var tasks = [
            {
                cmd: lsscsiCmd,
                stdout: stdoutMocks.lsscsiOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;

                expect(result.data[0]).to.have.property('scsiInfo');
                expect(result.data[0].scsiInfo).to.equal('[0:0:0:0]');

                expect(result.data[0]).to.have.property('peripheralType');
                expect(result.data[0].peripheralType).to.equal('disk');

                expect(result.data[0]).to.have.property('vendorName');
                expect(result.data[0].vendorName).to.equal('HITACHI');

                expect(result.data[0]).to.have.property('modelName');
                expect(result.data[0].modelName).to.equal('HUSMM812 CLAR200');

                expect(result.data[0]).to.have.property('revisionString');
                expect(result.data[0].revisionString).to.equal('C118');

                expect(result.data[0]).to.have.property('devicePath');
                expect(result.data[0].devicePath).to.equal('/dev/sdb');

                expect(result.data[0]).to.have.property('size');
                expect(result.data[0].size).to.equal('200GB');

                expect(result.data[2]).to.have.property('scsiInfo');
                expect(result.data[2].scsiInfo).to.equal('[0:0:2:0]');

                expect(result.data[2]).to.have.property('peripheralType');
                expect(result.data[2].peripheralType).to.equal('disk');

                expect(result.data[2]).to.have.property('vendorName');
                expect(result.data[2].vendorName).to.equal('HGST');

                expect(result.data[2]).to.have.property('modelName');
                expect(result.data[2].modelName).to.equal('HUSMM8080ASS200');

                expect(result.data[2]).to.have.property('revisionString');
                expect(result.data[2].revisionString).to.equal('A116');

                expect(result.data[2]).to.have.property('devicePath');
                expect(result.data[2].devicePath).to.equal('/dev/sdc');

                expect(result.data[2]).to.have.property('size');
                expect(result.data[2].size).to.equal('-');

                expect(result.source).to.equal('lsscsi');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });
});

describe("MegaRAID Parsers", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse storcli show all JSON output", function (done) {
        var storcliCmd = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 show all J';
        var tasks = [
            {
                cmd: storcliCmd,
                stdout: stdoutMocks.storcliAdapterInfo,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(_.isEqual(result.data,
                    JSON.parse(stdoutMocks.storcliAdapterInfo))).to.be.true;
                expect(result.source).to.equal('megaraid-controllers');
                done();
            });
    });

    it("should parse storcli controller count output", function (done) {
        var storcliCmd = 'sudo /opt/MegaRAID/storcli/storcli64 show ctrlcount J';
        var tasks = [
            {
                cmd: storcliCmd,
                stdout: stdoutMocks.storcliControllerCountNoControllers,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                // We ignore output with no controllers
                expect(result.store).to.be.false;
                expect(_.isEqual(result.data,
                    JSON.parse(stdoutMocks.storcliControllerCountNoControllers))).to.be.true;
                expect(result.source).to.equal('megaraid-controller-count');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should parse storcli virtual disk info", function (done) {
        var storcliCmd = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 /vall show all J';
        var tasks = [
            {
                cmd: storcliCmd,
                stdout: stdoutMocks.storcliVirtualDiskInfo,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(_.isEqual(result.data,
                    JSON.parse(stdoutMocks.storcliVirtualDiskInfo))).to.be.true;
                expect(result.source).to.equal('megaraid-virtual-disks');
                done();
            });
    });
});

describe("MPT Fusion parsers", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse sudo /opt/mpt/mpt2fusion/sas2flash -s -list", function (done) {
        var sas2flashCmd = 'sudo /opt/mpt/mpt2fusion/sas2flash -s -list';
        var tasks = [
            {
                cmd: sas2flashCmd,
                stdout: stdoutMocks.sas2flashList,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.data['NVDATA Version (Persistent)']).to.equal('11.00.2b.09');
                expect(result.data['BIOS Version']).to.equal('07.35.00.00');
                expect(result.data['PCI Address']).to.equal('00:83:00:00');
                expect(result.data['Firmware Product ID']).to.equal('0x2713');
                expect(result.data.Controller).to.equal('SAS2008(B2)');
                expect(result.data['Firmware Version']).to.equal('17.00.01.00');
                expect(result.data['NVDATA Product ID']).to.equal('Undefined');
                expect(result.data['FCODE Version']).to.equal('N/A');
                expect(result.data['UEFI BSD Version']).to.equal('07.25.01.00');
                expect(result.data['Controller Number']).to.equal('0');
                expect(result.data['SAS Address']).to.equal('5001636-0-0142-4e65');
                expect(result.data['NVDATA Vendor']).to.equal('LSI');
                expect(result.data['Board Tracer Number']).to.equal('N/A');
                expect(result.data['Board Name']).to.equal('SAS2 Mezz');
                expect(result.data['Board Assembly']).to.equal('N/A');
                expect(result.data['NVDATA Version (Default)']).to.equal('11.00.2b.09');
                expect(result.source).to.equal('mpt2fusion-adapters');
                done();
            });
    });
});

describe("IPMI Parsers", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse ipmitool lan print output", function (done) {
        var ipmiCmd = 'sudo ipmitool lan print';
        var tasks = [
            {
                cmd: ipmiCmd,
                stdout: stdoutMocks.ipmiLanPrintOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.store).to.be.true;
                expect(result.data['Set in Progress']).to.equal('Set Complete');
                expect(result.data['Auth Type Support']).to.equal('NONE MD2 MD5 PASSWORD');
                var authTypeEnable = {
                    'Callback': 'MD2 MD5 PASSWORD',
                    'User': 'MD2 MD5 PASSWORD',
                    'Operator': 'MD2 MD5 PASSWORD',
                    'Admin': 'MD2 MD5 PASSWORD',
                    'OEM': 'MD2 MD5 PASSWORD'
                };
                expect(_.isEqual(result.data['Auth Type Enable'], authTypeEnable)).to.be.true;
                expect(result.data['IP Address Source']).to.equal('DHCP Address');
                expect(result.data['IP Address']).to.equal('0.0.0.0');
                expect(result.data['Subnet Mask']).to.equal('0.0.0.0');
                expect(result.data['MAC Address']).to.equal('00:25:90:83:d4:4c');
                expect(result.data['SNMP Community String']).to.equal('public');
                expect(result.data['IP Header']).to.equal(
                    'TTL=0x00 Flags=0x00 Precedence=0x00 TOS=0x00');
                expect(result.data['BMC ARP Control']).to.equal(
                    'ARP Responses Enabled, Gratuitous ARP Disabled');
                expect(result.data['Default Gateway IP']).to.equal('0.0.0.0');
                expect(result.data['Default Gateway MAC']).to.equal('00:00:00:00:00:00');

                expect(result.data['802.1q VLAN ID']).to.equal('Disabled');
                expect(result.data['802.1q VLAN Priority']).to.equal('0');
                expect(result.data['RMCP+ Cipher Suites']).to.equal('1,2,3,6,7,8,11,12');
                var cipherSuitePrivMax = [
                    'aaaaXXaaaXXaaXX',
                    'X=Cipher Suite Unused',
                    'c=CALLBACK',
                    'u=USER',
                    'o=OPERATOR',
                    'a=ADMIN',
                    'O=OEM'
                ];
                expect(_.isEqual(result.data['Cipher Suite Priv Max'],
                    cipherSuitePrivMax)).to.be.true;

                expect(result.source).to.equal('bmc');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should append channel number > 1 to ipmi source names", function (done) {
        var tasks = [
            {
                cmd: 'sudo ipmitool lan print 15',
                stdout: stdoutMocks.ipmiLanPrintOutput,
                stderr: '',
                error: null
            },
            {
                cmd: 'sudo ipmitool -c user list 15',
                stdout: stdoutMocks.ipmiLanPrintOutput,
                stderr: '',
                error: null
            },
            {
                cmd: 'sudo ipmitool user summary 15',
                stdout: stdoutMocks.ipmiLanPrintOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.source).to.equal('bmc-15');
                return parsePromises[1];
            })
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.source).to.equal('ipmi-user-list-15');
                return parsePromises[2];
            })
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.source).to.equal('ipmi-user-summary-15');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should name ipmi channel 3 sources as rmm", function (done) {
        var tasks = [
            {
                cmd: 'sudo ipmitool lan print 3',
                stdout: stdoutMocks.ipmiLanPrintOutput,
                stderr: '',
                error: null
            },
            {
                cmd: 'sudo ipmitool -c user list 3',
                stdout: stdoutMocks.ipmiLanPrintOutput,
                stderr: '',
                error: null
            },
            {
                cmd: 'sudo ipmitool user summary 3',
                stdout: stdoutMocks.ipmiLanPrintOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.source).to.equal('rmm');
                return parsePromises[1];
            })
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.source).to.equal('rmm-user-list');
                return parsePromises[2];
            })
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.source).to.equal('rmm-user-summary');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should ignore lan print output with empty mac address", function (done) {
        var ipmiCmd = 'sudo ipmitool lan print 3';
        var tasks = [
            {
                cmd: ipmiCmd,
                stdout: stdoutMocks.ipmiLanPrintOutputUnused,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.false;
                expect(result.data['MAC Address']).to.equal('00:00:00:00:00:00');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should parse ipmitool sel list -c", function (done) {
        var ipmiCmd = 'sudo ipmitool sel list -c';
        var tasks = [
            {
                cmd: ipmiCmd,
                stdout: stdoutMocks.ipmiSelListOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(_.isEqual(result.data[1],
                    ['05/27/2014',
                        '21:20:43',
                        'Event Logging Disabled #0x07',
                        'Log area reset/cleared',
                        'Asserted'])).to.be.true;
                expect(_.isEqual(result.data[2],
                    ['05/27/2014',
                        '21:22:20',
                        'System Event #0x83',
                        'Timestamp Clock Sync',
                        'Asserted'])).to.be.true;
                expect(_.isEqual(result.data[3],
                    ['05/27/2014',
                        '21:22:21',
                        'System Event #0x83',
                        'Timestamp Clock Sync',
                        'Asserted'])).to.be.true;
                expect(_.isEqual(result.data[4],
                    ['05/27/2014',
                        '21:22:21',
                        'Power Unit #0x01',
                        'Power off/down',
                        'Asserted'])).to.be.true;
                expect(_.isEqual(result.data[5],
                    ['05/27/2014',
                        '21:23:24',
                        'Power Supply #0x51',
                        'Power Supply AC lost',
                        'Asserted'])).to.be.true;
                expect(_.isEqual(result.data[6],
                    ['05/27/2014',
                        '21:23:25',
                        'Power Unit #0x02',
                        'Fully Redundant',
                        'Deasserted'])).to.be.true;
                expect(_.isEqual(result.data[7],
                    ['05/27/2014',
                        '21:23:25',
                        'Power Unit #0x02',
                        'Redundancy Lost',
                        'Asserted'])).to.be.true;
                expect(_.isEqual(result.data[8],
                    ['05/27/2014',
                        '21:23:25',
                        'Power Unit #0x02',
                        'Non-Redundant: Sufficient from Redundant',
                        'Asserted'])).to.be.true;
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should parse ipmitool user list 1 output", function (done) {
        var ipmiCmd = 'sudo ipmitool -c user list 1';
        var tasks = [
            {
                cmd: ipmiCmd,
                stdout: stdoutMocks.ipmiUserListOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(_.isEqual(_.keys(result.data), ['1', '2'])).to.be.true;
                expect(result.data[1].ID).to.equal('1');
                expect(result.data[1].Name).to.equal('');
                expect(result.data[1].Callin).to.equal('true');
                expect(result.data[1]['Link Auth']).to.equal('false');
                expect(result.data[1]['IPMI Msg Channel']).to.equal('true');
                expect(result.data[1]['Priv Limit']).to.equal('ADMINISTRATOR');
                expect(result.data[2].ID).to.equal('2');
                expect(result.data[2].Name).to.equal('root');
                expect(result.data[2].Callin).to.equal('false');
                expect(result.data[2]['Link Auth']).to.equal('true');
                expect(result.data[2]['IPMI Msg Channel']).to.equal('true');
                expect(result.data[2]['Priv Limit']).to.equal('ADMINISTRATOR');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should parse ipmitool user summary 1 output", function (done) {
        var ipmiCmd = 'sudo ipmitool user summary 1';
        var tasks = [
            {
                cmd: ipmiCmd,
                stdout: stdoutMocks.ipmiUserSummaryOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.data['Maximum IDs']).to.equal('15');
                expect(result.data['Enabled User Count']).to.equal('2');
                expect(result.data['Fixed Name Count']).to.equal('2');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });

    it("should parse ipmitool mc info output", function (done) {
        var ipmiCmd = 'sudo ipmitool mc info';
        var tasks = [
            {
                cmd: ipmiCmd,
                stdout: stdoutMocks.ipmiMcInfoOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.data['Device ID']).to.equal('33');
                expect(result.data['Device Revision']).to.equal('1');
                expect(result.data['Firmware Revision']).to.equal('1.17');
                expect(result.data['IPMI Version']).to.equal('2.0');
                expect(result.data['Manufacturer ID']).to.equal('343');
                expect(result.data['Product ID']).to.equal('73 (0x0049)');
                expect(result.data['Product Name']).to.equal('Unknown (0x49)');
                expect(result.data['Device Available']).to.equal('yes');
                expect(result.data['Provides Device SDRs']).to.equal('no');
                expect(_.isEqual(result.data['Additional Device Support'],
                    [
                        'Sensor Device',
                        'SDR Repository Device',
                        'SEL Device',
                        'FRU Inventory Device',
                        'IPMB Event Receiver',
                        'IPMB Event Generator',
                        'Chassis Device'
                    ]
                )).to.be.true;
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });
});

describe("Mellanox Parsers", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse mellanox XML output", function (done) {
        var mlxCmd = 'sudo mlxfwmanager --query-xml';

        var tasks = [
            {
                cmd: mlxCmd,
                stdout: stdoutMocks.mellanoxOutput,
                stderr: '',
                error: null
            }
        ];

        xmlParser(stdoutMocks.mellanoxOutput, function (err, jsonOut) {
            if (err) {
                done(err);
                return;
            }

            var parsePromises = taskParser.parseTasks(tasks);

            parsePromises[0]
                .then(function (result) {
                    expect(result.error).to.be.undefined;
                    expect(result.store).to.be.true;
                    expect(_.isEqual(result.data, jsonOut)).to.be.true;
                    expect(result.source).to.equal('mellanox');
                    done();
                });
        });
    });
});

describe("Ami Parsers", function () {

    var taskParser;

    before(function() {
        var _ = helper.baseInjector.get('_');

        // create a child injector with renasar-core and the base pieces we need to test this
        injector = helper.baseInjector.createChild(_.flatten([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]));

        taskParser = injector.get('JobUtils.CommandParser');

    });

    it("should parse amilnx_64 /S output", function (done) {
        var amiCmd = 'cd /opt/ami; sudo ./afulnx_64 /S';

        var tasks = [
            {
                cmd: amiCmd,
                stdout: stdoutMocks.amiOutput,
                stderr: '',
                error: null
            }
        ];

        var parsePromises = taskParser.parseTasks(tasks);

        parsePromises[0]
            .then(function (result) {
                expect(result.data.systemRomId).to.equal('S2RS4A08');
                expect(result.data.systemRomGuid).to.equal('b5c59087-feac-4b41-9d80790ba5aa070f');
                expect(result.data.systemRomSecureFlash).to.equal('Diable.');
                expect(result.source).to.equal('ami');
                done();
            })
            .fail(function (err) {
                done(err);
            });
    });
});

