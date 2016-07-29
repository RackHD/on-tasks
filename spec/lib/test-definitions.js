"use strict";

module.exports.get = function() {
    var graphDefinition = {
        friendlyName: 'Test Graph',
        injectableName: 'Graph.test',
        tasks: [
            { label: 'test-1',
              taskName: 'Task.test' },
            { label: 'test-2',
              taskName: 'Task.test',
              waitOn: { 'test-1': 'finished' } }
        ]
    };
    var graphDefinitionInline = {
        friendlyName: 'Test Graph',
        injectableName: 'Graph.test',
        tasks: [
            { label: 'test-1',
              taskDefinition: {
                friendlyName: 'Test task',
                implementsTask: 'Task.Base.test',
                injectableName: 'Task.test',
                options: { option1: 1, option2: 2, option3: 3 },
                properties: { } }
            }
        ]
    };
    var baseTask = {
        friendlyName: 'Base test task',
        injectableName: 'Task.Base.test',
        runJob: 'Job.test',
        requiredOptions: [
            'option1',
            'option2',
            'option3',
        ],
        requiredProperties: {},
        properties: {}
    };
    var baseTaskEmpty = {
        friendlyName: 'Test task empty',
        injectableName: 'Task.Base.test-empty',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {},
        properties: {}
    };
    var testTask = {
        friendlyName: 'Test task',
        implementsTask: 'Task.Base.test',
        injectableName: 'Task.test',
        options: { option1: 1, option2: 2, option3: 3 },
        properties: { test: { foo: 'bar' } }
    };
    var baseTask1 = {
        friendlyName: 'base test task properties 1',
        injectableName: 'Task.Base.testProperties1',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {},
        properties: {
            test: {
                type: 'null'
            },
            fresh: {
                fruit: {
                    slices: 'sugary'
                }
            },
            fried: {
                chicken: {
                    and: {
                        waffles: 'yum'
                    }
                }
            }
        }
    };
    var baseTask2 = {
        friendlyName: 'base test task properties 2',
        injectableName: 'Task.Base.testProperties2',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {
            // test multiple levels of nesting
            'pancakes': 'syrup',
            'spam.eggs': 'monty',
            'fresh.fruit.slices': 'sugary',
            'fried.chicken.and.waffles': 'yum',
            'coffee.with.cream.and.sugar': 'wake up'
        },
        properties: {
            test: {
                type: 'null'
            }
        }
    };
    var baseTask3 = {
        friendlyName: 'base test task properties 3',
        injectableName: 'Task.Base.testProperties3',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {
            'does.not.exist': 'negative'
        },
        properties: {
            test: {
                type: 'null'
            }
        }
    };
    var testTask1 = {
        friendlyName: 'test properties task 1',
        implementsTask: 'Task.Base.testProperties1',
        injectableName: 'Task.testProperties1',
        options: {},
        properties: {
            test: {
                unit: 'properties',
            },
            pancakes: 'syrup',
            spam: {
                eggs: 'monty'
            },
            coffee: {
                'with': {
                    cream: {
                        and: {
                            sugar: 'wake up'
                        }
                    }
                }
            }
        }
    };
    var testTask2 = {
        friendlyName: 'test properties task 2',
        implementsTask: 'Task.Base.testProperties2',
        injectableName: 'Task.testProperties2',
        options: {},
        properties: {
            test: {
                foo: 'bar'
            }
        }
    };
    var testTask3 = {
        friendlyName: 'test properties task 3',
        implementsTask: 'Task.Base.testProperties3',
        injectableName: 'Task.testProperties3',
        options: {},
        properties: {
            test: {
                bar: 'baz'
            }
        }
    };
    var graphDefinitionValid = {
        injectableName: 'Graph.testPropertiesValid',
        friendlyName: 'Valid Test Graph',
        tasks: [
            {
                label: 'test-1',
                taskName: 'Task.testProperties1'
            },
            {
                label: 'test-2',
                taskName: 'Task.testProperties2',
                waitOn: {
                    'test-1': 'finished'
                }
            }
        ]
    };
    var graphDefinitionInvalid = {
        injectableName: 'Graph.testPropertiesInvalid',
        friendlyName: 'Invalid Test Graph',
        tasks: [
            {
                label: 'test-1',
                taskName: 'Task.testProperties1'
            },
            {
                label: 'test-2',
                taskName: 'Task.testProperties2',
                waitOn: {
                    'test-1': 'finished'
                }
            },
            {
                label: 'test-3',
                taskName: 'Task.testProperties3',
                waitOn: {
                    'test-2': 'finished'
                }
            }
        ]
    };
    var graphDefinitionOptions = {
        injectableName: 'Graph.testGraphOptions',
        friendlyName: 'Test Graph Options',
        options: {
            defaults: {
                option1: 'same for all',
                option2: 'same for all',
                'optionNonExistant': 'not in any'
            },
            'test-2': {
                overrideOption: 'overridden for test-2',
                option2: 'overridden default option for test-2'
            },
            'test-3': {
                inlineOptionOverridden: 'overridden inline option for test-3'
            },
            'test-4': {
                nonRequiredOption: 'add an option to an empty base task'
            },
            'test-5': {
                option1: null,
                option2: 'overidden all'
            }
        },
        tasks: [
            {
                label: 'test-1',
                taskName: 'Task.test',
                optionOverrides: {
                    'testName': 'firstTask'
                }
            },
            {
                label: 'test-2',
                taskName: 'Task.test',
                optionOverrides: {
                    'testName': 'secondTask',
                    overrideOption: undefined
                },
                waitOn: {
                    'test-1': 'finished'
                }
            },
            {
                label: 'test-3',
                taskDefinition: {
                    friendlyName: 'Test Inline Task',
                    injectableName: 'Task.test.inline-task',
                    implementsTask: 'Task.Base.test',
                    options: {
                        option3: 3,
                        inlineOption: 3,
                        inlineOptionOverridden: undefined,
                        testName: 'thirdTask'
                    },
                    properties: {}
                }
            },
            {
                label: 'test-4',
                taskDefinition: {
                    friendlyName: 'Test Inline Task no options',
                    injectableName: 'Task.test.inline-task-no-opts',
                    implementsTask: 'Task.Base.test-empty',
                    options: {
                        testName: 'fourthTask'
                    },
                    properties: {}
                }
            },
            {
                label: 'test-5',
                taskDefinition: {
                    friendlyName: 'Test Inline Task with schema',
                    injectableName: 'Task.test.inline-task-with-schema',
                    implementsTask: 'Task.Base.test-empty',
                    schemaRef: 'testschema',
                    options: {
                        option1: 'default value of option 1',
                        option5: 'default value of option 5',
                        testName: 'fifthTask'
                    },
                    properties: {}
                }
            }
        ]
    };

    return {
        graphDefinition: graphDefinition,
        graphDefinitionInline: graphDefinitionInline,
        baseTask: baseTask,
        baseTaskEmpty: baseTaskEmpty,
        testTask: testTask,
        baseTask1: baseTask1,
        baseTask2: baseTask2,
        baseTask3: baseTask3,
        testTask1: testTask1,
        testTask2: testTask2,
        testTask3: testTask3,
        graphDefinitionValid: graphDefinitionValid,
        graphDefinitionInvalid: graphDefinitionInvalid,
        graphDefinitionOptions: graphDefinitionOptions
    };
};
