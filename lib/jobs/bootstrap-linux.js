// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('Task.Job.Linux.Bootstrapper'));
    di.annotate(factory,
    new di.Inject(
        'Assert',
        'Q'
    )
);
function factory(assert, Q) {
    function bootstrapLinux(options) {
        assert.object(options);
        assert.string(options.kernel);
        assert.string(options.initrd);
        assert.string(options.basefs);
        assert.string(options.overlayfs);

        // Do bootstrap here

        return Q.resolve();
    }

    return bootstrapLinux;
}
