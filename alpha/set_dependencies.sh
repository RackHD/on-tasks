#!/bin/bash -ex

if [ "${VERIFY_DEP}" == "true" ]; then
    COMMIT=$(cat $(ls ../manifest-artifactory/manifest*.json) | jq -r .ontasks.commit)
    git config --add remote.origin.fetch +refs/pull/*/head:refs/remotes/origin/pull/*
    git fetch
    git checkout $COMMIT
    pushd ../on-core
    COMMIT=$(cat $(ls ../manifest-artifactory/manifest*.json) | jq -r .oncore.commit)
    git config --add remote.origin.fetch +refs/pull/*/head:refs/remotes/origin/pull/*
    git fetch
    git checkout $COMMIT
    popd
    mkdir -p node_modules

    # Map on-core
    pushd ../
    ln -s $(pwd)/on-core $(pwd)/on-tasks/node_modules/on-core
    popd

    # Run npm install for on-core
    pushd ../on-core
    npm install
    popd
fi
