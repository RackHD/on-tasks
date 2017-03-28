// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'dell wsman powerthermal monitoring',
    injectableName: 'Task.Dell.Wsman.Powerthermal',
    implementsTask: 'Task.Base.Dell.Wsman.PowerThermal',
    //schemaRef: 'dell-wsman-control.json',
    options: {
        action: 'powercapping',
        "powerCap":null,
        "enableCapping":true 
         
     },
    properties: {}
};

