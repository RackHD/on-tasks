// Copyright 2014, Renasar Technologies Inc.
// Created by ben broderick phillips on 8/28/14.
// *** KEEP ONLY THOSE THAT ARE APPLICABLE HERE AND SET TO TRUE ***
/* jshint node: true, -W064 */

'use strict';

var di = require('di'),
    xmlParser = require('xml2js').parseString;

module.exports = commandParserFactory;

di.annotate(commandParserFactory, new di.Provide('JobUtils.CommandParser'));
di.annotate(commandParserFactory, new di.Inject('Logger', 'Promise', '_'));
function commandParserFactory(Logger, Promise, _) {
    var logger = Logger.initialize(commandParserFactory);

    function CommandParser() { }

    // -------- commands ----------
    var ohai = 'sudo /opt/chef/bin/ohai --directory /etc/ohai/plugins',
        dmi = 'sudo dmidecode',
        megaraidControllerCount = 'sudo /opt/MegaRAID/storcli/storcli64 show ctrlcount J',
        megaraidAdapterInfo = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 show all J',
        megaraidDriveInfo = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 /eall /sall show J',
        megaraidVirtualDiskInfo = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 /vall show all J',
        mpt2fusionAdapterInfo = 'sudo /opt/mpt/mpt2fusion/sas2flash -s -list',
        mellanoxInfo = 'sudo mlxfwmanager --query-xml',
        lshw = 'sudo lshw -json',
        lspci = 'sudo lspci -nn -vmm',
        lsscsiPlusRotational = 'sudo lsblk -o KNAME,TYPE,ROTA; echo BREAK; sudo lsscsi --size',
        ipmiMcInfo = 'sudo ipmitool mc info',
        ipmiSelList = 'sudo ipmitool sel list -c',
        ipmiFru = 'sudo ipmitool fru',
        testEsesR = 'sudo test_eses -R --xml',
        testEsesQ = 'sudo test_eses -q std --xml',
        amiBios = 'cd /opt/ami; sudo ./afulnx_64 /S';

    var matchParsers = {};
    matchParsers.ipmiUserList = {
        regex: /^sudo ipmitool -c user list \d+$/,
        parsefunction: function (data) {
            var channel = data.cmd.match(/\d+/);
            var userListSource = 'ipmi-user-list';
            if (channel) {
                if (channel[0] === '3') {
                    userListSource = 'rmm-user-list';
                } else {
                    userListSource = userListSource + '-' + channel;
                }
            }
            if (data.error) {
                // We catalog all 15 channels, only really fail if the first
                // one isn't present
                if (channel && channel[0] !== '1') {
                    return Promise.resolve({ source: userListSource, data: '', store: false });
                } else {
                    return Promise.resolve({ source: userListSource, error: data.error });
                }
            }
            try {
                var lines = data.stdout.split('\n');
                _.remove(lines, function (line) {
                    if (!line) {
                        return true;
                    } else {
                        return false;
                    }
                });
                var parsed = {},
                    header = lines.shift().split(','),
                    columns = _.map(lines, function (line) {
                        return line.split(',');
                    });
                var ids = _.map(lines, function (line) {
                    return line.split(',')[0];
                });
                var i = 0;
                _.forEach(ids, function (id) {
                    _.forEach(header, function (title) {
                        parsed[id] = parsed[id] || {};
                        parsed[id][title] = columns[i].shift();
                    });
                    i += 1;
                });

                var store = true;
                return Promise.resolve({data: parsed, source: userListSource, store: store});
            } catch (e) {
                return Promise.resolve({source: userListSource, error: e});
            }
        }
    };

    matchParsers.ipmiUserSummary = {
        regex: /^sudo ipmitool user summary \d+$/,
        parsefunction: function(data) {
            var channel = data.cmd.match(/\d+/);
            var userSummarySource = 'ipmi-user-summary';
            if (channel) {
                if (channel[0] === '3') {
                    userSummarySource = 'rmm-user-summary';
                } else {
                    userSummarySource = userSummarySource + '-' + channel;
                }
            }
            if (data.error) {
                // We catalog all 15 channels, only really fail if the first
                // one isn't present
                if (channel && channel[0] !== '1') {
                    return Promise.resolve({ source: userSummarySource, data: '', store: false });
                } else {
                    return Promise.resolve({ source: userSummarySource, error: data.error });
                }
            }
            try {
                var split = data.stdout.split('\n');
                _.remove(split, function(line) {
                    if (!line) {
                        return true;
                    } else if (line.indexOf(' : ') === -1) {
                        logger.warning("ipmitool parser: ignoring line " + line);
                        return true;
                    } else {
                        return false;
                    }
                });
                split = _.map(split, function(line) {
                    var sep = line.split(' : ');
                    sep[0] = sep[0].trim();
                    sep[1] = sep[1].trim();
                    return sep;
                });
                var parsed = {};
                _.forEach(split, function(line) {
                    parsed[line[0]] = line[1];
                });

                var store = true;
                return Promise.resolve({ data: parsed, source: userSummarySource, store: store });
            } catch (e) {
                return Promise.resolve({ source: userSummarySource, error: e });
            }
        }
    };

    matchParsers.ipmiLanPrint = {
        regex: /^sudo ipmitool lan print\s?\d?\d?$/,
        parsefunction: function(data) {
            var channel = data.cmd.match(/\d+/);
            var bmcsource = 'bmc';
            if (channel) {
                if (channel[0] === '3') {
                    bmcsource = 'rmm';
                } else {
                    bmcsource = bmcsource + '-' + channel;
                }
            }
            if (data.error) {
                // We catalog all 15 channels, only really fail if the first
                // one isn't present
                if (channel && channel[0] !== '1') {
                    return Promise.resolve({ source: bmcsource, data: '', store: false });
                } else {
                    return Promise.resolve({ source: bmcsource, error: data.error });
                }
            }
            try {
                var split = data.stdout.split('\n');
                _.remove(split, function(line) {
                    if (!line) {
                        return true;
                    } else if (line.indexOf(' : ') === -1) {
                        logger.warning("ipmitool parser: ignoring line " + line);
                        return true;
                    } else {
                        return false;
                    }
                });
                split = _.map(split, function(line) {
                    var sep = line.split(' : ');
                    sep[0] = sep[0].trim();
                    sep[1] = sep[1].trim();
                    return sep;
                });
                var parsed = {};
                _.forEach(split, function(line) {
                    if (line.length === 3) {
                        if (line[0] === 'Auth Type Enable') {
                            parsed['Auth Type Enable'] = parsed['Auth Type Enable'] || {};
                            parsed['Auth Type Enable'][line[1]] = line[2];
                        } else if (line[0] === '' && _.has(parsed, 'Auth Type Enable')) {
                            parsed['Auth Type Enable'][line[1]] = line[2];
                        } else {
                            logger.warning("Skipping subsection of IPMI data: " + line);
                        }
                    } else if (line[0] === 'Cipher Suite Priv Max') {
                        parsed['Cipher Suite Priv Max'] = parsed['Cipher Suite Priv Max'] || [];
                        parsed['Cipher Suite Priv Max'].push(line[1]);
                    } else if (line[0] === '' && _.has(parsed, 'Cipher Suite Priv Max')) {
                        parsed['Cipher Suite Priv Max'].push(line[1]);
                    } else {
                        parsed[line[0]] = line[1];
                    }
                });

                var store = (parsed['MAC Address'] !== '00:00:00:00:00:00');
                return Promise.resolve({ data: parsed, source: bmcsource, store: store });
            } catch (e) {
                return Promise.resolve({ source: bmcsource, error: e });
            }
        }
    };


    // -------- parsers ----------
    CommandParser.prototype[ohai] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'ohai', error: data.error });
        }
        try {
            var parsed = JSON.parse(data.stdout);
            return Promise.resolve({ data: parsed, source: 'ohai', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'ohai', error: e });
        }
    };

    CommandParser.prototype[dmi] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'dmi', error: data.error });
        }
        try {
            // Slice head of file until first 'Handle...' entry and
            // tail of file to before 'End Of Table'
            var lines = data.stdout.split('\n');
            var start = _.findIndex(lines, function(line) {
                return line.startsWith('Handle');
            });
            var end = _.findLastIndex(lines, function(line) {
                return line === 'End Of Table';
            });
            lines = lines.slice(start, end);

            var key = null;
            var subKey = null;
            var curr;
            var parsed = _.transform(lines, function(result, line) {
                if (line.startsWith('Handle')) {
                    /* Skip lines that look like:
                     *
                     * Handle 0x0012, DMI type 8, 9 bytes
                     */
                    return;
                } else if (!line) {
                    /* Along with the !key block below, handle cases where we
                     * have a break between top-level items:
                     *
                     * Handle 0x0012, DMI type 8, 9 bytes
                     * Port Connector Information
                     *         Internal Reference Designator: J3A1
                     *
                     * Handle 0x0013, DMI type 8, 9 bytes
                     * Port Connector Information
                     *         Internal Reference Designator: J3A1
                     */
                    key = null;
                } else if (!key) {
                    // See comments on previous conditional block
                    key = line.trim();
                    /* If this key already exists, that means we have duplicate keys,
                     * so we should change to an array of objects, e.g. with:
                     *
                     * Handle 0x0012, DMI type 8, 9 bytes
                     * Port Connector Information
                     *         Internal Reference Designator: J3A1
                     *
                     * Handle 0x0013, DMI type 8, 9 bytes
                     * Port Connector Information
                     *         Internal Reference Designator: J3A1
                     *
                     * We want the result to be:
                     *     result['Port Connector Information'] = [ { ... } , { ... } ]
                     *
                     * All _.isArray checks in below blocks accomodate this case as well.
                     */
                    if (_.has(result, key)) {
                        if (_.isArray(result[key])) {
                            result[key].push({});
                        } else {
                            result[key] = [result[key], {}];
                        }
                    } else {
                        result[key] = {};
                    }
                } else if (_.last(line) === ':') {
                    /* Handle cases where we have a subkey that is an array of items,
                     * as in 'Characteristics' below:
                     *
                     * BIOS Information
                     *         Characteristics:
                     *                 PCI is supported
                     *                 BIOS is upgradeable
                     */
                    subKey = line.split(':')[0].trim();
                    if (_.isArray(result[key])) {
                        curr = _.last(result[key]);
                        curr[subKey] = [];
                    } else {
                        result[key][subKey] = [];
                    }
                } else if (line[0] !== '\s' && line[0] !== '\t') {
                    /* Handle cases where we don't have a blank line in between
                     * top level categories:
                     *
                     * On Board Device 1 Information
                     *         Type: Video
                     * On Board Device 2 Information
                     *         Type: Ethernet
                     */
                    key = line.trim();
                    result[key] = {};
                } else {
                    /* Handle sub-objects and sub-arrays
                     *
                     * Cache Information
                     *         Socket Designation: L2 Cache
                     *         Supported SRAM Types:
                     *                 Unknown
                     *         Installed SRAM Type: Unknown
                     */
                    var split = line.split(':');
                    if (split.length === 1) {
                        if (_.isArray(result[key])) {
                            curr = _.last(result[key]);
                            curr[subKey].push(split[0].trim());
                        } else {
                            /* Handle corner case where the value looks like
                             * an object initially, but is actually an array
                             * with a pre-specified length. In this case,
                             * ditch the length value and just provide an array.
                             *
                             * Examples include 'Installable Languages' and 'Contained Elements':
                             *
                             * BIOS Language Information
                             *         Language Description Format: Long
                             *         Installable Languages: 1
                             *                 en|US|iso8859-1
                             *         Currently Installed Language: en|US|iso8859-1
                             *
                             *  ---
                             *
                             * Chassis Information
                             *     Contained Elements: 1
                             *         <OUT OF SPEC> (0)
                             *     SKU Number: To be filled by O.E.M.
                             *
                             */
                            if (parseInt(result[key][subKey])) {
                                result[key][subKey] = [];
                            }
                            result[key][subKey].push(split[0].trim());
                        }
                    } else {
                        subKey = split[0].trim();
                        if (_.isArray(result[key])) {
                            curr = _.last(result[key]);
                            curr[subKey] = split[1].trim();
                        } else {
                            result[key][subKey] = split[1].trim();
                        }
                    }
                }
            }, {});

            return Promise.resolve({ data: parsed, source: 'dmi', store: true });
        } catch (e) {
            return Promise.reject({ source: 'dmi', error: e });
        }
    };

    CommandParser.prototype[lshw] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'lshw', error: data.error });
        }

        return Promise.resolve()
        .then(function() {
            return JSON.parse(data.stdout);
        })
        .then(function(parsed) {
            // Grab any mac addresses out of lshw output, and return them in a
            // lookups object, which will be used to populate the lookups
            // collection in the DB.
            var pci = _.find(parsed.children[0].children, function(child) {
                return child.id.startsWith('pci');
            });
            var macs = _.compact(_.map(pci.children, function(child) {
                if (child.id === 'network') {
                    return child.serial;
                }
                if (child.id.startsWith('pci')) {
                    return _.compact(_.map(child.children, function(_child) {
                        if (_child.class === 'network') {
                            return _child.serial;
                        }
                    }));
                }
            }));
            var lookups = _.map(_.flatten(macs), function(mac) {
                return { mac: mac };
            });
            return Promise.resolve({ data: parsed, source: 'lshw', store: true, lookups: lookups });
        })
        .catch(function(e) {
            return Promise.resolve({ source: 'lshw', error: e });
        });
    };

    CommandParser.prototype[lspci] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'lspci', error: data.error });
        }
        try {
            var lines = data.stdout.split('\n\n');
            var parsed = _.map(lines, function(line) {
                var split = line.split('\n');
                return _.transform(split, function(result, pair) {
                    var sep = pair.split(/:[\t\s]?/, 2);
                    result[sep[0]] = sep[1];
                }, {});
            });
            return Promise.resolve({ data: parsed, source: 'lspci', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'lspci', error: e });
        }
    };

    CommandParser.prototype[lsscsiPlusRotational] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'lsscsi', error: data.error });
        }
        try {
            var lines = data.stdout.trim().split('\n');
            // Remove KNAME,ROTA header from lsblk output
            lines.shift();
            var lsblk = true;
            var split;
            var rotationalData = {};
            var parsed = _.compact(_.map(lines, function(line) {
                if (line === 'BREAK') {
                    lsblk = false;
                } else if (lsblk) {
                    // Grab rotational data information

                    split = line.replace(/\s+/g, ',').split(',');
                    // Our current overlay version of lsblk does not support the
                    // --scsi flag, otherwise we could just use that instead
                    // of checking the TYPE field
                    if (split[1] === 'disk') {
                        rotationalData[split[0]] = Boolean(parseInt(split[2]));
                    }
                } else {
                    // Grab lsscsi information

                    split = _.compact(line.split(' '));
                    if (split.length === 8) {
                        split[3] = split[3] + ' ' + split[4];
                        split = split.slice(0, 4).concat(split.slice(5, split.length));
                    }

                    var curr = {
                        scsiInfo: split[0],
                        peripheralType: split[1],
                        vendorName: split[2],
                        modelName: split[3],
                        revisionString: split[4],
                        devicePath: split[5],
                        size: split[6]
                    };

                    var device = _.last(curr.devicePath.split('/'));
                    if (_.has(rotationalData, device)) {
                        curr.rotational = rotationalData[device];
                    }

                    return curr;
                }
            }));

            return Promise.resolve({ data: parsed, source: 'lsscsi', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'lsscsi', error: e });
        }
    };

    CommandParser.prototype[megaraidControllerCount] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'megaraid-controller-count', error: data.error });
        }
        try {
            var store = true;
            var parsed = JSON.parse(data.stdout);
            if (parsed.Controllers[0]['Response Data']['Controller Count'] === 0) {
                store = false;
            }
            return Promise.resolve({
                data: parsed,
                source: 'megaraid-controller-count',
                store: store
            });
        } catch (e) {
            return Promise.resolve({ source: 'megaraid-controllers', error: e });
        }
    };

    CommandParser.prototype[megaraidAdapterInfo] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'megaraid-controllers', error: data.error });
        }
        try {
            var store = true;
            var parsed = JSON.parse(data.stdout);
            if (parsed.Controllers[0]['Command Status'].Status === 'Failure') {
                store = false;
            }
            return Promise.resolve({ data: parsed, source: 'megaraid-controllers', store: store });
        } catch (e) {
            return Promise.resolve({ source: 'megaraid-controllers', error: e });
        }
    };


    CommandParser.prototype[megaraidVirtualDiskInfo] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'megaraid-virtual-disks', error: data.error });
        }
        try {
            var store = true;
            var parsed = JSON.parse(data.stdout);
            if (parsed.Controllers[0]['Command Status'].Status === 'Failure') {
                store = false;
            }
            return Promise.resolve({
                data: parsed,
                source: 'megaraid-virtual-disks',
                store: store
            });
        } catch (e) {
            return Promise.resolve({ source: 'megaraid-virtual-disks', error: e });
        }
    };

    CommandParser.prototype[megaraidDriveInfo] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'megaraid-physical-drives', error: data.error });
        }
        try {
            var store = true;
            var parsed = JSON.parse(data.stdout);
            if (parsed.Controllers[0]['Command Status'].Status === 'Failure') {
                store = false;
            }
            return Promise.resolve({
                data: parsed,
                source: 'megaraid-physical-drives',
                store: store
            });
        } catch (e) {
            return Promise.resolve({ source: 'megaraid-physical-drives', error: e });
        }
    };

    CommandParser.prototype[mpt2fusionAdapterInfo] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'mpt2fusion-adapters', error: data.error });
        }
        try {
            var lines = data.stdout.split('\n');
            lines = lines.slice(5, lines.length-4);
            _.remove(lines, function (line) {
                if (!line) {
                    return true;
                } else {
                    return false;
                }
            });
            var parsed = _.transform(lines, function(result, line) {
                var split = line.split(':');
                split[0] = split[0].trim();
                if (split.length > 2) {
                    split[1] = split.slice(1).join(':').trim();
                } else {
                    split[1] = split[1].trim();
                }
                result[split[0]] = split[1];
            }, {});

            return Promise.resolve({ data: parsed, source: 'mpt2fusion-adapters', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'mpt2fusion-adapters', error: e });
        }
    };

    CommandParser.prototype[mellanoxInfo] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'mellanox', error: data.error });
        } else if (!data.stdout) {
            return Promise.resolve({ source: 'mellanox', error: new Error("No data") });
        }
        var resolve;
        var deferred = new Promise(function(_resolve) {
            resolve = _resolve;
        });
        xmlParser(data.stdout, function(err, out) {
            if (err) {
                resolve({ source: 'mellanox', error: err });
            } else {
                resolve({
                    data: out,
                    source: 'mellanox',
                    store: true
                });
            }
        });
        return deferred;
    };

    CommandParser.prototype[ipmiSelList] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'ipmi-sel-list', error: data.error });
        }
        try {
            var lines = data.stdout.split('\n');
            _.remove(lines, function(line) {
                if (!line) {
                    return true;
                } else {
                    return false;
                }
            });
            var parsed = _.transform(lines, function(result, line) {
                var split = line.split(',');
                result[split.shift()] = split;
            }, {});

            return Promise.resolve({ data: parsed, source: 'ipmi-sel-list', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'ipmi-sel-list', error: e });
        }
    };

    CommandParser.prototype[ipmiFru] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'ipmi-fru', error: data.error });
        }
        try {
            var split = data.stdout.split('\n');
            _.remove(split, function(line) {
                if (!line) {
                    return true;
                } else {
                    return false;
                }
            });
            split = _.map(split, function(line) {
                var sep = line.split(':');
                sep[0] = sep[0].trim();
                sep[1] = sep[1] ? sep[1].trim() : '';
                return sep;
            });
            var parsed = {};
            var key;
            _.forEach(split, function(line) {
                if (line[0] === 'FRU Device Description') {
                    key = line[1];
                    parsed[key] = {};
                } else  {
                    parsed[key][line[0]] = line[1];
                }
            });
            return Promise.resolve({ data: parsed, source: 'ipmi-fru', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'ipmi-fru', error: e });
        }
    };


    CommandParser.prototype[ipmiMcInfo] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'ipmi-mc-info', error: data.error });
        }
        try {
            var split = data.stdout.split('\n');
            _.remove(split, function(line) {
                if (!line) {
                    return true;
                } else {
                    return false;
                }
            });
            split = _.map(split, function(line) {
                var sep = line.split(':');
                sep[0] = sep[0].trim();
                sep[1] = sep[1] ? sep[1].trim() : '';
                return sep;
            });
            var parsed = {};
            _.forEach(split, function(line) {
                if (line[0] === 'Additional Device Support') {
                    parsed['Additional Device Support'] = [];
                } else if (line[0] === 'Aux Firmware Rev Info') {
                    parsed['Aux Firmware Rev Info'] = [];
                } else if (parsed['Aux Firmware Rev Info']) {
                    parsed['Aux Firmware Rev Info'].push(line[0]);
                } else if (parsed['Additional Device Support']) {
                    parsed['Additional Device Support'].push(line[0]);
                } else {
                    parsed[line[0]] = line[1];
                }
            });

            return Promise.resolve({ data: parsed, source: 'ipmi-mc-info', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'ipmi-mc-info', error: e });
        }
    };

    CommandParser.prototype[amiBios] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'ami', error: data.error });
        }
        try {
            var lines = data.stdout.split('\n');
            var parsed = {};
            _.forEach(lines, function(line) {
                if (line.match(/System ROM ID/)) {
                    parsed.systemRomId = _.last(line.split(' = '));
                } else if (line.match(/System ROM GUID/)) {
                    parsed.systemRomGuid = _.last(line.split(' = '));
                } else if (line.match(/System ROM Secure Flash/)) {
                    parsed.systemRomSecureFlash = _.last(line.split(' = '));
                }
            });
            return Promise.resolve({ data: parsed, source: 'ami', store: true });
        } catch (e) {
            return Promise.resolve({ source: 'ami', error: e });
        }
    };

    CommandParser.prototype[testEsesR] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'test_eses', error: data.error });
        } else if (!data.stdout) {
            return Promise.resolve({ source: 'test_eses', error: new Error("No data") });
        }
        var resolve;
        var deferred = new Promise(function(_resolve) {
            resolve = _resolve;
        });
        xmlParser(data.stdout, function(err, out) {
            if (err) {
                resolve({ source: 'test_eses', error: err });
            } else {
                resolve({
                    data: out,
                    source: 'test_eses',
                    store: true
                });
            }
        });
        return deferred;
    };

    CommandParser.prototype[testEsesQ] = function(data) {
        if (data.error) {
            return Promise.resolve({ source: 'test_eses', error: data.error });
        } else if (!data.stdout) {
            return Promise.resolve({ source: 'test_eses', error: new Error("No data") });
        }
        var resolve;
        var deferred = new Promise(function(_resolve) {
            resolve = _resolve;
        });
        xmlParser(data.stdout, function(err, out) {
            if (err) {
                resolve({ source: 'test_eses', error: err });
            } else {
                resolve({
                    data: out,
                    source: 'test_eses',
                    store: true
                });
            }
        });
        return deferred;
    };

    CommandParser.prototype.parseUnknownTasks = function(tasks) {
        return Promise.all(_.map(tasks, function(data) {
            var out;
            if (data.error) {
                return Promise.resolve({ source: data.source, error: data.error });
            } else if (!data.stdout) {
                return Promise.resolve({ source: data.source, error: new Error("No data") });
            }
            if (data.format === 'json') {
                try {
                    out = JSON.parse(data.stdout);
                } catch (e) {
                    return Promise.resolve({ source: data.source, error: e });
                }
                return Promise.resolve({
                    source: data.source,
                    data: out,
                    store: true
                });
            } else if (data.format === 'xml') {
                xmlParser(data.stdout, function(err, out) {
                    if (err) {
                        return Promise.resolve({ source: data.source, error: err });
                    } else {
                        return Promise.resolve({
                            data: out,
                            source: data.source,
                            store: true
                        });
                    }
                });
            } else {
                return Promise.resolve({
                    source: data.source,
                    data: { data: data.stdout },
                    store: true
                });
            }
        }));
    };

    CommandParser.prototype.parseTasks = function parseTasks(tasks) {
        var self = this;

        return Promise.all(_.map(tasks, function(task) {
            // if there's an explicit match parser listed, use it
            if (self[task.cmd]) {
                return self[task.cmd](task);
            }
            // if there's a match on a regex parser listed, use it
            for(var parsername in matchParsers) {
                if (matchParsers.hasOwnProperty(parsername)) {
                    if (task.cmd.match(matchParsers[parsername].regex)) {
                        return matchParsers[parsername].parsefunction(task);
                    }
                }
            }
            // otherwise return an error for no parser existing
            var error = new Error("No parser exists for command " + task.cmd);
            return Promise.resolve({ source: task.cmd, error: error });
        }));
    };

    return new CommandParser();
}
