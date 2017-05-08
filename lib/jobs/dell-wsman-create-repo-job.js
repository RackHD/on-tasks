//Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
urlParse=require('url-parse');

module.exports = wsmanCreateRepoJobFactory;
di.annotate(wsmanCreateRepoJobFactory, new di.Provide('Job.Dell.Wsman.Create.Repo'));
di.annotate(wsmanCreateRepoJobFactory, new di.Inject(
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

function wsmanCreateRepoJobFactory(
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
	var logger = Logger.initialize(wsmanCreateRepoJobFactory);
	/**
	 *
	 * @param {Object} options
	 * @param {Object} context
	 * @param {String} taskId
	 * @constructor
	 */
	function WsmanCreateRepoJob(options, context, taskId) {
		WsmanCreateRepoJob.super_.call(this, logger, options, context, taskId);
		this.action = options.action;
		this.dellConfigs = undefined;   
		this.apiServerConfig=undefined;

		this.catalogFilePath=options.catalogFilePath;
		this.targetFilePath=options.targetFilePath;
		this.updates=options.updates;
		this.wsman=WsmanTool;


	}

	util.inherits(WsmanCreateRepoJob, BaseJob);


	/*
	 *  Initialize basic configuration for the job
	 *
	 */

	WsmanCreateRepoJob.prototype.initJob = function () {
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

	WsmanCreateRepoJob.prototype._run = function() {
		var self = this;

		self.initJob();

		return self.customUpdatesRepository()
		.then(function (result){
			self._done();
			return ;
		})

		.catch(function(error){
			self._done(error);
		});

	} ;




	/*
	 *    Create custom firmware repository 
	 */
	WsmanToolJob.prototype.customUpdatesRepository= function(){
		logger.info('creating custome DUPS for firmware update');

		var self=this;
		var apiHost=elf.apiServerConfig.host;
		var path=self.apiServerConfig.endpoints.customRepo;
		var method='POST';
		var updates=self.updates;

		var data= {
				"catalogFilePath":self.catalogFilePath,
				"targetFilePath" :self.targetFilePath,				
				"updates":updates
		};

		return self.wsman.clientRequest(apiHost,path,method,data);

	}; 


	return WsmanCreateRepoJob;
}
