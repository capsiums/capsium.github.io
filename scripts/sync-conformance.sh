#!/usr/bin/env bash
# Pulls the latest results.json from capsiums/capsium-conformance
# (committed by that repo's publish-results.yml workflow) into the
# website's data/ directory so the conformance matrix reflects the
# latest kit run.
#
# Idempotent: only writes when the content actually changed. The
# website's CI runs this before `astro build` so the published site
# always reflects the latest conformance state.
#
# Usage: script/sync-conformance.sh [--check]
#   --check  fail if the file would change (CI safety); default writes.

set -euo pipefail

SOURCE_URL="https://raw.githubusercontent.com/capsiums/capsium-conformance/main/results.json"
TARGET_DIR="data"
TARGET="${TARGET_DIR}/conformance.json"
CHECK_MODE=0

if [[ "${1:-}" == "--check" ]]; then
  CHECK_MODE=1
fi

mkdir -p "${TARGET_DIR}"

NEW="$(curl -fsSL "${SOURCE_URL}")" || {
  echo "sync-conformance: failed to fetch ${SOURCE_URL}" >&2
  exit 1
}

if [[ -f "${TARGET}" && "$(cat "${TARGET}")" == "${NEW}" ]]; then
  echo "sync-conformance: ${TARGET} up to date"
  exit 0
fi

if [[ "${CHECK_MODE}" -eq 1 ]]; then
  echo "sync-conformance: ${TARGET} stale (would update)" >&2
  exit 1
fi

printf '%s\n' "${NEW}" > "${TARGET}"
echo "sync-conformance: updated ${TARGET}"
