'use strict'
// ─────────────────────────────────────────────────────────────────────────
// TESTES DE NAVEGADOR (Chromium real via playwright).
//
// Aqui os plugins correm com APIs reais: Canvas (mapa da refracção), SVG
// feDisplacementMap, ResizeObserver, IntersectionObserver, MutationObserver,
// eventos de scroll/load. Complementam os testes em VM (test/runtime-dom.test.js).
//
// O playwright é OPCIONAL: se não estiver instalado (não é dependência do
// breeze — zero deps npm), os testes são IGNORADOS com um aviso claro.
// Instalar para os correr:  npm i -g playwright && npx playwright install chromium
// ─────────────────────────────────────────────────────────────────────────

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const os = require('os')

const { CLI, MOTOR } = require('./helpers/exec')

// playwright é opcional — não é dependência do pacote
function tentarPlaywright() {
  const candidatos = ['playwright']
  if (process.env.PLAYWRIGHT_PATH) candidatos.unshift(process.env.PLAYWRIGHT_PATH)
  if (process.platform !== 'win32') {
    candidatos.push('/home/z/.npm-global/lib/node_modules/playwright')
    candidatos.push('/usr/local/lib/node_modules/playwright')
  }
  for (const c of candidatos) {
    try {
      return require(c)
    } catch (e) {
      /* seguir */
    }
  }
  return null
}

const playwright = tentarPlaywright()
const TEM_PLAYWRIGHT = !!(playwright && playwright.chromium)

test('navegador: ambiente disponível (chromium)', () => {
  if (!TEM_PLAYWRIGHT) {
    console.log(
      '\n  ⚠ testes de navegador PENDENTES — playwright/chromium não encontrado.\n' +
        '    Pendente verificar em browser real: Canvas da refracção, ResizeObserver,\n' +
        '    IntersectionObserver, animações SVG-SMIL dos backgrounds.\n' +
        '    Instalar com: npm i -g playwright && npx playwright install chromium',
    )
    test.skip('playwright indisponível — testes de navegador pendentes', () => {})
    return
  }
  assert.ok(true)
})

// ── preparar o projecto de fixtures uma vez para todos os testes ─────────
let dirFixtures = null
let navegador = null

async function projeto() {
  if (dirFixtures) return dirFixtures
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-browser-'))
  const origem = path.join(__dirname, 'fixtures')
  for (const f of fs.readdirSync(origem)) {
    fs.copyFileSync(path.join(origem, f), path.join(dir, f))
  }
  const r = execFileSync('node', [CLI, '--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], {
    cwd: dir,
    encoding: 'utf8',
  })
  if (!r || r.length === 0) throw new Error('build das fixtures falhou')
  dirFixtures = dir
  return dir
}

async function abrir(pagina) {
  const dir = await projeto()
  navegador = navegador || (await playwright.chromium.launch({ headless: true }))
  const contexto = await navegador.newContext()
  const erros = []
  const avisos = []
  const paginaB = await contexto.newPage()
  paginaB.on('pageerror', (e) => erros.push(String(e)))
  paginaB.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
    if (m.type() === 'warning') avisos.push(m.text())
  })
  await paginaB.goto('file://' + path.join(dir, pagina))
  return { dir, pagina: paginaB, erros, avisos, contexto }
}

async function comBrowser(fn) {
  try {
    return await fn()
  } finally {
    if (navegador) {
      await navegador.close()
      navegador = null
    }
    if (dirFixtures) {
      fs.rmSync(dirFixtures, { recursive: true, force: true })
      dirFixtures = null
    }
  }
}

test('navegador: plugins activos sem o bundle original e sem erros', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('plugins.html')
    await pagina.waitForTimeout(500)
    const estado = await pagina.evaluate(() => ({
      breezeCSS: typeof window.BreezeCSS,
      runtime: !!(window.__breezeRuntime && window.__breezeRuntime.plugins),
      plugins: window.__breezeRuntime ? window.__breezeRuntime.plugins : [],
      glass: typeof window.BreezeGlass,
      bundle: typeof window.__breezeCliSonda,
    }))
    assert.strictEqual(estado.breezeCSS, 'object', 'BreezeCSS definido (nunca "is not defined")')
    assert.ok(estado.runtime, '__breezeRuntime activo')
    assert.ok(estado.plugins.includes('progress'), 'progress activo: ' + estado.plugins)
    assert.ok(estado.plugins.includes('scrollbar'), 'scrollbar activo')
    assert.ok(estado.plugins.includes('backgrounds'), 'backgrounds activo')
    assert.strictEqual(estado.glass, 'object', 'glass exportado (a página usa glass-refract → efeito dinâmico)')
    assert.ok(!estado.plugins.includes('preloader'), 'preloader NÃO exportado (página não usa) — exportação seletiva')
    assert.ok(!estado.plugins.includes('dividers'), 'dividers NÃO exportado (só CSS, nunca gera JS)')
    assert.deepStrictEqual(erros, [], 'sem erros de consola: ' + erros.join(' | '))
  })
})

test('navegador: glass-refract gera o mapa de deslocamento (Canvas + SVG reais)', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('plugins.html')
    await pagina.waitForTimeout(700)
    const res = await pagina.evaluate(() => {
      const el = document.getElementById('glass-refract')
      return {
        url: el.style.getPropertyValue('--glass-refract-url'),
        filtros: document.querySelectorAll('svg filter feDisplacementMap').length,
      }
    })
    assert.ok(res.url.startsWith('url(#'), 'filtro SVG registado: ' + res.url)
    assert.ok(res.filtros >= 1, 'feDisplacementMap criado (Canvas/ResizeObserver reais)')
    assert.deepStrictEqual(erros, [], 'sem erros: ' + erros.join(' | '))
  })
})

test('navegador: barra de progresso segue o scroll da página', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('plugins.html')
    await pagina.waitForTimeout(400)
    const antes = await pagina.evaluate(() => document.querySelectorAll('[data-breeze-progress]').length)
    assert.ok(antes >= 1, 'barra criada pelo plugin original: ' + antes)
    await pagina.evaluate(() => window.scrollTo(0, 600))
    await pagina.waitForTimeout(300)
    const res = await pagina.evaluate(() => {
      const el = document.querySelector('.progress.progress-lg')
      const fill = el ? el : null
      return {
        progresso: el ? parseFloat(el.style.getPropertyValue('--progress')) : -1,
        hosts: document.querySelectorAll('[data-breeze-progress]').length,
      }
    })
    assert.ok(res.progresso >= 0 && res.progresso <= 1, '--progress actualizado pelo scroll: ' + res.progresso)
    assert.strictEqual(res.hosts, antes, 'nenhuma barra duplicada após o scroll')
    assert.deepStrictEqual(erros, [], 'sem erros')
  })
})

test('navegador: scrollbar aplica [data-breeze-scrollbar] e espelha body→html', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('plugins.html')
    await pagina.waitForTimeout(400)
    const res = await pagina.evaluate(() => ({
      el: document.getElementById('scroll-el').getAttribute('data-breeze-scrollbar'),
      larguraWebkit: getComputedStyle(document.getElementById('scroll-el'), '::-webkit-scrollbar').width,
    }))
    assert.strictEqual(res.el, '', 'atributo aplicado pelo runtime')
    assert.ok(res.larguraWebkit !== '' && res.larguraWebkit !== 'auto', 'WebKit estiliza a barra: ' + res.larguraWebkit)
    assert.deepStrictEqual(erros, [], 'sem erros')
  })
})

test('navegador: backgrounds gera o fundo (SVG/SMIL reais)', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('plugins.html')
    await pagina.waitForTimeout(700)
    const res = await pagina.evaluate(() => {
      const el = document.getElementById('bg-el')
      const id = el.getAttribute('data-cbg')
      const folhas = [...document.querySelectorAll('style[data-breeze="backgrounds"]')]
      return {
        id,
        folhas: folhas.length,
        temFundo: folhas.some((f) => f.textContent.includes('background-image')),
      }
    })
    assert.ok(res.id, 'elemento registado (data-cbg)')
    assert.ok(res.folhas >= 1 && res.temFundo, 'folha com background-image gerada pelo canvas interno')
    assert.deepStrictEqual(erros, [], 'sem erros')
  })
})

test('navegador: componentes com efeitos dinâmicos (ponte .card → glass-refract)', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('componentes.html')
    await pagina.waitForTimeout(700)
    const res = await pagina.evaluate(() => {
      const card = document.getElementById('card1')
      const cardR = document.getElementById('card2')
      return {
        glassCss: getComputedStyle(card).backdropFilter,
        refracao: (cardR.style.getPropertyValue('--glass-refract-url') || '').startsWith('url(#'),
        componentes: window.__breezeRuntime ? [...window.__breezeRuntime.componentes.keys()] : [],
      }
    })
    assert.ok(res.glassCss && res.glassCss !== 'none', '.card tem backdrop-filter (CSS do componente): ' + res.glassCss)
    assert.ok(res.refracao, 'refracção registada no elemento do COMPONENTE (ponte de componentes)')
    assert.ok(res.componentes.includes('card') && res.componentes.includes('card-refract'), 'componentes no runtime')
    assert.deepStrictEqual(erros, [], 'sem erros: ' + erros.join(' | '))
  })
})

test('navegador: preloader cria o overlay e remove-o no load', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('preloader.html')
    await pagina.waitForTimeout(300)
    const durante = await pagina.evaluate(() => ({
      overlay: document.querySelectorAll('[data-breeze-preloader]').length,
      ariaBusy: document.body.getAttribute('aria-busy'),
    }))
    assert.ok(durante.overlay >= 1, 'overlay criado')
    assert.strictEqual(durante.ariaBusy, 'true', 'aria-busy durante o carregamento')
    await pagina.waitForTimeout(1300)
    const fim = await pagina.evaluate(() => ({
      overlay: document.querySelectorAll('[data-breeze-preloader]').length,
      done: document.body.getAttribute('data-preloader'),
    }))
    assert.strictEqual(fim.overlay, 0, 'overlay removido')
    assert.strictEqual(fim.done, 'done', 'data-preloader=done')
    assert.deepStrictEqual(erros, [], 'sem erros')
  })
})

test('navegador: BreezeConfig/BreezeCSS.init do tempo do bundle continua compatível', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros, avisos } = await abrir('init.html')
    await pagina.waitForTimeout(500)
    const res = await pagina.evaluate(() => ({
      plugins: window.__breezeRuntime ? window.__breezeRuntime.plugins : [],
      glass: typeof window.BreezeGlass,
    }))
    assert.ok(res.plugins.includes('glass'), 'glass do BreezeConfig activo')
    assert.strictEqual(res.glass, 'object', 'BreezeGlass global disponível')
    assert.deepStrictEqual(erros, [], 'sem erros de referência: ' + erros.join(' | '))
  })
})

test('navegador: SPA — elementos montados/desmontados dinamicamente', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros } = await abrir('spa.html')
    await pagina.waitForTimeout(400)
    await pagina.evaluate(() => window.__montar())
    await pagina.waitForTimeout(400)
    const montado = await pagina.evaluate(() => ({
      hosts: document.querySelectorAll('[data-breeze-progress]').length,
      existe: !!document.getElementById('spa-prog'),
    }))
    assert.ok(montado.existe, 'elemento SPA montado')
    assert.ok(montado.hosts >= 1, 'MutationObserver detectou e criou a barra')
    await pagina.evaluate(() => window.__desmontar())
    await pagina.waitForTimeout(400)
    const limpo = await pagina.evaluate(() => document.querySelectorAll('[data-breeze-progress]').length)
    assert.strictEqual(limpo, 0, 'barra removida — limpeza correcta (sem fugas)')
    assert.deepStrictEqual(erros, [], 'sem erros')
  })
})

test('navegador: recarregar a página não duplica o runtime', async (t) => {
  if (!TEM_PLAYWRIGHT) t.skip('playwright indisponível')
  await comBrowser(async () => {
    const { pagina, erros, avisos } = await abrir('plugins.html')
    await pagina.waitForTimeout(300)
    await pagina.reload()
    await pagina.waitForTimeout(400)
    const duplicado = avisos.some((a) => a.includes('já estava carregado'))
    assert.ok(!duplicado, 'sem carga dupla do runtime')
    const contagem = await pagina.evaluate(
      () => (document.documentElement.outerHTML.match(/data-breeze-cli="runtime"/g) || []).length,
    )
    assert.strictEqual(contagem, 1, 'uma só referência gerida no HTML')
  })
})
