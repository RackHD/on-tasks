#!/bin/bash -ex

if [ "${VERIFY_DEP}" == "true" ]; then
    COMMIT=$(cat $(ls ../manifest-artifactory/manifest*.json) | jq -r .ontasks.commit)
    git config --add remote.origin.fetch +refs/pull/*/head:refs/remotes/origin/pull/*
    git fetch
    git checkout $COMMIT
    export ONCORE_TAG=$(<../on-core-docker/digest)
    sed -i "s/^FROM.*/FROM $REGISTRY\/${REPO_OWNER}\/on-core@${ONCORE_TAG}/" ./Dockerfile
fi
cat Dockerfile
cp -rf * ../build
