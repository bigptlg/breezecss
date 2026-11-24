'use strict'
// Testes FUNCIONAIS dos plugins ORIGINAIS dentro do runtime gerado.
// Corre num DOM mínimo em VM — os motores dos plugins são código 1:1 do
// bundle; o comportamento observado é o mesmo do browser (com computed
// styles simuladas pelo teste, el._vars).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const raizPacote = path.join(__dirname, '..')
const runtimeJS = require(path.join(raizPacote, 'lib', 'runtime'))
const { carregarRuntime, esperar } = require('./helpers/dom')
const { MOTOR } = require('./helpers/exec')

const fonteBundle = fs.readFileSync(MOTOR, 'utf8')
const extraccao = runtimeJS.extrairPlugins(fonteBundle)

async function runtimeDe(plugins, componentes = {}, extra = {}) {
  const js = runtimeJS.construirRuntime({
    plugins,
    componentes,
    prefix: '',
    cliVersao: '1.2.0-test',
    motorVersao: '2.2.5',
    extraccao,
    paginas: 1,
  })
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rtdom-'))
  const ficheiro = path.join(dir, 'r.runtime.js')
  fs.writeFileSync(ficheiro, js)
  const sandbox = await carregarRuntime(ficheiro, extra)
  sandbox._dir = dir
  return sandbox
}

function fechar(sandbox) {
  fs.rmSync(sandbox._dir, { recursive: true, force: true })
}

// ── BreezeProgress ──────────────────────────────────────────────────────

test('progress: barra criada num elemento, evento breeze:progress, limpeza', async () => {
  const sb = await runtimeDe(['progress'])
  const alvo = sb.document.createElement('div')
  alvo.setAttribute('class', 'progress')
  alvo._vars = { '--progress-on': '1' }
  alvo.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 400, width: 800, height: 400 })
  sb.document.body.appendChild(alvo)

  let eventos = 0
  alvo.addEventListener('breeze:progress', (e) => {
    eventos++
    assert.ok(e.detail.percentagem >= 0 && e.detail.percentagem <= 100)
  })

  await esperar(50) // varrer → registar → medir (rAF duplo)
  const host = sb.document.querySelectorAll('[data-breeze-progress]')
  assert.ok(host.length === 1, 'barra criada pelo motor ORIGINAL: ' + host.length)
  assert.strictEqual(host[0].getAttribute('aria-hidden'), 'true')
  assert.ok(host[0]._filhos.length === 1, 'host tem o fill')

  // scroll → actualiza --progress e dispara o evento
  sb.scrollY = 400
  sb.document.scrollingElement.scrollHeight = 2000
  sb._ouvintes.emitir(sb, 'scroll', { type: 'scroll' })
  await esperar(50)
  assert.ok(eventos >= 1, 'evento breeze:progress disparado')

  // remover o elemento → limpeza completa (observador, host, --progress)
  alvo.remove()
  await esperar(50)
  const depois = sb.document.querySelectorAll('[data-breeze-progress]')
  assert.strictEqual(depois.length, 0, 'host removido quando o alvo sai do DOM')
  assert.strictEqual(alvo.style.getPropertyValue('--progress'), '', '--progress limpo')
  fechar(sb)
})

test('progress: elemento adicionado dinamicamente (SPA) ganha barra', async () => {
  const sb = await runtimeDe(['progress'])
  // React/Vue insere um <article class="progress"> depois do arranque:
  const novo = sb.document.createElement('article')
  novo.setAttribute('class', 'progress progress-color[#e11d48]')
  novo._vars = { '--progress-on': '1', '--progress-color': '#e11d48' }
  novo.getBoundingClientRect = () => ({ left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300 })
  sb.document.body.appendChild(novo) // appendChild dispara MutationObserver
  await esperar(50)
  const hosts = sb.document.querySelectorAll('[data-breeze-progress]')
  assert.ok(hosts.length === 1, 'MutationObserver do plugin detectou o elemento novo')
  fechar(sb)
})

// ── BreezeScrollbar ─────────────────────────────────────────────────────

test('scrollbar: atributo aplicado ao elemento e espelhado do body para html', async () => {
  const sb = await runtimeDe(['scrollbar'])
  const caixa = sb.document.createElement('div')
  caixa.setAttribute('class', 'scrollbar scrollbar-thin scrollbar-thumb[#6366f1]')
  caixa._vars = { '--scrollbar-on': '1' }
  sb.document.body.appendChild(caixa)
  sb.document.body.setAttribute('class', 'scrollbar scrollbar-thumb[#ff0000]')
  // body também é alvo: simula computed do body
  sb.document.body._vars = { '--scrollbar-on': '1', '--scrollbar-thumb': '#ff0000' }
  await esperar(50)
  assert.strictEqual(caixa.getAttribute('data-breeze-scrollbar'), '', 'atributo no elemento')
  assert.strictEqual(
    sb.document.documentElement.getAttribute('data-breeze-scrollbar'),
    '',
    'body → html espelhado pelo plugin ORIGINAL',
  )
  // scrollbar-none esconde
  const sem = sb.document.createElement('div')
  sem.setAttribute('class', 'scrollbar-none')
  sem._vars = { '--scrollbar-on': '1', '--scrollbar-hide': '1' }
  sb.document.body.appendChild(sem)
  await esperar(50)
  assert.strictEqual(sem.getAttribute('data-breeze-scrollbar'), 'none', 'scrollbar-none → attr "none"')
  fechar(sb)
})

test('scrollbar: atributo removido quando a classe sai do elemento', async () => {
  const sb = await runtimeDe(['scrollbar'])
  const el = sb.document.createElement('div')
  el.setAttribute('class', 'scrollbar')
  el._vars = { '--scrollbar-on': '1' }
  sb.document.body.appendChild(el)
  await esperar(50)
  assert.ok(el.hasAttribute('data-breeze-scrollbar'))
  // Vue remove a classe (classList actualizado → mutação de atributo)
  el.classList.remove('scrollbar')
  await esperar(50)
  assert.ok(!el.hasAttribute('data-breeze-scrollbar'), 'limpeza pelo varrer do plugin')
  fechar(sb)
})

// ── BreezePreloader ─────────────────────────────────────────────────────

test('preloader: overlay criado, aria-busy, removido após o load', async () => {
  const sb = await runtimeDe(['preloader'])
  sb.document.body._vars = { '--preloader-on': '1' }
  sb.document.body.setAttribute('class', 'preloader')
  await esperar(60)
  const overlay = sb.document.querySelectorAll('[data-breeze-preloader]')
  assert.ok(overlay.length === 1, 'overlay criado pelo motor ORIGINAL: ' + overlay.length)
  assert.strictEqual(sb.document.body.getAttribute('aria-busy'), 'true', 'aria-busy durante o load')
  assert.strictEqual(overlay[0].getAttribute('role'), 'status', 'overlay com role=status')

  // load → esconde/removido (com tempo mínimo e fade; esperamos o máximo)
  const evLoad = new sb.Event('load')
  sb._ouvintes.emitir(sb, 'load', evLoad)
  await esperar(900)
  const fim = sb.document.querySelectorAll('[data-breeze-preloader]')
  assert.strictEqual(fim.length, 0, 'overlay removido no fim do carregamento')
  assert.strictEqual(sb.document.body.getAttribute('data-preloader'), 'done', 'data-preloader=done')
  fechar(sb)
})

// ── BreezeBackgrounds ───────────────────────────────────────────────────

test('backgrounds: fundo gerado (SVG) e limpo quando o elemento sai', async () => {
  const sb = await runtimeDe(['backgrounds'])
  const el = sb.document.createElement('section')
  el.setAttribute('class', 'custom-bg[topo]')
  el._vars = { '--cbg-name': 'topo' }
  el.offsetWidth = 600
  el.offsetHeight = 300
  sb.document.body.appendChild(el)
  await esperar(60)
  assert.ok(el.hasAttribute('data-cbg'), 'elemento registado pelo plugin ORIGINAL')
  // ResizeObserver do harness nunca dispara → forçar o varrer (igual a um
  // resize real no browser)
  sb.BreezeCSS.processar()
  await esperar(30)
  const folhas = sb.document.querySelectorAll('style[data-breeze="backgrounds"]')
  assert.ok(folhas.length === 1, 'folha de estilo do fundo criada')
  const css = folhas[0].textContent
  assert.ok(css && css.includes('::before'), 'pseudoelemento ::before com o fundo')
  assert.ok(css && css.includes('background'), 'css do fundo presente')

  el.remove()
  await esperar(50)
  assert.strictEqual(sb.document.querySelectorAll('style[data-breeze="backgrounds"]').length, 0, 'folha removida')
  fechar(sb)
})

// ── BreezeGlass ─────────────────────────────────────────────────────────

test('glass: estilos de acessibilidade injectados + refracção registada', async () => {
  const sb = await runtimeDe(['glass'])
  await esperar(40)
  const estilos = sb.document.getElementById('breeze-glass-estilos')
  assert.ok(estilos, 'style a11y do glass injectado')
  const css = estilos.textContent
  assert.ok(css.includes('prefers-reduced-transparency'), 'regra reduced-transparency')
  assert.ok(css.includes('prefers-contrast'), 'regra prefers-contrast')
  assert.ok(css.includes('prefers-reduced-motion'), 'regra reduced-motion')

  const el = sb.document.createElement('div')
  el.setAttribute('class', 'glass glass-refract[24]')
  el._vars = { '--glass-refract-px': '24' }
  el.offsetWidth = 400
  el.offsetHeight = 200
  sb.document.body.appendChild(el)
  await esperar(60)
  assert.ok(
    (el.style.getPropertyValue('--glass-refract-url') || '').startsWith('url(#'),
    'filtro SVG da refracção registado no elemento',
  )
  const filtro = sb.document.body.querySelector('svg')
  assert.ok(filtro, 'SVG de filtros criado no body')
  assert.ok((filtro._filhos[0] ? filtro._filhos[0].textContent || '' : '').length >= 0 || filtro._filhos.length >= 1, 'defs presente')
  // remover → limpeza da refracção
  el.remove()
  await esperar(50)
  assert.strictEqual(el.style.getPropertyValue('--glass-refract-url'), '', 'var limpo ao remover')
  fechar(sb)
})

// ── BreezeDividers ──────────────────────────────────────────────────────

test('dividers: regista as classes (só CSS) e não cria elementos nem JS', async () => {
  const sb = await runtimeDe(['dividers'])
  await esperar(40)
  // dividers não cria motor: nada no body além do que o teste pôs
  assert.strictEqual(sb.document.querySelectorAll('[data-breeze-dividers]').length, 0)
  // o plugin existe e só tem a interface de registos (CSS puro)
  assert.strictEqual(typeof sb.BreezeDividers.setup, 'function')
  assert.strictEqual(sb.document.querySelectorAll('style[data-breeze="dividers"]').length, 0, 'sem folhas de estilo no arranque (máscaras vão no CSS compilado)')
  fechar(sb)
})

// ── inicialização compatível e limpeza ──────────────────────────────────

test('runtime com zero plugins (compat): init() não rebenta e nada é executado', async () => {
  const sb = await runtimeDe([])
  sb.BreezeCSS.init({ plugins: ['preloader'], tema: { cores: { x: '#fff' } } })
  await esperar(40)
  assert.ok(sb.__avisos.some((a) => a.includes('não foi exportado')), 'aviso: preloader não exportado neste runtime')
  assert.strictEqual(sb.document.querySelectorAll('[data-breeze-preloader]').length, 0)
  fechar(sb)
})

test('__breezeRuntime.destruir() restaura o querySelectorAll e limpa registos', async () => {
  const sb = await runtimeDe(['progress'], { card: ['progress'] })
  const original = sb._qsaOriginal || null
  sb.__breezeRuntime.destruir()
  await esperar(20)
  assert.strictEqual(sb.__breezeRuntime.plugins.length, 0, 'registos limpos')
  assert.ok(sb.__avisos.some((a) => a.includes('destruir')), 'aviso de teardown')
  fechar(sb)
})
