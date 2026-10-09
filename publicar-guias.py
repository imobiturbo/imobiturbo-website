#!/usr/bin/env python3
"""Executado apenas na VPS3: acrescenta guias ao artefato de produção conferido."""
import datetime, fcntl, hashlib, json, os, pathlib, shutil, subprocess, sys, urllib.request
ROOT = pathlib.Path('/opt/builds/trial-guides-20261006')
BASE_ID = '778babd9-df11-4638-8cf0-18ec8669d445'
MERGE = 'e3a893bd4072a9966130504838e5b9102d71febb'
secrets = json.load(sys.stdin)
def api(path):
    url = 'https://api.cloudflare.com/client/v4/accounts/'+secrets['CLOUDFLARE_ACCOUNT_ID']+path
    req = urllib.request.Request(url,headers={'Authorization':'Bearer '+secrets['CLOUDFLARE_API_TOKEN']})
    with urllib.request.urlopen(req,timeout=30) as r: return json.load(r)['result']
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,obj): (ROOT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
with open('/var/lock/imobiturbo-ci.lock','r+') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX)
    if (ROOT/'guide-deploy-receipt.json').exists():
        previous=json.loads((ROOT/'guide-deploy-receipt.json').read_text())
        if previous.get('deployment_id'): raise SystemExit('Deployment already recorded; reconcile without another deploy.')
    current=api('/pages/projects/imobiturbo-website')
    if current['canonical_deployment']['id']!=BASE_ID: raise SystemExit('Production changed; reconstruct the fresh baseline before deploying.')
    baseline=ROOT/'live-baseline-local/.cloudflare-pages'
    check=json.loads((ROOT/'baseline-complete-check.json').read_text())
    if check['mismatches'] or check['compared']!=1206: raise SystemExit('Incomplete baseline')
    metadata=json.loads((ROOT/'site-baseline-files.json').read_text())['result']
    publication=ROOT/'publication';publication.mkdir(exist_ok=True)
    before={}
    for rel in metadata['files']:
        src=baseline/rel.lstrip('/');dst=publication/rel.lstrip('/')
        dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
        before[rel]=sha(src)
    worker=baseline/'_worker.js'
    if sha(worker)!=check['worker_sha256']:raise SystemExit('Worker changed after inspection')
    shutil.copy2(worker,publication/'_worker.js');before['/_worker.js']=sha(worker)
    # Existing guide sources remain byte-for-byte, including their shared official brand files.
    guide_sources=ROOT/'.cloudflare-pages/guias'
    for src in guide_sources.rglob('*'):
        if src.is_file():
            rel='/guias/'+str(src.relative_to(guide_sources));dst=publication/rel.lstrip('/')
            if rel in before:raise SystemExit('Guide would overwrite an existing production asset: '+rel)
            dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
    after={'/'+str(p.relative_to(publication)):sha(p) for p in publication.rglob('*') if p.is_file()}
    changed=[p for p,h in before.items() if after.get(p)!=h]
    if changed:raise SystemExit('Unrelated production content changed')
    tree_current=subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=ROOT,text=True).strip()
    tree_merge=subprocess.check_output(['git','rev-parse',MERGE+'^{tree}'],cwd=ROOT,text=True).strip()
    if tree_current!=tree_merge:raise SystemExit('Merged source differs from the source tested on VPS3')
    provenance={'baseline_deployment':BASE_ID,'source_commit_tested':'1df3068b23f1b2c895ce6314b9b6823813c94f22',
        'merged_commit':MERGE,'source_tree':tree_merge,'preserved_assets':len(before),'changed_existing':changed,
        'added':sorted(set(after)-set(before)),'worker_sha256':after['/_worker.js'],
        'composed_on':'vmi3482766','checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    save('guide-artifact-provenance.json',provenance)
    # Freshness guard immediately before the external mutation.
    if api('/pages/projects/imobiturbo-website')['canonical_deployment']['id']!=BASE_ID:
        raise SystemExit('Production changed during preparation; publication stopped')
    env=dict(os.environ);env.update(secrets);env['WRANGLER_SEND_METRICS']='false'
    cmd=['node',str(ROOT/'node_modules/wrangler/bin/wrangler.js'),'pages','deploy',str(publication),
         '--project-name','imobiturbo-website','--branch','main','--commit-hash',MERGE,
         '--commit-message','Trial guides 2026-10-06; preserve production '+BASE_ID[:8],
         '--commit-dirty=true']
    with (ROOT/'guide-deploy.log').open('w') as log:
        result=subprocess.run(cmd,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    print('Wrangler exit',result.returncode,flush=True)
    deployed=api('/pages/projects/imobiturbo-website')['canonical_deployment']
    receipt={'exit_code':result.returncode,'deployment_id':deployed['id'],'url':deployed['url'],
        'created_on':deployed['created_on'],'deployment_trigger':deployed['deployment_trigger'],
        'predecessor':BASE_ID,'artifact_provenance':'guide-artifact-provenance.json',
        'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    save('guide-deploy-receipt.json',receipt)
    print(json.dumps(receipt,ensure_ascii=False),flush=True)
    if result.returncode or deployed['id']==BASE_ID:raise SystemExit(1)
