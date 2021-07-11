#!/usr/bin/env bash
set -xe
sleep 10
curl --output /dev/null --silent --head --fail http://localhost:8080/api/user
exit 0