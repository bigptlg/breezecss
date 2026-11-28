'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/engine.js
//
// Hospedeiro do motor BreezeCSS REAL (breeze.bundle.js) dentro de uma VM
// Node. Em vez de reimplementar o parser de classes, o CLI executa o
// próprio motor com shims DOM mínimos e usa:
//
//   • BreezeCSS.init(config)  → registra plugins, tema, prefix, safelist
//   • BreezeCSS.build(html)   → modo offline: devolve o CSS como string
//
// Truques de estabilidade:
//   • document.body = null     → os motores dos plugins (progress, scrollbar,
//     preloader, backgrounds, refracção do glass) ficam inertes — só as
//     CLASSES registadas (CSS) são geradas.
//   • ResizeObserver não existe→ a refracção do glass nunca arranca.
//   • MutationObserver no-op  → nenhuma observação de mutações em Node.
//   • document.readyState     → 'loading' durante o load do bundle (o
//     auto-init fica adiado) e depois 'complete' + evento DOMContentLoaded
//     disparado manualmente, com a BreezeConfig já preparada pelo CLI.
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { cssEscape } = require('./escape')
const { parseHTML } = require('./htmlscan')

const PLUGIN_GLOBALS = {
  glass: 'BreezeGlass',
  dividers: 'BreezeDividers',
  progress: 'BreezeProgress',
  scrollbar: 'BreezeScrollbar',
  preloader: 'BreezePreloader',
  backgrounds: 'BreezeBackgrounds',
}

// ─────────────────────────────────────────────────────────────────────────
// Versão mínima do motor suportada pelo CLI (política de versões).
// O motor 2.3.0 introduz group-hover:/peer-*: e breakpoints máximos
// (max-md: …); com motores anteriores essas classes eram descartadas em
// silêncio — por isso o CLI recusa motores abaixo desta versão (ver
// --force-engine no README).
// ─────────────────────────────────────────────────────────────────────────
const MOTOR_VERSAO_MINIMA = '2.3.0'

/** Compara duas versões "x.y.z"; devolve -1, 0 ou 1. */
function compararVersoes(a, b) {
  const pa = String(a || '0').split('.').map((x) => parseInt(x, 10) || 0)
  const pb = String(b || '0').split('.').map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1
  }
  return 0
}

/**
 * Lê a versão do motor do cabeçalho do bundle ("BreezeCSS x.y.z").
 * Devolve a versão como string ou null se não estiver lá escrita.
 */
function versaoDeBundle(caminho) {
  let fonte
  try {
    fonte = fs.readFileSync(path.resolve(String(caminho)), 'utf8')
  } catch (e) {
    return null
  }
  const m = /BreezeCSS\s+(\d+\.\d+\.\d+)/.exec(fonte.slice(0, 4000))
  return m ? m[1] : null
}

/** Insere o prefixo no nome-base de uma classe (após hover:/md:, antes do nome). */
function prefixarClasse(c, pf) {
  if (!pf) return c
  let dentro = false
  let corte = 0
  for (let i = 0; i < c.length; i++) {
    if (c[i] === '[') dentro = true
    if (c[i] === ']') dentro = false
    if (c[i] === ':' && !dentro) corte = i + 1
  }
  const quals = c.slice(0, corte)
  let base = c.slice(corte)
  const imp = base.endsWith('!')
  if (imp) base = base.slice(0, -1)
  if (base.startsWith(pf)) return quals + base + (imp ? '!' : '')
  return quals + pf + base + (imp ? '!' : '')
}

function criarElementoSandbox(tag) {
  const attrs = {}
  const el = {
    tagName: String(tag).toLowerCase(),
    id: '',
    style: {},
    textContent: '',
    sheet: {
      rules: [],
      insertRule(regra) {
        this.rules.push(regra)
      },
      deleteRule(i) {
        this.rules.splice(i, 1)
      },
      get cssRules() {
        return this.rules
      },
    },
    setAttribute(n, v) {
      attrs[String(n).toLowerCase()] = String(v)
    },
    getAttribute(n) {
      const v = attrs[String(n).toLowerCase()]
      return v === undefined ? null : v
    },
    hasAttribute(n) {
      return String(n).toLowerCase() in attrs
    },
    removeAttribute(n) {
      delete attrs[String(n).toLowerCase()]
    },
    appendChild(c) {
      return c
    },
    removeChild(c) {
      return c
    },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
  }
  Object.defineProperty(el, 'className', {
    get() {
      return attrs.class || ''
    },
    set(v) {
      attrs.class = String(v)
    },
  })
  Object.defineProperty(el, 'classList', {
    get() {
      const lista = (attrs.class || '').trim().split(/\s+/).filter(Boolean)
      lista.contains = (c) => lista.indexOf(c) !== -1
      return lista
    },
  })
  Object.defineProperty(el, 'attributes', {
    get() {
      return attrs
    },
  })
  el._attrs = attrs
  return el
}

function criarHospedeiro({ caminhoBundle, config, verboso = false }) {
  const caminhoAbs = path.resolve(caminhoBundle)
  let fonte
  try {
    fonte = fs.readFileSync(caminhoAbs, 'utf8')
  } catch (e) {
    throw new Error('Não foi possível ler o motor: ' + caminhoAbs)
  }

  const avisos = []
  const erros = []
  const ouvintesDOM = []
  let ultimosElementos = []

  // ── shims ────────────────────────────────────────────────────────────
  const sandbox = {}
  sandbox.window = sandbox
  sandbox.self = sandbox
  sandbox.globalThis = sandbox

  sandbox.console = {
    log(...a) {
      // O Logger do motor escreve tudo via console.log com etiquetas.
      const etiqueta = typeof a[0] === 'string' ? a[0] : ''
      if (etiqueta.includes('[AVISO]')) avisos.push(a.slice(3).map(String).join(' '))
      else if (etiqueta.includes('[ERRO]')) erros.push(a.slice(3).map(String).join(' '))
    },
    warn() {},
    error(...a) {
      erros.push(a.map(String).join(' '))
    },
    info() {},
    debug() {},
  }

  sandbox.CSS = {
    escape: cssEscape,
    registerProperty() {},
    supports: require("./value-validation").supports,
  }

  sandbox.document = {
    readyState: 'loading', // adia o auto-init do bundle
    head: {
      children: [],
      appendChild(el) {
        this.children.push(el)
        return el
      },
      removeChild(el) {
        return el
      },
    },
    body: null, // ← mantém os motores dos plugins inertes
    documentElement: { style: {}, nodeType: 9 },
    createElement(tag) {
      return criarElementoSandbox(tag)
    },
    createElementNS(ns, tag) {
      return criarElementoSandbox(tag)
    },
    querySelector() {
      return null
    },
    querySelectorAll() {
      return []
    },
    getElementById(id) {
      for (const el of this.head.children) {
        if (el && el.id === id) return el
      }
      return null
    },
    addEventListener(tipo, fn) {
      if (tipo === 'DOMContentLoaded') ouvintesDOM.push(fn)
    },
    removeEventListener() {},
  }

  sandbox.DOMParser = class {
    parseFromString(html, tipo) {
      const els = parseHTML(String(html))
      ultimosElementos = els
      return {
        querySelectorAll(sel) {
          if (sel === '*') return els.slice()
          if (typeof sel !== 'string' || !sel) return []
          if (sel[0] === '.') {
            const cls = sel.slice(1)
            return els.filter((e) => e.classList.contains(cls))
          }
          const m = /\[class\*="([^"]+)"\]/.exec(sel)
          if (m) return els.filter((e) => (e.attrs.class || '').includes(m[1]))
          return []
        },
        documentElement: { style: {} },
        head: null,
        body: null,
      }
    }
  }

  sandbox.MutationObserver = class {
    constructor(cb) {}
    observe() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }

  sandbox.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0)
  sandbox.cancelAnimationFrame = (id) => clearTimeout(id)
  sandbox.setTimeout = setTimeout
  sandbox.clearTimeout = clearTimeout
  sandbox.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => '' })
  sandbox.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9 }
  sandbox.navigator = { userAgent: 'BreezeCLI/1.1 Node' }
  sandbox.addEventListener = function () {}
  sandbox.removeEventListener = function () {}
  sandbox.__breezeCli = true

  // ── carregar o motor ─────────────────────────────────────────────────
  const contexto = vm.createContext(sandbox)
  try {
    vm.runInContext(fonte, contexto, { filename: path.basename(caminhoAbs) })
  } catch (e) {
    throw new Error('Falha ao executar o motor BreezeCSS: ' + e.message)
  }

  const BreezeCSS = sandbox.BreezeCSS
  if (!BreezeCSS || typeof BreezeCSS.build !== 'function') {
    throw new Error(
      'O ficheiro do motor não expõe BreezeCSS.build() — esperado breeze.bundle.js ≥ 2.2.2 em: ' +
        caminhoAbs,
    )
  }

  // ── plugins pedidos ──────────────────────────────────────────────────
  const pluginsPedidos = (config && config.plugins) || null // null = todos
  const plugins = [
    // sonda: captura a config interna (para o CLI validar classes/reportar)
    {
      nome: 'breeze-cli-sonda',
      versao: '0.0.0',
      setup(ctx) {
        sandbox.__breezeConfigInterna = ctx.config
      },
    },
  ]
  const pluginsActivos = []
  if (pluginsPedidos !== false && pluginsPedidos !== undefined) {
    for (const nome of pluginsPedidos === null ? Object.keys(PLUGIN_GLOBALS) : pluginsPedidos) {
      const globalNome = PLUGIN_GLOBALS[nome]
      if (!globalNome) {
        throw new Error(
          `Plugin desconhecido: "${nome}". Disponíveis: ${Object.keys(PLUGIN_GLOBALS).join(', ')}`,
        )
      }
      const plugin = sandbox[globalNome]
      if (plugin) {
        plugins.push(plugin)
        pluginsActivos.push(nome)
      } else if (verboso) {
        avisos.push(`plugin "${nome}" não existe neste bundle (global ${globalNome} ausente)`)
      }
    }
  }

  // ── init com a config final ──────────────────────────────────────────
  sandbox.BreezeConfig = {
    ...(config || {}),
    plugins,
    log: true, // deixa o Logger escrever; o console shim filtra AVISO/ERRO
  }
  sandbox.document.readyState = 'complete'
  for (const fn of ouvintesDOM) {
    try {
      fn()
    } catch (e) {
      throw new Error('Falha no arranque do BreezeCSS: ' + (e && e.message))
    }
  }

  const configInterna = sandbox.__breezeConfigInterna || null
  const prefixoMotor = (config && config.prefix) || ''
  const componentes = new Map() // nome no HTML → classes[]

  /** Regista um componente (igual a BreezeCSS.addComponent no browser). */
  function registarComponente(nome, classes) {
    const api = sandbox.BreezeCSS
    if (!api || typeof api.addComponent !== 'function') {
      avisos.push(`addComponent indisponível neste motor — componente "${nome}" ignorado`)
      return false
    }
    try {
      api.addComponent(nome, classes)
    } catch (e) {
      avisos.push(`componente "${nome}" não registado: ${e.message}`)
      return false
    }
    const nomeHTML = prefixoMotor && !nome.startsWith(prefixoMotor) ? prefixoMotor + nome : nome
    if (nomeHTML !== nome) {
      // Alias com prefixo (bz-btn) — o motor não prefixa componentes sozinho,
      // nem os membros: com prefixo, os membros têm de ser bz-p[15px], etc.
      const membros = classes.map((c) => prefixarClasse(c, prefixoMotor))
      try {
        api.addComponent(nomeHTML, membros)
      } catch (e) {
        avisos.push(`componente "${nomeHTML}" não registado: ${e.message}`)
      }
    }
    componentes.set(nomeHTML, classes)
    // Alias sem prefixo também, para HTML misto com/sem prefixo
    if (nomeHTML !== nome && !componentes.has(nome)) componentes.set(nome, classes)
    return true
  }

  /**
   * Gera as regras de VARIANTE dos componentes (ex.: .btn:hover { transform: … }).
   * O motor emite-as com [data-breeze-id="bN"] — este micro-build usa um
   * elemento por componente, com uma única classe, para o mapeamento
   * id → .nome ser inequívoco. Devolve Map<nome, string[]>.
   */
  function regrasComponentes(nomes) {
    const lista = (nomes || []).filter((n) => componentes.has(n))
    if (!lista.length) return new Map()
    const fantasma = lista.map((n) => `<i class="${n}"></i>`).join('')
    let build
    try {
      build = BreezeCSS.build(fantasma, { minificar: false })
    } catch (e) {
      avisos.push('regras de componentes falharam: ' + e.message)
      return new Map()
    }
    // mapear id → nome do componente (cada elemento tem uma só classe)
    const idParaNome = new Map()
    for (const el of ultimosElementos) {
      const id = el && el.attrs ? el.attrs['data-breeze-id'] : null
      if (id && el.classList.length === 1) idParaNome.set(id, el.classList[0])
    }
    const RE_ID = /\[data-breeze-id="(b\d+)"\]/g
    const regrasPorNome = new Map()
    for (const linha of String(build).split('\n')) {
      if (!linha.includes('[data-breeze-id=')) continue
      // transforms de componentes são geradas pelo próprio CLI (o motor
      // quebra o valor com prefix: "transform: 5px") — saltar aqui
      if (linha.includes('transform:')) continue
      const nomesNaLinha = new Set()
      let ok = true
      for (const m of linha.matchAll(RE_ID)) {
        const nome = idParaNome.get(m[1])
        if (!nome) { ok = false; break }
        nomesNaLinha.add(nome)
      }
      if (!ok) continue
      const regra = linha.replace(RE_ID, (t, id) => '.' + cssEscape(idParaNome.get(id)))
      for (const nome of nomesNaLinha) {
        if (!regrasPorNome.has(nome)) regrasPorNome.set(nome, [])
        const arr = regrasPorNome.get(nome)
        if (!arr.includes(regra)) arr.push(regra)
      }
    }
    return regrasPorNome
  }

  // ── API do hospedeiro ────────────────────────────────────────────────
  function build(htmlString) {
    ultimosElementos = []
    const css = BreezeCSS.build(String(htmlString), { minificar: false })
    // O build() junta as regras com "\n" — devolver como lista de regras.
    const regras = css.length ? css.split('\n') : []
    return { regras, elementos: ultimosElementos }
  }

  function buildClasses(grupos) {
    if (typeof BreezeCSS.buildElementos !== 'function') throw new Error('Motor sem API buildElementos')
    const elementos = Array.from(grupos, grupo => {
      const attrs = {}; const list = Array.isArray(grupo) ? [...grupo] : String(grupo).trim().split(/\s+/).filter(Boolean)
      return { classList: list, getAttribute: n => attrs[n] ?? null, setAttribute: (n,v) => { attrs[n]=String(v) }, removeAttribute: n => { delete attrs[n] } }
    })
    const css = BreezeCSS.buildElementos(elementos, { minificar: false })
    return { regras: css ? css.split('\n') : [], elementos }
  }

  function estilosPlugins() {
    const folhas = []
    for (const tag of sandbox.document.head.children) {
      if (!tag || tag.tagName !== 'style') continue
      const data = String(tag._attrs['data-breeze'] || '').toLowerCase()
      if (data === 'v2' || tag.id === 'breeze-v2-estilos') continue // motor core
      let nome = null
      if (data && data !== 'v2') nome = data
      else if ('data-breeze-preloader-css' in tag._attrs) nome = 'preloader'
      else {
        const id = String(tag.id || '').toLowerCase()
        for (const chave of Object.keys(PLUGIN_GLOBALS)) {
          if (id.includes('breeze-' + chave)) {
            nome = chave
            break
          }
        }
      }
      const css = String(tag.textContent || '')
      if (css.trim()) folhas.push({ plugin: nome || 'plugin', css })
    }
    return folhas
  }

  return {
    build,
    buildClasses,
    estilosPlugins,
    registarComponente,
    regrasComponentes,
    componentes,
    pluginsActivos,
    configInterna,
    avisos,
    erros,
    versao: BreezeCSS.versao || '?',
    caminho: caminhoAbs,
  }
}

module.exports = {
  criarHospedeiro,
  PLUGIN_GLOBALS,
  prefixarClasse,
  MOTOR_VERSAO_MINIMA,
  compararVersoes,
  versaoDeBundle,
}
