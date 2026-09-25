#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(git rev-parse --show-toplevel)"

export VITE_API_URL="https://api.example.test"
export VITE_REALTIME_URL="https://realtime.example.test"

for FILE in \
  compose.yaml \
  compose.demo.yaml \
  compose.trial.yaml \
  compose.production.yaml
do
  echo
  echo "Validating $FILE"

  docker compose \
    -f "$FILE" \
    config --quiet

  echo "✓ $FILE"
done

echo
echo "Checking for forbidden host-port publication..."

if grep -nE '^[[:space:]]+ports:' \
  compose.demo.yaml \
  compose.trial.yaml \
  compose.production.yaml
then
  echo "ERROR: host ports must not be published in Coolify"
  exit 1
fi

echo "✓ frontend uses internal expose only"
