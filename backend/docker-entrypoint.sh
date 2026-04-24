#!/bin/sh
set -e

echo "[entrypoint] running database migrations..."
./server migrate

echo "[entrypoint] starting backend server..."
exec ./server
