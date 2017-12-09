//Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
		friendlyName: 'dell wsman Os Deployment Deploy',
		injectableName: 'Task.Dell.Wsman.Os.Deploy',
		implementsTask: 'Task.Base.Dell.Wsman.Os.Deploy',
		options: {
				  
			     action: 'deploy',
			     hypervisorType: null,
				 hypervisorVersion: null,
				 
				 isoFileShare: {
					address: null,
					description: null,
					fileName: null,
					name: null,
					path: null,
					scriptDirectory: null,
					scriptName: null,
					type: null,
					passwordCredential: {
						domain: null,
						password: null,
						username: null
					  },
				  },
				  serverAddress: null,
				  userName: null,
				  password: null

				
			},
		properties: {}
};

