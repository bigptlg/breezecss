import tempfile,subprocess,time,json,statistics,hashlib
from pathlib import Path
for n in (1000,5000,20000):
 with tempfile.TemporaryDirectory() as tmp:
  p=Path(tmp);(p/'index.html').write_text(''.join(f'<div class="w[{i}px] p[12px] bg[red]"></div>' for i in range(1,n+1)))
  for mini in (False,True):
   vals={v:[] for v in ('brcmp','optbr')}; hashes={}
   for i in range(3):
    for v in (('brcmp','optbr') if i%2==0 else ('optbr','brcmp')):
     t=time.perf_counter();r=subprocess.run(['node',f'/tmp/{v}/breeze/bin/breeze.js','--no-plugins','--no-cache']+(['--minify'] if mini else []),cwd=p,capture_output=True,timeout=60);assert r.returncode==0,r.stderr;vals[v].append((time.perf_counter()-t)*1000);css=(p/'css/breeze.css').read_bytes();hashes[v]=hashlib.sha256(css).hexdigest()
   print(json.dumps(dict(n=n,minify=mini,median={v:statistics.median(x) for v,x in vals.items()},samples=vals,identical=len(set(hashes.values()))==1,bytes=len(css))),flush=True)
