//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
urlParse=require('url-parse');

module.exports = wsmanDownloadJobFactory;
di.annotate(wsmanDownloadJobFactory, new di.Provide('Job.Dell.Wsman.Download'));
di.annotate(wsmanDownloadJobFactory, new di.Inject(
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

function wsmanDownloadJobFactory(
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
	var logger = Logger.initialize(wsmanDownloadJobFactory);
	/**
	 *
	 * @param {Object} options
	 * @param {Object} context
	 * @param {String} taskId
	 * @constructor
	 */
	function WsmanDownloadJob(options, context, taskId) {
		WsmanDownloadJob.super_.call(this, logger, options, context, taskId);
		this.action = options.action;
		this.dellConfigs = undefined;   
        this.apiServerConfig=undefined;
        
        this.fileName=options.fileName;
        this.fileURL=options.fileURL;
        this.targetLocation=options.targetLocation;

	}

	util.inherits(WsmanDownloadJob, BaseJob);


	/*
	 *  Initialize basic configuration for the job
	 *
	 */

	WsmanDownloadJob.prototype.initJob = function () {
		var self = this;

		self.dellConfigs = configuration.get('dell');

		if (!self.dellConfigs || !self.dellConfigs.services.firmwareUpdate) {
			throw new errors.NotFoundError('Dell FirmwareUpdate web service is not defined in wsmanConfig.json.');
		}
		
		self.apiServerConfig =self.dellConfigs.services.firmwareUpdate;   	            
		
	};

	
	/**
	 * @memberOf WsmanToolJob
	 */

	WsmanDownloadJob.prototype._run = function() {
		var self = this;

		self.initJob();
		
	return self.downloadCatalog()
		.then(function (result){
			logger.info("================Downloaded FTP Catalog ====================");
			self._done();
			return ;
		})

      .catch(function(error){
			self._done(error);
		});

	} ;



	/*
	 *  function to find the installed microservice version 
	 * 
	 */



	/*
	 *  Download the catalog file for firmware updates 
	 */

	WsmanDownloadJob.prototype.downloadCatalog= function(){
		logger.info('downloading firmware catalog file');
		var self=this;
		
		var tmpPath='?fileName='+self.fileName+'&fileUrl='+self.fileURL+'&targetLocation='+self.targetLocation; 
			
		var apiHost=self.apiServerConfig.host;
		var path=self.apiServerConfig.endpoints.downloader;
		path=path+tmpPath;
		var method='GET';
		return self.clientRequest(apiHost,path,method,null);

	};


	


	/*
	 * Client Request API
	 * 
	 * 
	 */

	WsmanDownloadJob.prototype.clientRequest = function(host, path, method, data) {
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

		logger.info(JSON.stringify(setups));
		
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

	return WsmanDownloadJob;
}
