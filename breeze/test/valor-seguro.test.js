'use strict'
// Valores arbitrários perigosos: o motor rejeita-os e o CLI DEVE dizê-lo
// (diagnóstico `valor-perigoso`) — antes a classe desaparecia sem aviso e
// `--strict` saía com 0.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const { motivoInseguro } = require('../lib/valor-seguro')
const diagnostico = require('../lib/diagnostico')
const { executar, projetoTemporario, limpar, MOTOR } = require('./helpers/exec')

const PERIGOSOS = [
  '1px</style><script>alert(1)</script>',
  '1px</STYLE>',
  'red/*',
  '1px}body{display:none',
  '1px;color:red',
  '1px}@import_url(//evil.css);a{',
  '(1px',
  '1px)',
  '"abc',
  '1px\\',
]
const SEGUROS = [
  '1px',
  'calc(1px_+_2px)',
  'var(--x)',
  'url(data:image/png;base64,AAAA)',
  'url(/a/*b.png)',
  "'a;b'",
  'red/**/',
]

test('motivoInseguro: perigosos têm motivo, seguros dão null', () => {
  for (const v of PERIGOSOS) assert.ok(motivoInseguro(v), v + ' deve ser inseguro')
  for (const v of SEGUROS) assert.strictEqual(motivoInseguro(v), null, v + ' deve ser seguro')
})

test('analisarClasse devolve valor-perigoso (e só para valores inseguros)', () => {
  const cfg = { prefix: '', variantes: { hover: ':hover' }, breakpoints: { md: '768px' }, classesFixas: {}, mapaPropriedades: { p: 'padding', bg: 'background-color' }, transformPrefixos: [] }
  for (const v of PERIGOSOS.filter((x) => !/[()"\\]/.test(x))) {
    const r = diagnostico.analisarClasse('hover:p[' + v + ']', cfg)
    assert.ok(r && r.codigo === 'valor-perigoso', v + ' → ' + JSON.stringify(r))
  }
  for (const v of ['1px', 'calc(1px_+_2px)', 'var(--x)']) {
    const r = diagnostico.analisarClasse('p[' + v + ']', cfg)
    assert.ok(!r || r.codigo !== 'valor-perigoso', v + ' não pode ser valor-perigoso')
  }
})

test('paridade com o motor: o que o CLI diz perigoso nunca chega ao CSS', () => {
  const alvo = PERIGOSOS.filter((x) => !/[\\"]/.test(x) && !x.includes(' '))
  const classes = alvo.map((v) => 'p[' + v.replace(/\]/g, '') + ']')
  const dir = projetoTemporario({
    'index.html': '<div class="' + classes.join(' ') + ' m[3px] w[calc(1px_+_2px)]"></div>',
  })
  try {
    const res = executar(['--engine', MOTOR, '--no-cache'], { cwd: dir })
    const css = fs.readFileSync(path.join(dir, 'css', 'breeze.css'), 'utf8')
    assert.ok(/margin:\s*3px/.test(css), 'classe segura emitida')
    assert.ok(/width:\s*calc\(1px \+ 2px\)/.test(css), 'calc seguro emitido')
    for (const marca of ['alert(1)', 'display:none', 'color:red', '@import', 'evil.css']) {
      assert.ok(!css.includes(marca), 'CSS não pode conter ' + marca)
    }
    assert.match(res.saida, /valor-perigoso/, 'relatório menciona valor-perigoso')
  } finally {
    limpar(dir)
  }
})

test('--strict sai com 1 quando há valor perigoso; sem ele, com 0', () => {
  const mau = projetoTemporario({ 'index.html': '<div class="bg[red/*] p[1px]"></div>' })
  const bom = projetoTemporario({ 'index.html': '<div class="bg[red] p[1px]"></div>' })
  try {
    const a = executar(['--strict', '--engine', MOTOR, '--no-cache'], { cwd: mau })
    assert.strictEqual(a.ok, false, '--strict deve falhar')
    assert.match(a.saida, /valor-perigoso/)
    const b = executar(['--strict', '--engine', MOTOR, '--no-cache'], { cwd: bom })
    assert.ok(b.ok, 'projecto limpo passa: ' + b.saida)
  } finally {
    limpar(mau)
    limpar(bom)
  }
})
