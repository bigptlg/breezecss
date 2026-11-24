'use strict'
// ─────────────────────────────────────────────────────────────────────────
// test/helpers/dom.js
//
// DOM mínimo funcional para executar o RUNTIME GERADO (e os plugins
// originais do bundle) dentro de uma VM Node. Não é um motor CSS: as
// "computed styles" são fornecidas pelo teste (el._vars), que simula o
// efeito das classes já compiladas no CSS exportado.
//
// O objectivo é testar COMPORTAMENTO REAL dos plugins originais:
//   • glass: injecção de estilos a11y, registo da refracção (SVG no head,
//     var --glass-refract-url), varrer/remover
//   • progress: criação da barra (host [data-breeze-progress]), eventos
//     breeze:progress, limpeza quando o elemento sai do DOM
//   • scrollbar: aplicação de [data-breeze-scrollbar] e espelho body→html
//   • preloader: overlay criado/removido, aria-busy, data-preloader
//   • backgrounds: style tag [data-cbg] com o fundo gerado
//
// Canvas/SVG feDisplacementMap e ResizeObserver reais são verificados nos
// testes de navegador (playwright — test/browser.test.js).
// ─────────────────────────────────────────────────────────────────────────

function criarStyleMap(inicial = {}) {
  const props = { ...inicial }
  return {
    _props: props,
    getPropertyValue(n) {
      return props[String(n)] !== undefined ? String(props[String(n)]) : ''
    },
    setProperty(n, v) {
      props[String(n)] = String(v)
    },
    removeProperty(n) {
      delete props[String(n)]
    },
    get cssText() {
      return Object.entries(props)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')
    },
    set cssText(txt) {
      for (const k of Object.keys(props)) delete props[k]
      for (const parte of String(txt).split(';')) {
        const idx = parte.indexOf(':')
        if (idx === -1) continue
        props[parte.slice(0, idx).trim()] = parte.slice(idx + 1).trim()
      }
    },
  }
}

function criarOuvintes() {
  const ouvintes = new Map()
  return {
    adicionar(alvo, tipo, fn) {
      if (!ouvintes.has(alvo)) ouvintes.set(alvo, new Map())
      const t = ouvintes.get(alvo)
      if (!t.has(tipo)) t.set(tipo, [])
      t.get(tipo).push(fn)
    },
    remover(alvo, tipo, fn) {
      const t = ouvintes.get(alvo)
      if (t && t.has(tipo)) t.set(tipo, t.get(tipo).filter((f) => f !== fn))
    },
    emitir(alvo, tipo, evento) {
      const t = ouvintes.get(alvo)
      if (!t || !t.has(tipo)) return 0
      let n = 0
      for (const fn of [...t.get(tipo)]) {
        try {
          fn(evento)
          n++
        } catch (e) {
          /* o plugin decide */
        }
      }
      return n
    },
  }
}

function criarDom({ largura = 1280, altura = 800 } = {}) {
  const ouvintes = criarOuvintes()
  const observadoresMutacao = []
  let contadorId = 0
  // box com resolução tardia: head/body/documentElement são criados antes
  // do objecto doc existir, mas os seus métodos correm depois — ler o doc
  // do box em tempo de chamada
  const docBox = { atual: null }

  class CustomEvent {
    constructor(tipo, opcoes = {}) {
      this.type = tipo
      this.detail = opcoes.detail
      this.bubbles = !!opcoes.bubbles
    }
  }
  class Event {
    constructor(tipo) {
      this.type = tipo
    }
  }

  class MutationObserver {
    constructor(cb) {
      this._cb = cb
      this._alvo = null
      observadoresMutacao.push(this)
    }
    observe(alvo) {
      this._alvo = alvo
    }
    disconnect() {
      this._alvo = null
    }
    takeRecords() {
      return []
    }
  }
  class ResizeObserver {
    constructor(cb) {
      this._cb = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  class IntersectionObserver {
    constructor(cb) {
      this._cb = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  /** Dispara mutações nos MutationObservers registados (simula o browser). */
  function mutar(mutacoes) {
    for (const o of observadoresMutacao) {
      if (!o._alvo) continue
      try {
        o._cb(mutacoes)
      } catch (e) {
        /* ignorar */
      }
    }
  }

  const mutacaoClasse = (el) => ({ type: 'attributes', attributeFilter: ['class'], target: el, attributeName: 'class' })
  const mutacaoFilhos = (alvo, adicionados = [], removidos = []) => ({
    type: 'childList',
    target: alvo,
    addedNodes: adicionados,
    removedNodes: removidos,
  })

  function criarElemento(tag, doc) {
    const attrs = {}
    const filhos = []
    const el = {
      nodeType: 1,
      tagName: String(tag).toLowerCase(),
      _id: ++contadorId,
      _doc: doc,
      _vars: {}, // "computed styles" fornecidos pelo teste
      _rect: { left: 0, top: 0, right: largura, bottom: altura, width: largura, height: altura },
      offsetWidth: largura,
      offsetHeight: altura,
      clientWidth: largura,
      clientHeight: altura,
      scrollWidth: largura,
      scrollHeight: altura,
      scrollTop: 0,
      scrollLeft: 0,
      isConnected: true,
      parentNode: null,
      style: criarStyleMap(),
      get children() {
        return filhos.slice()
      },
      get firstChild() {
        return filhos[0] || null
      },
      appendChild(c) {
        filhos.push(c)
        if (c && typeof c === 'object') c.parentNode = el
        if (docBox.atual) docBox.atual._notificarFilhos(el, c, null)
        return c
      },
      insertBefore(c, ref) {
        const i = filhos.indexOf(ref)
        if (i === -1) filhos.push(c)
        else filhos.splice(i, 0, c)
        if (c && typeof c === 'object') c.parentNode = el
        if (docBox.atual) docBox.atual._notificarFilhos(el, c, null)
        return c
      },
      removeChild(c) {
        const i = filhos.indexOf(c)
        if (i !== -1) filhos.splice(i, 1)
        if (c && typeof c === 'object') c.parentNode = null
        if (docBox.atual) docBox.atual._notificarFilhos(el, null, c)
        return c
      },
      remove() {
        if (el.parentNode) el.parentNode.removeChild(el)
        el.parentNode = null
        el.isConnected = false
      },
      contains(n) {
        if (n === el) return true
        return filhos.some((f) => f && typeof f.contains === 'function' && f.contains(n))
      },
      closest(sel) {
        let atual = el
        while (atual) {
          if (atual._casa && atual._casa(sel)) return atual
          atual = atual.parentNode || null
        }
        return null
      },
      dispatchEvent(ev) {
        ev.target = el
        ouvintes.emitir(el, ev.type, ev)
        return true
      },
      getBoundingClientRect() {
        return { ...el._rect }
      },
      querySelector(sel) {
        const r = el.querySelectorAll(sel)
        return r[0] || null
      },
      querySelectorAll(sel) {
        return pesquisarSel([el], sel)
      },
      addEventListener(tipo, fn) {
        ouvintes.adicionar(el, tipo, fn)
      },
      removeEventListener(tipo, fn) {
        ouvintes.remover(el, tipo, fn)
      },
    }

    el.setAttribute = (n, v) => {
      attrs[String(n).toLowerCase()] = String(v)
      if (docBox.atual && String(n).toLowerCase() === 'class') docBox.atual._notificarMutações([mutacaoClasse(el)])
    }
    el.getAttribute = (n) => {
      const v = attrs[String(n).toLowerCase()]
      return v === undefined ? null : v
    }
    el.hasAttribute = (n) => String(n).toLowerCase() in attrs
    el.removeAttribute = (n) => {
      delete attrs[String(n).toLowerCase()]
    }
    Object.defineProperty(el, 'attributes', { get: () => attrs })
    Object.defineProperty(el, 'id', {
      get: () => attrs.id || '',
      set: (v) => {
        attrs.id = String(v)
      },
    })
    Object.defineProperty(el, 'className', {
      get: () => attrs.class || '',
      set: (v) => {
        attrs.class = String(v)
        if (docBox.atual) docBox.atual._notificarMutações([mutacaoClasse(el)])
      },
    })
    Object.defineProperty(el, 'classList', {
      get() {
        const lista = (attrs.class || '').trim().split(/\s+/).filter(Boolean)
        lista.contains = (c) => lista.indexOf(c) !== -1
        lista.add = (c) => {
          if (!lista.includes(c)) {
            attrs.class = [...lista, c].join(' ')
            if (doc) doc._notificarMutações([mutacaoClasse(el)])
          }
        }
        lista.remove = (c) => {
          if (lista.includes(c)) {
            attrs.class = lista.filter((x) => x !== c).join(' ')
            if (doc) doc._notificarMutações([mutacaoClasse(el)])
          }
        }
        lista.toggle = (c) => {
          if (lista.includes(c)) lista.remove(c)
          else lista.add(c)
        }
        return lista
      },
    })
    el._attrs = attrs
    el._filhos = filhos
    el._casa = (sel) => casaSeleitor(el, sel)
    return el
  }

  const RE_TOKEN_SEL = /(\[class\*="[^"]*"\]|\[class~="[^"]*"\]|\[[a-zA-Z-]+(?:="[^"]*")?\]|\.[\w-]+|#[\w-]+|^[a-zA-Z][\w-]*)/g

  function casaSeleitor(el, sel) {
    if (sel === '*') return true
    for (const parte of sel.split(/,/)) {
      const s = parte.trim()
      if (!s) continue
      // selector composto: tag + classes + atributos (todos têm de casar)
      const tokens = s.match(RE_TOKEN_SEL)
      if (!tokens) continue
      let casa = true
      for (const t of tokens) {
        let m
        if ((m = /^\[class\*="([^"]*)"\]$/.exec(t))) {
          if (!(el._attrs.class || '').includes(m[1])) { casa = false; break }
        } else if ((m = /^\[class~="([^"]*)"\]$/.exec(t))) {
          if (!el.classList.contains(m[1])) { casa = false; break }
        } else if ((m = /^\[([a-zA-Z-]+)="([^"]*)"\]$/.exec(t))) {
          if ((el._attrs[m[1].toLowerCase()] || '') !== m[2]) { casa = false; break }
        } else if ((m = /^\[([a-zA-Z-]+)\]$/.exec(t))) {
          if (!el.hasAttribute(m[1])) { casa = false; break }
        } else if ((m = /^\.([\w-]+)$/.exec(t))) {
          if (!el.classList.contains(m[1])) { casa = false; break }
        } else if ((m = /^#([\w-]+)$/.exec(t))) {
          if (el._attrs.id !== m[1]) { casa = false; break }
        } else if (/^[a-zA-Z][\w-]*$/.test(t)) {
          if (el.tagName !== t.toLowerCase()) { casa = false; break }
        } else {
          casa = false
          break
        }
      }
      if (casa) return true
    }
    return false
  }

  function pesquisarSel(raizes, sel) {
    const saida = []
    const acumular = (el) => {
      for (const f of el._filhos) {
        if (f._casa(sel)) saida.push(f)
        acumular(f)
      }
    }
    for (const r of raizes) acumular(r)
    return saida
  }

  const head = criarElemento('head', null)
  const body = criarElemento('body', null)
  const documentElement = criarElemento('html', null)
  documentElement._filhos.push(head, body)
  head.parentNode = documentElement
  body.parentNode = documentElement

  const doc = {
    readyState: 'complete',
    head,
    body,
    documentElement,
    _scrollY: 0,
    _notificarMutações(ms) {
      mutar(ms)
    },
    _notificarFilhos(alvo, adicionado, removido) {
      mutar([mutacaoFilhos(alvo, adicionado ? [adicionado] : [], removido ? [removido] : [])])
    },
    createElement(tag) {
      return criarElemento(tag, doc)
    },
    createElementNS(_ns, tag) {
      const el = criarElemento(tag, doc)
      el.namespaceURI = _ns
      return el
    },
    createTextNode(txt) {
      return { nodeType: 3, textContent: String(txt), isConnected: true }
    },
    getElementById(id) {
      if (documentElement._attrs.id === id) return documentElement
      if (head._attrs.id === id) return head
      if (body._attrs.id === id) return body
      const r = pesquisarSel([documentElement], '#' + id)
      return r[0] || null
    },
    querySelector(sel) {
      const r = doc.querySelectorAll(sel)
      return r[0] || null
    },
    querySelectorAll(sel) {
      const saida = pesquisarSel([documentElement], sel)
      // documentElement/body/head podem casar também
      for (const r of [documentElement, head, body]) {
        if (r._casa(sel) && !saida.includes(r)) saida.unshift(r)
      }
      return saida
    },
    addEventListener(tipo, fn) {
      ouvintes.adicionar(doc, tipo, fn)
    },
    removeEventListener(tipo, fn) {
      ouvintes.remover(doc, tipo, fn)
    },
    dispatchEvent(ev) {
      return ouvintes.emitir(doc, ev.type, ev) > 0
    },
    scrollingElement: null,
  }
  doc.scrollingElement = documentElement
  docBox.atual = doc // resolução tardia: head/body já podem notificar mutações
  documentElement.clientWidth = largura
  documentElement.clientHeight = altura

  const sandbox = {
    document: doc,
    CustomEvent,
    Event,
    MutationObserver,
    ResizeObserver,
    IntersectionObserver,
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9 },
    CSS: {
      escape: (s) => String(s).replace(/([^a-zA-Z0-9_-])/g, '\\$1'),
      registerProperty() {},
      supports() {
        return false
      },
    },
    navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BreezeCLI-Test' },
    matchMedia(q) {
      return {
        matches: false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }
    },
    getComputedStyle(el) {
      return {
        getPropertyValue(n) {
          const nome = String(n)
          if (el && el.style) {
            const direto = el.style.getPropertyValue(nome)
            if (direto) return direto
          }
          if (el && el._vars && el._vars[nome] !== undefined) return String(el._vars[nome])
          return ''
        },
        borderTopLeftRadius: '0px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }
    },
    innerWidth: largura,
    innerHeight: altura,
    scrollY: 0,
    scrollX: 0,
    requestAnimationFrame(fn) {
      return setTimeout(() => fn(Date.now()), 0)
    },
    cancelAnimationFrame(id) {
      clearTimeout(id)
    },
    setTimeout,
    clearTimeout,
    performance: { now: () => Date.now() },
    console: {
      log() {},
      info() {},
      warn() {},
      error() {},
      debug() {},
    },
  }
  sandbox.window = sandbox
  sandbox.self = sandbox
  sandbox.globalThis = sandbox
  sandbox.addEventListener = function (tipo, fn) {
    ouvintes.adicionar(sandbox, tipo, fn)
  }
  sandbox.removeEventListener = function (tipo, fn) {
    ouvintes.remover(sandbox, tipo, fn)
  }
  sandbox._ouvintes = ouvintes
  sandbox._mutar = mutar

  return sandbox
}

/**
 * Carrega o runtime gerado num sandbox DOM e espera os microtasks.
 * @returns {Promise<sandbox>} com api/BreezeCSS em sandbox.window
 */
async function carregarRuntime(ficheiro, { antes = null, silencioso = true } = {}) {
  const vm = require('vm')
  const fs = require('fs')
  const sandbox = criarDom()
  sandbox.__erros = []
  sandbox.__avisos = []
  sandbox.console = {
    log() {},
    info() {},
    warn(...a) {
      sandbox.__avisos.push(a.map(String).join(' '))
    },
    error(...a) {
      sandbox.__erros.push(a.map(String).join(' '))
    },
    debug() {},
  }
  if (antes) antes(sandbox)
  const contexto = vm.createContext(sandbox)
  vm.runInContext(fs.readFileSync(ficheiro, 'utf8'), contexto, { filename: 'runtime.js' })
  // esperar microtasks (arranque dos plugins em Promise.resolve)
  await esperar(40)
  return sandbox
}

/** Espera n ms (timers/rAF do sandbox). */
function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

module.exports = { criarDom, carregarRuntime, esperar }
