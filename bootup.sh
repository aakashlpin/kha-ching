#!/bin/bash
until $(curl --output /dev/null --silent --head --fail $NEXT_PUBLIC_APP_URL/api/user); do
  printf '.'
  sleep 5
done