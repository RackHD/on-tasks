// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = dockerReconcilerJobFactory;

di.annotate(dockerReconcilerJobFactory, new di.Provide('Job.Docker.Reconciler'));
di.annotate(dockerReconcilerJobFactory, new di.Inject(
  'Job.Base',
  'Services.Waterline',
  'Services.Messenger',
  'Logger',
  'Util',
  'Constants',
  'Assert'
));

function dockerReconcilerJobFactory(
  BaseJob,
  waterline,
  messenger,
  Logger,
  util,
  Constants,
  assert
) {
    var logger = Logger.initialize(dockerReconcilerJobFactory);

    function DockerReconcilerJob(options, context, taskId) {
        BaseJob.call(this, logger, options, context, taskId);
    }

    util.inherits(DockerReconcilerJob, BaseJob);

    DockerReconcilerJob.prototype._run = function _run() {
        var self = this;

        var deferred = messenger.subscribe(
            Constants.Protocol.Exchanges.Task.Name,
            'docker-reconciler',
            function (data, message) {
                self.reconcileData(data, message);
            }
        );

        self.subscriptionPromises.push(deferred);

        return deferred.then(function (subscription) {
            self.subscriptions.push(subscription);
        }).catch(function (err) {
            self._done(err);
        });;
    };

    DockerReconcilerJob.prototype.reconcileData = function (data, message) {
        if (data && data.type === 'containers') {
            return this.reconcileContainers(data.node, data.value)
                .then(function () {
                    message.resolve(data);
                })
                .catch(function (err) {
                    message.reject(err);
                });
        }
        // TODO: reconcile images, volumes and networks
        message.reject(new Error('Invalid Docker Reconciler Request'));
        return Promise.resolve();
    };

    DockerReconcilerJob.prototype.reconcileContainers = function (nodeId, containers) {
        var containersById = {};

        containers.forEach(function (container) {
            containersById[container.Id] = container;
        });

        return new Promise(function (resolveMessage, rejectMessage) {
            waterline.nodes.findByTag('dockerHost:' + nodeId)
                .then(function (records) {
                    var newContainers,
                        removedRecords,
                        recordsByContainerId = {},
                        changedItems = [];

                    removedRecords = records.filter(function (record) {
                        if (record.docker && record.docker.containerId) {
                            recordsByContainerId[record.docker.containerId] = record;
                        }

                        var matchingContainer = record.docker &&
                            containersById[record.docker.containerId];

                        if (matchingContainer) {
                            changedItems.push({
                                container: matchingContainer,
                                record: record
                            });
                            return false;
                        }
                        return true;
                    });

                    newContainers = containers.filter(function (container) {
                        if (recordsByContainerId[container.Id]) {
                            return false;
                        }
                        return true;
                    });

                    var promises = [];

                    promises = promises.concat(newContainers.map(function (newContainer) {
                        return new Promise(function (resolve, reject) {
                            waterline.nodes.create({
                                name: newContainer.Image + '#' + newContainer.Id.substr(0, 6),
                                docker: {
                                  containerId: newContainer.Id,
                                  container: newContainer
                                },
                                tags: ['dockerHost:' + nodeId],
                                relations: [{relationType: 'dockerHost', targets: [nodeId]}],
                                type: Constants.NodeTypes.ComputerContainer
                            })
                            .then(resolve)
                            .catch(reject);
                        });
                    }));

                    promises = promises.concat(changedItems.map(function (changedItem) {
                        return new Promise(function (resolve, reject) {
                            waterline.nodes.updateOneById(changedItem.record.id, {
                                docker: {
                                    containerId: changedItem.container.Id,
                                    container: changedItem.container
                                }
                            })
                            .then(resolve)
                            .catch(reject);
                        });
                    }));

                    promises = promises.concat(removedRecords.map(function (removedRecord) {
                        return new Promise(function(resolve, reject) {
                            waterline.nodes.destroyOneById(removedRecord.id)
                                .then(resolve)
                                .catch(reject);
                        });
                    }));

                    Promise.all(promises)
                        .then(resolveMessage)
                        .catch(rejectMessage);
                });
        });
    };

    return DockerReconcilerJob;
}
