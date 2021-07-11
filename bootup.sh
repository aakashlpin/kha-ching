#!/usr/bin/env bash
set -xe
sleep 5
curl -L -sS http://localhost:${PORT:-8080}/api/user
exit 0