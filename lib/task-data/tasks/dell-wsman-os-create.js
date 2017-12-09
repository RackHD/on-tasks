//Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
		friendlyName: 'dell wsman Os Deployment Create',
		injectableName: 'Task.Dell.Wsman.Os.Create',
		implementsTask: 'Task.Base.Dell.Wsman.Os.Create',
		options: {
		   	   action: 'create',
			   destinationDir: null,
			   destinationFileName: null,
			   fileName: null,
			   kickStartFileName: null,
			   ksLocation: null,
			   shareAddress: null,
			   sourceDir: null
			},
		properties: {}
};

