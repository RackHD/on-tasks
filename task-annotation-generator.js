// Copyright 2016, EMC

'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var uuid = require('node-uuid');
var Task;

function TaskAnnotation(task) {
    this.task = task;
}

/**
 * Run the process to generate doc data with current existing task schemas
 * @param {Array<Object>} tasks - list of task from task folder
 *                        e.g. /lib/task-data/tasks/*.js
 * @param {Object} validator - instance of JsonSchemaValidator
 * @return {Promise} promise with value docData array
 */
TaskAnnotation.run = function (tasks, validator) {
    return validator.register()
    .return(tasks)
    .map(function (task) {
        var tn = new TaskAnnotation(task);
        var fullSchema = Task.getFullSchema(task);
        var tempSchemaId = uuid.v4();

        //add schema then remove it is to resolve reference
        validator.addSchema(fullSchema, tempSchemaId);
        var schemaResolved = validator.getSchemaResolved(tempSchemaId);
        validator.removeSchema(tempSchemaId);

        var schemaMerged = tn.mergeSchema(schemaResolved);
        tn.addDefault(schemaMerged);
        return tn.generateDocData(schemaMerged, {
            // url: '/' + task.injectableName,
            name: 'option',
            title: 'option',
            group: task.injectableName.replace(/\./g, '_'),
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
 * add default value from task.options to schema
 * @param  {Object} obj - JSON schema object
 */
TaskAnnotation.prototype.addDefault = function (obj) {
    var self = this;
    _.forOwn(self.task.options, function (value, name) {
        var op = _.get(obj, 'properties.' + name);
        if (op && op instanceof Object) {
            op.default = value;
        }
    });
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
        type: getType(obj),
        description: '',
        // url: dataTemplate.url,
        name: dataTemplate.name,
        title: dataTemplate.title,
        // version: '0.0.0',
        group: dataTemplate.group,
        groupTitle: dataTemplate.groupTitle,
        parameter: {
            fields: {
                properties: []
            }
        }
    };

    var subItems =[];

    _.forEach(getProp(obj), function (option, name) {
        var subProp = getProp(option);
        var subTemp = {};
        if (subProp) {
            subTemp = {
                // url: data.url + '/' + name,
                name: data.name + '_' + name,
                title: data.title + '.' + name,
                group: data.group,
                groupTitle: data.groupTitle
            };
            subItems = subItems.concat(self.generateDocData(option, subTemp));
        }

        var fieldTemp = {
            group: 'g1', // TODO: find out group usage
            type: getType(option),
            optional: _.indexOf(obj.required, name) < 0,
            field: name + '',
            description: getDescription(option)
        };

        if (obj.oneOf || obj.anyOf) {
            fieldTemp.field = data.type + '[' + name + ']';
        }

        if (subProp) {
            fieldTemp.description += '<p>See details for <a href="#api-' +
                subTemp.group + '-' + subTemp.name + '">' + name +'</a></p>';
        }

        data.parameter.fields.properties.push(fieldTemp);
    });

    return [data].concat(subItems);

    function getProp(obj) {
        return obj.properties || _.get(obj, 'items.properties') ||
            obj.oneOf || obj.anyOf;
    }

    function getType(option) {
        if (option.enum) {
            return 'enum';
        }

        if (option.oneOf) {
            return 'oneOf';
        }

        if (option.anyOf) {
            return 'anyOf';
        }

        return option.type;
    }

    function getDescription(option) {
        var description = '';
        if (option.description) {
            description += '<p>' + option.description + '</p>';
        }

        if (option.properties) {
            description += '<p>properties: <code>' +
                _.keys(option.properties) + '</code></p>';
        }

        if (option.enum) {
            description += '<p>value in: <ul><li>' +
                option.enum.join('</li><li>') +'</li></ul></p>';
        }

        var skipKeys = {
            type: 1,
            description: 1,
            properties: 1,
            enum: 1,
            items: 1,
            oneOf: 1,
            anyOf: 1
        };

        _.forOwn(option, function (val, key) {
            if (key in skipKeys) {
                return true;
            }

            description += '<p>' + key + ': <code>' + val +'</code></p>';
        });

        return description;
    }
};


if (require.main === module) {
    var di = require('di');
    var core = require('on-core')(di);
    var onTasks = require('./index.js');
    var tasks = core.helper.requireGlob(path.resolve(__dirname, 'lib/task-data/tasks/*.js'));
    var injector = new di.Injector(_.flattenDeep([
            core.injectables,
            onTasks.injectables
        ])
    );
    var Task = injector.get('Task.Task');
    var validator = injector.get('TaskOption.Validator');

    TaskAnnotation.run(tasks, validator)
    .then(function (docData) {
        fs.writeFileSync('task_doc_data.json', JSON.stringify(docData, null, 4));
        console.log('========= task_doc_data.json generated =======');
    })
    .catch(function(err) {
        console.error(err.toString());
        process.exit(1);
    });
}
