// Copyright 2016, EMC, Inc.
/* jshint node:true */
'use strict';

describe("Services.Task", function () {
    var validator;
    var subject;

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/task-service.js'),
                helper.require('/lib/utils/task-option-validator.js')
            ])
        );
        subject = helper.injector.get('Services.Task');
        validator = helper.injector.get('TaskOption.Validator');
        this.sandbox = sinon.sandbox.create();
        this.sandbox.stub(validator, 'register');
        this.sandbox.stub(validator, 'reset');
    });

    afterEach(function() {
        validator.register.reset();
        validator.reset.reset();
    });

    after(function() {
        this.sandbox.restore();
    });

    it('should have a start function', function() {
        expect(subject).to.have.property('start').is.a('function').with.length(0);
    });

    it('should have a stop function', function() {
        expect(subject).to.have.property('stop').is.a('function').with.length(0);
    });

    it('should register validator after starting service', function() {
        subject.start();
        expect(validator.register).to.have.been.calledOnce;
    });

    it('should reset validator after stopping service', function() {
        subject.stop();
        expect(validator.reset).to.have.been.calledOnce;
    });
});
