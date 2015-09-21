// Copyright 2015, EMC, Inc.

module.exports = {
    friendlyName: 'Ansible Playbook',
    injectableName: 'Task.Base.Ansible',
    runJob: 'Job.Ansible.Playbook',
    requiredOptions: [
        "playbook"
    ],
    requiredProperties: {},
    properties: {}
};
