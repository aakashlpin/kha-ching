#!/usr/bin/env bash
set -xe
sleep 5
curl --output /dev/null --silent --head --fail http://localhost:${PORT:-8080}/api/user
exit 0