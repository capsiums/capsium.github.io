#!/usr/bin/env bash
# Pulls the latest registry content (index.json + every indexed .cap)
# from the capsiums/registry repo's GitHub Pages URL into the website's
# public/registry/ directory so it ships at https://capsium.org/registry/.
#
# Why a sync rather than a subdomain: GitHub Pages custom domains
# don't auto-inherit to project repos. Serving the registry as a path
# on the main site (single Pages site, single domain) is simpler and
# matches how visitors expect to find things — "capsium.org/registry",
# not "where does the registry live?".
#
# Idempotent. CI runs this before `astro build` so the published site
# always reflects the latest registry state.

set -euo pipefail

SOURCE="https://capsiums.github.io/registry"
TARGET_DIR="public/registry"

mkdir -p "${TARGET_DIR}"

# 1. The index first (small; tells us what else to fetch).
INDEX="$(curl -fsSL "${SOURCE}/index.json")"
printf '%s\n' "${INDEX}" > "${TARGET_DIR}/index.json"
echo "sync-registry: index.json updated"

# 2. Every indexed package. The index lists relative paths like
#    "packages/<name>-<version>.cap"; fetch each one.
COUNT=$(printf '%s' "${INDEX}" | jq -r '.packages[].versions[].file' | wc -l | tr -d ' ')
if [[ "${COUNT}" -eq 0 ]]; then
  echo "sync-registry: index has no packages; nothing to fetch"
  exit 0
fi

mkdir -p "${TARGET_DIR}/packages"
printf '%s' "${INDEX}" | jq -r '.packages[].versions[].file' | while read -r file; do
  rel="${file#packages/}"
  target="${TARGET_DIR}/packages/${rel}"
  if [[ -f "${target}" ]]; then
    continue  # already fetched in a previous run
  fi
  curl -fsSL "${SOURCE}/${file}" -o "${target}"
  echo "sync-registry: fetched ${rel}"
done

echo "sync-registry: ${COUNT} package(s) synced to ${TARGET_DIR}/packages/"
