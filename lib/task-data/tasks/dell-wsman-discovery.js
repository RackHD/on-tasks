// Copyright 2016, Dell, Inc.

'use strict';

module.exports = {
    friendlyName: "Dell Wsman Discovery",
    injectableName: "Task.Dell.Wsman.Discovery",
    implementsTask: "Task.Base.Dell.Wsman.Discovery",
    options: {
		ranges:[{
			startIp: null,
			endIp: null,
			credentials:{
				user: null,
				password: null
			}
		}],
		credentials:{
			user: null,
			password: null
		},
		inventory: null
    },
    properties: {}
};
