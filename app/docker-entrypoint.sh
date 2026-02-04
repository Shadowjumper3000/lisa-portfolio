#!/bin/sh
set -e

# If a go.mod file exists, ensure modules and go.sum are up to date
if [ -f /app/go.mod ]; then
  echo "Setting up Go modules..."
  cd /app
  go mod tidy
  go mod download
  echo "Go modules ready."
fi

# Execute the container CMD
exec "$@"
