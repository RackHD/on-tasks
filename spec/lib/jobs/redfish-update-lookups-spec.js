// Copyright © 2018 Dell Inc. or its subsidiaries. All Rights Reserved.

'use strict';
var uuid = require('node-uuid');

describe('redfish-update-lookups-job', function() {
    var waterline = { catalogs: {}, lookups: {} },
        RedfishUpdateLookupsJob,
        job;

    var ethernetInterfacesCatalog = {
        "id": "abf88cc8-ea5c-4db8-961c-5faf39bec1b9",
        "node": "/api/2.0/nodes/5afbe4080ff1d4bb0e2c0232",
        "createdAt": "2018-05-16T07:56:23.785Z",
        "updatedAt": "2018-05-16T07:56:23.785Z",
        "source": "/redfish/v1/Systems/5afbe4080ff1d4bb0e2c0232/EthernetInterfaces",
        "data": {
          "@odata_context": "/redfish/v1/$metadata#EthernetInterfaceCollection.EthernetInterfaceCollection",
          "@odata_id": "/redfish/v1/Systems/18D2182-CN7475158B0188/EthernetInterfaces",
          "@odata_type": "#EthernetInterfaceCollection.EthernetInterfaceCollection",
          "Description": "Collection of Ethernet Interfaces for this System",
          "Members": [
            {
              "@odata_id": "/redfish/v1/Systems/18D2182-CN7475158B0188/EthernetInterfaces/NIC.Embedded.1-1-1"
            }
          ],
          "Members@odata_count": 1,
          "Name": "System Ethernet Interface Collection"
        }
    };
    var nicCatalog = {
        "id": "7fab2fdb-0e7a-4348-b600-15ce532c7ced",
        "node": "/api/2.0/nodes/5afbe4080ff1d4bb0e2c0232",
        "createdAt": "2018-05-16T07:56:27.744Z",
        "updatedAt": "2018-05-16T07:56:27.744Z",
        "source": "/redfish/v1/Systems/5afbe4080ff1d4bb0e2c0232/EthernetInterfaces/NIC.Embedded.1-1-1",
        "data": {
          "@odata_context": "/redfish/v1/$metadata#EthernetInterface.EthernetInterface",
          "@odata_id": "/redfish/v1/Systems/18D2182-CN7475158B0188/EthernetInterfaces/NIC.Embedded.1-1-1",
          "@odata_type": "#EthernetInterface.v1_0_2.EthernetInterface",
          "AutoNeg": false,
          "Description": "Embedded NIC 1 Port 1 Partition 1",
          "FQDN": null,
          "FullDuplex": true,
          "HostName": null,
          "IPV6DefaultGateway": null,
          "IPv4Addresses": [],
          "IPv4Addresses@odata_count": 0,
          "IPv6AddressPolicyTable": [],
          "IPv6AddressPolicyTable@odata_count": 0,
          "IPv6Addresses": [],
          "IPv6Addresses@odata_count": 0,
          "IPv6StaticAddresses": [],
          "IPv6StaticAddresses@odata_count": 0,
          "Id": "NIC.Embedded.1-1-1",
          "InterfaceEnabled": null,
          "MTUSize": null,
          "MacAddress": "00:8C:FA:F3:78:18",
          "MaxIPv6StaticAddresses": null,
          "Name": "System Ethernet Interface",
          "NameServers": [],
          "NameServers@odata_count": 0,
          "PermanentMACAddress": "00:8C:FA:F3:78:18",
          "SpeedMbps": 10240,
          "Status": {
            "Health": "Ok",
            "State": "Enabled"
          },
          "UefiDevicePath": "PciRoot(0x1)/Pci(0x1,0x0)/Pci(0x0,0x0)",
          "VLAN": null
        }
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/redfish-update-lookups.js'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        this.sandbox = sinon.sandbox.create();
        RedfishUpdateLookupsJob = helper.injector.get('Job.Redfish.Update.Lookups');
    });

    beforeEach(function() {
        waterline.catalogs.findLatestCatalogOfSource = this.sandbox.stub();
        waterline.lookups.upsertNodeToMacAddress = this.sandbox.stub();
        job = new RedfishUpdateLookupsJob({}, { systems: ['someNodeId']}, uuid.v4());
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it('should update lookups from catalog', function() {
        waterline.catalogs.findLatestCatalogOfSource.withArgs(
            'someNodeId',
            '/redfish/v1/Systems/someNodeId/EthernetInterfaces'
        ).resolves(ethernetInterfacesCatalog);
        waterline.catalogs.findLatestCatalogOfSource.withArgs(
            'someNodeId',
            '/redfish/v1/Systems/someNodeId/EthernetInterfaces/NIC.Embedded.1-1-1'
        ).resolves(nicCatalog);
        return job._run()
        .then(function() {
            expect(waterline.lookups.upsertNodeToMacAddress).to.be.calledOnce;
            expect(waterline.lookups.upsertNodeToMacAddress).to.be
                .calledWith('someNodeId', '00:8C:FA:F3:78:18');
        });
    });

    it('should fail if lookups insertion fails', function() {
        var error = new Error('some Waterline error');
        waterline.lookups.upsertNodeToMacAddress.rejects(error);
        waterline.catalogs.findLatestCatalogOfSource.withArgs(
            'someNodeId',
            '/redfish/v1/Systems/someNodeId/EthernetInterfaces'
        ).resolves(ethernetInterfacesCatalog);
        waterline.catalogs.findLatestCatalogOfSource.withArgs(
            'someNodeId',
            '/redfish/v1/Systems/someNodeId/EthernetInterfaces/NIC.Embedded.1-1-1'
        ).resolves(nicCatalog);
        return expect(job._run()).to.be.rejectedWith('some Waterline error');
    });

    it('should fail if EthernetInterfaces data is unavailable in catalog', function() {
        waterline.catalogs.findLatestCatalogOfSource.resolves(undefined);
        return expect(job._run())
            .to.be.rejectedWith('Could not find Members in EthernetInterfaces catalog!');
    });

    it('should fail if NIC data is unavailable in catalog', function() {
        waterline.catalogs.findLatestCatalogOfSource.withArgs(
            'someNodeId',
            '/redfish/v1/Systems/someNodeId/EthernetInterfaces'
        ).resolves(ethernetInterfacesCatalog);
        waterline.catalogs.findLatestCatalogOfSource.withArgs(
            'someNodeId',
            '/redfish/v1/Systems/someNodeId/EthernetInterfaces/NIC.Embedded.1-1-1'
        ).resolves(undefined);
        return expect(job._run()).to.be.rejectedWith('Could not find MacAddress in NIC catalog!');
    });
});
