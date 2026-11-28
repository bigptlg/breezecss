'use strict'
// Limpeza de regras de classes que saíram do DOM (runtime), num Chrome real
// em modo headless — sem dependências npm. Ignorado se não houver Chrome
// (CHROMIUM_PATH, google-chrome, chromium).
//
// Nota: o motor agrupa o processamento com requestAnimationFrame, que não
// dispara no Chrome headless com tempo virtual; a página de teste substitui-o
// por setTimeout(16) antes de carregar o bundle.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')

const BUNDLE = path.join(__dirname, '..', 'vendor', 'breeze.bundle.js')

function acharChrome() {
  const cands = [process.env.CHROMIUM_PATH, 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)
  for (const c of cands) {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' })
    if (r.status === 0) return c
  }
  return null
}
const CHROME = acharChrome()

function correr(corpo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breeze-gc-'))
  fs.copyFileSync(BUNDLE, path.join(dir, 'breeze.bundle.js'))
  const html = `<!doctype html><html><body><div id="root"></div><pre id="out"></pre>
<script>window.requestAnimationFrame=function(cb){return setTimeout(function(){cb(performance.now())},16)};window.cancelAnimationFrame=clearTimeout;</script>
<script src="breeze.bundle.js"></script><script>
const R=document.getElementById('root');const tick=(ms=80)=>new Promise(r=>setTimeout(r,ms));
const cs=(el,p)=>getComputedStyle(el)[p];
const nRules=()=>{let n=0;for(const ss of document.styleSheets){try{n+=ss.cssRules.length}catch(e){}}return n};
const mk=(cls)=>{const e=document.createElement('div');e.className=cls;R.appendChild(e);return e};
const res={};
(async()=>{await tick(200);try{${corpo}}catch(e){res.excepcao=String(e)}
document.getElementById('out').textContent='@@'+JSON.stringify(res)+'@@';})();
</script></body></html>`
  const f = path.join(dir, 't.html')
  fs.writeFileSync(f, html)
  try {
    const out = execFileSync(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--window-size=1000,800', '--virtual-time-budget=60000', '--dump-dom', 'file://' + f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 90000 })
    const m = /@@(\{.*?\})@@/s.exec(out)
    assert.ok(m, 'sem resultado da página')
    return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('classes únicas desmontadas deixam de acumular regras', { skip: !CHROME && 'sem Chrome/Chromium' }, () => {
  const r = correr(`
    const base=nRules();
    const vivo=mk('p[41px] md:m[7px] rotate[0deg] scale[2]');
    let ult;
    for(let k=0;k<12;k++){R.querySelectorAll('.u').forEach(e=>e.remove());for(let i=0;i<500;i++){ult=mk('u w['+(1000+k*500+i)+'px]')}await tick(60)}
    await tick(2500);
    res.acumuladas=nRules()-base;
    res.ultimo=cs(ult,'width');res.vivoP=cs(vivo,'paddingTop');res.vivoM=cs(vivo,'marginTop');res.vivoT=cs(vivo,'transform');
    R.querySelectorAll('.u').forEach(e=>e.remove());await tick(100);
    res.removidas=BreezeCSS.coletar();
    const volta=mk('w[1000px]');await tick(100);res.volta=cs(volta,'width');
  `)
  assert.ok(r.acumuladas < 6000 * 0.8, 'regras acumuladas: ' + r.acumuladas + ' (sem limpeza seriam 6000)')
  assert.strictEqual(r.ultimo, '6999px', 'nó vivo continua estilizado')
  assert.strictEqual(r.vivoP, '41px')
  assert.strictEqual(r.vivoM, '7px')
  assert.strictEqual(r.vivoT, 'matrix(2, 0, 0, 2, 0, 0)')
  assert.ok(r.removidas > 0, 'coletar() manual remove regras')
  assert.strictEqual(r.volta, '1000px', 'classe removida que reaparece é re-inserida')
})

test('gcLimiar:0 desactiva a limpeza automática; safelist nunca é removida', { skip: !CHROME && 'sem Chrome/Chromium' }, () => {
  const r = correr(`
    BreezeCSS.reiniciar();BreezeCSS.init({safelist:['w[555px]'],gcLimiar:0});
    const base=nRules();
    for(let i=0;i<3000;i++)mk('w['+(2000+i)+'px]');await tick(100);R.innerHTML='';await tick(2500);
    res.semGc=nRules()-base;
    BreezeCSS.coletar();await tick(50);
    res.depois=nRules()-base;
    const e=mk('w[555px]');await tick(100);res.safe=cs(e,'width');
    res.temSafe=[].concat(...[...document.styleSheets].map(ss=>[...ss.cssRules])).filter(r=>r.cssText.includes('555px')).length;
  `)
  assert.ok(r.semGc >= 3000, 'sem GC automático a folha mantém as regras: +' + r.semGc)
  assert.ok(r.depois < 50, 'coletar() manual limpa: +' + r.depois)
  assert.strictEqual(r.safe, '555px')
  assert.ok(r.temSafe >= 1, 'regra da safelist preservada')
})
