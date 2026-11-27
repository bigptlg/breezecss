import subprocess,tempfile,time,sys,json
from pathlib import Path
cli=Path(sys.argv[1]).resolve()/'breeze/bin/breeze.js'
rows=[]
with tempfile.TemporaryDirectory() as t:
 d=Path(t); f=d/'index.html'; out=d/'css/breeze.css'; args=['node',str(cli),'--no-plugins'];
 for c in ['p[10banana]','w[banana]','bg[color-mix(currentcolor_50%,transparent)]','p[banana]']:
  f.write_text(f'<div class="{c}"></div>'); r=subprocess.run(args+['--strict','--no-cache'],cwd=d,capture_output=True,text=True); rows.append({'class':c,'exit':r.returncode,'css':out.read_text().splitlines()[-2:]})
 f.write_text('<div class="bg[red]"></div>'); subprocess.run(args,cwd=d,check=True,capture_output=True); f.write_text('<div class="bg[blue]"></div>'); subprocess.run(args,cwd=d,check=True,capture_output=True); css=out.read_text(); rows.append({'ref':'20736','incremental_removed_class': 'background-color: red' not in css and 'background-color: blue' in css})
 f.write_text('<div class="bg[red]"></div>'); proc=subprocess.Popen(args+['--watch'],cwd=d,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  time.sleep(1); f.write_text('<div class="bg[green]"></div>'); time.sleep(.6); f.write_text('<div class="bg[blue]"></div>'); time.sleep(1); css=out.read_text(); rows.append({'ref':'20446','watch_latest': 'background-color: blue' in css and 'background-color: green' not in css and 'background-color: red' not in css}); f.unlink(); time.sleep(.7); f.write_text('<div class="bg[purple]"></div>'); time.sleep(1); rows.append({'ref':'20137','watch_restore': 'background-color: purple' in out.read_text()})
 finally: proc.terminate(); proc.wait(timeout=5)
print(json.dumps(rows,indent=2)); Path('breeze-tailwind-extra.json').write_text(json.dumps(rows,indent=2))
