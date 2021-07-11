#!/usr/bin/env bash
set -xe
sleep 10
curl --output /dev/null --silent --head --fail $NEXT_PUBLIC_APP_URL/api/user
exit 0