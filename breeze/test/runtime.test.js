'use strict'
// Testes do Runtime Builder: extracção do bundle + geração do ficheiro JS.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const raizPacote = path.join(__dirname, '..')
const runtimeJS = require(path.join(raizPacote, 'lib', 'runtime'))
const { executar, projetoTemporario, limpar, MOTOR } = require('./helpers/exec')

const fonteBundle = fs.readFileSync(MOTOR, 'utf8')

test('extracção: os 6 plugins existem no bundle com as versões certas', () => {
  const plugins = runtimeJS.extrairPlugins(fonteBundle)
  const nomes = plugins.map((p) => p.nome).sort()
  assert.deepStrictEqual(nomes, ['backgrounds', 'dividers', 'glass', 'preloader', 'progress', 'scrollbar'])
  const porNome = Object.fromEntries(plugins.map((p) => [p.nome, p]))
  assert.strictEqual(porNome.glass.global, 'BreezeGlass')
  assert.strictEqual(porNome.glass.versao, '1.0.0')
  assert.strictEqual(porNome.dividers.versao, '1.2.0')
  assert.strictEqual(porNome.progress.versao, '1.0.0')
  assert.strictEqual(porNome.scrollbar.versao, '1.0.0')
  assert.strictEqual(porNome.preloader.versao, '1.6.0')
  assert.strictEqual(porNome.backgrounds.versao, '1.5.0')
  for (const p of plugins) {
    assert.ok(p.fonte.includes('(function (global)'), `${p.nome} mantém o IIFE original`)
    assert.ok(p.fonte.length > 1000, `${p.nome} tem corpo`)
  }
})

test('extracção: nenhum código do motor entra no runtime', () => {
  const plugins = runtimeJS.extrairPlugins(fonteBundle)
  for (const p of plugins) {
    for (const marca of ['processarElementos', 'insertRule', '_construirConfig', 'BreezeCSS v2.2']) {
      assert.ok(!p.fonte.includes(marca), `${p.nome} não contém "${marca}"`)
    }
  }
})

test('geração: runtime com todos os plugins é sintaxe válida e contém os IIFEs', () => {
  const extraccao = runtimeJS.extrairPlugins(fonteBundle)
  const js = runtimeJS.construirRuntime({
    plugins: ['glass', 'dividers', 'progress', 'scrollbar', 'preloader', 'backgrounds'],
    componentes: {},
    prefix: '',
    cliVersao: '1.2.0-test',
    motorVersao: '2.2.5',
    extraccao,
    paginas: 2,
  })
  // sintaxe
  new vm.Script(js, { filename: 'runtime.test.js' })
  for (const g of ['BreezeGlass', 'BreezeDividers', 'BreezeProgress', 'BreezeScrollbar', 'BreezePreloader', 'BreezeBackgrounds']) {
    assert.ok(js.includes(`global.${g} = plugin`), `${g} auto-regista-se`)
  }
  assert.ok(js.includes('__breezeNucleo.arrancar('), 'arranque presente')
  assert.ok(js.includes('BreezeCSS'), 'compatibilidade BreezeCSS')
})

test('geração: runtime só com os plugins pedidos', () => {
  const extraccao = runtimeJS.extrairPlugins(fonteBundle)
  const js = runtimeJS.construirRuntime({
    plugins: ['progress'],
    componentes: { card: ['glass', 'p[20px]'] },
    prefix: 'bz-',
    cliVersao: '1.2.0-test',
    motorVersao: '2.2.5',
    extraccao,
    paginas: 1,
  })
  assert.ok(js.includes('BreezeProgress'), 'progress incluído')
  assert.ok(!js.includes('global.BreezeGlass = plugin'), 'glass NÃO incluído')
  assert.ok(!js.includes('global.BreezePreloader = plugin'), 'preloader NÃO incluído')
  // componentes e prefix embedados no meta
  assert.ok(js.includes('"card"'), 'componentes embedados')
  assert.ok(js.includes('"bz-"'), 'prefix embedado')
})

test('runtime num head-less: BreezeCSS e __breezeRuntime ficam definidos, sem erros', async () => {
  const { carregarRuntime } = require('./helpers/dom')
  const extraccao = runtimeJS.extrairPlugins(fonteBundle)
  const js = runtimeJS.construirRuntime({
    plugins: ['progress', 'scrollbar'],
    componentes: { card: ['glass', 'glass-refract'] },
    prefix: '',
    cliVersao: '1.2.0-test',
    motorVersao: '2.2.5',
    extraccao,
    paginas: 1,
  })
  const ficheiro = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'rt-')), 'r.runtime.js')
  fs.writeFileSync(ficheiro, js)
  const sandbox = await carregarRuntime(ficheiro)
  assert.strictEqual(typeof sandbox.BreezeCSS, 'object', 'BreezeCSS definido (nunca "is not defined")')
  assert.ok(sandbox.__breezeRuntime, 'API de inspecção')
  assert.deepStrictEqual([...sandbox.__breezeRuntime.plugins].sort(), ['progress', 'scrollbar'])
  assert.ok(sandbox.__erros.length === 0, 'sem erros: ' + sandbox.__erros.join(' | '))
  fs.rmSync(path.dirname(ficheiro), { recursive: true, force: true })
})

test('BreezeCSS.init() compatível: sem setup duplicado e sem crash', async () => {
  const { carregarRuntime } = require('./helpers/dom')
  const extraccao = runtimeJS.extrairPlugins(fonteBundle)
  const js = runtimeJS.construirRuntime({
    plugins: ['progress'],
    componentes: {},
    prefix: '',
    cliVersao: 't',
    motorVersao: '2.2.5',
    extraccao,
    paginas: 1,
  })
  const ficheiro = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'rt-')), 'r.runtime.js')
  fs.writeFileSync(ficheiro, js)
  const sandbox = await carregarRuntime(ficheiro)
  const antes = [...sandbox.__breezeRuntime.plugins].sort()
  // a página tinha um BreezeCSS.init(…) do tempo do bundle:
  sandbox.BreezeCSS.init({
    plugins: [sandbox.BreezeProgress, 'progress'], // objecto + string
    tema: { cores: { primaria: '#003' } },
  })
  await require('./helpers/dom').esperar(30)
  const depois = [...sandbox.__breezeRuntime.plugins].sort()
  assert.deepStrictEqual(depois, antes, 'sem setup duplicado')
  assert.ok(sandbox.__avisos.some((a) => a.includes('tema')), 'aviso do modo compilado sobre tema')
  assert.ok(sandbox.__erros.length === 0, 'sem erros: ' + sandbox.__erros.join(' | '))
  fs.rmSync(path.dirname(ficheiro), { recursive: true, force: true })
})

test('BreezeCSS.init({ log: false }) silencia os avisos do runtime', async () => {
  const { carregarRuntime, esperar } = require('./helpers/dom')
  const extraccao = runtimeJS.extrairPlugins(fonteBundle)
  const js = runtimeJS.construirRuntime({
    plugins: [],
    componentes: {},
    prefix: '',
    cliVersao: 't',
    motorVersao: '2.2.5',
    extraccao,
    paginas: 1,
  })
  const ficheiro = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'rt-')), 'r.runtime.js')
  fs.writeFileSync(ficheiro, js)
  const sandbox = await carregarRuntime(ficheiro)
  sandbox.BreezeCSS.init({ plugins: ['glass'], tema: { cores: { x: '#fff' } }, log: false })
  await esperar(30)
  assert.ok(!sandbox.__avisos.some((a) => a.includes('tema')), 'log:false silencia')
  assert.ok(sandbox.__erros.length === 0)
  fs.rmSync(path.dirname(ficheiro), { recursive: true, force: true })
})

test('addComponent em runtime alimenta a ponte de componentes', async () => {
  const { carregarRuntime } = require('./helpers/dom')
  const extraccao = runtimeJS.extrairPlugins(fonteBundle)
  const js = runtimeJS.construirRuntime({
    plugins: ['glass'],
    componentes: {},
    prefix: '',
    cliVersao: 't',
    motorVersao: '2.2.5',
    extraccao,
    paginas: 1,
  })
  const ficheiro = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'rt-')), 'r.runtime.js')
  fs.writeFileSync(ficheiro, js)
  const sandbox = await carregarRuntime(ficheiro)
  // página regista um componente EM RUNTIME
  sandbox.BreezeCSS.addComponent('card', ['glass', 'glass-refract'])
  // elemento com o componente, SEM classes do glass directamente
  const card = sandbox.document.createElement('div')
  card.setAttribute('class', 'card')
  card._vars = { '--glass-refract-px': '16' }
  card.offsetWidth = 300
  card.offsetHeight = 120
  card.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 120, width: 300, height: 120 })
  sandbox.document.body.appendChild(card)
  // o scan do plugin original ([class*="glass-refract"]) deve VER o card
  const vista = sandbox.document.querySelectorAll('[class*="glass-refract"]')
  assert.ok(vista.includes(card), 'ponte de componentes: card visto pelo scan do Glass')
  await require('./helpers/dom').esperar(30)
  // refracção registada: var --glass-refract-url + filtro SVG no body
  assert.ok(
    (card.style.getPropertyValue('--glass-refract-url') || '').includes('url(#'),
    'refracção registada no elemento do componente',
  )
  fs.rmSync(path.dirname(ficheiro), { recursive: true, force: true })
})

test('CLI: runtime só nas páginas com plugins dinâmicos; CSS-only não gera runtime', () => {
  const dir = projetoTemporario({
    'estatico.html': '<!doctype html><html><body class="p[20px] flex bg[#eee]">x</body></html>',
    'dinamico.html':
      '<!doctype html><html><body class="progress"><main class="custom-bg[topo]">x</main></body></html>',
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    assert.ok(fs.existsSync(path.join(dir, 'css/dinamico.css')))
    assert.ok(fs.existsSync(path.join(dir, 'css/estatico.css')))
    assert.ok(fs.existsSync(path.join(dir, 'js/dinamico.runtime.js')), 'runtime da página dinâmica')
    assert.ok(!fs.existsSync(path.join(dir, 'js/estatico.runtime.js')), 'página só-CSS sem runtime')
    assert.ok(!fs.existsSync(path.join(dir, 'js/breeze.shared.runtime.js')), 'sem runtime partilhado')
  } finally {
    limpar(dir)
  }
})

test('CLI: --no-runtime não gera JavaScript', () => {
  const dir = projetoTemporario({
    'a.html': '<!doctype html><html><body class="progress">x</body></html>',
  })
  try {
    const r = executar(['--split', '--no-runtime', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    assert.ok(!fs.existsSync(path.join(dir, 'js')), 'pasta js/ não criada')
  } finally {
    limpar(dir)
  }
})
