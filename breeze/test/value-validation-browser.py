import os
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None)
    page=browser.new_page(); logs=[]; page.on('console',lambda m: logs.append(m.text))
    page.set_content('<div id="x" class="p[banana] bg[banana] rotate[banana] p[20px] m[-20px]"></div>')
    page.add_script_tag(path=str(Path(__file__).resolve().parents[1]/'vendor/breeze.bundle.js'))
    page.wait_for_timeout(150)
    assert page.locator('#x').evaluate('e=>getComputedStyle(e).padding')=='20px'
    assert page.locator('#x').evaluate('e=>getComputedStyle(e).transform')=='none'
    for c in ['p[banana]','bg[banana]','rotate[banana]']: assert any('Valor CSS inválido' in l and c in l for l in logs),logs
    page.locator('#x').evaluate("e=>e.className='rotate[30deg] p[auto]'");page.wait_for_timeout(100)
    assert page.locator('#x').evaluate('e=>getComputedStyle(e).transform')!='none'
    assert any('p[auto]' in l and 'Valor CSS inválido' in l for l in logs)
    print('Browser semantic validation: OK');browser.close()
