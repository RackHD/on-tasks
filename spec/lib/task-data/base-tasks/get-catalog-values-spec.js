'use strict';

describe(require('path').basename(__filename), function() {
    var base = require('./base-task-data-spec');
    
    base.before(function (context){
       context.taskdefinition = helper.require('/lib/task-data/base-tasks/get-catalog-values.js'); 
    });
    
    describe('task-data', function () {
        base.examples();
    });
});
