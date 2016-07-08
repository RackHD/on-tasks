// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
var stream = require('stream');

module.exports = dockerJobFactory;

di.annotate(dockerJobFactory, new di.Provide('Job.Docker'));
di.annotate(dockerJobFactory, new di.Inject(
    'Job.Base',
    'Util',
    'Logger',
    'Assert',
    'Constants',
    'Services.Waterline',
    'Services.Messenger',
    'Docker'
));

function dockerJobFactory(
    BaseJob,
    util,
    Logger,
    assert,
    Constants,
    waterline,
    messenger,
    Docker
) {
    var logger = Logger.initialize(dockerJobFactory);

    function DockerJob(options, context, taskId) {
        BaseJob.call(this, logger, options, context, taskId);
        assert.string(this.context.target);
        this.nodeId = this.context.target;
    }
    util.inherits(DockerJob, BaseJob);

    DockerJob.createDockerAPI = createDockerAPI;

    DockerJob.prototype._run = function run() {
        var self = this;

        return waterline.nodes.needByIdentifier(self.nodeId)
            .then(function (node) {
                if (node && node.type === Constants.NodeTypes.ComputerContainer) {
                    var dockerHost = node.relations.filter(function (relation) {
                        return relation.relationType === 'dockerHost';
                    }).map(function (relation) {
                        return relation.targets[0];
                    });
                    if (!dockerHost) {
                        return self._done(new Error(
                            'Missing docker host relation for compute container node.'));
                    }
                    waterline.nodes.needByIdentifier(dockerHost)
                        .then(function (dockerHostNode) {
                            lookupNodeAddress(null, dockerHostNode, node);
                        })
                        .catch(function (err) {
                            self._done(err);
                        });
                } else {
                    lookupNodeAddress(null, node);
                }
            })
            .catch(function (err) {
                self._done(err);
            });

        function lookupNodeAddress(err, node, containerNode) {
            waterline.lookups.findOneByTerm(self.nodeId)
                .then(function (lookup) {
                    sendDockerCommand(null, node, lookup, containerNode);
                })
                .catch(function (err) {
                    sendDockerCommand(err, node, null, containerNode);
                });
        }

        function sendDockerCommand(err, node, lookup, containerNode) {
            var dockerOptions = {
                protocol: self.options.protocol || 'http',
                host: self.options.host || '127.0.0.1',
                port: self.options.port || 2375,
                ca: self.options.ca || null,
                cert: self.options.cert || null,
                key: self.options.key || null
            };

            if (self.nodeId && lookup) {
              dockerOptions.host = lookup.ipAddress;
            }

            if (self.nodeId && node && node.docker && node.docker.hostOptions) {
              var nodeDockerOptions = node.docker.hostOptions;
              dockerOptions.protocol = nodeDockerOptions.protocol || dockerOptions.protocol;
              dockerOptions.host = nodeDockerOptions.host || dockerOptions.host;
              dockerOptions.port = nodeDockerOptions.port || dockerOptions.port;
              dockerOptions.ca = nodeDockerOptions.ca || dockerOptions.ca;
              dockerOptions.cert = nodeDockerOptions.cert || dockerOptions.cert;
              dockerOptions.key = nodeDockerOptions.key || dockerOptions.key;
            }

            assert.string(dockerOptions.host);

            var docker = new Docker(dockerOptions),
                api = createDockerAPI(docker, logger);

            Promise.all(self.options.exec.map(dockerCall))
                .then(function () {
                    self._done();
                })
                .catch(function (err) {
                    self._done(err);
                });

            function dockerCall(call) {
                return new Promise(function (resolve, reject) {
                    var args = call.args || [];

                    args.push(function(err) {
                        if (err) { return reject(err); }

                        var cbArgs = Array.prototype.slice.call(arguments, 1);

                        if (call.store) {
                            Object.keys(call.store).forEach(function (prop) {
                                self.context[prop] = cbArgs[call.store[prop]];
                            });
                        }

                        if (call.emit) {
                            return finishDockerCall(
                                Object.keys(call.emit).map(function (routingKey) {
                                    var obj = call.emit[routingKey];

                                    if (typeof obj.ref === 'number') {
                                        obj.value = cbArgs[obj.ref] || obj.value;
                                    }
                                    else if (typeof obj === 'string') {
                                        obj.value = self.context[obj.ref] || obj.value;
                                    }

                                    obj.value = obj.value || null;
                                    obj.node = self.nodeId;

                                    delete obj.ref;

                                    return messenger.request(
                                        Constants.Protocol.Exchanges.Task.Name,
                                        routingKey,
                                        obj,
                                        'Object',
                                        15000
                                    );
                                })
                            );
                        }

                        return finishDockerCall([]);

                        function finishDockerCall(promises) {
                            if (Array.isArray(call.then)) {
                                promises = promises.concat(call.then.map(dockerCall));
                            }

                            if (promises.length === 0) {
                                return resolve();
                            }

                            return Promise.all(promises).then(resolve).catch(reject);
                        }
                    });

                    if (typeof args[0] === 'string' && args[0].charAt(0) === '$') {
                        args[0] = containerNode.docker[args[0].slice(1)];
                    }

                    api[call.method].apply(docker, args);
                });
            }
        }
    };

    return DockerJob;
}

function createDockerAPI(docker, logger) {
    return {
        attach: function(id, opts, cb) { docker.getContainer(id).attach(opts, cb); },
        create: function(opts, cb) { docker.createContainer(opts, cb); },
        inspect: function(id, opts, cb) { docker.getContainer(id).inspect(opts, cb); },
        kill: function(id, opts, cb) { docker.getContainer(id).kill(opts, cb); },
        list: function(opts, cb) {
            docker.listContainers(opts, function (err, containers) {
                if (containers) {
                    containers.forEach(function (container) {
                        container.Labels = JSON.stringify(container.Labels);
                    });
                }
                cb(err, containers);
            });
        },
        logs: function(id, opts, cb) { docker.getContainer(id).logs(opts, cb); },
        pull: function(image, opts, cb) {
            docker.pull(image, opts, function (err, stream) {
                if (err) { return cb(err); }
                docker.modem.followProgress(stream, onFinished, onProgress);
                function onFinished(err, output) { cb(err, output); }
                function onProgress(event) {}
            });
        },
        remove: function(id, opts, cb) { docker.getContainer(id).remove(opts, cb); },
        restart: function(id, opts, cb) { docker.getContainer(id).restart(opts, cb); },
        run: function(image, opts, cb) {
            opts.create = opts.create || {};
            opts.create.Image = image;
            docker.createContainer(opts.create, function(err, container) {
                if (err) { return cb(err); }
                container.start(opts.start, function(err, data) {
                    return cb(err, data, container);
                });
            });
        },
        start: function(id, opts, cb) { docker.getContainer(id).start(opts, cb); },
        stop: function(id, opts, cb) { docker.getContainer(id).stop(opts, cb); }
        // TODO add image, volume and network commands
    };
}
