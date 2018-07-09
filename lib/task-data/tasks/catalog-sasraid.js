// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Catalog sasraid',
    injectableName: 'Task.Catalog.sasraid',
    implementsTask: 'Task.Base.Linux.Catalog',
    optionsSchema: 'catalog-sas.json',
    options: {
        adapter: '0',
        commands: [
	    'sudo python /opt/sas_info.py /opt/sas2ircu',
            'sudo python /opt/sas_info.py /opt/sas3ircu'
        ]
    },
    properties: {
        catalog: {
            type: 'sasraid'
        }
    }
};
