#!/usr/bin/env bash

docker run \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --name solutions-team-jenkins-agent-nexentaedge.github.io-build \
    solutions-team-jenkins-agent-nexentaedge.github.io-build
