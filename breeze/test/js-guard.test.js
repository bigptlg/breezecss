'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const { protegerCodigo, protegerChamadasBreeze } = require('../lib/js-guard')

test('guard: protege apenas chamadas BreezeCSS e preserva scripts no mesmo bloco', () => {
  const fonte = `
BreezeCSS.init({ plugins: [BreezeGlass], tema: { cores: { primaria: '#003' } } });
BreezeCSS.addComponent('card', ['glass', 'p[20px]']);
Emerge.init();
window.addEventListener('load', () => Emerge.refresh());
window.ano = 2026;
`
  const res = protegerCodigo(fonte)
  assert.equal(res.protegidas, 2)
  assert.equal((res.codigo.match(/if \(typeof BreezeCSS !== 'undefined'\)/g) || []).length, 2)
  const chamadas = []
  const contexto = {
    Emerge: { init: () => chamadas.push('emerge'), refresh: () => chamadas.push('refresh') },
    window: { addEventListener: (evento, fn) => { chamadas.push(evento); fn() } },
  }
  vm.runInNewContext(res.codigo, contexto)
  assert.deepEqual(chamadas, ['emerge', 'load', 'refresh'])
  assert.equal(contexto.window.ano, 2026)
  assert.match(res.codigo, /tema: \{ cores: \{ primaria: '#003' \} \}/)
})

test('guard: chamadas em linha e sem ponto-e-vírgula', () => {
  const res = protegerCodigo(`BreezeCSS.init({}) ; Emerge.init();\nBreezeCSS.addComponent('x', [])\nEmerge.refresh()`)
  assert.equal(res.protegidas, 2)
  const chamadas = []
  vm.runInNewContext(res.codigo, { Emerge: { init: () => chamadas.push('init'), refresh: () => chamadas.push('refresh') } })
  assert.deepEqual(chamadas, ['init', 'refresh'])
})

test('guard: idempotente e não mexe em strings, comentários, expressões ou scripts externos', () => {
  const html = `<!doctype html><html><body>
<script src="outro.js"></script>
<script type="application/json">{"codigo":"BreezeCSS.init({})"}</script>
<script>
// BreezeCSS.init({});
const texto = 'BreezeCSS.init({})';
const valor = typeof BreezeCSS !== 'undefined' ? BreezeCSS.init({}) : null;
BreezeCSS.init({ tema: { cores: { terceira: '#fff' } } });
Emerge.init();
</script></body></html>`
  const um = protegerChamadasBreeze(html)
  const dois = protegerChamadasBreeze(um.html)
  assert.equal(um.protegidas, 1)
  assert.equal(dois.protegidas, 0)
  assert.equal(dois.html, um.html)
  assert.match(um.html, /<script src="outro.js"><\/script>/)
  assert.match(um.html, /const texto = 'BreezeCSS.init\(\{\}\)'/)
  assert.match(um.html, /const valor = typeof BreezeCSS/)
})

test('guard: não envolve chamadas que fazem parte de expressões ou retornos', () => {
  const codigo = `const valor = BreezeCSS.init({});\nfunction f() { return BreezeCSS.init({}); }\nBreezeCSS.init({});`
  const res = protegerCodigo(codigo)
  assert.equal(res.protegidas, 1)
  assert.match(res.codigo, /const valor = BreezeCSS\.init/)
  assert.match(res.codigo, /return BreezeCSS\.init/)
})
