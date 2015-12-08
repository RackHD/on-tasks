// Copyright 2015, EMC, Inc.
/* jshint node: true */


'use strict';

var xmlParser = require('xml2js').parseString;

describe("Task Parser", function () {
    var stdoutMocks;
    var taskParser;

    before('command task parser before', function() {
        stdoutMocks = require('./stdout-helper');
        // create a child injector with on-core and the base pieces we need to test this
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/command-parser.js')
        ]);

        taskParser = helper.injector.get('JobUtils.CommandParser');

    });

    it("should return an error for an unknown command", function () {
        var tasks = [
            {cmd: 'UNKNOWN COMMAND'}
        ];
        var error = new Error("No parser exists for command " + tasks[0].cmd);

        return taskParser.parseTasks(tasks)
        .spread(function (result) {
            expect(result.error.toString()).to.equal(error.toString());
        });
    });

    it("should return an error when there is a task error", function () {
        var error = new Error("command failure");
        var tasks = [
            {
                cmd: 'sudo ohai --directory /etc/ohai/plugins',
                stdout: '',
                stderr: '',
                error: error
            }
        ];

        return taskParser.parseTasks(tasks)
        .spread(function (result) {
            expect(result.error.toString()).to.equal(error.toString());
        });
    });

    describe("dmi parser", function() {
        var dmiSchemaSupermicro = {
            'BIOS Information': 'object',
            'System Information': 'object',
            'Base Board Information': 'object',
            'Chassis Information': 'object',
            'Processor Information': 'array',
            'Cache Information': 'array',
            'Port Connector Information': 'array',
            'System Slot Information': 'array',
            'On Board Device 1 Information': 'object',
            'On Board Device 2 Information': 'object',
            'On Board Device 3 Information': 'object',
            'OEM Strings': 'object',
            'Physical Memory Array': 'array',
            'Memory Array Mapped Address': 'array',
            'Memory Device': 'array',
            'Memory Device Mapped Address': 'array',
            'System Boot Information': 'object',
            'Management Device': 'array',
            'Voltage Probe': 'array',
            'Management Device Threshold Data': 'array',
            'Management Device Component': 'array',
            'Temperature Probe': 'array',
            'Cooling Device': 'array',
            'Electrical Current Probe': 'array',
            'System Power Supply': 'array',
            'Onboard Device': 'array',
            'IPMI Device Information': 'object',
            'System Event Log': 'object',
            'BIOS Language Information': 'object',
        };

        var dmiSchemaQuanta = {
            'BIOS Information': 'object',
            'System Information': 'object',
            'Base Board Information': 'object',
            'Chassis Information': 'object',
            'Processor Information': 'array',
            'Cache Information': 'array',
            'Port Connector Information': 'array',
            'System Slot Information': 'array',
            'OEM Strings': 'object',
            'Physical Memory Array': 'array',
            'Memory Array Mapped Address': 'array',
            'Memory Device': 'array',
            'Onboard Device': 'array',
            'IPMI Device Information': 'object',
            'BIOS Language Information': 'object',
        };

        it("should parse sudo dmidecode from a supermicro", function() {
            var dmiCmd = "sudo dmidecode";
            var tasks = [
                {
                    cmd: dmiCmd,
                    stdout: stdoutMocks.dmidecodeSupermicro,
                    stderr: '',
                    error: null
                }
            ];
            return taskParser.parseTasks(tasks)
            .then(function(result) {
                // NOTE: While we don't check EVERY attribute, we check one or two
                // members of each class of attribute types and assume if we got
                // them right we got all the others right as well.

                var data = result[0].data;

                _.forEach(dmiSchemaSupermicro, function(elementType, element) {
                    expect(data).to.have.property(element).that.is.an(elementType);
                });

                expect(data).to.not.have.property('End Of Table');

                expect(data['Memory Device']).to.have.length(16);
                expect(data['On Board Device 1 Information']).to.have.property('Type')
                    .that.equals('Video');
                expect(data['On Board Device 2 Information']).to.have.property('Type')
                    .that.equals('Ethernet');

                // Assert we can handle empty objects
                expect(data['Management Device Threshold Data']).to.have.length(13);
                expect(data['Management Device Threshold Data'][11]).to.be.empty;

                // Assert we can parse top-level objects with a mix of sub-array and sub-objects
                expect(data['BIOS Information']).to.have.property('Vendor')
                    .that.equals('American Megatrends Inc.');
                expect(data['BIOS Information']).to.have.property('Characteristics')
                    .that.is.an('array').with.length(20);
                expect(data['BIOS Information'].Characteristics[0]).to.equal('PCI is supported');

                // Assert we can do the above assertions but with objects in a top-level array
                expect(data['Processor Information']).to.have.length(2);
                _.forEach(data['Processor Information'], function(info) {
                    expect(info).to.have.property('Type').that.equals('Central Processor');
                    expect(info).to.have.property('Flags').that.is.an('array').with.length(28);
                });

                // Assert we handled the case where a key has both
                // a length value and an array, but we drop the length and
                // coerce it to an array
                expect(data['BIOS Language Information']).to.deep.equal({
                    'Language Description Format': 'Long',
                    'Installable Languages': ['en|US|iso8859-1'],
                    'Currently Installed Language': 'en|US|iso8859-1'
                });
            });
        });

        it("should parse sudo dmidecode from a quanta", function() {
            var dmiCmd = "sudo dmidecode";
            var tasks = [
                {
                    cmd: dmiCmd,
                    stdout: stdoutMocks.dmidecodeQuanta,
                    stderr: '',
                    error: null
                }
            ];
            return taskParser.parseTasks(tasks)
            .then(function(result) {
                // NOTE: While we don't check EVERY attribute, we check one or two
                // members of each class of attribute types and assume if we got
                // them right we got all the others right as well.

                var data = result[0].data;

                _.forEach(dmiSchemaQuanta, function(elementType, element) {
                    expect(data).to.have.property(element).that.is.an(elementType);
                });

                expect(data).to.not.have.property('End Of Table');

                expect(data['Memory Device']).to.have.length(16);
                expect(data['Onboard Device'][0]).to.have.property('Type')
                    .that.equals('Video');
                expect(data['Onboard Device'][1]).to.have.property('Type')
                    .that.equals('SATA Controller');
                expect(data['Onboard Device'][2]).to.have.property('Type')
                    .that.equals('SATA Controller');

                // Assert we handled the case where a key has both
                // a length value and an array, but we drop the length and
                // coerce it to an array
                expect(data['Chassis Information'])
                    .to.have.property('Contained Elements').that.deep.equals([
                        '<OUT OF SPEC> (0)'
                    ]);

                // Assert we can parse top-level objects with a mix of sub-array and sub-objects
                expect(data['BIOS Information']).to.have.property('Vendor')
                    .that.equals('American Megatrends Inc.');
                expect(data['BIOS Information']).to.have.property('Characteristics')
                    .that.is.an('array').with.length(16);
                expect(data['BIOS Information'].Characteristics[0]).to.equal('PCI is supported');

                // Assert we can do the above assertions but with objects in a top-level array
                expect(data['Processor Information']).to.have.length(2);
                _.forEach(data['Processor Information'], function(info) {
                    expect(info).to.have.property('Type').that.equals('Central Processor');
                    expect(info).to.have.property('Flags').that.is.an('array').with.length(28);
                });

                // Assert we handled the language information corner case
                expect(data['BIOS Language Information']).to.deep.equal({
                    'Language Description Format': 'Long',
                    'Installable Languages': ['en|US|iso8859-1'],
                    'Currently Installed Language': 'en|US|iso8859-1'
                });
            });
        });
    });

    describe("lshw, lspci parsers", function () {
        it("should parse lspci -nn -vmm", function () {
            var lspciCmd = 'sudo lspci -nn -vmm';
            var tasks = [
                {
                    cmd: lspciCmd,
                    stdout: stdoutMocks.lspciOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
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
            });
        });

        it("should parse lshw -json", function () {
            var lshwCmd = 'sudo lshw -json';
            var tasks = [
                {
                    cmd: lshwCmd,
                    stdout: stdoutMocks.lshwOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.lookups).to.deep.equal(
                    [
                        { mac: '00:1e:67:ab:5e:dc' },
                        { mac: '00:1e:67:ab:5e:dd' },
                        { mac: '00:1e:67:69:4c:b8' }
                    ]
                );
                expect(_.isEqual(result.data,
                    JSON.parse(stdoutMocks.lshwOutput))).to.be.true;
                expect(result.source).to.equal('lshw');
            });
        });

        describe("lssci parser", function () {
            it("should parse lsscsi and lsblk output", function () {
                var cmd = 'sudo lsblk -o KNAME,TYPE,ROTA; echo BREAK; sudo lsscsi --size';
                var tasks = [
                    {
                        cmd: cmd,
                        stdout: stdoutMocks.lsscsiPlusRotationalOutput,
                        stderr: '',
                        error: null
                    }
                ];

                return taskParser.parseTasks(tasks)
                .spread(function (result) {
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

                    // lsblk rotational data assertions
                    expect(result.data[0]).to.have.property('rotational');
                    expect(result.data[0].rotational).to.equal(true);

                    expect(result.data[2]).to.have.property('rotational');
                    expect(result.data[2].rotational).to.equal(true);

                    expect(result.data[10]).to.not.have.property('rotational');

                    expect(result.data[65]).to.have.property('devicePath');
                    expect(result.data[65].devicePath).to.equal('/dev/sda');

                    expect(_.last(result.data)).to.have.property('rotational');
                    expect(_.last(result.data).rotational).to.equal(false);

                    expect(result.source).to.equal('lsscsi');
                });
            });
        });
    });

    describe("MegaRAID Parsers", function () {
        it("should parse storcli show all JSON output", function () {
            var storcliCmd = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 show all J';
            var tasks = [
                {
                    cmd: storcliCmd,
                    stdout: stdoutMocks.storcliAdapterInfo,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(_.isEqual(result.data,
                    JSON.parse(stdoutMocks.storcliAdapterInfo))).to.be.true;
                expect(result.source).to.equal('megaraid-controllers');
            });
        });

        it("should parse storcli controller count output", function () {
            var storcliCmd = 'sudo /opt/MegaRAID/storcli/storcli64 show ctrlcount J';
            var tasks = [
                {
                    cmd: storcliCmd,
                    stdout: stdoutMocks.storcliControllerCountNoControllers,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                // We ignore output with no controllers
                expect(result.store).to.be.false;
                expect(_.isEqual(result.data,
                    JSON.parse(stdoutMocks.storcliControllerCountNoControllers)))
                        .to.be.true;
                expect(result.source).to.equal('megaraid-controller-count');
            });
        });

        it("should parse storcli virtual disk info", function () {
            var storcliCmd = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 /vall show all J';
            var tasks = [
                {
                    cmd: storcliCmd,
                    stdout: stdoutMocks.storcliVirtualDiskInfo,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                    expect(result.data).to.deep.equal(
                        JSON.parse(stdoutMocks.storcliVirtualDiskInfo));
                expect(result.source).to.equal('megaraid-virtual-disks');
            });
        });

        it("should parse storcli physical disk info", function () {
            var storcliCmd = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 /eall /sall show all J';
            var tasks = [
                {
                    cmd: storcliCmd,
                    stdout: stdoutMocks.storcliPhysicalDiskInfo,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
                .spread(function (result) {
                    expect(result.error).to.be.undefined;
                    expect(result.store).to.be.true;
                    expect(result.data).to.deep.equal(
                        JSON.parse(stdoutMocks.storcliPhysicalDiskInfo));
                    expect(result.source).to.equal('megaraid-physical-drives');
                });
        });
    });

    describe("MPT Fusion parsers", function () {
        it("should parse sudo /opt/mpt/mpt2fusion/sas2flash -s -list", function () {
            var sas2flashCmd = 'sudo /opt/mpt/mpt2fusion/sas2flash -s -list';
            var tasks = [
                {
                    cmd: sas2flashCmd,
                    stdout: stdoutMocks.sas2flashList,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
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
            });
        });
    });

    describe("IPMI Parsers", function () {
        it("should parse ipmitool lan print output", function () {
            var ipmiCmd = 'sudo ipmitool lan print || true';
            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiLanPrintOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
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
                expect(_.isEqual(result.data['Auth Type Enable'], authTypeEnable))
                    .to.be.true;
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
            });
        });

        it("should add a lookup field if the BMC IP is statically configured", function () {
            var ipmiCmd = 'sudo ipmitool lan print || true';

            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiLanPrintOutputStatic,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.lookups).to.deep.equal(
                    [
                        {
                            ip: '10.1.1.24',
                            mac: '00:25:90:83:d4:4c'
                        }
                    ]
                );
            });
        });

        it("should append channel number > 1 to ipmi source names", function () {
            var tasks = [
                {
                    cmd: 'sudo ipmitool lan print 15 || true',
                    stdout: stdoutMocks.ipmiLanPrintOutput,
                    stderr: '',
                    error: null
                },
                {
                    cmd: 'sudo ipmitool -c user list 15 || true',
                    stdout: stdoutMocks.ipmiLanPrintOutput,
                    stderr: '',
                    error: null
                },
                {
                    cmd: 'sudo ipmitool user summary 15 || true',
                    stdout: stdoutMocks.ipmiLanPrintOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result1, result2, result3) {
                expect(result1.error).to.be.undefined;
                expect(result1.store).to.be.true;
                expect(result1.source).to.equal('bmc-15');

                expect(result2.error).to.be.undefined;
                expect(result2.store).to.be.true;
                expect(result2.source).to.equal('ipmi-user-list-15');

                expect(result3.error).to.be.undefined;
                expect(result3.store).to.be.true;
                expect(result3.source).to.equal('ipmi-user-summary-15');
            });
        });

        it("should name ipmi channel 3 sources as rmm", function () {
            var tasks = [
                {
                    cmd: 'sudo ipmitool lan print 3 || true',
                    stdout: stdoutMocks.ipmiLanPrintOutput,
                    stderr: '',
                    error: null
                },
                {
                    cmd: 'sudo ipmitool -c user list 3 || true',
                    stdout: stdoutMocks.ipmiLanPrintOutput,
                    stderr: '',
                    error: null
                },
                {
                    cmd: 'sudo ipmitool user summary 3 || true',
                    stdout: stdoutMocks.ipmiLanPrintOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result1, result2, result3) {
                expect(result1.error).to.be.undefined;
                expect(result1.store).to.be.true;
                expect(result1.source).to.equal('rmm');

                expect(result2.error).to.be.undefined;
                expect(result2.store).to.be.true;
                expect(result2.source).to.equal('rmm-user-list');

                expect(result3.error).to.be.undefined;
                expect(result3.store).to.be.true;
                expect(result3.source).to.equal('rmm-user-summary');
            });
        });

        it("should ignore lan print output with empty mac address", function () {
            var ipmiCmd = 'sudo ipmitool lan print 3 || true';
            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiLanPrintOutputUnused,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.false;
                expect(result.data['MAC Address']).to.equal('00:00:00:00:00:00');
            });
        });

        it("should parse ipmitool sel", function() {
            var ipmiCmd = 'sudo ipmitool sel';
            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiSelInformationOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function(result) {
                expect(result.source).to.equal('ipmi-sel-information');
                expect(result.store).to.equal(true);
                expect(_.keys(result.data).length).to.equal(13);
                expect(result.data.Version).to.equal('1.5 (v1.5, v2 compliant)');
                expect(result.data.Entries).to.equal('545');
                expect(result.data['Free Space']).to.equal('6552 bytes');
                expect(result.data['Percent Used']).to.equal('57%');
                expect(result.data['Last Add Time']).to.equal('07/15/2015 22:35:35');
                expect(result.data['Last Del Time']).to.equal('Not Available');
                expect(result.data.Overflow).to.equal('false');
                expect(result.data['Supported Cmds']).to.equal(
                    "'Delete' 'Partial Add' 'Reserve' 'Get Alloc Info'");
                expect(result.data['# of Alloc Units']).to.equal('909');
                expect(result.data['Alloc Unit Size']).to.equal('18');
                expect(result.data['# Free Units']).to.equal('364');
                expect(result.data['Largest Free Blk']).to.equal('364');
                expect(result.data['Max Record Size']).to.equal('1');
            });
        });

        it("should parse ipmitool sel list -c", function () {
            var ipmiCmd = 'sudo ipmitool sel list -c';
            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiSelOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
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
            });
        });

        it("should parse ipmitool user list 1 output", function () {
            var ipmiCmd = 'sudo ipmitool -c user list 1 || true';
            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiUserListOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
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
            });
        });

        it("should parse ipmitool user summary 1 output", function () {
            var ipmiCmd = 'sudo ipmitool user summary 1 || true';
            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiUserSummaryOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.data['Maximum IDs']).to.equal('15');
                expect(result.data['Enabled User Count']).to.equal('2');
                expect(result.data['Fixed Name Count']).to.equal('2');
            });
        });

        it("should parse ipmitool mc info output", function () {
            var ipmiCmd = 'sudo ipmitool mc info';
            var tasks = [
                {
                    cmd: ipmiCmd,
                    stdout: stdoutMocks.ipmiMcInfoOutput,
                    stderr: '',
                    error: null
                }
            ];

            return taskParser.parseTasks(tasks)
            .spread(function (result) {
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
            });
        });
    });

    describe("Mellanox Parsers", function () {
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

                taskParser.parseTasks(tasks)
                .spread(function (result) {
                    expect(result.error).to.be.undefined;
                    expect(result.store).to.be.true;
                    expect(_.isEqual(result.data, jsonOut)).to.be.true;
                    expect(result.source).to.equal('mellanox');
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
            });
        });
    });

    describe("Ami Parsers", function () {
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

            taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.data.systemRomId).to.equal('S2RS4A08');
                expect(result.data.systemRomGuid)
                    .to.equal('b5c59087-feac-4b41-9d80790ba5aa070f');
                expect(result.data.systemRomSecureFlash).to.equal('Diable.');
                expect(result.source).to.equal('ami');
                done();
            })
            .catch(function (err) {
                done(err);
            });
        });
    });

    describe("SMART Parser", function() {
        it("should parse smartctrl output", function (done) {
            var smartCmd = 'sudo bash get_smart.sh';
            var tasks = [
                {
                    cmd: smartCmd,
                    stdout: stdoutMocks.smart,
                    stderr: '',
                    error: null
                }
            ];

            taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.source).to.equal('smart');
                expect(result.data).that.is.an('array');
                expect(result.data).to.have.length(3);

                _.forEach(result.data, function(elem) {
                    expect(elem).to.contain.all.keys('OS Device Name',
                                                     'SMART', 'smartctl Version');
                    expect(elem).property('OS Device Name').that.is.a('string');
                    expect(elem).property('OS Device Name').to.match(/^\/dev\/[\w]+/);
                    expect(elem).property('SMART').that.is.an('object');
                    expect(elem).property('SMART').to.contain.keys('Attributes',
                        'Self-Assessment', 'Capabilities', 'Identity');
                    expect(elem).property('smartctl Version').to.match(/^\d+\.\d+$/);
                    expect(elem).property('Controller').that.is.an('object');
                    expect(elem).property('Controller').to.contain.keys('controller_name',
                        'controller_ID', 'controller_PCI_BDF');
                });

                var smart = result.data[0].SMART;
                expect(smart).to.contains.all.keys('Attributes', 'Capabilities', 'Identity',
                                                   'Self-Assessment', 'Self-test Log',
                                                   'Selective Self-test Log', 'Error Log');

                var attr = smart.Attributes;
                expect(attr).to.contains.all.keys('Revision', "Attributes Table");
                expect(attr).property('Revision').to.match(/^\d+$/);
                expect(attr).property('Attributes Table').that.is.an('Array');
                expect(attr).property('Attributes Table').to.have.length(24);
                _.forEach(attr['Attributes Table'], function(elem) {
                    expect(elem).to.contain.all.keys(
                        'ID#', 'ATTRIBUTE_NAME', 'FLAG', 'VALUE', 'WORST',
                        'THRESH', 'TYPE', 'UPDATED', 'WHEN_FAILED', 'RAW_VALUE');
                    expect(elem).property('ID#').to.match(/^\d+$/);
                    expect(elem).property('ATTRIBUTE_NAME').that.is.a('string');
                    expect(elem).property('ATTRIBUTE_NAME').match(/[\w_]+/);
                    expect(elem).property('FLAG').to.match(/^0x[\da-f]{4}$/);
                    expect(elem).property('VALUE').to.match(/^\d+$/);
                    expect(elem).property('WORST').to.match(/^\d+$/);
                    expect(elem).property('THRESH').to.match(/^\d+$/);
                    expect(elem).property('TYPE').that.is.a('string');
                    expect(elem).property('UPDATED').that.is.a('string');
                    expect(elem).property('WHEN_FAILED').to.equal('-');
                    expect(elem).property('RAW_VALUE').to.match(/^\d+/);
                });
               // Add test case for Jira MAG-91 issue
               expect(attr['Attributes Table'][15]).property('RAW_VALUE').equal('40 (Min/Max 25/47)'); //jshint ignore:line
               expect(attr['Attributes Table'][9]).property('RAW_VALUE').equal('1275616690298');
               expect(attr['Attributes Table'][23]).property('ID#').equal('242');
               expect(attr['Attributes Table'][21]).property('UPDATED').equal('Offline');
               expect(attr['Attributes Table'][17]).property('ATTRIBUTE_NAME').equal('Reallocated_Event_Count');//jshint ignore:line

                var cap = smart.Capabilities;
                expect(cap).that.is.an('array');
                _.forEach(cap, function(elem) {
                    expect(elem).contain.all.keys('Name', 'Value', 'Annotation');
                    expect(elem).property('Name').to.match(/^[\w\s]+/);
                    expect(elem).property('Value').to.match(/^0x[\da-f]+$|^\d+$/);
                    expect(elem).property('Annotation').is.an('array');
                    expect(elem).property('Annotation').have.length.least(1);
                });
                // Add test case for Jira MAG-91 issue
                expect(cap[cap.length-1]).property('Name').to.equal('SCT capabilities');
                expect(cap[cap.length-1]).property('Value').to.equal('0x003d');
                expect(cap[cap.length-1]).property('Annotation').have.length(4);
                expect(cap[cap.length-1]).property('Annotation').property(3).to.equal('SCT Data Table supported');//jshint ignore:line

                var errlog = smart['Error Log'];
                expect(errlog).contain.all.keys('Error Log Table', 'Revision');
                expect(errlog).property('Revision').to.match(/^\d+$/);
                expect(errlog).property('Error Log Table').that.is.an('array');

                var iden = smart.Identity;
                expect(iden).that.is.an('object');
                _.forEach(iden, function(val, key) {
                    expect(val).to.match(/^[\w\s]+/);
                    expect(key).to.match(/^[\w\s]+/);
                });

                var selTestLog = smart['Selective Self-test Log'];
                expect(selTestLog).contain.all.keys('Revision',
                    'Selective Self-test Log Table');
                expect(selTestLog).property('Revision').to.match(/^\d+$/);
                expect(selTestLog).property('Selective Self-test Log Table')
                    .that.is.an('array');
                _.forEach(selTestLog['Selective Self-test Log Table'], function(elem) {
                    expect(elem).contain.all.keys('CURRENT_TEST_STATUS',
                        'MAX_LBA', 'MIN_LBA', 'SPAN');
                    expect(elem).property('MAX_LBA').to.match(/^\d+$/);
                    expect(elem).property('MIN_LBA').to.match(/^\d+$/);
                    expect(elem).property('SPAN').to.match(/^\d+$/);
                });

                var testLog = smart['Self-test Log'];
                expect(testLog).contain.all.keys('Revision', 'Self-test Log Table');
                expect(testLog).property('Revision').to.match(/^\d+$/);
                expect(testLog).property('Self-test Log Table').that.is.an('array');
                _.forEach(testLog['Self-test Log Table'], function(elem) {
                    expect(elem).contain.all.keys('LBA_of_first_error', 'LifeTime(hours)',
                        'Num', 'Remaining', 'Status', 'Test_Description');
                    expect(elem).property('LifeTime(hours)').to.match(/^\d+$/);
                    expect(elem).property('Num').to.match(/^#\s*\d+$/);
                    expect(elem).property('Remaining').to.match(/^\d\d\%$/);
                    expect(elem).property('Test_Description').is.a('string');
                });

                done();
            })
            .catch(function (err) {
                done(err);
            });
        });
    });

    describe("flashupdt parser", function() {
        var flashupdtSchema = {
            'BIOS Version Information': 'object',
            'BMC Firmware Version': 'object',
            'ME Firmware Version': 'string',
            'SDR Version': 'string',
            'Baseboard Information': 'object',
            'System Information': 'object',
            'Chassis Information': 'object',
        };

        it("should parse sudo flashupdt -i", function() {
            var flashupdtCmd = "sudo /opt/intel/flashupdt -i";
            var tasks = [
                {
                    cmd: flashupdtCmd,
                    stdout: stdoutMocks.flashupdtdecode,
                    stderr: '',
                    error: null
                }
            ];
            return taskParser.parseTasks(tasks)
            .then(function(result) {
                // NOTE: While we don't check EVERY attribute, we check one or two
                // members of each class of attribute types and assume if we got
                // them right we got all the others right as well.

                var data = result[0].data;

                _.forEach(flashupdtSchema, function(elementType, element) {
                    expect(data).to.have.property(element).that.is.an(elementType);
                });

                expect(data).to.not.have.property('Successfully Completed');

                // Assert we can parse key
                expect(data['SDR Version']).to.equal('SDR Package 1.14');

                // Assert we can handle subkey
                expect(data['BIOS Version Information']).to.have.property('BIOS Version')
                    .that.equals('S1200BT.86B.02.00.0035');
                expect(data['BMC Firmware Version']).to.have.property('Op Code')
                    .that.equals('1.13.2825');
                expect(data['BMC Firmware Version']).to.have.property('Boot Code')
                    .that.equals('00.03');

                // Assert we can handle empty objects
                expect(data['Chassis Information']).to.have.property('Manufacturer Name')
                    .that.equals('..............................');

           });
        });
    });

    describe("LLDP Parsers", function () {
        it("should parse lldpcli output", function (done) {
            var lldpCmd = 'sudo /usr/sbin/lldpcli show neighbor -f keyvalue';

            var tasks = [
                {
                    cmd: lldpCmd,
                    stdout: stdoutMocks.lldpOutput,
                    stderr: '',
                    error: null
                }
            ];

            taskParser.parseTasks(tasks)
            .spread(function (result) {
                expect(result.error).to.be.undefined;
                expect(result.store).to.be.true;
                expect(result.data.p20p2.port.descr).to.equal('Not received');
                expect(result.data.p20p2.port.ifname).to.equal('Ethernet50');
                expect(result.data.p20p2.chassis.mac).to.equal('00:1c:73:ac:94:89');
                expect(result.data.p20p2.chassis.name).to.equal('mgmt01');
                expect(result.data.p20p2.chassis['mgmt-ip']).to.equal('10.240.19.102');
                expect(result.data.p20p2.chassis.Bridge.enabled).to.equal('on');
                expect(result.data.p20p2.chassis.Router.enabled).to.equal('off');
                done();
            })
            .catch(function (err) {
                done(err);
            });
        });
    });

    describe("driveId Parsers", function () {
        it("should parse driveId output", function (done) {
            var driveidCmd = 'sudo node get_driveid.js';

            var tasks = [
                {
                    cmd: driveidCmd,
                    stdout: stdoutMocks.driveidOutput,
                    stderr: '',
                    error: null
                }
            ];

            taskParser.parseTasks(tasks)
                .spread(function (result) {
                    expect(result.error).to.be.undefined;
                    expect(result.store).to.be.true;
                    expect(result.source).to.equal('driveId');
                    var driveIdLog = result.data;
                    expect(driveIdLog).that.is.an('array').with.length(2);
                    expect(driveIdLog[0]).property('identifier').to.equal(0);
                    expect(driveIdLog[0]).property('esxiWwid').to.equal
                    ("t10.ATA_____SATADOM2DSV_3SE__________________________20150522AA9992050074");
                    expect(driveIdLog[0]).property('devName').to.equal("sdg");
                    expect(driveIdLog[0]).property('virtualDisk').to.equal("");
                    expect(driveIdLog[0]).property('scsiId').to.equal("10:0:0:0");
                    expect(driveIdLog[0]).property('linuxWwid').to.equal
                    ("/dev/disk/by-id/ata-SATADOM-SV_3SE_20150522AA9992050074");
                    expect(driveIdLog[1]).property('identifier').to.equal(1);
                    expect(driveIdLog[1]).property('esxiWwid').to.equal
                    ("naa.6001636001940a481ddebecb45264d4a");
                    expect(driveIdLog[1]).property('devName').to.equal("sda");
                    expect(driveIdLog[1]).property('virtualDisk').to.equal("/c0/v0");
                    expect(driveIdLog[1]).property('scsiId').to.equal("0:2:0:0");
                    expect(driveIdLog[1]).property('linuxWwid').to.equal
                    ("/dev/disk/by-id/scsi-36001636001940a481ddebecb45264d4a");
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });
        it("should throw error true", function (done) {
            var driveidCmd = 'sudo node get_driveid.js';
            var tasks = [
                {
                    cmd: driveidCmd,
                    stdout: stdoutMocks.driveidOutput,
                    stderr: '',
                    error: true
                }
            ];

            taskParser.parseTasks(tasks)
                .spread(function (result) {
                    expect(result.error).to.be.true;
                    expect(result.source).to.equal('driveId');
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });
        it("should throw Error: No data", function (done) {
            var driveidCmd = 'sudo node get_driveid.js';
            var tasks = [
                {
                    cmd: driveidCmd,
                    stdout: '',
                    stderr: '',
                    error: null
                }
            ];

            taskParser.parseTasks(tasks)
                .spread(function (result) {
                    expect(result.error.toString()).to.equal('Error: No data');
                    expect(result.source).to.equal('driveId');
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });
    });
});

