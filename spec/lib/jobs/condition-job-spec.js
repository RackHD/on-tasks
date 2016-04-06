// Copyright 2016, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var uuid = require('node-uuid'),
        graphId = uuid.v4(),
        ConditionJob;
    
    before(function() { 
        helper.setupInjector([
            helper.require('/lib/jobs/base-job.js'),
            helper.require('/lib/jobs/condition.js'),
        ]);
        ConditionJob = helper.injector.get('Job.Evaluate.Condition');
    });

    it("should run and finish with success", function() {
        var job = new ConditionJob({when: 'true'}, {}, graphId);
        job._run();
        return job._deferred;
    });

    it("should run and finish with failure", function() {
        var job = new ConditionJob({when: 'false'}, {}, graphId);
        job._run();
        return job._deferred.should.be.rejectedWith('condition evaluated to false');
    });
});
