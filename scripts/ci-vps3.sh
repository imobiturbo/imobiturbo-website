#!/usr/bin/env bash
set -euo pipefail
[[ "$(hostname)" == vmi3482766 ]] || { echo 'CI exclusivo na VPS3' >&2; exit 78; }
[[ "$(id -un)" == natan ]] || { echo 'Execute CI como natan' >&2; exit 78; }
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "$task_root" == /opt/builds/* ]] || { echo 'Use checkout em /opt/builds/' >&2; exit 78; }
cd "$task_root"
exec 9>/var/lock/imobiturbo-ci.lock
flock 9
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'Checkout precisa estar limpo' >&2; exit 78; }
npm ci --no-audit --no-fund
npm --prefix tools/oficina-web ci --no-audit --no-fund
npm test
npm run build:pages
node scripts/verify-organic-artifact.mjs
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'Build alterou fontes versionadas' >&2; exit 78; }
git rev-parse HEAD
