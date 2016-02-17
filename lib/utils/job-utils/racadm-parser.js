// Copyright 2016, EMC, Inc.

"use strict";

var di = require('di');

module.exports = parseRacadmDataFactory;
di.annotate(parseRacadmDataFactory, new di.Provide('JobUtils.RacadmCommandParser'));
di.annotate(parseRacadmDataFactory,
    new di.Inject(
        'Assert',
        '_'
    )
);

function parseRacadmDataFactory(
    assert,
    _
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
            throw "software list data is not aligned in correct way";
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
            suffixArray = [], preffixArray = [], newSoftwareList = {};
        //Original key                                      => New key
        //Disk.Bay.0:Enclosure.Internal.0-0:RAID.Slot.1-1   => Disk0
        //RAID.Slot.1-1                                     => RAID
        _.forEach(softwareList, function(value, key){
            preffixArray.push(key.toString().split('.')[0].trim());
            suffixArray.push(key.toString().split(':')[0].split('.')[2]);
            oldKeyArray.push(key);
        });
        _.forEach(oldKeyArray, function(value, key){
            var preffix = preffixArray[key],
                suffix = suffixArray[key].split('-')[0];
            //If preffix appeared only once, then suffix is not necessary
            //Otherwise, suffix is needed
            if(_.countBy(preffixArray)[preffix] === 1){
                newKeyArray[key] = preffix;
            } else {
                /* Another option: create device name suffix
                 if(keyCount[preffix]){
                 keyCount.preffix += 1;
                 } else{
                 keyCount[preffix] = 0;
                 }
                 newKeyArray[i] = preffix + keyCount.preffix.toString();
                 */
                newKeyArray[key] = preffix.concat(suffix);
            }
            newSoftwareList[newKeyArray[key]] = softwareList[value];
        });
        return newSoftwareList;
    };

    /**
     * Transfer xml file into json object
     *
     * @param xmlData
     */
    /*
    RacadmCommandParser.prototype.xmlToJson = function(xmlData) {
        var xmlToJsonParser = new xml2js.Parser();
        fs.readFile('./spec/lib/utils/job-utils/samplefiles/racadm-bios.xml', function(err, data) {
            //console.dir(JSON.stringify(data));
            xmlToJsonParser.parseString(data, function (err, result) {
                //console.dir(result.toString());
                //result = JSON.stringify(result).replace(/"\$"\:/g, '').replace(/"_"\:/g, '');
                //console.dir(result);
                console.log('Done');
            });
        });
    };*/

    /**
     * Divide full file path into file path + file name
     *
     * @param {string} data
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
     * @param {string} data
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
     * @param {string} data
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

    return new RacadmCommandParser();
}
