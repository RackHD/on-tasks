# Copyright 2016, EMC, Inc.
ARG repo=rackhd
ARG tag=devel

FROM ${repo}/on-core:${tag}

COPY . /RackHD/on-tasks/

RUN cd /RackHD/on-tasks \
  && mkdir -p /RackHD/on-tasks/node_modules \
  && npm install --ignore-scripts --production \
  && rm -r /RackHD/on-tasks/node_modules/on-core \
  && rm -r /RackHD/on-tasks/node_modules/di \
  && ln -s /RackHD/on-core /RackHD/on-tasks/node_modules/on-core \
  && ln -s /RackHD/on-core/node_modules/di /RackHD/on-tasks/node_modules/di \
  && apt-get update \
  && apt-get install -y apt-utils ipmitool openipmi
