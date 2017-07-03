// Copyright 2017, EMC, Inc.

'use strict';

describe('Emc Ucs Catalog Job', function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        ucsJob,
        waterline = {},
        sandbox = sinon.sandbox.create(),
        rackmountInfo = {
            body: [{
                "admin_power": "policy",
                "admin_state": "in-service",
                "assigned_to_dn": "",
                "association": "none",
                "availability": "available",
                "available_memory": "49152",
                "check_point": "discovered",
                "child_action": null,
                "conn_path": "A,B",
                "conn_status": "A,B",
                "descr": "",
                "discovery": "complete",
                "discovery_status": "",
                "dn": "sys/rack-unit-6",
                "fan_speed_config_status": "",
                "fan_speed_policy_fault": "no",
                "flt_aggr": "2",
                "fsm_descr": "",
                "fsm_flags": "",
                "fsm_prev": "DiscoverSuccess",
                "fsm_progr": "100",
                "fsm_rmt_inv_err_code": "none",
                "fsm_rmt_inv_err_descr": "",
                "fsm_rmt_inv_rslt": "",
                "fsm_stage_descr": "",
                "fsm_stamp": "2017-01-19T15:39:46.419",
                "fsm_status": "nop",
                "fsm_try": "0",
                "id": "6",
                "int_id": "63408",
                "lc": "discovered",
                "lc_ts": "1970-01-01T00:00:00.000",
                "local_id": "",
                "low_voltage_memory": "not-applicable",
                "managing_inst": "A",
                "memory_speed": "not-applicable",
                "mfg_time": "not-applicable",
                "model": "UCSC-C240-M4SX",
                "name": "",
                "num_of40_g_adaptors_with_old_fw": "0",
                "num_of40_g_adaptors_with_unknown_fw": "0",
                "num_of_adaptors": "3",
                "num_of_cores": "12",
                "num_of_cores_enabled": "12",
                "num_of_cpus": "2",
                "num_of_eth_host_ifs": "0",
                "num_of_fc_host_ifs": "0",
                "num_of_threads": "16",
                "oper_power": "off",
                "oper_pwr_trans_src": "unknown",
                "oper_qualifier": "",
                "oper_state": "unassociated",
                "operability": "operable",
                "original_uuid": "1b4e28ba-2fa1-11d2-e006-b9a761bde3fb",
                "part_number": "",
                "policy_level": "0",
                "policy_owner": "local",
                "presence": "equipped",
                "revision": "0",
                "rn": "rack-unit-6",
                "sacl": null,
                "serial": "RK37",
                "server_id": "6",
                "status": null,
                "total_memory": "49152",
                "usr_lbl": "",
                "uuid": "1b4e28ba-2fa1-11d2-e006-b9a761bde3fb",
                "vendor": "Cisco Systems Inc",
                "version_holder": "no",
                "vid": "0"
            }]
        };
        var setup = sandbox.stub().resolves();
        var clientRequest = sandbox.stub();
        var node = {
            "autoDiscover": false,
            "createdAt": "2017-01-26T19:25:50.337Z",
            "identifiers": [
                "00:00:FF:36:57:01",
                "00:00:FF:36:57:02"
            ],
            "name": "sys/rack-unit-5",
            "obm": [
                {
                    "config": {
                        "uri": "http://10.240.19.226:6080/sys",
                        "host": "10.240.19.226",
                        "root": "/sys",
                        "port": "6080",
                        "protocol": "http",
                        "username": "ucspe",
                        "password": "ucspe",
                        "ucs": "10.240.19.236",
                        "verifySSL": false
                    },
                    "service": "ucs-obm-service"
                }
            ],
            "relations": [],
            "tags": [],
            "type": "compute",
            "updatedAt": "2017-01-27T13:51:02.323Z",
            "id": "588a4d3ea510c0233a10214c",
            "obmSettings": [
                {
                    "service": "ucs-obm-service",
                    "config": {
                        "uri": "http://10.240.19.226:6080/sys",
                        "host": "10.240.19.226",
                        "root": "/sys",
                        "port": "6080",
                        "protocol": "http",
                        "username": "ucspe",
                        "ucs": "10.240.19.236",
                        "verifySSL": false
                    }
                }
            ]
        };


    before(function() { 
        function UcsTool() {
            this.setup = setup;
            this.clientRequest = clientRequest;
            this.settings = {
                root: '/'
            };
        }
        
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/ucs-catalog.js'),
            helper.require('/lib/utils/job-utils/ucs-tool.js'),
            helper.di.simpleWrapper(waterline,'Services.Waterline'),
            helper.di.simpleWrapper(UcsTool,'JobUtils.UcsTool')
        ]);
        waterline.catalogs = {
            create: sandbox.stub().resolves()
        };
        waterline.nodes = {
            getNodeById: sandbox.stub().resolves(node)
        };
    });
    
    afterEach(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        var Job = helper.injector.get('Job.Ucs.Catalog');
        ucsJob = new Job({
            uri:'fake',
            username:'user',
            password:'pass'
        }, {target:'abc'}, graphId);
        ucsJob.node= "xyz";
        clientRequest.resetBehavior();
        clientRequest.reset();
        waterline.catalogs.create.reset();
    });
       
    describe('run catalog ucs rackmount', function() {
        it('should successfully catalog rackmount servers', function() {
            clientRequest.onCall(0).resolves(rackmountInfo);
            return ucsJob._run()
            .then(function() {
                expect(waterline.catalogs.create).to.be.calledOnce;
            });
        });
    });

    it('should fail to catalog rackmount', function() {
        clientRequest.rejects('some error');
        ucsJob._run();
        return ucsJob._deferred.should.be.rejectedWith('some error');
    });
});
