// Copyright 2016, EMC, Inc.

"use strict";

var di = require('di'),
    xml2js = require('xml2js');

module.exports = parseRacadmDataFactory;
di.annotate(parseRacadmDataFactory, new di.Provide('JobUtils.RacadmCommandParser'));
di.annotate(parseRacadmDataFactory,
    new di.Inject(
        'Assert',
        '_',
        'fs',
        'Promise'
    )
);

function parseRacadmDataFactory(
    assert,
    _,
    fs,
    Promise
) {

    function RacadmCommandParser() {}

    /**
     * Parser software inventory list to get standard software list json format.
     *
     * @param {string} softwareListData
     */
    RacadmCommandParser.prototype.getSoftwareList = function(softwareListData) {
        var softwareInventory = {};

        var lines = softwareListData.trim().split('\n');
        var filteredLines = _.filter(lines, function(line){
            return line.indexOf('=') !== -1 && line.indexOf('ComponentType') === -1;
        });

        if (filteredLines.length % 4 !== 0){
            throw new Error("software list data is not aligned in correct way");
        }
        var groupedData = _.chunk(filteredLines, 4);

        //Example of groupedData Element
        //data[0] - 'ElementName = Intel(R) Ethernet 10G X520 LOM - 00:8C:FA:F3:78:30'
        //data[1] - 'FQDD = NIC.Embedded.1-1-1'
        //data[2] - 'InstallationDate = 2015-11-26T06:54:17Z'
        //data[3] - 'Current Version = 16.5.0'
        _.forEach(groupedData, function(data){
            var row = [];
            //Example of row
            //row[0] - ['elementName', 'Intel(R) Ethernet 10G X520 LOM - 00:8C:FA:F3:78:30']
            //row[1] - ['fQDD', 'NIC.Embedded.1-1-1']
            //row[2] - ['installationDate', '2015-11-26T06:54:17Z']
            //row[3] - ['currentVersion', '16.5.0']
            _.forEach(data, function(line){
                var splitedLine = line.split('='),
                    name = splitedLine[0].trim().replace(' ', '');
                var lowerFirstChar = name.substr(0,1).toLowerCase().concat(name.substr(1));
                row.push([lowerFirstChar, splitedLine[1].trim()]);
            });
            var deviceName = row[1][1].split(':')[0];
            var deviceInfo = {
                elementName: '',
                FQDD: '',
                installationDate: '',
                currentVersion: '',
                rollbackVersion: '',
                availableVersion: ''
            };
            if (softwareInventory.hasOwnProperty(deviceName)){
                deviceInfo = softwareInventory[deviceName];
                if (deviceInfo.installationDate === 'NA'){
                    deviceInfo.installationDate = row[2][1];
                }
                if (!deviceInfo[row[3][0]]){
                    deviceInfo[row[3][0]] = row[3][1];
                }
            } else {
                deviceInfo.elementName = row[0][1];
                deviceInfo.FQDD = row[1][1];
                deviceInfo.installationDate = row[2][1];
                deviceInfo[row[3][0]] = row[3][1];
            }
            /*
             if (softwareInventory.hasOwnProperty(deviceName)){
             deviceInfo = softwareInventory[deviceName];
             deviceInfo[row[3][0]] = row[3][1];
             if (deviceInfo[row[2][0]] === 'NA'){
             deviceInfo[row[2][0]] = row[2][1];
             }
             } else{
             for(var j = 0; j < data.length; j += 1){
             deviceInfo[row[j][0]] = row[j][1];
             }
             }
             */
            softwareInventory[deviceName] = deviceInfo;
        });
        return this.simplifyKeyName(softwareInventory);
    };

    /**
     * Create simply key for each software list
     *
     * @param {string} softwareList
     */
    RacadmCommandParser.prototype.simplifyKeyName = function(softwareList) {
        var newKeyArray = [], oldKeyArray = [],
            suffixArray = [], prefixArray = [], newSoftwareList = {};
        //Original key                                      => New key
        //Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1   => Disk0
        //RAID.Slot.1-1                                     => RAID
        _.forEach(softwareList, function(value, key){
            prefixArray.push(key.toString().split('.')[0].trim());
            suffixArray.push(key.toString().split(':')[0].split('.')[2]);
            oldKeyArray.push(key);
        });
        _.forEach(oldKeyArray, function(value, key){
            var prefix = prefixArray[key],
                suffix = suffixArray[key].split('-')[0];
            //If prefix appeared only once, then suffix is not necessary
            //Otherwise, suffix is needed
            if(_.countBy(prefixArray)[prefix] === 1){
                newKeyArray[key] = prefix;
            } else {
                /* Another option: create device name suffix
                 if(keyCount[prefix]){
                 keyCount.prefix += 1;
                 } else{
                 keyCount[prefix] = 0;
                 }
                 newKeyArray[i] = prefix + keyCount.prefix.toString();
                 */
                newKeyArray[key] = prefix.concat(suffix);
            }
            newSoftwareList[newKeyArray[key]] = softwareList[value];
        });
        return newSoftwareList;
    };

    /**
     * Divide full file path into file path + file name
     *
     * @param {string} data - full file path includes path and filename
     */
    RacadmCommandParser.prototype.getPathFilename = function(data) {
        assert.string(data);
        var filename = data.slice(data.lastIndexOf('/')+1),
            path = data.slice(0, data.lastIndexOf('/')),
            style = '';

        if (path.indexOf('//') === 0) {
            style = 'remote';
        } else if (path.indexOf('/') === 0) {
            style = 'local';
        } else {
            throw new Error('file path format is incorrect');
        }

        return {name: filename, path: path, style: style};
    };

    /**
     * Get job ID from racadm command line feedback message
     *
     * @param {string} data - console output for racadm get job ID command
     */
    RacadmCommandParser.prototype.getJobId = function(data) {
        var lines = data.trim().split('\n');
        var filteredLine = _.filter(lines, function(line){
            return line.indexOf('JID_') !== -1;
        });

        if (filteredLine.length === 0){
            throw new Error('can not find JID_ index in console standard output message');
        }

        return _.last(filteredLine[0].split('"')[1].split(' ')).trim();
    };

    /**
     * Get job status from racadm command line feedback message
     *
     * @param {string} data - console output for racadm get job status command
     */
    RacadmCommandParser.prototype.getJobStatus = function(data) {
        var lines = data.trim().split('\n');
        var filteredLines = _.filter(lines, function(line){
            return line.indexOf('=') !== -1 ;
        });
        var column = _.map(filteredLines, function(line){
            line = line.split('=')[1].trim();
            return line.replace('[', '').replace(']', '');
        });

        if (column.length !== 7){
            throw new Error('job status format is not correct');
        }

        return {
            jobId: column[0],
            jobName: column[1],
            status: column[2],
            startTime: column[3],
            expirationTime: column[4],
            message: column[5],
            percentComplete: column[6]
        };
    };

    /**
     * Parser json object transferred from xml file
     *
     * @param {object} components - object for a component configure info
     */
    RacadmCommandParser.prototype._xmlToJson = function(components) {
        var componentsList = [], self = this;
        _.forEach(components, function(component) {
            var componentCatalog = {
                FQDD: '',
                attribute: [], //use Attribute for json2Xml
                commentedAttribute: []
            };
            if (component.Component) {
                componentCatalog.components = [];
                componentCatalog.components = self._xmlToJson(component.Component);
            }
            if (!component.$.FQDD) {
                throw new Error('FQDD or component attribute does not exist');
            }
            componentCatalog.FQDD = component.$.FQDD;
            _.forEach(component.Attribute, function (attribute) {
                var keyValue = {};
                keyValue[attribute.$.Name] = attribute._ || 'NA';
                componentCatalog.attribute.push(keyValue);
            });

            _.forEach(component.commentedAttribute, function (attribute) {
                var keyValue = {};
                keyValue[attribute.$.Name] = attribute._ || 'NA';
                componentCatalog.commentedAttribute.push(keyValue);
            });
            componentsList.push(componentCatalog);
        });
        return componentsList;
    };

    /**
     * Transfer xml file into json object
     *
     * @param {file} filePath - xml data file path
     */
    RacadmCommandParser.prototype.xmlToJson = function(filePath) {
        var xmlToJsonParser = new xml2js.Parser({attrkey: '$', charkey: '_'});
        var readFile = Promise.promisify(fs.readFile);
        var xmlCatalog = {
                systemInfo: {},
                components: []
            },
            self = this;
        return readFile(filePath, 'utf8')
            .then(function(file){
                //Commented lines should also be parsed, thus we need remove '<!--' and '-->'
                //Original line:    <!-- <Attribute Name="SataPortA">Auto</Attribute> -->
                //New line:         < commentedAttribute Name="SataPortA">Auto</commentedAttribute>
                return file.replace(/<!-- </g, '< commented').
                    replace(/Attribute> -->/g, 'commentedAttribute>');
            })
            .then(function(newFile){
                xmlToJsonParser.parseString(newFile, function (err, result) {
                    if(err){
                        throw err;
                    }
                    if (!result.SystemConfiguration){
                        throw new Error('Can not find SystemConfiguration attribute');
                    }
                    if (!result.SystemConfiguration.$){
                        throw new Error('SystemConfiguration attribute is null');
                    }
                    xmlCatalog.systemInfo = result.SystemConfiguration.$;
                    var components = result.SystemConfiguration.Component;
                    if (!components || components.length === 0){
                        throw new Error('Can not find components');
                    }
                    xmlCatalog.components = self._xmlToJson(components);
                });
                return xmlCatalog;
            });
    };

    return new RacadmCommandParser();
}
