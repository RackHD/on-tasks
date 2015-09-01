// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di');

module.exports = ansibleFactory;

di.annotate(ansibleFactory, new di.Provide('JobUtils.Ansible.Playbook'));
di.annotate(ansibleFactory, new di.Inject(
            'Assert',
            'ChildProcess'
));

function ansibleFactory(assert, ChildProcess) {
    function ansibleTool() {
        this.childProcess = undefined;
    };

    ansibleTool.prototype.runPlaybook = function(nodeid, playbook, extra_args) {
        var env = {
            'nodeid': nodeid
        };
        var args = [ '-i', '/opt/onrack/etc/ansible/inventory.py' ];
        if( extra_args )  {
          args.push("--extra-vars");
          args.push(extra_args);
        }
        args.push(playbook);

        var maxBuffer = 3000 * 1024;
        this.childProcess = new ChildProcess('/usr/bin/ansible-playbook', args, env, null, maxBuffer);
        return this.childProcess.run();
    };

    ansibleTool.prototype.kill = function() {
        if(this.childProcess) {
            this.childProcess.killSafe();
        }
    };

    return ansibleTool;
}