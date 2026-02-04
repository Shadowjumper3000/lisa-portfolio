#!/bin/sh
set -e

# Substitute environment variables in nginx config template
envsubst '${SERVER_NAME}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the CMD
exec "$@"
