// Copyright 2017 Dell Inc. or its subsidiaries. All Rights Reserved.
/* jshint node:true */

'use strict';

var uuid = require('node-uuid');
describe(require('path').basename(__filename), function () {
    var Waterline = {
        obms: {
            findByNode: function() {}
        }
    };
    var waterline;
    var ipmitool;
    var parser;
    var ClearSelJob;
    var context = {
        target: uuid.v4()
    };
    var options = {
        selForceClear: true,
        maxSelUsage: 80
    };
    var taskId = uuid.v4();
    var obm = {
        config:{
            host: '10.1.1.1',
            user: 'admin',
            password: 'admin'
        }
    };
    var mockData = require('../utils/job-utils/stdout-helper').ipmiSelInformationOutput;

    before(function () {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/ipmitool.js'),
            helper.require('/lib/utils/job-utils/ipmi-parser.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/clear-sel-by-usage.js'),
            helper.di.simpleWrapper(Waterline,'Services.Waterline')
        ]);
        ClearSelJob = helper.injector.get('Job.Clear.Sel.By.Usage');
        waterline = helper.injector.get('Services.Waterline');
        ipmitool = helper.injector.get('JobUtils.Ipmitool');
        parser = helper.injector.get('JobUtils.IpmiCommandParser');
        this.sandbox = sinon.sandbox.create();
    });

    beforeEach(function() {
        this.sandbox.stub(waterline.obms, 'findByNode').resolves(obm);
        this.sandbox.spy(parser, 'parseSelInformationData');
        this.sandbox.stub(ipmitool, 'clearSel');
    });

    afterEach(function() {
        this.sandbox.restore();
    });

    it("should run job without clearing sel", function() {
        var _job = new ClearSelJob({}, context, taskId);
        this.sandbox.stub(ipmitool, 'selInformation').resolves(mockData);
        this.sandbox.spy(_job, '_done');
        return _job._run()
        .then(function(){
            expect(waterline.obms.findByNode).to.be.calledOnce;
            expect(waterline.obms.findByNode).to.be.calledWith(
                context.target, 'ipmi-obm-service', true
            );
            expect(ipmitool.selInformation).to.be.calledOnce;
            expect(ipmitool.selInformation).to.be.calledWith(
                obm.config.host,obm.config.user,obm.config.password
            );
            expect(parser.parseSelInformationData).to.be.calledOnce;
            expect(parser.parseSelInformationData).to.be.calledWith(mockData);
            expect(ipmitool.clearSel).not.to.be.called;
            expect(_job._done).to.be.calledOnce;
        });
    });

    it("should run job by clearing sel", function() {
        var _options = _.cloneDeep(options);
        _options.maxSelUsage = 50;
        var _job = new ClearSelJob(_options, context, taskId);
        this.sandbox.stub(ipmitool, 'selInformation').resolves(mockData);
        return _job._run()
        .then(function(){
            expect(waterline.obms.findByNode).to.be.calledOnce;
            expect(waterline.obms.findByNode).to.be.calledWith(
                context.target, 'ipmi-obm-service', true
            );
            expect(ipmitool.selInformation).to.be.calledOnce;
            expect(ipmitool.selInformation).to.be.calledWith(
                obm.config.host,obm.config.user,obm.config.password
            );
            expect(parser.parseSelInformationData).to.be.calledOnce;
            expect(parser.parseSelInformationData).to.be.calledWith(mockData);
            expect(ipmitool.clearSel).to.be.calledOnce;
            expect(ipmitool.clearSel).to.be.calledWith(
                obm.config.host,obm.config.user,obm.config.password
            );
        });
    });

    it("should throw can not get node sel usage status error", function() {
        var _mockData = "sel \n Percent Used 25% : Anything";
        this.sandbox.stub(ipmitool, 'selInformation').resolves(_mockData);
        var _job = new ClearSelJob(options, context, taskId);
        this.sandbox.stub(_job, '_done');
        return _job._run()
        .then(function(){
            expect(_job._done).to.callOnce;
            expect(_job._done.args[0][0].message).to.equal("Can not get node SEL usage status");
        });
    });

    it("should throw sel is almost full error", function() {
        this.sandbox.stub(ipmitool, 'selInformation').resolves(mockData);
        var _job = new ClearSelJob({maxSelUsage: 50}, context, taskId);
        this.sandbox.stub(_job, '_done');
        return _job._run()
        .then(function(){
            var err = new Error("Sel usage is 57\%, exceeds max sel usage 50\%");
            expect(_job._done).to.callOnce;
            expect(_job._done.args[0][0]).to.deep.equal(err);
        });
    });

});
