// Copyright 2016, EMC

'use strict';

var fs = require('fs');

function TaskAnnotation(task) {
    this.task = task;
}

/**
 * Run the process to generate doc data with current existing task schemas
 * @param {Array} tasks - list of task from task folder
 *                        e.g. /lib/task-data/tasks/*.js
 * @param {Object} validator - instance of task-option-validator
 * @return {Promise} promise with value docData array
 */
TaskAnnotation.run = function (tasks, validator) {
    return validator.register()
    .return(tasks)
    .filter(function (task) {
        // filter all tasks, only those task has schema will be annotated.
        return task.schemaRef ? true: false;
    })
    .map(function (task) {
        var tn = new TaskAnnotation(task);
        var schemaResolved = validator.getSchemaResolved(task.schemaRef);
        var schemaMerged = tn.mergeSchema(schemaResolved);
        return tn.generateDocData(schemaMerged, {
            url: '/' + task.injectableName,
            name: 'option',
            title: 'option',
            group: task.injectableName,
            groupTitle: task.friendlyName
        });
    })
    .then(function (docData) {
        return _.flatten(docData);
    });
};

/**
 * Merge the schema (recusively) where `allOf` keyword found.
 * @example
 * { allOf: [
 *     { p1: { type: "string" } },
 *     { p2: { type: "number" } }
 *  ]
 * }
 * after merged:
 * { p1: { type: "string" },
 *   p2: { type: "number" }
 * }
 *
 * @param  {Object} obj - JSON schema object
 * @return {Object} schema - with `allOf` merged
 */
TaskAnnotation.prototype.mergeSchema = function (obj) {
    var self = this;
    if (obj.allOf && obj.allOf instanceof Array) {
        var all = {};
        _.forEach(obj.allOf, function (item) {
            if(item.allOf) {
                item = self.mergeSchema(item);
            }
            _.merge(all, item);
        });
        delete obj.allOf;
        _.merge(obj, all);
    }

    _.forOwn(obj, function(val) {
        if (val instanceof Object) {
            self.mergeSchema(val);
        }
    });

    return obj;
};

/**
 * Parse the JSON schema and generate doc data recusively.
 * The doc data will be rendered in apiDoc template
 *
 * @param {Object} obj - JSON schema object
 * @param {Object} dataTemplate - the doc data template
 * @return {Array} doc data array
 */
TaskAnnotation.prototype.generateDocData = function (obj, dataTemplate) {
    var self = this;
    var data = {
        type: obj.type,
        description: obj.description,
        url: dataTemplate.url,
        name: dataTemplate.name,
        title: dataTemplate.title, 
        version: '0.0.0',
        group: dataTemplate.group,
        groupTitle: dataTemplate.groupTitle,
        parameter: {
            fields: {
                properties: []
            }
        }  
    };

    function getProp(obj) {
        return obj.properties || _.get(obj, 'items.properties') ||
            obj.oneOf || obj.anyOf;
    }
    
    var subItems =[];

    _.forEach(getProp(obj), function (option, name) {
        var subProp = getProp(option);
        var subTemp = {};
        if (subProp) {
            subTemp = {
                url: data.url + '/' + name,
                name: data.name + '_' + name,
                title: data.title + '.' + name,
                group: data.group,
                groupTitle: data.groupTitle
            };
            subItems = subItems.concat(self.generateDocData(option, subTemp));
        }

        var fieldTemp = {
            group: 'g1', // TODO: find out group usage
            type: option.type,
            optional: _.indexOf(obj.required, name) < 0,
            field: name + '',
            description: '<p>' + option.description + '</p>'
        };

        _.forOwn(option, function (val, key) {
            if (key !== 'type' && key !== 'description') {
                fieldTemp.description += '<p>' + key + ':<code>' + val +'</code></p>';
            }
        });

        if (subProp) {
            fieldTemp.description += '<p>See details for <a href="#api-' +
                subTemp.group + '-' + subTemp.name + '">' + name +'</a></p>';
        }

        data.parameter.fields.properties.push(fieldTemp);
    });

    return [data].concat(subItems);
};


if (require.main === module) {
    require('on-core/spec/helper');

    helper.setupInjector([
        helper.require('/lib/utils/task-option-validator')
    ]);

    var validator = helper.injector.get('TaskOption.Validator');
    var tasks = helper.requireGlob('/lib/task-data/tasks/*.js');

    TaskAnnotation.run(tasks, validator)
    .then(function (docData) {
        fs.writeFileSync('task_doc_data.json', JSON.stringify(docData));
        console.log('========= task_doc_data.json generated =======');
    });
}
