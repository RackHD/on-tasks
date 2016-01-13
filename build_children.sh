#!/bin/bash

#Gets the latest Master build
GetMasterBuild () {

    BUILD=$(curl -s 'https://api.travis-ci.org/repos/RackHD/'$1'/branches/master' | grep -o '{"branch":{"id":[0-9]*,' | grep -o '[0-9]' | tr -d '\n')

    echo $BUILD
}

# Get last child project build number
BUILD_NUM_TASKGRAPH=$(GetMasterBuild on-taskgraph)

# Restart last child project build
curl -X POST https://api.travis-ci.org/builds/$BUILD_NUM_TASKGRAPH/restart --header "Authorization: token "$AUTH_TOKEN

#Echo out what builds where restarted
echo Restarted on-taskgraph Build = $BUILD_NUM_TASKGRAPH
