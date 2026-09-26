#!/bin/sh
set -eu

# Run only from the server checkout after fetching/checking out the exact commit.
revision=$(git rev-parse HEAD)
expected=${1:?Pass the expected commit}
test "$revision" = "$expected" || { echo "Checkout does not match requested commit" >&2; exit 1; }
state=${ANALOG_STATE_DIR:-/opt/analog-canvas}
case "$state" in /opt/analog-canvas) ;; *) echo "Unexpected state directory" >&2; exit 1 ;; esac
umask 077
mkdir -p "$state/data" "$state/releases"
chown 10001:10001 "$state/data"
chmod 700 "$state/data"
node containers/self-host/init-secrets.mjs "$state/secrets"
release_env="$state/releases/$revision.env"
printf 'ANALOG_REVISION=%s\nANALOG_STATE_DIR=%s\n' "$revision" "$state" > "$release_env"
compose=containers/self-host/compose.yaml
# The upstream executor now consumes a bundled simulation-service harness.
# Build it with the same pinned Node/pnpm toolchain, then stage only that output.
docker build -f containers/self-host/Dockerfile --target build \
  -t "analog-canvas-build:$revision" .
stager=$(docker create "analog-canvas-build:$revision")
trap 'docker rm "$stager" >/dev/null 2>&1 || true' EXIT HUP INT TERM
mkdir -p containers/ngspice/runtime
docker cp "$stager:/app/containers/ngspice/runtime/." containers/ngspice/runtime/
docker rm "$stager" >/dev/null
trap - EXIT HUP INT TERM
docker compose --env-file "$release_env" -f "$compose" build app assets executor
# No down, volume deletion, shared network changes or data reset.
docker compose --env-file "$release_env" -f "$compose" up -d --no-build
ln -sfn "$release_env" "$state/current.env"
printf 'Started Analog Canvas commit %s; persistent state retained at %s\n' "$revision" "$state"
