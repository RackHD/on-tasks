#! /usr/bin/env node

// Copyright 2016, EMC, Inc

'use strict';

var di = require('di');

module.exports = RestJobFactory;
di.annotate(RestJobFactory, new di.Provide('Job.Rest'));
di.annotate(RestJobFactory, new di.Inject(
    'Job.Base', 
    'Logger', 
    '_', 
    'Assert', 
    'Promise',  
    'Util', 
    'JobUtils.RestTool'));

function RestJobFactory(BaseJob, Logger, _, assert, Promise, util, restTool){
<<<<<<< HEAD
    
    var logger = Logger.initialize(RestJobFactory);
=======
>>>>>>> REST interface done

    /**
    * Helper class that used for handling parameters for REST tool
    * @constructor
    */
    function RestRequest(){
    // Data for REST request - public
        this.reqData = {
            cred : {username:'', password:''},
            url : '',
            dataType : 'application/json',
            data : '',
            header : {}
        };
    // Deal with method - private and privileged
        var validMethod = {'GET':true, 
                'POST':true, 'PUT':true, 'DEL':true};
        var method = '';

        this.getMethod = function(){
            var ret = method;
            return ret;
        };

        this.setMethod = function(intendMethod){
            if (intendMethod in validMethod) {
                method = intendMethod;
            }
            else {
                throw new Error('Invalid method: '+intendMethod);
            }
        };
    }

    /**
    * Set the property in the Request by given an object
    * @param {object} objReq - The object detail for the request which 
    * key is same as member variables in RestRequest.
    * example:
    * {
    *   cred:{
    *       username:'',
    *       password:''
    *       },
    *   url:'',
    *   dataType:'',
    *   data:'',
    *   header:{},
    *   method:''
    *   }
    */

    RestRequest.prototype.setRequest = function(objReq){
            for (var itrProp in objReq){
                if (objReq.hasOwnProperty(itrProp)) {
                    if (itrProp === 'method'){
                        this.setMethod(objReq.method);
                    }
                    else {
                        if (itrProp in this.reqData){
                            this.reqData[itrProp] = objReq[itrProp];
<<<<<<< HEAD
                            // console.log("Set property "+itrProp+": "+this.reqData[itrProp]);
=======
                            console.log("Set property "+itrProp+": "+this.reqData[itrProp]);
>>>>>>> REST interface done
                        }
                        else {
                            throw new Error("The property you want to set" +
                                            "does not exists!");    
                        }
                    }
                }
<<<<<<< HEAD
            }};
=======
            }
        };

>>>>>>> REST interface done

    /**
    * The job class used for REST Calls
    * @constructor
    */
<<<<<<< HEAD
    function Rest(){
=======
    function RestJob(){
>>>>>>> REST interface done
        this.request = new RestRequest();
        this.rest = restTool;
    }
    
<<<<<<< HEAD
    Rest.prototype.configRequest = function(objReq, callback){
=======
    util.inherits(RestJob, BaseJob);

    RestJob.prototype.configRequest = function(objReq, callback){
>>>>>>> REST interface done
        this.request.setRequest(objReq);
        this.rest.credential = this.request.reqData.cred;
        callback(); 
    };

    /**
    * Exec the Rest according to its config.
    * @param {callback} callback - function(err, res): what to do when 
    * error happened or getting the result smoothly.
    */
<<<<<<< HEAD
    Rest.prototype.doREST = function(callback){
=======
    RestJob.prototype.doREST = function(callback){
>>>>>>> REST interface done
        var method = this.request.getMethod();
        if (_.isEmpty(method) || _.isEmpty(this.request.reqData.url)){
            throw new Error('Please provide method and url to continue');
        }

        switch(method) {
            case 'GET':
                this.rest.get(this.request.reqData.url, 
                              this.request.reqData.header, callback);
                break;
            case 'POST':
                this.rest.post(this.request.reqData.url,
                               this.request.reqData.dataType,
                               this.request.reqData.data, 
                               this.request.reqData.header, callback);
                break;
            case 'PUT':
                this.rest.put(this.request.reqData.url,
                              this.request.reqData.dataType, 
                              this.request.reqData.data, 
                              this.request.reqData.header, callback);
                break;
            case 'DEL':
                this.rest.del(this.request.reqData.url, 
                              this.request.reqData.header, callback);
                break;
        }
    };
   
<<<<<<< HEAD
    /**
    * The interface that runs Rest Job from tasks
    * @constructor
    */
    function RestJob(options, context, taskId){
        var self = this;
        self.options = options;
        self.context = context;

        RestJob.super_.call(self, logger, options, context, taskId);
        self.restJob = new Rest();
        
        self.setResult = function(err, res){
            if (_.isEmpty(err)){
                self.context.text = res.text;
                self.context.header = res.header;
                self._done();
            }
            else {
                var resErr = {};
                resErr.status = err.status;
                if ("text" in err.response){
                    resErr.message = err.response.text;
                }

                resErr.header = err.response.header;
                self._done(resErr);
            }    
        };
    }

    util.inherits(RestJob, BaseJob);

    /**
    * Main Execution of the interface class
    */

    RestJob.prototype._run = function run(){
        var self = this;

        if (! _.isEmpty(self.options.requestConfig)){
            self.restJob.configRequest(self.options.requestConfig, 
                function(){
                    logger.info("Running REST job.");
            });
        }
        else {
            throw new Error("Please provide" +  
                            "options.requestConfig to continue.");
        }
        
        self.restJob.doREST(this.setResult);
    };  
=======
    RestJob.prototype._run = function run(){
        
    }; 
    
>>>>>>> REST interface done
    return RestJob;
}
