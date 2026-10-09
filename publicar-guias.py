"""VPS3 only: preserve the current production artifact and add ten new guides."""
import datetime,fcntl,hashlib,json,os,pathlib,shutil,subprocess,urllib.request
ROOT=pathlib.Path('/opt/builds/trial-guides-20261007')
BASE='7c96f252-3d2c-4a3e-99d2-1f6d2d3d672a'
BASELINE=pathlib.Path('/opt/builds/website-offers-final-scoped-v3-20261007')
secrets={}
for line in pathlib.Path('/opt/builds/website-offers-launch-20261007/.deploy-private.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1);secrets[k.strip()]=v.strip().strip('"').strip("'")
def current():
    req=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/'+secrets['CLOUDFLARE_ACCOUNT_ID']+'/pages/projects/imobiturbo-website',headers={'Authorization':'Bearer '+secrets['CLOUDFLARE_API_TOKEN']})
    return json.load(urllib.request.urlopen(req))['result']['canonical_deployment']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,d):(ROOT/name).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
with open('/var/lock/imobiturbo-ci.lock','r') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX)
    if (ROOT/'guide-deploy-receipt.json').exists():raise SystemExit('Existing receipt; reconcile without another deployment')
    check=json.loads((ROOT/'baseline-verification.json').read_text())
    if check['missing'] or check['mismatch'] or check['checked']!=1586:raise SystemExit('Baseline does not match Cloudflare hashes')
    if current()['id']!=BASE:raise SystemExit('Current production changed; rebuild fresh baseline')
    output=ROOT/'publication';output.mkdir(exist_ok=False)
    before={}
    for p in BASELINE.rglob('*'):
        if p.is_file():
            rel=p.relative_to(BASELINE);dest=output/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);before[str(rel)]=sha(p)
    slugs=json.loads((ROOT/'batch-guide-input.json').read_text())
    additions=[]
    for slug in slugs:
        src=ROOT/'.cloudflare-pages/guias'/slug;dest=output/'guias'/slug
        if dest.exists():raise SystemExit('Existing production guide preserved: '+slug)
        shutil.copytree(src,dest);additions.extend(str(p.relative_to(output)) for p in dest.rglob('*') if p.is_file())
    if any(sha(output/r)!=h for r,h in before.items()):raise SystemExit('Protected production bytes changed')
    commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    provenance={'baseline_deployment':BASE,'source_commit':commit,'preserved_assets':len(before),'added':additions,'changed_existing':[],'worker_sha256':sha(output/'_worker.js'),'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'executor':'vmi3482766'}
    save('guide-artifact-provenance.json',provenance)
    if current()['id']!=BASE:raise SystemExit('Current production changed during composition')
    env={**os.environ,**secrets,'WRANGLER_SEND_METRICS':'false'}
    cmd=['node','/opt/builds/website-offers-launch-20261007/node_modules/wrangler/bin/wrangler.js','pages','deploy',str(output),'--project-name','imobiturbo-website','--branch','main','--commit-hash',commit,'--commit-message','Ten property guides 2026-10-07; preserve production '+BASE[:8],'--commit-dirty=true']
    with (ROOT/'guide-deploy.log').open('w') as log:r=subprocess.run(cmd,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    d=current();receipt={'exit_code':r.returncode,'deployment_id':d['id'],'url':d['url'],'created_on':d['created_on'],'predecessor':BASE,'commit':commit,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    save('guide-deploy-receipt.json',receipt);print(json.dumps(receipt))
    if r.returncode or d['id']==BASE:raise SystemExit(1)
