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
		'JobUtils.HttpTool'

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
		HttpTool
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
		this.userConfig = {user: options.serverUsername, password: options.serverPassword,filePath: options.serverFilePath};
		if (typeof options.forceReboot !== "undefined") {
			this.userConfig.forceReboot = options.forceReboot;
		}


		this.apiServer='http://100.68.124.107:8080';
		this.oobServerAddress='100.68.124.120';        

	}

	util.inherits(WsmanToolJob, BaseJob);

	/**
	 * @memberOf WsmanToolJob
	 */
	WsmanToolJob.prototype._run = function() {
		var self = this;


		logger.info("Job is running to for wsman firmware update on target server machine");

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
		    logger.info("================updateable components ====================");
			logger.info(JSON.stringify(result))
			return self.downloadCatalog();
		})

		
		.then(function (result){
			logger.info("================Download FTP catalog ====================");
			//logger.info(JSON.stringifyresult);
			return self.applicableUpdates();
		})

		
		.then(function (result){
			logger.info("================ applicable Updates ====================");
			logger.info(JSON.stringify(result));
			//return self.customUpdatesRepository();
			return null;
		})

		.then(function(result){
			logger.info(JSON.stringify(result));
		})                

		.catch(function(error){
			self._done(error);
		});


		self._done();

	} ;


	/*
	 *  function to find the installed microservice version 
	 * 
	 */

	WsmanToolJob.prototype.apiVersion= function(){
		logger.info('apiVersioin - trying to find the provided firmware API version');
		var self=this;
		var apiHost=self.apiServer;
		var path='/v1/duse/version';
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
		var apiHost=self.apiServer;
		var path='/v1/duse/uci/?address='+self.oobServerAddress;
		var method='GET';
		return self.clientRequest(apiHost,path,method,null);

	};

	/*
	 *  Download the catalog file for firmware updates 
	 */

	WsmanToolJob.prototype.downloadCatalog= function(){
		logger.info('downloading firmware catalog file');
		var self=this;
		var apiHost=self.apiServer;
		var path='/v1/duse/downloader?fileName=Catalog.xml.gz&fileUrl=ftp.dell.com/catalog&targetLocation=/fwRepo/';
		var method='GET';
		return self.clientRequest(apiHost,path,method,null);

	};

	/*
	 *  Get list of applicable updates  for server firmware update
	 */
	WsmanToolJob.prototype.applicableUpdates= function(){
		logger.info('Getting list of applicable updates for firmware update');
		var self=this;
		var apiHost=self.apiServer;
		var path='/v1/duse/comparer/';
		var method='POST';
		var data={           
				  "address":self.oobServerAddress,
				  "catalogPath":"/fwRepo/Catalog.xml",
				  "type":"wsman",
				  "updateableComponentInventory":""
		};
		
		return self.clientRequest(apiHost,path,method,data);

	};




	WsmanToolJob.prototype.customUpdatesRepository= function(result){
		logger.info('creating custome DUPS for firmware update');
		var self=this;
		var apiHost=self.apiServer;
		var path='/v1/duse/comparer/custom';
		var method='POST';
		
		if (result || result.updates){
			throw new Error('No updateable applicable updates matched');
		}	
		
			
		var data= {
				  "catalogFilePath":"/tmp/fw/Catalog.xml",
				  "targetFilePath" :"/tmp/fw/repo",				
				  "updates":[]
	        	};
		
		return self.clientRequest(apiHost,path,method,data);

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
		logger.info('>>>>>>>>>>>>>>>>>>>> sends request Data >>>>>>>>>>>>>>>>>>>>>>>>>');
		logger.info(JSON.stringify(setups));
		logger.info('>>>>>>>>>>>>>>>>>>>> ends request Data  >>>>>>>>>>>>>>>>>>>>>>>>>');              
		
		var http = new HttpTool();


		return http.setupRequest(setups)
		.then(function(){
			return http.runRequest();
		})
		.then(function(response){
			if (response.httpStatusCode > 206) {
				var errorMsg = _.get(response, 'body.error.message', 'IP is NOT an iDRAC.');
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
