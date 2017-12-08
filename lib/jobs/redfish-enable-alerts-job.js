// Copyright 2017, EMC, Inc

'use strict';

var di = require('di');

module.exports = RestJobFactory;
di.annotate(RestJobFactory, new di.Provide('Job.Redfish.Alert.Enable'));

di.annotate(RestJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    '_',
    'Assert',
    'Promise',
    'Util',
    'HttpTool',
    'Services.Waterline',
    'Services.Configuration'));


function RestJobFactory(BaseJob,
                        Logger,
                        _,
                        assert,
                        Promise,
                        util,
                        HttpTool,
                        waterline,
                        configuration){
    var logger = Logger.initialize(RestJobFactory);

    /**
     * The interface that runs Rest Job from tasks
     * @constructor
     */
    function RestJob(options, context, taskId){
        var self = this;
        self.options = options;
        self.context = context;

        RestJob.super_.call(self, logger, options, context, taskId);
        self.restClient = new HttpTool();
    }

    util.inherits(RestJob, BaseJob);

    RestJob.prototype._run = function run(){
        var self = this;
        return new Promise.resolve()
            .then(function(){
                return updateOptions(self);
            })
            .then(function(setup){
                logger.debug("setting up the redfish alert subcription");
                return self.restClient.setupRequest(setup);
            })
            .then(function(){
                logger.debug("Running The rest call for redfish subscription");
                return self.restClient.runRequest();
            })
            .then(function(data){
              self.context.restData = {};
              self.context.restData.httpStatusCode = data.httpStatusCode;

                self._done();
            })
            .catch(function(err){
                logger.error("Found error during HTTP request.", {error: err});
                self._done(err);
            });
    };



    function updateOptions(obj){
        logger.debug("Setting up the values in order to post RackHD subscribtion");
        //user entered values always take precedence
        var httpSetup = obj.options;

        httpSetup.method = obj.options.data.method || "POST";
        httpSetup.data.Protocol = obj.options.data.Protocol || "Redfish";
        httpSetup.data.Context = obj.options.data.Context || "RackhHD Subscription";
        httpSetup.data.EventTypes = obj.options.data.EventTypes ||
            ["ResourceAdded", "StatusChange", "Alert"];

        if (obj.options.data.Destination){
            httpSetup.data.Destination = obj.options.data.Destination;
        }else{
            var ip = configuration.get("rackhdPublicIp");
            var httpsPort = configuration.get("httpEndpoints")[1].port;
            httpSetup.data.Destination = "https://" + ip + ":"+
                httpsPort + "/api/2.0/notification/alerts";
        }

        //Getting the http credentials
        if (obj.options.credential &&
            obj.options.credential.password &&
            obj.options.credential.username){
            httpSetup.credential.username  = obj.options.credential.username;
            httpSetup.credential.password  = obj.options.credential.password;
            httpSetup.url = obj.options.url;

            return httpSetup;
        }else{
            return waterline.obms.findByNode(obj.context.target, 'redfish-obm-service', true)
                .then(function(obm){
                    if (!obm){
                        throw new Error("Couldn't find redfish obm  setting for node " +
                            obj.context.target);
                    }
                    else{
                        httpSetup.credential = {};
                        httpSetup.credential.username  = obm.config.user;
                        httpSetup.credential.password  = obm.config.password;
                        httpSetup.url =  obj.options.url || "https://" + obm.config.host +
                            "/redfish/v1/EventService/Subscriptions";
                        return httpSetup;
                    }
                });
        }
    }
    return RestJob;
}
