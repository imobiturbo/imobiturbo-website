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
task_evidence="$(dirname "$task_root")/ci-evidence"
mkdir -p "$task_evidence"
if ! npm test > "$task_evidence/tests.log" 2>&1; then
  python3 - "$task_evidence/tests.log" <<'PY'
import re,sys
s=open(sys.argv[1]).read()
for m in re.finditer(r'^not ok .*$',s,re.M):
    block=s[m.start():s.find('# Subtest:',m.start()+1) if '# Subtest:' in s[m.start()+1:] else len(s)]
    print(m.group(0))
    for line in block.splitlines()[1:]:
        if re.match(r'\s*(?:location|error|code|operator):',line):print(line[:250])
print('Log completo: '+sys.argv[1])
PY
  exit 1
fi
tail -n 10 "$task_evidence/tests.log"
npm run build:pages
node scripts/verify-organic-artifact.mjs
node scripts/verify-lp-assets.mjs
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'Build alterou fontes versionadas' >&2; exit 78; }
git rev-parse HEAD
