//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
urlParse=require('url-parse');

module.exports = wsmanFirmwareCollectJobFactory;
di.annotate(wsmanFirmwareCollectJobFactory, new di.Provide('Job.Dell.Wsman.Firmware.Collect'));
di.annotate(wsmanFirmwareCollectJobFactory, new di.Inject(
		'Job.Base',
		'JobUtils.WsmanTool',
		'Logger',
		'Util',
		'Assert',
		'Promise',
		'_',
		'Services.Encryption',
		'Services.Lookup',
		'Constants',
		'Services.Waterline',
		'Services.Configuration',
		'JobUtils.WsmanTool',
		'uuid'

));

function wsmanFirmwareCollectJobFactory(
		BaseJob,
		wsmanTool,
		Logger,
		util,
		assert,
		Promise,
		_,
		encryption,
		lookup,
		Constants,
		waterline, 
		configuration,
		WsmanTool,
		uuid
)
{
	var logger = Logger.initialize(wsmanFirmwareCollectJobFactory);
	/**
	 *
	 * @param {Object} options
	 * @param {Object} context
	 * @param {String} taskId
	 * @constructor
	 */
	function WsmanFirmwareCollectJob(options, context, taskId) {
		WsmanFirmwareCollectJob.super_.call(this, logger, options, context, taskId);
		this.nodeId = this.context.target;
		this.action = options.action;
		this.dellConfigs = undefined;   
		this.apiServerConfig=undefined;
		this.targetConfig={
				serverAddress:"",
				userName : "",
				password : ""             
		};

		this.catalogPath=options.catalogPath;
		this.type=options.type;
		this.updateableComponents=options.updateableComponents;
		this.wsman=WsmanTool;


	}

	util.inherits(WsmanFirmwareCollectJob, BaseJob);


	/*
	 *  Initialize basic configuration for the job
	 *
	 */

	WsmanFirmwareCollectJob.prototype.initJob = function () {
		var self = this;

		self.dellConfigs = configuration.get('dell');

		if (!self.dellConfigs || !self.dellConfigs.services.firmwareUpdate) {
			throw new errors.NotFoundError('Dell FirmwareUpdate web service is not defined in wsmanConfig.json.');
		}

		self.apiServerConfig =self.dellConfigs.services.firmwareUpdate;

		return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true)
		.then(function(obm) {
			if (!obm) { 
				throw new errors.NotFoundError('Failed to find Wsman obm settings'); 
			}

			self.targetConfig.serverAddress=obm.config.host;
			self.targetConfig.userName=obm.config.user;
			self.targetConfig.password=encryption.decrypt(obm.config.password);


		});     


	};


	/**
	 * @memberOf WsmanToolJob
	 */

	WsmanFirmwareCollectJob.prototype._run = function() {
		var self = this;

		self.initJob();

		return self.applicableUpdates()
		.then(function (result){
			 
			logger.info(JSON.stringify(result));
			 
			self._done();
			return ;
		})

		.catch(function(error){
			self._done(error);
		});

	} ;




	/*
	 *    Collecting firmware applicable updates  
	 */

	WsmanFirmwareCollectJob.prototype.applicableUpdates= function(){
		logger.info('Getting list of applicable updates for firmware update ');
		
		var self=this;
		var apiHost=self.apiServerConfig.host;
		var path=self.apiServerConfig.endpoints.comparer;
		var method='POST';

		var data= {
				"serverAddress":self.targetConfig.serverAddress,
				"userName":self.targetConfig.userName,
				"password":self.targetConfig.password,
				"catalogPath":self.catalogPath,				
				"type":self.type,
				"updateableComponentInventory":""
		};

		return self.wsman.clientRequest(apiHost,path,method,data);

	}; 

 	return WsmanFirmwareCollectJob;
}
