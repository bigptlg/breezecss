"""Regression tests: python -m pip install playwright; playwright install chromium.
Set CHROMIUM_PATH to use an installed Chromium executable.
"""
import os, subprocess, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
B = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    opts = {'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
    browser = p.chromium.launch(**opts)
    page = browser.new_page()
    page.set_content('<div id="root"></div>')
    page.add_script_tag(path=str(B/'vendor/breeze.bundle.js'))
    page.wait_for_timeout(150)
    result = page.evaluate('''async()=>{const root=document.querySelector('#root'), wait=()=>new Promise(r=>setTimeout(r,80)), count=()=>document.querySelector('#breeze-v2-estilos').sheet.cssRules.length; root.innerHTML='<div class="rotate[30deg] scale[2]"></div>'; await wait(); const e=root.firstChild; const initial=getComputedStyle(e).transform; e.className='scale[2]'; await wait(); const partial=getComputedStyle(e).transform; e.className=''; await wait(); const empty=getComputedStyle(e).transform; root.replaceChildren(); await wait(); const before=count(); for(let i=0;i<10;i++){root.innerHTML='<section>'+ '<div class="rotate[30deg]"></div>'.repeat(100)+'</section>'; await wait()} root.replaceChildren(); await wait(); return {initial,partial,empty,before,after:count()}}''')
    assert result['initial'] != 'none', result
    assert result['partial'] == 'matrix(2, 0, 0, 2, 0, 0)', result
    assert result['empty'] == 'none', result
    assert result['before'] == result['after'], result
    print('SPA:', result)
    with tempfile.TemporaryDirectory() as tmp:
        d=Path(tmp)
        html='<div class="bg[red/*]"></div><div class="bg[</style>]"></div><div class="rotate[30deg/*]"></div><div class="'+ 'hover:'*64+'bg[red]"></div><div id="good" class="bg[blue]"></div>'
        (d/'index.html').write_text(html)
        for mini in (False,True):
            subprocess.run(['node',str(B/'bin/breeze.js'),'--no-plugins','--no-cache']+(['--minify'] if mini else []),cwd=d,check=True,capture_output=True)
            css=(d/'css/breeze.css').read_text()
            assert '</style' not in css.lower() and 'red/*' not in css and '30deg/*' not in css
            assert ':hover:hover:hover' not in css
            page.set_content(html)
            page.add_style_tag(content=css)
            assert page.locator('#good').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(0, 0, 255)'
            print('CLI minify='+str(mini)+': OK')
    browser.close()
