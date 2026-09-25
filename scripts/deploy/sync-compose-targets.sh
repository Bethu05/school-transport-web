#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(git rev-parse --show-toplevel)"

for TARGET in demo trial production
do
  {
    echo "# GENERATED FROM compose.yaml."
    echo "# Deployment target: ${TARGET}"
    echo "# Edit compose.yaml, then rerun npm run deploy:sync-compose."
    echo
    echo "x-deployment-target: ${TARGET}"
    echo
    cat compose.yaml
  } > "compose.${TARGET}.yaml"

  echo "✓ compose.${TARGET}.yaml"
done
