#!/bin/sh
set -eu

curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":"healthcheck","method":"aria2.getVersion","params":["token:'"${ARIA2_RPC_SECRET}"'"]}' \
  http://127.0.0.1:6800/jsonrpc >/dev/null
