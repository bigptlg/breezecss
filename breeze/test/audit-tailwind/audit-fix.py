import sys, tempfile, subprocess, time, json, html
from pathlib import Path
from playwright.sync_api import sync_playwright
B=Path(sys.argv[1]); cli=B/'breeze/bin/breeze.js'; bundle=B/'breeze.bundle.js'
# class, CSS property, expected computed value (or native CSS reference)
cases=[('20690','bg[red/*]','backgroundColor','rgba(0, 0, 0, 0)'),('20691','bg[</STYLE>]','backgroundColor','rgba(0, 0, 0, 0)'),('20693','hover:'*64+'bg[red]','backgroundColor','rgba(0, 0, 0, 0)'),('20699','bg-image[url(/a/*b.png)]','backgroundImage','url("https://example.test/a/*b.png")'),('20615',"content['min(1,2)']",'content','"min(1,2)"'),('20727','w[Calc(100px_+_20px)]','width','120px'),('20727','w[calc(100px+20px)]','width','120px'),('20658','bg[color-mix(currentcolor_50%,transparent)]','backgroundColor','rgba(0, 0, 0, 0)'),('20658','bg[color-mix(in_srgb,red_50%,blue)]','backgroundColor','color(srgb 0.5 0 0.5)'),('19986',"content['a__b']",'content','"a  b"'),('19988','mt[-20in]','marginTop','-1920px'),('20298','bg[#ABC]','backgroundColor','rgb(170, 187, 204)'),('20373','p[var(--missing,)]','paddingTop','0px'),('20717','justify[baseline]','justifyContent','normal'),('20693','data-'+'a-'*5000+'x:bg[red]','backgroundColor','rgba(0, 0, 0, 0)'),('20694','['*10000,'backgroundColor','rgba(0, 0, 0, 0)')]
rows=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']); page=browser.new_page(); page.route('**/*',lambda r:r.abort());
 for ref,c,prop,want in cases:
  markup=f'<base href="https://example.test/"><div id="x" class="{html.escape(c,quote=False).replace(chr(34), '&quot;')}"></div><div id="good" class="bg[blue]"></div>'
  row={'ref':ref,'class':c if len(c)<200 else c[:40]+f'… ({len(c)} chars)','property':prop,'expected':want}
  for mode in ['runtime','normal','minified']:
   page.set_content(markup); start=time.monotonic(); css=''; logs=[]
   if mode=='runtime':
    page.add_script_tag(path=str(bundle)); page.wait_for_timeout(100)
    css=page.evaluate("Array.from(document.styleSheets).flatMap(s=>Array.from(s.cssRules,r=>r.cssText)).join('\\n')")
   else:
    with tempfile.TemporaryDirectory() as tmp:
     d=Path(tmp); (d/'index.html').write_text(markup); r=subprocess.run(['node',str(cli),'--no-plugins','--no-cache']+(['--minify'] if mode=='minified' else []),cwd=d,capture_output=True,text=True,timeout=10); css=(d/'css/breeze.css').read_text(); page.add_style_tag(content=css)
   actual=page.locator('#x').evaluate('(e,p)=>getComputedStyle(e)[p]',prop); good=page.locator('#good').evaluate('e=>getComputedStyle(e).backgroundColor'); row[mode]={'actual':actual,'good':good,'pass':actual==want and good=='rgb(0, 0, 255)' and '</style' not in css.lower(),'ms':round((time.monotonic()-start)*1000),'declaration': [x[:250] for x in css.splitlines() if ('/*b.png' in x or 'color-mix(' in x or 'baseline' in x)][:3]}
  rows.append(row); print(ref,row['class'],[(m,row[m]['actual'],row[m]['good'],row[m]['pass']) for m in ['runtime','normal','minified']],flush=True)
 browser.close()
Path('breeze-tailwind-results.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False))
