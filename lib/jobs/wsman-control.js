//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
urlParse=require('url-parse');

module.exports = wsmanToolJobFactory;
di.annotate(wsmanToolJobFactory, new di.Provide('Job.Dell.WsmanTool'));
di.annotate(wsmanToolJobFactory, new di.Inject(
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
		'HttpTool',
		'uuid'

));

function wsmanToolJobFactory(
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
		HttpTool,
		uuid
)
{
	var logger = Logger.initialize(wsmanToolJobFactory);
	/**
	 *
	 * @param {Object} options
	 * @param {Object} context
	 * @param {String} taskId
	 * @constructor
	 */
	function WsmanToolJob(options, context, taskId) {
		WsmanToolJob.super_.call(this, logger, options, context, taskId);

		this.nodeId = this.context.target;
		this.action = options.action;

		this.shareConfig =  {
				user: options.serverUsername, 
				password: options.serverPassword,
				filePath: options.serverFilePath
		};

		this.targetConfig ={
				serverAddress :"",
				user :"",
				password :"",
				forceReboot:""
		};

		if (typeof options.forceReboot !== "undefined") {
			this.targetConfig.forceReboot = options.forceReboot;
		}

		this.dellConfigs = undefined;   


	}

	util.inherits(WsmanToolJob, BaseJob);


	/*
	 *  Initialize basic configuration for the job
	 *
	 */

	WsmanToolJob.prototype.initJob = function () {
		var self = this;

		self.dellConfigs = configuration.get('dell');

		if (!self.dellConfigs || !self.dellConfigs.services.firmwareUpdate) {
			throw new errors.NotFoundError('Dell FirmwareUpdate web service is not defined in wsmanConfig.json.');
		}
		self.firmwareConfigs=self.dellConfigs.services.firmwareUpdate;   	            
		self.apiServer=self.firmwareConfigs.host;


		return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true)
		.then(function(obm) {
			if (!obm) { 
				throw new errors.NotFoundError('Failed to find Wsman obm settings'); 
			}

			self.targetConfig.serverAddress=obm.config.host;
			self.targetConfig.user=obm.config.user;
			self.targetConfig.password= encryption.decrypt(obm.config.password);


		});      

	};

	/*
	 *   Print the result for RestAPI Response
	 */

	WsmanToolJob.prototype.printResult = function (result) {

		logger.info(JSON.stringify(result,null,4));

	};


	/**
	 * @memberOf WsmanToolJob
	 */

	WsmanToolJob.prototype._run = function() {
		var self = this;

		self.initJob();
		logger.info("Job is running to update firmware on target server machine " + this.oobServerAddress);

		Promise.resolve(self.apiVersion()
				.then(function(result) {
					logger.info(JSON.stringify(result));
				})
				.catch(function(error){
					self._done(error);
				}));


		/*
		 * Calling firmware update workflow 
		 */

		self.updateableComponentInventory()
		.then(function(result){
			logger.info("================Updateable components ====================");
			self.printResult(result);
			return self.downloadCatalog();
		})


		.then(function (result){
			logger.info("================Download FTP Catalog ====================");
			self.printResult(result);
			return self.applicableUpdates();
		})


		.then(function (result){
			logger.info("================ applicable Updates ====================");
			self.printResult(result);
			return self.customUpdatesRepository(result);

		})

		.then(function(result){
			logger.info("================ Custom Updates Repository - invoking firmware update API ====================");
			self.printResult(result);
			return self.updateFirmware(result);
		})
		.then(function(result){
			logger.info("================ Firmware Update Execution Result ====================");
			self.printResult(result);
			return null; 		
		})
		.catch(function(error){
			self._done(error);
		});


	} ;



	/*
	 *  function to find the installed microservice version 
	 * 
	 */



	WsmanToolJob.prototype.apiVersion= function(){
		logger.info('apiVersioin - trying to find the provided firmware API version');
		var self=this;

		if (!self.firmwareConfigs.endpoints.apiVersion){
			throw new errors.NotFoundError('Dell FirmwareUpdate web service for API version is not defined in wsmanConfig.json.');
		}

		var apiHost=self.apiServer;
		var path=self.firmwareConfigs.endpoints.apiVersion;
		var method='GET';
		return self.clientRequest(apiHost,path,method,null);


	};


	/*
	 *  API to collect updateable component inventory 
	 * 
	 */

	WsmanToolJob.prototype.updateableComponentInventory= function(){
		logger.info('updateableComponentInventory - firmware components');
		var self=this;

		self.validateConfigs(self.firmwareConfigs.endpoints.uci,'UpdateableComponents');

		var apiHost=self.apiServer;
		var path=self.firmwareConfigs.endpoints.uci+'='+self.oobServerAddress;
		var method='GET';
		return self.clientRequest(apiHost,path,method,null);

	};

	/*
	 *  Download the catalog file for firmware updates 
	 */

	WsmanToolJob.prototype.downloadCatalog= function(){
		logger.info('downloading firmware catalog file');
		var self=this;

		self.validateConfigs(self.firmwareConfigs.endpoints.downloader,'Downloader');

		var apiHost=self.apiServer;
		var path=self.firmwareConfigs.endpoints.downloader;
		var method='GET';
		return self.clientRequest(apiHost,path,method,null);

	};

	/*
	 *  Get list of applicable updates  for server firmware update
	 */
	WsmanToolJob.prototype.applicableUpdates= function(){
		logger.info('Getting list of applicable updates for firmware update ');
		var self=this;

		self.validateConfigs(self.firmwareConfigs.endpoints.comparer,'comparer');

		var apiHost=self.apiServer;
		var path=self.firmwareConfigs.endpoints.comparer;

		var method='POST';
		var data={           
				"address":self.oobServerAddress,
				"catalogPath":"/fwRepo/Catalog.xml",
				"type":"wsman",
				"updateableComponentInventory":""
		};

		return self.clientRequest(apiHost,path,method,data);

	};




	/*
	 *    Create custom firmware repository 
	 */
	WsmanToolJob.prototype.customUpdatesRepository= function(result){
		logger.info('creating custome DUPS for firmware update');
		var self=this;

		self.validateConfigs(self.firmwareConfigs.endpoints.customRepo,'CustomRepo');

		var apiHost=self.apiServer;
		var path=self.firmwareConfigs.endpoints.customRepo;
		var method='POST';
		var updates=result[0].updates;

		var data= {

				"catalogFilePath":"/fwRepo/Catalog.xml",
				"targetFilePath" :"/fwRepo/repo",				
				"updates":updates


		};

		return self.clientRequest(apiHost,path,method,data);

	};




	/*
	 * This method call the microservice to apply the firmware on target server
	 */


	WsmanToolJob.prototype.updateFirmware=function(result){
		logger.info("calling to start firmware on target server "+ this.oobServerAddress);	

		var self=this;

		self.validateConfigs(self.firmwareConfigs.endpoints.updater,'updater');
		self.validateConfigs(self.firmwareConfigs.endpoints.callbackUri,'callbackUri');

		var apiHost=self.apiServer;
		var path=self.firmwareConfigs.endpoints.updater;
		var method='POST';
		var callBackUriRef=self.firmwareConfigs.endpoints.callbackUri;
		var type = '';
		var callbackIdentifier = uuid.v4();
		var callBackUriRef = callBackUriRef.replace(/_IDENTIFIER_/, callbackIdentifier);

		self._subscribeHttpResponseUuid(self.firmwareUpdateCallback, callbackIdentifier);

		var request=  {
				"serverAddress": self.oobServerAddress,
				"shareAddress" : "100.68.124.106",
				"shareName": "/nfs/repo",
				"catalogFileName" : "Catalog.xml",
				"shareType" : "0",
				"shareUserName" : "user1",
				"sharePassword" : "user1",
				"applyUpdate" : "1",
				"Reboot" : "YES",
				"callBack" : {
					"callbackUri": callBackUriRef,
					"callbackGraph": "Graph.Dell.Wsman.Firmware",
					"type": "wsman"
				}
		};


		logger.info('Before calling the endpoint :');	
		return self.clientRequest(apiHost,path,method,request);


	};


	/*
	 * function called after the result have been sent back from firmware update micro servcie
	 */

	WsmanToolJob.prototype.firmwareUpdateCallback = function firmwareUpdateCallback(data){
		var self = this;
		logger.info(' Fimware Update callback function invoked for Node: ' + self.nodeId + ' Type: ' + data.type);
		self.printResult(data);


		var isSuccessful=true;
		if (data!==null && data.length>0){
			data.forEach(function (item){

				if ( !(item.status==='undefined' || item.staus===null || item.status==="")){
					if(item.status==='Failed'){
						isSuccessful=false;
					}
				}

			});

		};	  

		if (isSuccessful){
			self._done();
		}
		else {
			throw new Error('Firmware Update Failed for provided server , see logs for details');
		}


	}



	/*
	 *  Validate firmware configuration data provided wsmanConfig.json file
	 */

	WsmanToolJob.prototype.validateConfigs = function(data,name){

		if (!data){
			throw new errors.NotFoundError('Dell FirmwareUpdate web service for '+ name +' is not defined in wsmanConfig.json.');
		}

	};


	/*
	 * Client Request API
	 * 
	 * 
	 */

	WsmanToolJob.prototype.clientRequest = function(host, path, method, data) {
		var self = this;

		var parse = urlParse(host);

		var setups = {};

		setups.url = {};
		setups.url.protocol = parse.protocol.replace(':','').trim();
		setups.url.host = parse.host.split(':')[0];
		setups.url.port = parse.port;
		setups.url.path = path || '/';

		setups.method = method || 'GET';
		setups.credential = {};
		setups.verifySSl = false;
		setups.headers = {'Content-Type': 'application/json'};
		setups.recvTimeoutMs = 60000;
		setups.data = data || '';

		var http = new HttpTool();
		return http.setupRequest(setups)
		.then(function(){
			return http.runRequest();
		})
		.then(function(response){
			if (response.httpStatusCode > 206) {
				var errorMsg = _.get(response, 'body.error.message', 'IP is NOT valid or  httpStatusCode > 206 .');
				throw new Error(errorMsg);
			}

			if (response.body.length > 0) {
				response.body = JSON.parse(response.body);
			}
			return response.body;
		});
	};






	return WsmanToolJob;
}
