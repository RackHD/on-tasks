// Copyright 2015, EMC, Inc.

'use strict';

describe(require('path').basename(__filename), function () {
    var base = require('./base-tasks-spec');
    var hogan;

    base.before(function (context) {
        context.taskdefinition = helper.require('/lib/task-data/tasks/create-megaraid.js');
        helper.setupInjector();
        hogan = helper.injector.get('Hogan');
    });

    describe('task-data', function () {
        base.examples();
    });

    describe('task options data', function () {
        it('should have an options', function() {
            expect(this.taskdefinition).to.have.property('options');
            expect(this.taskdefinition.options).to.be.an('Object');
        });

        it('should have commands option', function() {
            expect(this.taskdefinition.options).to.have.property('commands');
            expect(this.taskdefinition.options.commands).to.be.an('Array').with.length(1);
        });

        it('should parse command template', function() {
            var cmd = this.taskdefinition.options.commands[0];
            expect(function() {
                hogan.parse(hogan.scan(cmd));
            }).to.not.throw(Error);
        });

        it('should render default command', function() {
            var template = hogan.compile(this.taskdefinition.options.commands[0]);
            var defaultCmd = 'sudo /opt/MegaRAID/storcli/storcli64 /c0 add vd each type=raid0';
            expect(template.render(this.taskdefinition)).to.equal(defaultCmd);
        });

        it('should render multiple command', function() {
            var options = this.taskdefinition.options;
            var template = hogan.compile(options.commands[0]);
            options.createDefault = false;
            options.path = '/storcli64';
            options.controller = 1;
            options.raidList = [
                {
                    'enclosure': 62,
                    'type': 'raid1',
                    'drives': [1, 4],
                    'name': 'VD1'
                },
                {
                    'enclosure': 62,
                    'type': 'raid10',
                    'drives': [6, 7, 8, 9],
                    'name': 'VD3',
                    'size': '200G',
                    'drivePerArray': 2
                }
            ];
            var expectCmd = 'sudo /storcli64 /c1 add vd type=raid1 name=VD1 drives=62:1,4;' +
                'sudo /storcli64 /c1 add vd type=raid10 name=VD3 size=200G drives=62:6,7,8,9 ' +
                'PDPerArray=2;';
            expect(template.render(this.taskdefinition)).to.equal(expectCmd);
        });
    });
});