// Copyright 2014, Renasar Technologies Inc.
// Created by ben broderick phillips on 8/28/14.
// *** KEEP ONLY THOSE THAT ARE APPLICABLE HERE AND SET TO TRUE ***
/* jshint node: true, -W064 */

'use strict';

var di = require('di'),
    _ = require('lodash'),
    xmlParser = require('xml2js').parseString;

module.exports = commandParserFactory;

di.annotate(commandParserFactory, new di.Provide('JobUtils.CommandParser'));
di.annotate(commandParserFactory, new di.Inject('Logger', 'Q'));
function commandParserFactory(Logger, Q) {
    var logger = Logger.initialize(commandParserFactory);

    function CommandParser() { }

    // -------- commands ----------
    var ohai = 'sudo /opt/chef/bin/ohai --directory /etc/ohai/plugins',
        megaraidControllerCount = 'sudo /opt/MegaRAID/storcli/storcli64 show ctrlcount J',
        megaraidAdapterInfo = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 show all J',
        megaraidVirtualDiskInfo = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 /vall show all J',
        mpt2fusionAdapterInfo = 'sudo /opt/mpt/mpt2fusion/sas2flash -s -list',
        mellanoxInfo = 'sudo mlxfwmanager --query-xml',
        lshw = 'sudo lshw -json',
        lspci = 'sudo lspci -nn -vmm',
        lsscsi = 'sudo lsscsi --size',
        ipmiMcInfo = 'sudo ipmitool mc info',
        ipmiSelList = 'sudo ipmitool sel list -c',
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
                    return Q.resolve({ source: userListSource, data: '', store: false });
                } else {
                    return Q.resolve({ source: userListSource, error: data.error });
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
                return Q.resolve({data: parsed, source: userListSource, store: store});
            } catch (e) {
                return Q.resolve({source: userListSource, error: e});
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
                    return Q.resolve({ source: userSummarySource, data: '', store: false });
                } else {
                    return Q.resolve({ source: userSummarySource, error: data.error });
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
                return Q.resolve({ data: parsed, source: userSummarySource, store: store });
            } catch (e) {
                return Q.resolve({ source: userSummarySource, error: e });
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
                    return Q.resolve({ source: bmcsource, data: '', store: false });
                } else {
                    return Q.resolve({ source: bmcsource, error: data.error });
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
                return Q.resolve({ data: parsed, source: bmcsource, store: store });
            } catch (e) {
                return Q.resolve({ source: bmcsource, error: e });
            }
        }
    };


    // -------- parsers ----------
    CommandParser.prototype[ohai] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'dmi', error: data.error });
        }
        try {
            var parsed = JSON.parse(data.stdout);
            return Q.resolve({ data: parsed, source: 'dmi', store: true });
        } catch (e) {
            return Q.resolve({ source: 'dmi', error: e });
        }
    };

    CommandParser.prototype[lshw] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'lshw', error: data.error });
        }
        try {
            var parsed = JSON.parse(data.stdout);
            return Q.resolve({ data: parsed, source: 'lshw', store: true });
        } catch (e) {
            return Q.resolve({ source: 'lshw', error: e });
        }
    };

    CommandParser.prototype[lspci] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'lspci', error: data.error });
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
            return Q.resolve({ data: parsed, source: 'lspci', store: true });
        } catch (e) {
            return Q.resolve({ source: 'lspci', error: e });
        }
    };

    CommandParser.prototype[lsscsi] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'lspci', error: data.error });
        }
        try {
            var lines = data.stdout.trim().split('\n');
            var parsed = _.map(lines, function(line) {
                var split = _.compact(line.split(' '));
                if (split.length === 8) {
                    split[3] = split[3] + ' ' + split[4];
                    split = split.slice(0, 4).concat(split.slice(5, split.length));
                }
                return {
                    scsiInfo: split[0],
                    peripheralType: split[1],
                    vendorName: split[2],
                    modelName: split[3],
                    revisionString: split[4],
                    devicePath: split[5],
                    size: split[6]
                };
            });
            return Q.resolve({ data: parsed, source: 'lsscsi', store: true });
        } catch (e) {
            return Q.resolve({ source: 'lsscsi', error: e });
        }
    };

    CommandParser.prototype[megaraidControllerCount] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'megaraid-controller-count', error: data.error });
        }
        try {
            var store = true;
            var parsed = JSON.parse(data.stdout);
            if (parsed.Controllers[0]['Response Data']['Controller Count'] === 0) {
                store = false;
            }
            return Q.resolve({
                data: parsed,
                source: 'megaraid-controller-count',
                store: store
            });
        } catch (e) {
            return Q.resolve({ source: 'megaraid-controllers', error: e });
        }
    };

    CommandParser.prototype[megaraidAdapterInfo] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'megaraid-controllers', error: data.error });
        }
        try {
            var store = true;
            var parsed = JSON.parse(data.stdout);
            if (parsed.Controllers[0]['Command Status'].Status === 'Failure') {
                store = false;
            }
            return Q.resolve({ data: parsed, source: 'megaraid-controllers', store: store });
        } catch (e) {
            return Q.resolve({ source: 'megaraid-controllers', error: e });
        }
    };


    CommandParser.prototype[megaraidVirtualDiskInfo] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'megaraid-virtual-disks', error: data.error });
        }
        try {
            var store = true;
            var parsed = JSON.parse(data.stdout);
            if (parsed.Controllers[0]['Command Status'].Status === 'Failure') {
                store = false;
            }
            return Q.resolve({ data: parsed, source: 'megaraid-virtual-disks', store: store });
        } catch (e) {
            return Q.resolve({ source: 'megaraid-virtual-disks', error: e });
        }
    };

    CommandParser.prototype[mpt2fusionAdapterInfo] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'mpt2fusion-adapters', error: data.error });
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

            return Q.resolve({ data: parsed, source: 'mpt2fusion-adapters', store: true });
        } catch (e) {
            return Q.resolve({ source: 'mpt2fusion-adapters', error: e });
        }
    };

    CommandParser.prototype[mellanoxInfo] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'mellanox', error: data.error });
        } else if (!data.stdout) {
            return Q.resolve({ source: 'mellanox', error: new Error("No data") });
        }
        var deferred = Q.defer();
        xmlParser(data.stdout, function(err, out) {
            if (err) {
                deferred.resolve({ source: 'mellanox', error: err });
            } else {
                deferred.resolve({
                    data: out,
                    source: 'mellanox',
                    store: true
                });
            }
        });
        return deferred.promise;
    };

    CommandParser.prototype[ipmiSelList] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'ipmi-sel-list', error: data.error });
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

            return Q.resolve({ data: parsed, source: 'ipmi-sel-list', store: true });
        } catch (e) {
            return Q.resolve({ source: 'ipmi-sel-list', error: e });
        }
    };

    CommandParser.prototype[ipmiMcInfo] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'ipmi-mc-info', error: data.error });
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

            return Q.resolve({ data: parsed, source: 'ipmi-mc-info', store: true });
        } catch (e) {
            return Q.resolve({ source: 'ipmi-mc-info', error: e });
        }
    };

    CommandParser.prototype[amiBios] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'ami', error: data.error });
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
            return Q.resolve({ data: parsed, source: 'ami', store: true });
        } catch (e) {
            return Q.resolve({ source: 'ami', error: e });
        }
    };

    CommandParser.prototype[testEsesR] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'test_eses', error: data.error });
        } else if (!data.stdout) {
            return Q.resolve({ source: 'test_eses', error: new Error("No data") });
        }
        var deferred = Q.defer();
        xmlParser(data.stdout, function(err, out) {
            if (err) {
                deferred.resolve({ source: 'test_eses', error: err });
            } else {
                deferred.resolve({
                    data: out,
                    source: 'test_eses',
                    store: true
                });
            }
        });
        return deferred.promise;
    };

    CommandParser.prototype[testEsesQ] = function(data) {
        if (data.error) {
            return Q.resolve({ source: 'test_eses', error: data.error });
        } else if (!data.stdout) {
            return Q.resolve({ source: 'test_eses', error: new Error("No data") });
        }
        var deferred = Q.defer();
        xmlParser(data.stdout, function(err, out) {
            if (err) {
                deferred.resolve({ source: 'test_eses', error: err });
            } else {
                deferred.resolve({
                    data: out,
                    source: 'test_eses',
                    store: true
                });
            }
        });
        return deferred.promise;
    };

    CommandParser.prototype.parseTasks = function parseTasks(tasks) {
        var self = this;

        var parsed = _.map(tasks, function(task) {
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
            return Q.resolve({ source: task.cmd, error: error });
        });

        return parsed;
    };

    return new CommandParser();
}
