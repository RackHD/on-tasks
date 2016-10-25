// Copyright 2016, DELL, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanConfigJobFactory;
di.annotate(DellWsmanConfigJobFactory, new di.Provide('Job.Dell.Wsman.Config'));
di.annotate(DellWsmanConfigJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Util',
    'Services.Configuration',
    '_',
    'JobUtils.HttpTool',
    'Errors',
    'fs',
    'Constants'
));

function DellWsmanConfigJobFactory(BaseJob, Logger, Promise, util, configuration, _, HttpTool, errors, fs, Constants) {
    var logger = Logger.initialize(DellWsmanConfigJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function DellWsmanConfigJob(options, context, taskId) {
        DellWsmanConfigJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);
        
        this.settings = {};
        this.target = {};
        this.dellConfigs = undefined;
        this.configServer = options.configServer;        
    }
    
    util.inherits(DellWsmanConfigJob, BaseJob);
        
    /**
     * @memberOf DellWsmanConfigJob
     */
    DellWsmanConfigJob.prototype.initJob = function () {
    	var self = this;
        self.dellConfigs = configuration.get('dell');
        if (!self.dellConfigs || !self.dellConfigs.configServerPath) {
        	throw new errors.NotFoundError('Config server path for Dell web service is not defined in wsmanConfig.json.');
        }
    }


    /**
     * @memberOf DellWsmanConfigJob
     */
    DellWsmanConfigJob.prototype._run = function () {
    	var self = this;
        return Promise.resolve(self.initJob())
    	.then(function(){
   			return self.getConfigData();
    	})
    	.then(function(){
    		self._done();
    	})
        .catch(function(err) {
            self._done(err);
        });
    };
  
    
    DellWsmanConfigJob.prototype.getConfigData = function() {
    	var self = this;      	

        return self.clientRequest(self.configServer, self.dellConfigs.configServerPath, 'GET', '')
        .then(function(response) {
        	return self.handleResponse(response);
        });
    }
      

    DellWsmanConfigJob.prototype.handleResponse = function(result) {
        var self = this;

        return Promise.resolve(result)
        .then(function() {
        	if(!result || _.isEmpty(result)){
       			throw new Error('Response for wsman microservice configuration is invalid.');
        	}
        	configuration.set('dell:credentials', result.credentials);
        	configuration.set('dell:gateway', result.gateway);

        	result.service.forEach(function(entry){
        		var name = 'dell:services:' + entry.name;
        		entry.endpoint.forEach(function(ep){
        			var epName = name + ':' + ep.name;
            		configuration.set(epName, ep.url);
        		});
        	});
        	var buffer = {
        			"dell": configuration.get('dell')
        	}
        	fs.writeFile(Constants.Configuration.Files.Dell, JSON.stringify(buffer, null, 4) + '\n', function(err){
        		if(err) {
        			throw new Error('Could not write wsman microservice configs to file');
        		} else {
        			logger.info('Wsman microservice config updated');
        		}
        	});
        });
    }

    
    DellWsmanConfigJob.prototype.clientRequest = function(host, path, method, data) {
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
        setups.recvTimeoutMs = 5000;
        setups.data = data || '';
        
        var http = new HttpTool();

        return http.setupRequest(setups)
        .then(function(){
            return http.runRequest();
        })
        .then(function(response){
            if (response.httpStatusCode > 206) {
                var errorMsg = _.get(response, 'body.error.message', 'Invalid response from config server.');
                throw new Error(errorMsg);
            }

            if (response.body.length > 0) {
                response.body = JSON.parse(response.body);
            }
            return response.body;
        });
    }

    
    return DellWsmanConfigJob;
}
