// Copyright 2016, EMC

'use strict';

var fs = require('fs');

function TaskAnnotation(validator) {
    this.validator = validator;
}

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
            group: 'g1', // TODO: find out gourp usage
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

TaskAnnotation.prototype.run = function () {
    var self = this;
    var baseId = 'rackhd/schemas/v1/tasks/';
    // TODO: move the list to config
    var schemaIds = [
        'install-os-general',
        'install-centos',
        'install-coreos',
        'obm-control'
    ];

    return self.validator.register().return(schemaIds)
    .map(function (id) {
        var schemaResolved = self.validator.getSchemaResolved(baseId + id);
        var schemaMerged = self.mergeSchema(schemaResolved);
        return self.generateDocData(schemaMerged, {
            url: '/' + id,
            name: 'option',
            title: 'option',
            group: id,
            groupTitle: schemaMerged.title
        });
    }).then(function (docData) {
        docData = _.flatten(docData);
        // console.log(JSON.stringify(docData));        
        fs.writeFileSync('task_doc_data.json', JSON.stringify(docData));
    });
};


if (require.main === module) {
    require('on-core/spec/helper');

    helper.setupInjector([
        helper.require('/lib/utils/task-option-validator')
    ]);

    var validator = helper.injector.get('TaskOption.Validator');

    var taskAnnotation = new TaskAnnotation(validator);
    taskAnnotation.run();
    console.log('========= task_doc_data.json generated =======');
}
