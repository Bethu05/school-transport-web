#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(git rev-parse --show-toplevel)"

COMPOSE_FILE="${1:-compose.demo.yaml}"
ENV_FILE="${2:-.env}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE does not exist"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  COMPOSE=(
    docker compose
    --env-file "$ENV_FILE"
    -f "$COMPOSE_FILE"
  )
else
  COMPOSE=(
    docker compose
    -f "$COMPOSE_FILE"
  )
fi

echo "============================================================"
echo "SCHOOL TRANSPORT WEB - DOCKER STATUS"
echo "Compose: $COMPOSE_FILE"
echo "============================================================"

"${COMPOSE[@]}" ps -a || true

ID="$("${COMPOSE[@]}" ps -a -q web 2>/dev/null || true)"

if [ -z "$ID" ]; then
  echo
  echo "web: MISSING"
  exit 1
fi

STATE="$(docker inspect \
  --format '{{.State.Status}}' "$ID")"

HEALTH="$(docker inspect \
  --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' \
  "$ID")"

RESTARTS="$(docker inspect \
  --format '{{.RestartCount}}' "$ID")"

EXIT_CODE="$(docker inspect \
  --format '{{.State.ExitCode}}' "$ID")"

echo
echo "STATE    : $STATE"
echo "HEALTH   : $HEALTH"
echo "RESTARTS : $RESTARTS"
echo "EXIT CODE: $EXIT_CODE"

echo
echo "INTERNAL HTTP CHECK"
echo "-------------------"

if "${COMPOSE[@]}" exec -T web \
  wget -q -O /dev/null http://127.0.0.1:8080/
then
  echo "web / : OK"
else
  echo "web / : FAILED"
  exit 1
fi
