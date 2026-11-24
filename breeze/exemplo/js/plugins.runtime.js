/*! breeze runtime v1.0.0 — gerado por BreezeCLI a partir do breeze.bundle.js 2.2.5
 *  Plugins com JavaScript: glass, progress, scrollbar, backgrounds
 *  Páginas: 4 · gerado em 2026-11-24 09:30
 *  NÃO EDITAR — regenerar com: node bin/breeze.js [--watch]
 *  Comportamentos dos plugins: código original do bundle (1:1).
 */

;var __breezeNucleo = (function () {
  'use strict'
  // ── protecção contra carga dupla (duas injecções, bundle + runtime) ──
  if (typeof window !== 'undefined' && window.__breezeRuntime) {
    console.warn('[breeze runtime] já estava carregado — segunda cópia ignorada')
    return
  }

  var TABELA_GLOBAIS = {
    glass: 'BreezeGlass',
    dividers: 'BreezeDividers',
    progress: 'BreezeProgress',
    scrollbar: 'BreezeScrollbar',
    preloader: 'BreezePreloader',
    backgrounds: 'BreezeBackgrounds'
  }

  var NUCLEO = {
    meta: null,
    activos: [],            // [{ nome, plugin }]
    chavesActivas: {},      // nome → true (evita setup duplicado)
    compMap: new Map(),     // nome (e alias) → membros[] (brutos)
    cacheMembros: new WeakMap(),
    selComp: '',
    selCompSujo: true,
    silencioso: false,
    avisosEmitidos: {},
    configsPendentes: [],
    arrancado: false,
    destruido: false
  }

  function aviso(msg) {
    if (NUCLEO.silencioso || NUCLEO.avisosEmitidos[msg]) return
    NUCLEO.avisosEmitidos[msg] = 1
    console.warn('[breeze runtime] ' + msg)
  }

  function escCSS(s) {
    try {
      if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(s)
    } catch (e) { /* seguir */ }
    return String(s).replace(/([^a-zA-Z0-9_-])/g, '\\$1')
  }

  // ── componentes: expansão recursiva com protecção anti-circular ──────
  function expandir(token, vistos, saida) {
    if (vistos.has(token)) return
    vistos.add(token)
    saida.push(token)
    var membros = NUCLEO.compMap.get(token)
    if (!membros) return
    for (var i = 0; i < membros.length; i++) expandir(membros[i], vistos, saida)
  }

  function membrosDe(el) {
    var classe = ''
    try { classe = el.getAttribute('class') || '' } catch (e) { classe = el.className || '' }
    var emCache = NUCLEO.cacheMembros.get(el)
    if (emCache && emCache.classe === classe) return emCache.membros
    var vistos = new Set()
    var saida = []
    var tokens = String(classe).split(/\s+/)
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i]) expandir(tokens[i], vistos, saida)
    }
    NUCLEO.cacheMembros.set(el, { classe: classe, membros: saida })
    return saida
  }

  function reconstruirSelComp() {
    NUCLEO.selCompSujo = false
    if (!NUCLEO.compMap.size) { NUCLEO.selComp = ''; return }
    var partes = []
    NUCLEO.compMap.forEach(function (_m, nome) { partes.push('.' + escCSS(nome)) })
    NUCLEO.selComp = partes.join(',')
  }

  // ── ponte de componentes: amplia os scans dos plugins ────────────────
  // document.querySelectorAll('[class*="progress"]') passa a devolver
  // também elementos cujo COMPONENTE contém classes do plugin
  // (ex.: .card com membro 'glass-refract'). Nenhuma mutação de DOM.
  function instalarPonte() {
    var original = document.querySelectorAll.bind(document)
    var RE_SCAN = /\[class\*=(?:"([^"]*)"|'([^']*)')\]/
    document.querySelectorAll = function (sel) {
      var res = original.apply(null, arguments)
      if (NUCLEO.destruido || !NUCLEO.compMap.size || typeof sel !== 'string') return res
      var m = RE_SCAN.exec(sel)
      if (!m) return res
      var token = m[1] !== undefined ? m[1] : m[2]
      if (!token) return res
      if (NUCLEO.selCompSujo) reconstruirSelComp()
      if (!NUCLEO.selComp) return res
      var extras = null
      try {
        var candidatos = original.call(document, NUCLEO.selComp)
        for (var i = 0; i < candidatos.length; i++) {
          var el = candidatos[i]
          var presente = false
          for (var j = 0; j < res.length; j++) {
            if (res[j] === el) { presente = true; break }
          }
          if (presente) continue
          var membros = membrosDe(el)
          var match = false
          for (var k = 0; k < membros.length; k++) {
            if (membros[k].indexOf(token) !== -1) { match = true; break }
          }
          if (match && !extras) extras = []
          if (match) extras.push(el)
        }
      } catch (e) { return res }
      if (!extras) return res
      var lista = []
      for (var x = 0; x < res.length; x++) lista.push(res[x])
      for (var y = 0; y < extras.length; y++) lista.push(extras[y])
      return lista
    }
    NUCLEO.qsaOriginal = original
  }

  // ── contexto passado a plugin.setup(ctx) ─────────────────────────────
  // Só o que os plugins realmente usam: registos (sem motor CSS — o CSS já
  // foi compilado) e config com classesFixas para detectarem o prefixo.
  function criarCtx() {
    var fixas = {}
    var prefix = (NUCLEO.meta && NUCLEO.meta.prefix) || ''
    if (prefix) fixas[prefix + 'block'] = 'display:block'
    var cfg = {
      prefix: prefix,
      classesFixas: fixas,
      mapaPropriedades: {},
      variantes: {},
      breakpoints: {},
      processadoresEspeciais: {},
      tema: { cores: {}, espacamento: {}, fontes: {} },
      plugins: []
    }
    return {
      config: cfg,
      addFixedClass: function (n, e) { fixas[n] = e },
      addMapping: function (p, prop) { cfg.mapaPropriedades[p] = prop },
      addProcessor: function (p, fn) { cfg.processadoresEspeciais[p] = fn },
      addVariant: function (n, ps) { cfg.variantes[n] = ps },
      addBreakpoint: function (n, t) { cfg.breakpoints[n] = t }
    }
  }

  function activarPlugin(chave, instancia, origem) {
    if (NUCLEO.chavesActivas[chave]) return true // sem setup duplicado
    var globalNome = TABELA_GLOBAIS[chave]
    if (!globalNome) {
      aviso('plugin desconhecido "' + chave + '" (' + origem + ') — ignorado')
      return false
    }
    var plugin = instancia || window[globalNome]
    if (!plugin || typeof plugin.setup !== 'function') {
      aviso('plugin "' + chave + '" (' + origem + ') não foi exportado neste runtime — regenera com --plugins auto/all')
      return false
    }
    try {
      plugin.setup(criarCtx())
    } catch (e) {
      console.error('[breeze runtime] setup de "' + chave + '" falhou:', e)
      return false
    }
    NUCLEO.chavesActivas[chave] = true
    NUCLEO.activos.push({ nome: chave, plugin: plugin })
    return true
  }

  function resolverChave(item) {
    if (typeof item === 'string') return item.trim().toLowerCase()
    if (item && typeof item === 'object' && item.nome && TABELA_GLOBAIS[item.nome]) return item.nome
    if (item && typeof item === 'function') {
      for (var k in TABELA_GLOBAIS) {
        if (window[TABELA_GLOBAIS[k]] === item) return k
      }
    }
    return null
  }

  function aplicarConfigUsuario(c, origem) {
    if (!c || typeof c !== 'object') return
    if (c.log === false) NUCLEO.silencioso = true
    if (c.tema) aviso('modo compilado: o tema já está no CSS exportado — "tema" em ' + origem + ' é ignorado')
    if (c.prefix && NUCLEO.meta && c.prefix !== NUCLEO.meta.prefix) {
      aviso('prefix "' + c.prefix + '" (' + origem + ') difere do compilado ("' + (NUCLEO.meta.prefix || '') + '") — o CSS exportado não muda')
    }
    if (c.safelist && c.safelist.length) {
      aviso('modo compilado: safelist de ' + origem + ' não gera CSS — usa --safelist no CLI e regenera')
    }
    if (Array.isArray(c.plugins)) {
      for (var i = 0; i < c.plugins.length; i++) {
        var chave = resolverChave(c.plugins[i])
        if (!chave) { aviso('plugin não reconhecido em ' + origem + ' — ignorado'); continue }
        activarPlugin(chave, typeof c.plugins[i] === 'object' ? c.plugins[i] : null, origem)
      }
    }
  }

  function dispatchActualizar() {
    for (var i = 0; i < NUCLEO.activos.length; i++) {
      var a = NUCLEO.activos[i]
      if (a.plugin && typeof a.plugin.actualizar === 'function') {
        try { a.plugin.actualizar() } catch (e) { /* o motor do plugin decide */ }
      }
    }
  }

  // ── window.BreezeCSS — interface mínima usada pelos plugins e pelas
  //    páginas que tinham o bundle original ──────────────────────────────
  var BreezeCSS = {
    versao: (NUCLEO.meta && NUCLEO.meta.motor) || '2.2.5',
    __runtimeCompilado: true,
    init: function (c) {
      if (NUCLEO.arrancado) aplicarConfigUsuario(c, 'BreezeCSS.init()')
      else NUCLEO.configsPendentes.push(c || {})
      return BreezeCSS
    },
    use: function (p) {
      var chave = resolverChave(p)
      if (!chave) { aviso('use(): plugin inválido'); return BreezeCSS }
      activarPlugin(chave, p && typeof p === 'object' ? p : null, 'BreezeCSS.use()')
      Promise.resolve().then(dispatchActualizar)
      return BreezeCSS
    },
    addComponent: function (nome, classes) {
      if (!nome || !Array.isArray(classes) || !classes.length) return BreezeCSS
      NUCLEO.compMap.set(String(nome), classes.slice())
      if (NUCLEO.meta && NUCLEO.meta.prefix && !NUCLEO.compMap.has(NUCLEO.meta.prefix + nome)) {
        NUCLEO.compMap.set(NUCLEO.meta.prefix + nome, classes.slice())
      }
      NUCLEO.selCompSujo = true
      Promise.resolve().then(dispatchActualizar)
      return BreezeCSS
    },
    processar: function () {
      if (NUCLEO.arrancado) dispatchActualizar()
      return BreezeCSS
    },
    reiniciar: function () {
      aviso('reiniciar() em modo compilado: o CSS é estático; os motores dos plugins continuam activos')
      dispatchActualizar()
      return BreezeCSS
    },
    // o motor de geração CSS não existe no runtime — aviso claro, sem erros
    build: function () {
      aviso('build() não existe no runtime compilado — o CSS é gerado pelo BreezeCLI')
      return ''
    },
    exportar: function () {
      aviso('exportar() não existe no runtime compilado — o CSS é gerado pelo BreezeCLI')
      return ''
    },
    addFixedClass: function () { aviso('addFixedClass() não gera CSS no modo compilado') },
    addMapping: function () { aviso('addMapping() não gera CSS no modo compilado') },
    addProcessor: function () { aviso('addProcessor() não gera CSS no modo compilado') },
    addVariant: function () { aviso('addVariant() não gera CSS no modo compilado') },
    addBreakpoint: function () { aviso('addBreakpoint() não gera CSS no modo compilado') },
    stats: function () {
      return {
        runtime: true,
        compilado: true,
        plugins: NUCLEO.activos.map(function (a) { return a.nome }),
        componentes: NUCLEO.compMap.size
      }
    }
  }
  if (typeof window !== 'undefined') window.BreezeCSS = BreezeCSS

  // ── arranque ──────────────────────────────────────────────────────────
  function arrancar(meta) {
    if (NUCLEO.arrancado) return
    NUCLEO.arrancado = true
    NUCLEO.meta = meta || {}
    // componentes compilados
    var comps = (meta && meta.componentes) || {}
    for (var nome in comps) {
      if (Object.prototype.hasOwnProperty.call(comps, nome)) {
        NUCLEO.compMap.set(nome, comps[nome].slice())
      }
    }
    NUCLEO.selCompSujo = true
    instalarPonte()

    // config do utilizador: window.BreezeConfig + init() pendentes
    var cfgUsuario
    try { cfgUsuario = window.BreezeConfig || null } catch (e) { cfgUsuario = null }
    aplicarConfigUsuario(cfgUsuario, 'BreezeConfig')
    for (var i = 0; i < NUCLEO.configsPendentes.length; i++) {
      aplicarConfigUsuario(NUCLEO.configsPendentes[i], 'BreezeCSS.init()')
    }

    // plugins incluídos neste runtime (setup 1×; espera o DOM se precisar —
    // tal como o bundle original, que arranca no DOMContentLoaded)
    var lista = (meta && meta.plugins) || []
    function ligar() {
      for (var j = 0; j < lista.length; j++) activarPlugin(lista[j], null, 'runtime')
      // igual ao use() do bundle: reprocessa os elementos já existentes
      Promise.resolve().then(dispatchActualizar)
      if (typeof console !== 'undefined' && !NUCLEO.silencioso) {
        var nomes = NUCLEO.activos.map(function (a) { return a.nome })
        console.info('[breeze runtime] activo — plugins: ' + (nomes.length ? nomes.join(', ') : 'nenhum (compatibilidade)'))
      }
    }
    var doc = typeof document !== 'undefined' ? document : null
    if (doc && doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function () { Promise.resolve().then(ligar) })
    } else {
      Promise.resolve().then(ligar)
    }
  }

  // ── API de inspecção/limpeza ──────────────────────────────────────────
  var API = {
    versao: 'runtime ' + ((NUCLEO.meta && NUCLEO.meta.cli) || ''),
    arrancar: arrancar,
    get plugins() {
      return NUCLEO.activos.map(function (a) { return a.nome })
    },
    get componentes() { return NUCLEO.compMap },
    registarComponente: function (nome, membros) {
      BreezeCSS.addComponent(nome, membros)
    },
    destruir: function () {
      if (NUCLEO.destruido) return
      NUCLEO.destruido = true
      if (NUCLEO.qsaOriginal) {
        try { document.querySelectorAll = NUCLEO.qsaOriginal } catch (e) { /* seguir */ }
      }
      NUCLEO.compMap.clear()
      NUCLEO.activos = []
      NUCLEO.chavesActivas = {}
      aviso('destruir(): registos limpos — os observadores internos dos plugins mantêm-se (comportamento original do bundle)')
    }
  }
  if (typeof window !== 'undefined') window.__breezeRuntime = API
  NUCLEO.api = API
  if (typeof module !== 'undefined' && module.exports) module.exports = API
  return API
})()


/* ═══ Plugin original: BreezeGlass v1.0.0 (extraído 1:1 do bundle) ═══ */

;/*!
 * BreezeGlass v1.0.0 — plugin "glass" para o BreezeCSS (>= 2.2)
 *
 * Camada 1 (todos os browsers): utilitários CSS ao vivo — backdrop-filter, tint,
 *   brilho especular e rebordo em box-shadow. Sem snapshot, sem WebGL.
 * Camada 2 (só Chromium, opcional): refracção real via SVG feDisplacementMap
 *   aplicada ao backdrop. Nos outros browsers degrada para a camada 1.
 *
 * Uso (recomendado — antes do BreezeCSS):
 *   <script src="breeze--glass.js"></script>
 *   <script>window.BreezeConfig = { plugins: [BreezeGlass] }</script>
 *   <script src="breeze.min.js"></script>
 *
 * Uso (depois do BreezeCSS já inicializado):
 *   BreezeCSS.use(BreezeGlass)
 *
 * Opções:  BreezeGlass.criar({ refracao: 'auto' | true | false,
 *            intensidade: 16, bisel: 0.3, resolucaoMax: 200 })
 *
 * Classes:
 *   glass                       base (obrigatória)
 *   glass-sm|md|lg|xl           desfoque (8 / 16 / 28 / 40 px)
 *   glass-light | glass-dark    tom
 *   glass-pill | glass-circle   forma
 *   glass-refract               refracção (Chromium) — glass-refract[24] = 24px
 *   glass-blur[20px]  glass-saturate[2]  glass-brightness[1.1]
 *   glass-tint[0.3]   glass-shadow[0.4]  glass-rgb[12_16_24]  glass-bezel[0.4]
 *   Variantes do Breeze funcionam: hover:glass-dark, md:glass-lg, etc.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.0.0'
  const PADROES = { refracao: 'auto', intensidade: 16, bisel: 0.3, resolucaoMax: 200 }

  // ---------------------------------------------------------------- classes
  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const FILTRO =
    'var(--glass-refract-url,) blur(var(--glass-blur, 16px)) ' +
    'saturate(var(--glass-saturate, 1.8)) brightness(var(--glass-brightness, 1.06))'

  const CLASSES = {
    glass: [
      '--glass-t: var(--glass-tint, var(--glass-tone-tint, 0.14))',
      'background-color: rgb(var(--glass-rgb, 255 255 255) / var(--glass-t))',
      'background-image: linear-gradient(135deg, rgb(255 255 255 / calc(var(--glass-t) * 1.8)) 0%, rgb(255 255 255 / 0) 42%, rgb(255 255 255 / 0) 58%, rgb(255 255 255 / calc(var(--glass-t) * 0.8)) 100%)',
      '-webkit-backdrop-filter: ' + FILTRO,
      'backdrop-filter: ' + FILTRO,
      'box-shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.55), inset 0 -1px 0 0 rgb(255 255 255 / 0.1), inset 0 0 0 1px rgb(255 255 255 / 0.16), inset 0 0 22px 0 rgb(255 255 255 / 0.07), 0 12px 32px -10px rgb(0 0 0 / var(--glass-shadow, 0.3))',
      'transition-property: background-color, box-shadow, transform',
      'transition-duration: 250ms',
      'transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1)'
    ].join('; '),
    'glass-sm': '--glass-blur: 8px',
    'glass-md': '--glass-blur: 16px',
    'glass-lg': '--glass-blur: 28px; --glass-saturate: 2',
    'glass-xl': '--glass-blur: 40px; --glass-saturate: 2.2',
    'glass-light': '--glass-rgb: 255 255 255',
    'glass-dark': '--glass-rgb: 12 16 24; --glass-tone-tint: 0.3',
    'glass-pill': 'border-radius: 9999px',
    'glass-circle': 'border-radius: 9999px; aspect-ratio: 1 / 1',
    'glass-refract': '--glass-refract-px: 16'
  }

  // Valores arbitrários: glass-blur[20px] → --glass-blur: 20px
  const MAPEAMENTOS = {
    'glass-blur': '--glass-blur',
    'glass-saturate': '--glass-saturate',
    'glass-brightness': '--glass-brightness',
    'glass-tint': '--glass-tint',
    'glass-shadow': '--glass-shadow',
    'glass-rgb': '--glass-rgb',
    'glass-bezel': '--glass-bezel',
    'glass-refract': '--glass-refract-px'
  }

  // ------------------------------------------------- estilos de apoio / a11y
  function esc(s) {
    return global.CSS && typeof global.CSS.escape === 'function' ? global.CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&')
  }

  function injectarEstilos(prefixo) {
    if (document.getElementById('breeze-glass-estilos')) return
    const g = '.' + esc(prefixo + 'glass')
    const s = g + g // .x.x → especificidade maior que os utilitários, para a11y ganhar
    const css = `
@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  ${s} { background-color: rgb(var(--glass-rgb, 255 255 255) / 0.78); }
}
@media (prefers-reduced-transparency: reduce) {
  ${s} { -webkit-backdrop-filter: none; backdrop-filter: none; background-image: none; background-color: rgb(var(--glass-rgb, 255 255 255) / 0.92); }
}
@media (prefers-contrast: more) {
  ${s} { -webkit-backdrop-filter: none; backdrop-filter: none; background-image: none; background-color: rgb(var(--glass-rgb, 255 255 255) / 0.95); box-shadow: inset 0 0 0 2px currentColor; }
}
@media (prefers-reduced-motion: reduce) {
  ${s} { transition: none; }
}`
    const el = document.createElement('style')
    el.id = 'breeze-glass-estilos'
    el.setAttribute('data-breeze', 'glass')
    el.textContent = css
    document.head.appendChild(el)
  }
  // ------------------------------------------------ refracção (só Chromium)
  function refracaoSuportada(cfg) {
    if (cfg.refracao === false) return false
    if (typeof ResizeObserver === 'undefined') return false
    if (cfg.refracao === true) return true
    const ua = navigator.userAgent || ''
    const marcas = navigator.userAgentData && navigator.userAgentData.brands
    const chromium = marcas ? marcas.some(b => /Chromium/i.test(b.brand)) : /Chrome\/\d+/.test(ua)
    return chromium && !/(iPhone|iPad|iPod)/.test(ua)
  }

  // Mapa de deslocamento: R/G = vector (128 = neutro). Junto à borda, o vector
  // aponta para fora (lente convexa), com queda quadrática para o interior.
  function gerarMapa(w, h, raio, bisel, resMax) {
    const passo = Math.max(1, Math.ceil(Math.max(w, h) / resMax))
    const cw = Math.max(1, Math.ceil(w / passo))
    const ch = Math.max(1, Math.ceil(h / passo))
    const cv = gerarMapa._cv || (gerarMapa._cv = document.createElement('canvas'))
    cv.width = cw
    cv.height = ch
    const ctx = cv.getContext('2d')
    const img = ctx.createImageData(cw, ch)
    const d = img.data
    const hx = w / 2
    const hy = h / 2
    const r = Math.min(raio, hx, hy)
    const largura = Math.max(2, Math.min(w, h) * bisel)

    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        const dx = ((i + 0.5) * w) / cw - hx
        const dy = ((j + 0.5) * h) / ch - hy
        const qx = Math.abs(dx) - (hx - r)
        const qy = Math.abs(dy) - (hy - r)
        const fora = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
        const prof = -(fora + Math.min(Math.max(qx, qy), 0) - r) // >0 dentro da forma
        let mx = 0
        let my = 0
        if (prof > 0 && prof < largura) {
          const t = 1 - prof / largura
          const m = t * t
          let nx, ny
          if (qx > 0 && qy > 0) {
            const n = Math.hypot(qx, qy)
            nx = (Math.sign(dx) * qx) / n
            ny = (Math.sign(dy) * qy) / n
          } else if (qx > qy) {
            nx = Math.sign(dx)
            ny = 0
          } else {
            nx = 0
            ny = Math.sign(dy)
          }
          mx = m * nx
          my = m * ny
        }
        const k = (j * cw + i) * 4
        d[k] = 128 + 127 * mx
        d[k + 1] = 128 + 127 * my
        d[k + 2] = 128
        d[k + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return cv.toDataURL()
  }

  function iniciarRefraccao(cfg) {
    const NS = 'http://www.w3.org/2000/svg'
    const alvos = new Map() // elemento → { filtro, img, disp, w, h, raio, px, bisel }
    let svg = null
    let contador = 0
    let agendado = false

    const lerPx = el => parseFloat(getComputedStyle(el).getPropertyValue('--glass-refract-px')) || 0

    function garantirSvg() {
      if (svg) return svg
      svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('width', '0')
      svg.setAttribute('height', '0')
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'
      svg.appendChild(document.createElementNS(NS, 'defs'))
      document.body.appendChild(svg)
      return svg
    }

    function actualizar(el, a) {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (!w || !h) return
      const cs = getComputedStyle(el)
      const brut = cs.borderTopLeftRadius || '0'
      const raio = brut.includes('%') ? (parseFloat(brut) / 100) * Math.min(w, h) : parseFloat(brut) || 0
      const px = lerPx(el) || a.px
      const bisel = parseFloat(cs.getPropertyValue('--glass-bezel')) || cfg.bisel
      if (w === a.w && h === a.h && raio === a.raio && px === a.px && bisel === a.bisel) return
      Object.assign(a, { w, h, raio, px, bisel })
      a.img.setAttribute('href', gerarMapa(w, h, raio, bisel, cfg.resolucaoMax))
      a.img.setAttribute('x', '0')
      a.img.setAttribute('y', '0')
      a.img.setAttribute('width', String(w))
      a.img.setAttribute('height', String(h))
      a.disp.setAttribute('scale', String(px * 2))
    }

    const ro = new ResizeObserver(entradas => {
      entradas.forEach(e => {
        const a = alvos.get(e.target)
        if (a) actualizar(e.target, a)
      })
    })

    function registar(el, px) {
      const id = 'bz-lg-' + ++contador
      const filtro = document.createElementNS(NS, 'filter')
      filtro.setAttribute('id', id)
      filtro.setAttribute('x', '0%')
      filtro.setAttribute('y', '0%')
      filtro.setAttribute('width', '100%')
      filtro.setAttribute('height', '100%')
      filtro.setAttribute('color-interpolation-filters', 'sRGB')
      const img = document.createElementNS(NS, 'feImage')
      img.setAttribute('result', 'mapa')
      img.setAttribute('preserveAspectRatio', 'none')
      const disp = document.createElementNS(NS, 'feDisplacementMap')
      disp.setAttribute('in', 'SourceGraphic')
      disp.setAttribute('in2', 'mapa')
      disp.setAttribute('xChannelSelector', 'R')
      disp.setAttribute('yChannelSelector', 'G')
      filtro.appendChild(img)
      filtro.appendChild(disp)
      garantirSvg().firstChild.appendChild(filtro)
      alvos.set(el, { filtro, img, disp, w: 0, h: 0, raio: -1, px, bisel: 0 })
      el.style.setProperty('--glass-refract-url', 'url(#' + id + ')')
      ro.observe(el) // o 1.º callback gera o mapa
    }

    function remover(el) {
      const a = alvos.get(el)
      if (!a) return
      ro.unobserve(el)
      a.filtro.remove()
      el.style.removeProperty('--glass-refract-url')
      alvos.delete(el)
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      document.querySelectorAll('[class*="glass-refract"]').forEach(el => {
        const px = lerPx(el)
        const a = alvos.get(el)
        if (px > 0 && !a) registar(el, px)
        else if (px > 0 && a && a.px !== px) actualizar(el, a)
        else if (px <= 0 && a) remover(el)
      })
      alvos.forEach((_, el) => {
        if (!el.isConnected) remover(el)
      })
    }

    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar(mutacoes) {
      if (svg && mutacoes && mutacoes.every(m => svg.contains(m.target))) return
      if (agendado) return
      agendado = true
      requestAnimationFrame(() => requestAnimationFrame(varrer))
    }

    new MutationObserver(agendar).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => agendar())
    else agendar()

    return { varrer }
  }

  // ----------------------------------------------------------------- plugin
  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    let motor = null
    return {
      nome: 'glass',
      versao: VERSAO,
      setup(ctx) {
        const prefixo = (ctx.config && ctx.config.prefix) || ''
        // Se o Breeze já aplicou o prefixo (use() depois do init), aplicamo-lo nós.
        const fixas = (ctx.config && ctx.config.classesFixas) || {}
        const jaPrefixado = prefixo && prefixo + 'block' in fixas
        const nome = n => (jaPrefixado ? prefixo + n : n)

        Object.keys(CLASSES).forEach(n => ctx.addFixedClass(nome(n), CLASSES[n]))
        Object.keys(MAPEAMENTOS).forEach(p => ctx.addMapping(nome(p), MAPEAMENTOS[p]))

        if (typeof document === 'undefined') return
        injectarEstilos(prefixo)
        if (!motor && refracaoSuportada(cfg)) motor = iniciarRefraccao(cfg)

        // use() depois do init: reprocessa os elementos já existentes
        if (global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      },
      actualizar() {
        if (motor) motor.varrer()
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeGlass = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)

/* ═══ Plugin original: BreezeProgress v1.0.0 (extraído 1:1 do bundle) ═══ */

;/*!
 * BreezeProgress v1.0.0 — plugin "progress" para o BreezeCSS (>= 2.2)
 *
 * Barra de progresso em qualquer elemento. Basta adicionar a classe `progress`:
 *   • no <body> (ou <html>)  → progresso de scroll da página inteira, fixa no viewport
 *   • num elemento com scroll interno (overflow auto/scroll) → progresso do scroll dele
 *   • num elemento normal (ex.: uma <section> ou <article>) → progresso da leitura
 *     do elemento enquanto passa pelo ecrã
 * Nos dois últimos casos a barra só é visível enquanto o elemento está visível e
 * fica limitada à largura/altura dele (não ultrapassa as bordas do elemento).
 *
 * Sem elementos extra no HTML: o plugin cria a barra sozinho (fica fora do fluxo
 * do elemento, por isso não estraga flex/grid/nth-child).
 *
 * Uso (junto dos outros plugins, antes do DOMContentLoaded):
 *   <script>window.BreezeConfig = { plugins: [BreezeGlass, BreezeDividers, BreezeProgress] }</script>
 *
 *   <body class="progress">                      barra no topo da página
 *   <body class="progress progress-bottom">      barra em baixo
 *   <article class="progress progress-color[#e11d48]">…</article>
 *   <div class="h[300px] overflow-auto progress progress-lg">…</div>
 *
 * Classes
 *   progress                    activa a barra (obrigatória)
 *   progress-top|bottom|left|right   posição (por omissão: top). left/right = barra vertical
 *   progress-sm|md|lg|xl        espessura (2 / 4 / 6 / 10 px)
 *   progress-h[6px]             espessura arbitrária
 *   progress-color[#6366f1]     cor da barra (aceita gradientes: progress-color[linear-gradient(90deg,#f0f,#0ff)])
 *   progress-track[rgb(0_0_0/_.1)]  cor do fundo (trilho) — transparente por omissão
 *   progress-radius[9999px]     arredondamento — ou a classe fixa progress-rounded
 *   progress-z[50]              z-index (por omissão 9990)
 *   progress-dur[200ms]         duração da animação — ou progress-smooth (200ms) / progress-instant (0)
 *   progress-reverse            enche da direita→esquerda (ou de baixo→cima)
 *   progress-scroll | progress-view | progress-auto   modo de medição
 *        scroll → usa o scroll do próprio elemento
 *        view   → usa a passagem do elemento pelo viewport
 *        auto   → scroll se o elemento tiver scroll interno, senão view (por omissão)
 *   Variantes do Breeze funcionam: md:progress, md:progress-lg, dark:progress-color[#fff]…
 *
 * Extras para o programador
 *   • o elemento recebe a variável CSS --progress (0 a 1), útil para animar outras coisas
 *   • evento 'breeze:progress' no elemento: e.detail = { progresso: 0..1, percentagem: 0..100 }
 *   • BreezeProgress.criar({ altura: 4, cor: '#3b82f6', z: 9990 }) altera os valores por omissão
 *
 * Nota: se um antepassado do elemento tiver transform/filter, a barra fixa pode
 * não alinhar; nesse caso use progress-scroll/view num elemento fora dele.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.0.0'
  const PADROES = { altura: 4, cor: '#3b82f6', z: 9990 }

  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const CLASSES = {
    progress: '--progress-on: 1',
    'progress-top': '--progress-pos: top',
    'progress-bottom': '--progress-pos: bottom',
    'progress-left': '--progress-pos: left',
    'progress-right': '--progress-pos: right',
    'progress-sm': '--progress-h: 2px',
    'progress-md': '--progress-h: 4px',
    'progress-lg': '--progress-h: 6px',
    'progress-xl': '--progress-h: 10px',
    'progress-rounded': '--progress-radius: 9999px',
    'progress-smooth': '--progress-dur: 200ms',
    'progress-instant': '--progress-dur: 0ms',
    'progress-reverse': '--progress-reverse: 1',
    'progress-auto': '--progress-mode: auto',
    'progress-scroll': '--progress-mode: scroll',
    'progress-view': '--progress-mode: view'
  }

  // Valores arbitrários: progress-color[#f00] → --progress-color: #f00
  const MAPEAMENTOS = {
    'progress-h': '--progress-h',
    'progress-color': '--progress-color',
    'progress-track': '--progress-track',
    'progress-radius': '--progress-radius',
    'progress-z': '--progress-z',
    'progress-dur': '--progress-dur'
  }

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // ---------------------------------------------------------------- motor
  function iniciarMotor(cfg, prefixo) {
    const reToken = new RegExp('(^|:)' + esc(prefixo + 'progress') + '!?$')
    const alvos = new Map() // elemento → { host, fill, c, chave, pct }
    const hosts = new WeakSet()
    let pendente = false
    let agendado = false

    // --progress-on não herda: senão todos os filhos de um <body class="progress">
    // seriam tratados como alvos.
    let registada = false
    try {
      if (global.CSS && typeof global.CSS.registerProperty === 'function') {
        global.CSS.registerProperty({ name: '--progress-on', syntax: '<number>', inherits: false, initialValue: '0' })
        registada = true
      }
    } catch (e) {
      registada = !!(e && e.name === 'InvalidModificationError') // já registada
    }

    const reduzMovimento = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ePagina = el => el === document.body || el === document.documentElement

    function ehAlvo(el) {
      let ok = false
      for (const c of el.classList) {
        if (reToken.test(c)) {
          ok = true
          break
        }
      }
      if (!ok) return false
      if (!registada) return true
      return parseFloat(getComputedStyle(el).getPropertyValue('--progress-on')) > 0
    }

    function configurar(el, a) {
      const cs = getComputedStyle(el)
      const v = n => cs.getPropertyValue(n).trim()
      const pos = v('--progress-pos')
      const modo = v('--progress-mode')
      const c = {
        pos: ['top', 'bottom', 'left', 'right'].indexOf(pos) >= 0 ? pos : 'top',
        h: v('--progress-h') || cfg.altura + 'px',
        cor: v('--progress-color') || cfg.cor,
        trilho: v('--progress-track') || 'transparent',
        raio: v('--progress-radius') || '0',
        z: v('--progress-z') || String(cfg.z),
        dur: reduzMovimento() ? '0ms' : v('--progress-dur') || '80ms',
        inverso: v('--progress-reverse') === '1',
        modo: modo === 'scroll' || modo === 'view' ? modo : 'auto'
      }
      const vert = c.pos === 'left' || c.pos === 'right'
      const prev = a.c
      a.c = c
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) return
      const hs = a.host.style
      hs.cssText =
        'position:fixed;left:0;top:0;margin:0;padding:0;box-sizing:border-box;pointer-events:none;overflow:hidden;' +
        'visibility:hidden;background:' + c.trilho + ';border-radius:' + c.raio + ';z-index:' + c.z
      const fs = a.fill.style
      fs.cssText =
        'width:100%;height:100%;will-change:transform;background:' + c.cor + ';' +
        'transition:transform ' + c.dur + ' linear;' +
        'transform-origin:' + (vert ? (c.inverso ? 'center bottom' : 'center top') : c.inverso ? 'right center' : 'left center')
      a.chave = ''
    }

    function registar(el) {
      const host = document.createElement('div')
      host.setAttribute('data-breeze-progress', '')
      host.setAttribute('aria-hidden', 'true')
      const fill = document.createElement('div')
      host.appendChild(fill)
      hosts.add(host)
      document.body.appendChild(host)
      const a = { host, fill, c: null, chave: '', pct: -1 }
      alvos.set(el, a)
      configurar(el, a)
      if (typeof ResizeObserver !== 'undefined') {
        a.ro = new ResizeObserver(pedir)
        a.ro.observe(ePagina(el) ? document.documentElement : el)
      }
    }

    function remover(el) {
      const a = alvos.get(el)
      if (!a) return
      if (a.ro) a.ro.disconnect()
      a.host.remove()
      alvos.delete(el)
      try {
        el.style.removeProperty('--progress')
      } catch (e) {
        /* ignorar */
      }
    }

    const limita = x => (x < 0 ? 0 : x > 1 ? 1 : x)

    function medir(el, a) {
      const c = a.c
      if (!c) return
      const de = document.documentElement
      const vw = de.clientWidth
      const vh = de.clientHeight
      const vert = c.pos === 'left' || c.pos === 'right'
      let p = 0
      let rect

      if (ePagina(el)) {
        rect = { left: 0, top: 0, right: vw, bottom: vh, width: vw, height: vh }
        const se = document.scrollingElement || de
        const maxV = se.scrollHeight - se.clientHeight
        const maxH = se.scrollWidth - se.clientWidth
        if (maxV > 1) p = (global.scrollY || se.scrollTop) / maxV
        else if (maxH > 1) p = (global.scrollX || se.scrollLeft) / maxH
      } else {
        rect = el.getBoundingClientRect()
        const dentro = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw
        if (!dentro) {
          if (a.chave !== 'oculto') {
            a.host.style.visibility = 'hidden'
            a.chave = 'oculto'
          }
          return
        }
        const cs = getComputedStyle(el)
        const maxV = el.scrollHeight - el.clientHeight
        const maxH = el.scrollWidth - el.clientWidth
        const rolaV = maxV > 1 && /(auto|scroll)/.test(cs.overflowY)
        const rolaH = maxH > 1 && /(auto|scroll)/.test(cs.overflowX)
        const usaScroll = c.modo === 'scroll' || (c.modo === 'auto' && (rolaV || rolaH))
        if (usaScroll) {
          if (maxV > 1 && (rolaV || c.modo === 'scroll')) p = el.scrollTop / maxV
          else if (maxH > 1) p = el.scrollLeft / maxH
        } else {
          // passagem pelo viewport: elemento alto → do topo ao fim; baixo → da entrada à saída
          p = rect.height > vh ? -rect.top / (rect.height - vh) : (vh - rect.top) / (vh + rect.height)
        }
      }
      p = limita(p)

      const x0 = Math.max(rect.left, 0)
      const x1 = Math.min(rect.right, vw)
      const y0 = Math.max(rect.top, 0)
      const y1 = Math.min(rect.bottom, vh)
      let tx = x0
      let ty = y0
      let extra = ''
      let w
      let h
      if (vert) {
        w = c.h
        h = y1 - y0 + 'px'
        if (c.pos === 'right') {
          tx = x1
          extra = ' translateX(-100%)'
        }
      } else {
        w = x1 - x0 + 'px'
        h = c.h
        if (c.pos === 'bottom') {
          ty = y1
          extra = ' translateY(-100%)'
        }
      }
      const chave = [tx, ty, w, h, extra].join('|')
      if (chave !== a.chave) {
        const hs = a.host.style
        hs.visibility = 'visible'
        hs.width = w
        hs.height = h
        hs.transform = 'translate(' + tx + 'px,' + ty + 'px)' + extra
        a.chave = chave
      }
      a.fill.style.transform = vert ? 'scaleY(' + p + ')' : 'scaleX(' + p + ')'

      const pct = Math.round(p * 100)
      if (pct !== a.pct) {
        a.pct = pct
        el.style.setProperty('--progress', String(pct / 100))
        el.dispatchEvent(new CustomEvent('breeze:progress', { detail: { progresso: p, percentagem: pct } }))
      }
    }

    function pedir() {
      if (pendente) return
      pendente = true
      requestAnimationFrame(() => {
        pendente = false
        alvos.forEach((a, el) => medir(el, a))
      })
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      document.querySelectorAll('[class*="progress"]').forEach(el => {
        const a = alvos.get(el)
        const activo = ehAlvo(el)
        if (activo && !a) registar(el)
        else if (activo && a) configurar(el, a)
        else if (!activo && a) remover(el)
      })
      alvos.forEach((_, el) => {
        if (!el.isConnected) remover(el)
      })
      pedir()
    }

    const nosso = n => n.nodeType === 1 && hosts.has(n)
    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar(mutacoes) {
      if (mutacoes && mutacoes.length && mutacoes.every(m => (m.target.nodeType === 1 && m.target.closest('[data-breeze-progress]')) ||
          (m.type === 'childList' && [].every.call(m.addedNodes, nosso) && [].every.call(m.removedNodes, nosso)))) return
      if (agendado) return
      agendado = true
      requestAnimationFrame(() => requestAnimationFrame(varrer))
    }

    global.addEventListener('scroll', pedir, { capture: true, passive: true })
    global.addEventListener('resize', () => agendar(), { passive: true })
    global.addEventListener('load', () => agendar())
    new MutationObserver(agendar).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => agendar())
    else agendar()

    return { varrer }
  }

  // ----------------------------------------------------------------- plugin
  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    let motor = null
    return {
      nome: 'progress',
      versao: VERSAO,
      setup(ctx) {
        const prefixo = (ctx.config && ctx.config.prefix) || ''
        // Se o Breeze já aplicou o prefixo (use() depois do init), aplicamo-lo nós.
        const fixas = (ctx.config && ctx.config.classesFixas) || {}
        const jaPrefixado = prefixo && prefixo + 'block' in fixas
        const nome = n => (jaPrefixado ? prefixo + n : n)

        Object.keys(CLASSES).forEach(n => ctx.addFixedClass(nome(n), CLASSES[n]))
        Object.keys(MAPEAMENTOS).forEach(p => ctx.addMapping(nome(p), MAPEAMENTOS[p]))

        if (typeof document === 'undefined') return
        if (!motor) motor = iniciarMotor(cfg, prefixo)

        // use() depois do init: reprocessa os elementos já existentes
        if (global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      },
      actualizar() {
        if (motor) motor.varrer()
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeProgress = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)

/* ═══ Plugin original: BreezeScrollbar v1.0.0 (extraído 1:1 do bundle) ═══ */

;/*!
 * BreezeScrollbar v1.0.0 — plugin "scrollbar" para o BreezeCSS (>= 2.2)
 *
 * Personaliza a barra de scroll de qualquer elemento — ou da página inteira
 * (classe no <html> ou no <body>). Chromium/Safari usam ::-webkit-scrollbar
 * (tamanho, raio, folga e hover totalmente controláveis); o Firefox usa
 * scrollbar-color / scrollbar-width (cores e fino/normal).
 *
 * Uso (junto dos outros plugins, antes do DOMContentLoaded):
 *   <script>window.BreezeConfig = { plugins: [BreezeGlass, BreezeDividers, BreezeProgress, BreezeScrollbar] }</script>
 *
 *   <body class="scrollbar scrollbar-thumb[#6366f1] scrollbar-track[#0f172a]">
 *   <div class="h[300px] overflow-auto scrollbar scrollbar-thin scrollbar-rounded">…</div>
 *   <div class="overflow-auto scrollbar-none">…</div>      (esconde a barra, mantém o scroll)
 *
 * Classes
 *   scrollbar                       activa a personalização (obrigatória, excepto com scrollbar-none)
 *   scrollbar-thin|md|lg|xl         espessura (6 / 10 / 14 / 18 px) — por omissão 8px
 *   scrollbar-size[12px]            espessura arbitrária
 *   scrollbar-thumb[#6366f1]        cor do "polegar" (aceita gradientes no Chromium/Safari)
 *   scrollbar-thumb-hover[#818cf8]  cor do polegar ao passar o rato
 *   scrollbar-track[rgb(0_0_0/_.1)] cor do trilho (transparente por omissão)
 *   scrollbar-corner[#000]          cor do canto (quando há scroll nos dois eixos)
 *   scrollbar-radius[4px]           arredondamento — ou a classe fixa scrollbar-square (0)
 *   scrollbar-gap[2px]              folga entre polegar e trilho
 *   scrollbar-none                  esconde a barra (o elemento continua a fazer scroll)
 *   scrollbar-stable                reserva o espaço da barra (scrollbar-gutter: stable)
 *   Variantes do Breeze funcionam: md:scrollbar-lg, dark:scrollbar-thumb[#fff], hover:scrollbar-thumb[red]…
 *
 * Nota: no Firefox só as cores, scrollbar-none e a escolha fino (por omissão) / normal
 * (scrollbar-lg e scrollbar-xl) têm efeito; raio, folga e hover do polegar não existem lá.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.0.0'
  const PADROES = { tamanho: 8, thumb: 'rgb(128 128 128 / 0.5)', thumbHover: 'rgb(128 128 128 / 0.8)' }
  const VARS = [
    '--scrollbar-size', '--scrollbar-thumb', '--scrollbar-thumb-hover', '--scrollbar-track',
    '--scrollbar-corner', '--scrollbar-radius', '--scrollbar-gap', '--scrollbar-ff'
  ]

  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const CLASSES = {
    scrollbar: '--scrollbar-on: 1',
    'scrollbar-thin': '--scrollbar-size: 6px',
    'scrollbar-md': '--scrollbar-size: 10px',
    'scrollbar-lg': '--scrollbar-size: 14px; --scrollbar-ff: auto',
    'scrollbar-xl': '--scrollbar-size: 18px; --scrollbar-ff: auto',
    'scrollbar-square': '--scrollbar-radius: 0px',
    'scrollbar-none': '--scrollbar-on: 1; --scrollbar-hide: 1',
    'scrollbar-stable': 'scrollbar-gutter: stable'
  }

  // Valores arbitrários: scrollbar-thumb[#f00] → --scrollbar-thumb: #f00
  const MAPEAMENTOS = {
    'scrollbar-size': '--scrollbar-size',
    'scrollbar-thumb': '--scrollbar-thumb',
    'scrollbar-thumb-hover': '--scrollbar-thumb-hover',
    'scrollbar-track': '--scrollbar-track',
    'scrollbar-corner': '--scrollbar-corner',
    'scrollbar-radius': '--scrollbar-radius',
    'scrollbar-gap': '--scrollbar-gap'
  }

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function injectarEstilos(cfg) {
    if (document.getElementById('breeze-scrollbar-estilos')) return
    const t = 'var(--scrollbar-size, ' + cfg.tamanho + 'px)'
    const thumb = 'var(--scrollbar-thumb, ' + cfg.thumb + ')'
    const css = `
[data-breeze-scrollbar]::-webkit-scrollbar { width: ${t}; height: ${t}; background: transparent; }
[data-breeze-scrollbar]::-webkit-scrollbar-track { background: var(--scrollbar-track, transparent); border-radius: var(--scrollbar-radius, 9999px); }
[data-breeze-scrollbar]::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: var(--scrollbar-radius, 9999px); border: var(--scrollbar-gap, 0px) solid transparent; background-clip: padding-box; }
[data-breeze-scrollbar]::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, var(--scrollbar-thumb, ${cfg.thumbHover})); background-clip: padding-box; }
[data-breeze-scrollbar]::-webkit-scrollbar-corner { background: var(--scrollbar-corner, transparent); }
[data-breeze-scrollbar]::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
@supports not selector(::-webkit-scrollbar) {
  [data-breeze-scrollbar] { scrollbar-width: var(--scrollbar-ff, thin); scrollbar-color: ${thumb} var(--scrollbar-track, transparent); }
}
[data-breeze-scrollbar="none"] { scrollbar-width: none; -ms-overflow-style: none; }
[data-breeze-scrollbar="none"]::-webkit-scrollbar { display: none; width: 0; height: 0; }`
    const el = document.createElement('style')
    el.id = 'breeze-scrollbar-estilos'
    el.setAttribute('data-breeze', 'scrollbar')
    el.textContent = css
    document.head.appendChild(el)
  }

  function iniciarMotor(cfg, prefixo) {
    const reToken = new RegExp('(^|:)' + esc(prefixo + 'scrollbar') + '(-none)?!?$')
    const copiadas = new Set() // propriedades copiadas do <body> para o <html>
    let agendado = false

    // --scrollbar-on não herda: senão todos os filhos de um <body class="scrollbar">
    // seriam tratados como alvos.
    let registada = false
    try {
      if (global.CSS && typeof global.CSS.registerProperty === 'function') {
        global.CSS.registerProperty({ name: '--scrollbar-on', syntax: '<number>', inherits: false, initialValue: '0' })
        registada = true
      }
    } catch (e) {
      registada = !!(e && e.name === 'InvalidModificationError') // já registada
    }

    function ehAlvo(el) {
      let ok = false
      for (const c of el.classList) {
        if (reToken.test(c)) {
          ok = true
          break
        }
      }
      if (!ok) return false
      if (!registada) return true
      return parseFloat(getComputedStyle(el).getPropertyValue('--scrollbar-on')) > 0
    }

    const escondida = el => getComputedStyle(el).getPropertyValue('--scrollbar-hide').trim() === '1'

    // A barra da página é controlada pelo <html>: se a classe estiver no <body>,
    // copiamos as variáveis e o atributo para o elemento raiz.
    function espelhar(body, valor) {
      const raiz = document.documentElement
      const cs = getComputedStyle(body)
      raiz.setAttribute('data-breeze-scrollbar', valor)
      VARS.forEach(v => {
        const x = cs.getPropertyValue(v).trim()
        if (x) {
          raiz.style.setProperty(v, x)
          copiadas.add(v)
        } else if (copiadas.has(v)) {
          raiz.style.removeProperty(v)
          copiadas.delete(v)
        }
      })
    }

    function limparRaiz() {
      const raiz = document.documentElement
      if (!raiz.hasAttribute('data-breeze-scrollbar') || ehAlvo(raiz)) return
      raiz.removeAttribute('data-breeze-scrollbar')
      copiadas.forEach(v => raiz.style.removeProperty(v))
      copiadas.clear()
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      const vistos = new Set()
      document.querySelectorAll('[class*="scrollbar"]').forEach(el => {
        if (ehAlvo(el)) {
          el.setAttribute('data-breeze-scrollbar', escondida(el) ? 'none' : '')
          vistos.add(el)
          if (el === document.body) espelhar(el, escondida(el) ? 'none' : '')
        }
      })
      document.querySelectorAll('[data-breeze-scrollbar]').forEach(el => {
        if (!vistos.has(el) && el !== document.documentElement) el.removeAttribute('data-breeze-scrollbar')
      })
      if (!vistos.has(document.body) || !ehAlvo(document.body)) limparRaiz()
    }

    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar() {
      if (agendado) return
      agendado = true
      requestAnimationFrame(() => requestAnimationFrame(varrer))
    }

    new MutationObserver(agendar).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    global.addEventListener('resize', agendar, { passive: true }) // variantes md:/lg: …
    global.addEventListener('load', agendar)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agendar)
    else agendar()

    return { varrer }
  }

  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    let motor = null
    return {
      nome: 'scrollbar',
      versao: VERSAO,
      setup(ctx) {
        const prefixo = (ctx.config && ctx.config.prefix) || ''
        // Se o Breeze já aplicou o prefixo (use() depois do init), aplicamo-lo nós.
        const fixas = (ctx.config && ctx.config.classesFixas) || {}
        const jaPrefixado = prefixo && prefixo + 'block' in fixas
        const nome = n => (jaPrefixado ? prefixo + n : n)

        Object.keys(CLASSES).forEach(n => ctx.addFixedClass(nome(n), CLASSES[n]))
        Object.keys(MAPEAMENTOS).forEach(p => ctx.addMapping(nome(p), MAPEAMENTOS[p]))

        if (typeof document === 'undefined') return
        injectarEstilos(cfg)
        if (!motor) motor = iniciarMotor(cfg, prefixo)

        // use() depois do init: reprocessa os elementos já existentes
        if (global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      },
      actualizar() {
        if (motor) motor.varrer()
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeScrollbar = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)

/* ═══ Plugin original: BreezeBackgrounds v1.5.0 (extraído 1:1 do bundle) ═══ */

;/*!
 * BreezeBackgrounds v1.5.0 — plugin "backgrounds" para o BreezeCSS (>= 2.2)
 *
 * v1.5.0 — dois novos estilos:
 *   • cubo      cubos isométricos animados sobre riscas diagonais (o clássico "cube
 *               background"). O mosaico é um <pattern> que se repete para sempre, por
 *               isso o deslize (SMIL no patternTransform) nunca descobre margens nem
 *               precisa de área extra. escala = tamanho do cubo (1 = cubos de 60px,
 *               como no original); angulo roda as riscas; opacidade = transparência
 *               dos cubos (0.7, como no original).
 *   • estrelas  campo de estrelas em 3 camadas (1/2/3px) que sobem continuamente, cada
 *               uma à sua velocidade (50s/100s/150s por ciclo — parallax, como no
 *               original). O céu é o gradiente radial vindo de baixo:
 *               custom-bg-glow[#321b35] sobre custom-bg-color[#090a0f];
 *               custom-bg-line = cor das estrelas; levels = densidade (80 ≈ o campo
 *               original, 1000 estrelas por 2000×2000px);
 *               custom-bg-anim[pulse] faz as estrelas cintilarem.
 *
 * v1.4.0 — fundos animados (opt-in: sem estas classes os fundos ficam exactamente como antes):
 *   • Qualquer estilo / preset pode ser animado. A animação é SVG/SMIL embutido na própria
 *     imagem de fundo: sem JavaScript por frame, sem canvas, sem elementos extra no HTML.
 *     A animação parte do mesmo desenho do fundo estático (mesma semente, mesmas formas).
 *   • custom-bg-animate           liga a animação, com o movimento que melhor assenta ao estilo
 *   • custom-bg-anim[tipos]       escolhe o(s) movimento(s); combinam-se com "_" (= espaço):
 *       drift     desloca o desenho numa trajectória suave e orgânica
 *                 (aurora: cada mancha de cor flutua à sua maneira)
 *       rotate    balanço angular lento em torno do centro (custom-bg-center)
 *       breathe   zoom lento (aproxima / afasta) em torno do centro
 *       pulse     linhas alternadas “respiram” em opacidade; pontos e quadrados cintilam;
 *                 as manchas da aurora pulsam
 *       none      desliga (útil em variantes, p.ex. md:custom-bg-anim[none])
 *   • custom-bg-anim-speed[1]     multiplicador de velocidade  (0.1–5)
 *   • custom-bg-anim-amount[1]    multiplicador de amplitude   (0–2.5)
 *     Ex.:  <section class="custom-bg[topo] custom-bg-animate">
 *           <section class="custom-bg[espiral] custom-bg-anim[rotate_pulse] custom-bg-anim-speed[0.6]">
 *   • Respeita prefers-reduced-motion (mostra o fundo estático) e, para poupar CPU/GPU, volta
 *     à versão estática enquanto o elemento está fora do ecrã.
 *     Desactivar o primeiro: BreezeBackgrounds.criar({ respeitarMovimentoReduzido: false })
 *   • Presets próprios: novas chaves  animacao ('drift pulse'), animar (true), velocidade, amplitude.
 *   • API: BreezeBackgrounds.gerar(bruto, w, h, { animar: false }) devolve sempre a versão estática.
 *   • Custo: a imagem é redesenhada a cada frame pelo browser. Estilos com muito traço
 *     (marmore, colmeia, raios, grelha) pesam mais — nesses convém baixar levels ou usar pulse
 *     (que não obriga a gerar área extra) em vez de drift/rotate.
 *
 * v1.3.0 — fundos mais variados:
 * v1.3.0 — fundos mais variados:
 *   • Novos estilos de linhas: colmeia, celulas, agata, dunas, raios.
 *   • Novos modos que não são linhas:
 *       pontos   meio-tom (halftone) — pontos que crescem e encolhem com o ruído
 *       mosaico  grelha de quadrados com tons variáveis (mapa de calor / pixel-art)
 *       aurora   manchas de cor difusas em gradiente, sem linhas
 *   • Os parâmetros existentes aplicam-se: levels = nº de células do longo lado
 *     (pontos, mosaico), width = tamanho dos pontos/quadrados, line = cor principal
 *     (em aurora define a família de cores), angle = direcção (pontos) ou
 *     rotação de matiz em graus (aurora).
 *
 * v1.2.0:
 *   • Zona limpa central removida — as linhas cobrem agora todo o fundo,
 *     sem máscara nem “buraco” ao centro.
 *   • Preset ilhas removido (ficou igual ao topo sem a zona limpa).
 *   • custom-bg-clear removido; custom-bg-center mantém-se apenas para
 *     posicionar os estilos radiais (ripples, espiral) e o brilho opt-in.
 *
 * v1.1.0:
 *   • O brilho central (círculo luminoso) deixou de ser aplicado por omissão —
 *     passa a ser opt-in via custom-bg-glow[cor].
 *   • Presets topo-emerald / topo-violet / topo-crimson / topo-mono / topo-light
 *     removidos (todos eram variações do mesmo estilo; ficou o "topo").
 *   • Novos estilos: picos, espiral, grelha, interferencia, marmore.
 *   • Linhas mais presentes (opacidade das traces reforçada).
 *
 * Gera fundos de linhas de contorno (estilo mapa topográfico) de forma
 * procedural, a partir de classes. Sem imagens, sem elementos extra no HTML:
 * o plugin desenha um SVG do tamanho exacto do elemento (regenerado quando ele
 * muda de tamanho) e aplica-o num ::before atrás do conteúdo.
 *
 * Uso (recomendado — antes do BreezeCSS):
 *   <script src="breeze--backgrounds.js"></script>
 *   <script>window.BreezeConfig = { plugins: [BreezeBackgrounds] }</script>
 *   <script src="breeze.min.js"></script>
 *
 * Uso (depois do BreezeCSS já inicializado):
 *   BreezeCSS.use(BreezeBackgrounds)
 *
 *   <div class="custom-bg[topo]">…</div>
 *   <section class="min-h[100vh] custom-bg[waves] custom-bg-color[#003] custom-bg-levels[24]">…</section>
 *
 * Estilos / presets  — custom-bg[nome]
 *   topo            contornos de relevo                  ← por omissão
 *   waves           ondas horizontais
 *   flow            ondas deformadas, em diagonal
 *   ripples         anéis concêntricos a partir do centro
 *   ridges          cristas / veios (contornos de |ruído|)
 *   picos           anéis em torno de vários picos
 *   espiral         redemoinho que roda em torno do centro
 *   grelha          malha orgânica de células arredondadas
 *   interferencia   interferência de duas fontes de ondas
 *   marmore         veios finos e caóticos
 *   colmeia         rede hexagonal deformada
 *   celulas         células tipo Voronoi, com anéis em cada uma
 *   agata           anéis irregulares encaixados, tipo ágata
 *   dunas           cristas paralelas e assimétricas (preset claro)
 *   raios           feixes que irradiam do centro
 *   pontos          meio-tom: pontos de tamanho variável
 *   mosaico         quadrados de tons variáveis
 *   aurora          manchas de cor difusas (gradientes, sem linhas)
 *   cubo            cubos isométricos sobre riscas diagonais
 *   estrelas        campo de estrelas em 3 camadas, com parallax
 *   A classe simples  custom-bg  equivale a  custom-bg[topo].
 *
 * Parâmetros (todos opcionais)
 *   custom-bg-color[#003]        cor base (a escura das bordas). As restantes cores
 *                                são derivadas dela, a menos que as indiques.
 *   custom-bg-glow[#0053cf]      brilho central OPCIONAL — desactivado por omissão;
 *                                custom-bg-glow[none] também força sem brilho
 *   custom-bg-line[#087cff]      cor das linhas principais
 *   custom-bg-line-soft[#0753bd] cor das linhas alternadas (mais discretas)
 *   custom-bg-levels[18]         nº de níveis de contorno (densidade das linhas)
 *   custom-bg-scale[1.4]         tamanho das formas (>1 = formas maiores)
 *   custom-bg-seed[42]           semente: muda a forma, mantém o estilo
 *   custom-bg-width[1.2]         espessura das linhas em px
 *   custom-bg-opacity[0.8]       multiplicador da opacidade das linhas (0–1)
 *   custom-bg-center[50%_53%]    centro dos estilos radiais (ripples, espiral)
 *                                e do brilho, se activo
 *   custom-bg-angle[30]          ângulo em graus (waves / flow / marmore)
 *   Variantes do Breeze funcionam: md:custom-bg[waves], hover:custom-bg-color[#012], …
 *
 * Presets próprios
 *   BreezeBackgrounds.criar({ presets: {
 *     marca: { estilo: 'topo', cor: '#1a0033', niveis: 22, seed: 5 }
 *   } })
 *   // ou, depois de criado:  BreezeBackgrounds.registar('marca', { … })
 *   // chaves do preset: estilo, cor, glow, linha, linhaSuave, niveis, escala, seed,
 *   //                   largura, opacidade, centro ('50% 50%'), angulo
 *
 * Opções gerais:  BreezeBackgrounds.criar({ pseudo: 'before' | 'after' })
 *   (o fundo usa um pseudo-elemento; se já usas ::before no elemento, escolhe 'after')
 *
 * API extra
 *   BreezeBackgrounds.gerar({ name:'topo', color:'#003', … }, largura, altura)
 *     → { svg, css }   (SVG das linhas + declarações CSS completas; funciona em Node)
 *
 * Notas
 *   • O elemento passa a ter position:relative e isolation:isolate (com especificidade 0:
 *     as tuas classes ganham) e o conteúdo fica por cima do fundo.
 *   • Respeita o border-radius do elemento.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.5.0'
  const PADROES = { pseudo: 'before', presets: {}, respeitarMovimentoReduzido: true }

  // Valores por omissão de todos os parâmetros (podem ser alterados por estilo / preset / classe)
  const BASE = {
    estilo: 'topo', cor: '#000824', glow: null, linha: null, linhaSuave: null,
    niveis: 18, escala: 1, seed: 7, largura: 1, opacidade: 1,
    centro: [0.5, 0.53], angulo: 0,
    animacao: null, animar: false, velocidade: 1, amplitude: 1
  }

  // ------------------------------------------------------------ classes CSS
  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const CLASSES = { 'custom-bg': '--cbg-on: 1', 'custom-bg-animate': '--cbg-animate: 1' }

  // Valores arbitrários: custom-bg-color[#003] → --cbg-color: #003
  const MAPEAMENTOS = {
    'custom-bg': '--cbg-name',
    'custom-bg-color': '--cbg-color',
    'custom-bg-glow': '--cbg-glow',
    'custom-bg-line': '--cbg-line',
    'custom-bg-line-soft': '--cbg-line-soft',
    'custom-bg-levels': '--cbg-levels',
    'custom-bg-scale': '--cbg-scale',
    'custom-bg-seed': '--cbg-seed',
    'custom-bg-width': '--cbg-width',
    'custom-bg-opacity': '--cbg-opacity',
    'custom-bg-center': '--cbg-center',
    'custom-bg-angle': '--cbg-angle',
    'custom-bg-anim': '--cbg-anim',
    'custom-bg-anim-speed': '--cbg-anim-speed',
    'custom-bg-anim-amount': '--cbg-anim-amount'
  }
  const VARS = ['on', 'name', 'color', 'glow', 'line', 'line-soft', 'levels', 'scale', 'seed', 'width', 'opacity', 'center', 'angle', 'animate', 'anim', 'anim-speed', 'anim-amount']

  // ------------------------------------------------------------------ utilitários
  const limita = (x, a, b) => (x < a ? a : x > b ? b : x)
  const lin = (a, b, n) => {
    const r = []
    for (let i = 0; i < n; i++) r.push(n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1))
    return r
  }
  const r1 = v => Math.round(v * 10) / 10
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // ------------------------------------------------------------------ cores
  function rgb2hsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    const l = (mx + mn) / 2
    let h = 0, s = 0
    if (mx !== mn) {
      const d = mx - mn
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
      h *= 60
    }
    return { h, s, l }
  }

  function hsl2rgb(h, s, l, a) {
    h = (((h % 360) + 360) % 360) / 360
    const f = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a: a == null ? 1 : a }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return { r: f(p, q, h + 1 / 3) * 255, g: f(p, q, h) * 255, b: f(p, q, h - 1 / 3) * 255, a: a == null ? 1 : a }
  }

  const mistura = (a, b, t) => ({
    r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: 1
  })
  const escala = (c, k) => ({ r: limita(c.r * k, 0, 255), g: limita(c.g * k, 0, 255), b: limita(c.b * k, 0, 255), a: 1 })
  const rgba = (c, a) => 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + (a == null ? 1 : +a.toFixed(3)) + ')'
  const rgbStr = c => 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'
  const BRANCO = { r: 255, g: 255, b: 255 }

  const cacheCor = new Map()
  let sonda = null
  let tela = null

  // Resolve qualquer cor CSS (nomes, var(--x), oklch(), …) para {r,g,b,a} — só no browser.
  function corViaDom(txt) {
    if (typeof document === 'undefined') return null
    try {
      if (!sonda) {
        sonda = document.createElement('span')
        sonda.style.cssText = 'display:none'
        sonda.setAttribute('data-breeze', 'backgrounds-sonda')
        document.documentElement.appendChild(sonda)
      }
      sonda.style.color = ''
      sonda.style.color = txt
      if (!sonda.style.color) return null
      const resolvida = getComputedStyle(sonda).color
      if (!tela) {
        tela = document.createElement('canvas')
        tela.width = tela.height = 1
      }
      const ctx = tela.getContext('2d', { willReadFrequently: true })
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = resolvida
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
    } catch (e) {
      return null
    }
  }

  function parseCor(txt) {
    if (txt && typeof txt === 'object') return txt
    const s = String(txt == null ? '' : txt).trim().toLowerCase()
    if (!s) return null
    if (cacheCor.has(s)) return cacheCor.get(s)
    let c = null
    let m
    if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
      let h = m[1]
      if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('')
      if (h.length === 6 || h.length === 8) {
        c = {
          r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
          a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        }
      }
    } else if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean)
      const v = i => (/%$/.test(p[i]) ? (parseFloat(p[i]) / 100) * 255 : parseFloat(p[i]))
      if (p.length >= 3 && [0, 1, 2].every(i => isFinite(v(i)))) {
        c = { r: v(0), g: v(1), b: v(2), a: p[3] != null ? (/%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1 }
      }
    } else if ((m = s.match(/^hsla?\(([^)]+)\)$/))) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean)
      const h = parseFloat(p[0]), sa = parseFloat(p[1]) / 100, li = parseFloat(p[2]) / 100
      if ([h, sa, li].every(isFinite)) {
        c = hsl2rgb(h, sa, li, p[3] != null ? (/%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1)
      }
    }
    if (!c) c = corViaDom(s)
    if (c) cacheCor.set(s, c)
    return c
  }

  // Deriva a paleta completa a partir da cor base (e das cores dadas explicitamente).
  // O brilho central é opt-in: só existe se P.glow indicar uma cor.
  function paleta(P) {
    const base = parseCor(P.cor) || parseCor(BASE.cor)
    const hsl = rgb2hsl(base)
    const escuro = hsl.l < 0.5
    let glow = null, linha, suave
    if (escuro) {
      const lLinha = limita(hsl.l + 0.4, 0.52, 0.78)
      linha = hsl2rgb(hsl.h, hsl.s, lLinha)
      suave = hsl2rgb(hsl.h, hsl.s, lLinha - 0.14)
    } else {
      linha = hsl2rgb(hsl.h, hsl.s, Math.max(0.25, hsl.l - 0.42))
      suave = hsl2rgb(hsl.h, hsl.s, Math.max(0.3, hsl.l - 0.28))
    }
    if (P.glow && P.glow !== 'none') {
      glow = parseCor(P.glow) ||
        (escuro ? hsl2rgb(hsl.h, hsl.s, Math.max(0.4, hsl.l + 0.3)) : hsl2rgb(hsl.h, hsl.s * 0.6, 0.995))
    }
    if (P.linha) linha = parseCor(P.linha) || linha
    // se só indicaram a linha principal, a suave deriva dela
    if (P.linhaSuave) suave = parseCor(P.linhaSuave) || suave
    else if (P.linha) suave = mistura(linha, base, 0.35)
    return { base, glow, linha, suave, escuro }
  }

  // ------------------------------------------------------------------ ruído
  function mulberry32(a) {
    return function () {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function criarRuido(seed) {
    const rnd = mulberry32((seed | 0) * 2654435761 + 1013904223)
    const p = []
    for (let i = 0; i < 256; i++) p.push(i)
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      const t = p[i]
      p[i] = p[j]
      p[j] = t
    }
    const P = new Uint8Array(512)
    for (let i = 0; i < 512; i++) P[i] = p[i & 255]
    const GX = new Float32Array(256)
    const GY = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      const a = rnd() * Math.PI * 2
      GX[i] = Math.cos(a)
      GY[i] = Math.sin(a)
    }
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10)
    function perlin(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y)
      const xf = x - xi, yf = y - yi
      const X = xi & 255, Y = yi & 255
      const g = (ix, iy, dx, dy) => {
        const h = P[P[ix & 255] + (iy & 255)]
        return GX[h] * dx + GY[h] * dy
      }
      const u = fade(xf), v = fade(yf)
      const a = g(X, Y, xf, yf), b = g(X + 1, Y, xf - 1, yf)
      const c = g(X, Y + 1, xf, yf - 1), d = g(X + 1, Y + 1, xf - 1, yf - 1)
      const l1 = a + (b - a) * u, l2 = c + (d - c) * u
      return l1 + (l2 - l1) * v
    }
    function fbm(x, y, oct) {
      let s = 0, a = 1, f = 1, n = 0
      for (let o = 0; o < oct; o++) {
        s += a * perlin(x * f + o * 17.3, y * f + o * 9.1)
        n += a
        a *= 0.5
        f *= 2
      }
      return s / n
    }
    return { perlin, fbm }
  }

  // ------------------------------------------------- marching squares + traçado
  // F[j*nx+i] = valor no vértice (i,j), de coordenadas (ox+i*passo, oy+j*passo).
  // Devolve polilinhas {pts:[x0,y0,x1,y1,…], fechada}.
  function contornos(F, nx, ny, ox, oy, passo, nivel) {
    const viz = new Map() // id da aresta → vizinhos (≤ 2)
    const idH = (i, j) => 2 * (j * nx + i) // aresta (i,j)–(i+1,j)
    const idV = (i, j) => 2 * (j * nx + i) + 1 // aresta (i,j)–(i,j+1)

    const lig = (a, b) => {
      let va = viz.get(a)
      if (!va) viz.set(a, (va = []))
      let vb = viz.get(b)
      if (!vb) viz.set(b, (vb = []))
      va.push(b)
      vb.push(a)
    }

    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = F[j * nx + i], b = F[j * nx + i + 1]
        const c = F[(j + 1) * nx + i + 1], d = F[(j + 1) * nx + i]
        const idx = (a >= nivel ? 8 : 0) | (b >= nivel ? 4 : 0) | (c >= nivel ? 2 : 0) | (d >= nivel ? 1 : 0)
        if (idx === 0 || idx === 15) continue
        const T = idH(i, j), B = idH(i, j + 1), L = idV(i, j), R = idV(i + 1, j)
        switch (idx) {
          case 1: case 14: lig(L, B); break
          case 2: case 13: lig(B, R); break
          case 3: case 12: lig(L, R); break
          case 4: case 11: lig(T, R); break
          case 6: case 9: lig(T, B); break
          case 7: case 8: lig(L, T); break
          case 5:
            if ((a + b + c + d) / 4 >= nivel) { lig(L, T); lig(B, R) } else { lig(T, R); lig(L, B) }
            break
          case 10:
            if ((a + b + c + d) / 4 >= nivel) { lig(T, R); lig(L, B) } else { lig(L, T); lig(B, R) }
            break
        }
      }
    }

    const ponto = id => {
      const e = id >> 1
      const j = Math.floor(e / nx), i = e - j * nx
      if ((id & 1) === 0) {
        const v0 = F[j * nx + i], v1 = F[j * nx + i + 1]
        return [ox + (i + (nivel - v0) / (v1 - v0)) * passo, oy + j * passo]
      }
      const v0 = F[j * nx + i], v1 = F[(j + 1) * nx + i]
      return [ox + i * passo, oy + (j + (nivel - v0) / (v1 - v0)) * passo]
    }

    const visto = new Set()
    const saida = []

    function seguir(inicio) {
      const pts = []
      let ant = -1
      let cur = inicio
      for (;;) {
        visto.add(cur)
        const p = ponto(cur)
        pts.push(p[0], p[1])
        let prox = -1
        const v = viz.get(cur)
        for (let k = 0; k < v.length; k++) {
          if (v[k] !== ant && !visto.has(v[k])) { prox = v[k]; break }
        }
        if (prox < 0) {
          const fechada = pts.length >= 6 && v.indexOf(inicio) >= 0 && cur !== inicio
          saida.push({ pts, fechada })
          return
        }
        ant = cur
        cur = prox
      }
    }

    // primeiro as linhas abertas (começam nos extremos), depois os anéis fechados
    viz.forEach((v, id) => { if (v.length === 1 && !visto.has(id)) seguir(id) })
    viz.forEach((v, id) => { if (!visto.has(id)) seguir(id) })
    return saida
  }

  // Polilinha → curva suave (Catmull-Rom → Bézier cúbica), com decimação.
  function caminho(pts, fechada, minD) {
    const P = []
    let lx = pts[0], ly = pts[1]
    P.push([lx, ly])
    for (let i = 2; i < pts.length; i += 2) {
      const x = pts[i], y = pts[i + 1]
      const ultimo = i >= pts.length - 2
      if (ultimo || Math.hypot(x - lx, y - ly) >= minD) {
        P.push([x, y])
        lx = x
        ly = y
      }
    }
    if (fechada && P.length > 3 && Math.hypot(P[0][0] - lx, P[0][1] - ly) < minD * 0.6) P.pop()
    const n = P.length
    if (n < 2) return ''
    if (n === 2) return 'M' + r1(P[0][0]) + ' ' + r1(P[0][1]) + 'L' + r1(P[1][0]) + ' ' + r1(P[1][1])
    const at = i => (fechada ? P[((i % n) + n) % n] : P[limita(i, 0, n - 1)])
    let d = 'M' + r1(P[0][0]) + ' ' + r1(P[0][1])
    const segs = fechada ? n : n - 1
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
      d += 'C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        r1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' +
        r1(p2[0]) + ' ' + r1(p2[1])
    }
    return fechada ? d + 'Z' : d
  }

  // ------------------------------------------------------------------ estilos
  // c = { W, H (em unidades), cx, cy, d2 (dist.² máx ao centro), r (ruído), escala, angulo }
  // campo(c) devolve f(x, y); niveis(c, n) devolve os valores de contorno.
  const rad = g => (g * Math.PI) / 180
  function extensaoRodada(c, ang) {
    const co = Math.cos(ang), si = Math.sin(ang)
    let mn = Infinity, mx = -Infinity
    ;[[0, 0], [c.W, 0], [0, c.H], [c.W, c.H]].forEach(p => {
      const v = -p[0] * si + p[1] * co
      if (v < mn) mn = v
      if (v > mx) mx = v
    })
    return [mn, mx]
  }

  const ESTILOS = {
    topo: {
      padroes: {},
      campo(c) {
        const f = 2.2 / c.escala
        return (x, y) => c.r.fbm(x * f, y * f, 3)
      },
      niveis: (c, n) => lin(-0.4, 0.6, n)
    },
    waves: {
      padroes: { niveis: 20, angulo: 0 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 1.4 / c.escala
        return (x, y) => {
          const u = x * co + y * si, v = -x * si + y * co
          return v + 0.24 * c.escala * c.r.fbm(u * f, v * f * 0.6, 2)
        }
      },
      niveis(c, n) {
        const e = extensaoRodada(c, rad(c.angulo))
        return lin(e[0], e[1], n + 2).slice(1, -1)
      }
    },
    flow: {
      padroes: { niveis: 22, angulo: 28 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 1.1 / c.escala
        return (x, y) => {
          const wx = x + 0.34 * c.escala * c.r.fbm(x * f, y * f, 2)
          const wy = y + 0.34 * c.escala * c.r.fbm(x * f + 5.2, y * f + 1.3, 2)
          const u = wx * co + wy * si, v = -wx * si + wy * co
          return v + 0.05 * c.r.fbm(u * 3 * f, v * 3 * f, 2)
        }
      },
      niveis(c, n) {
        const e = extensaoRodada(c, rad(c.angulo))
        return lin(e[0], e[1], n + 2).slice(1, -1)
      }
    },
    ripples: {
      padroes: { niveis: 24 },
      campo(c) {
        const f = 2.5 / c.escala
        return (x, y) => Math.hypot(x - c.cx, y - c.cy) + 0.07 * c.escala * c.r.fbm(x * f, y * f, 2)
      },
      niveis: (c, n) => lin(0.05, Math.sqrt(c.d2), n)
    },
    ridges: {
      padroes: { niveis: 14 },
      campo(c) {
        const f = 1.8 / c.escala
        return (x, y) => Math.abs(c.r.fbm(x * f, y * f, 3))
      },
      niveis: (c, n) => lin(0.012, 0.24, n)
    },
    picos: {
      padroes: { niveis: 20, escala: 1.3 },
      campo(c) {
        const f = 2.2 / c.escala
        const picos = []
        for (let k = 0; k < 6; k++) {
          const px = limita(0.5 + c.r.perlin(k * 12.9 + 1.7, 4.3) * 0.62, 0.08, 0.92)
          const py = limita(0.5 + c.r.perlin(k * 5.1 + 8.9, 2.6) * 0.62, 0.08, 0.92)
          const r0 = (0.13 + 0.07 * (c.r.perlin(k * 3.3 + 0.9, k * 7.7 + 2.4) + 1) / 2) * c.escala
          picos.push([px * c.W, py * c.H, r0 * r0])
        }
        return (x, y) => {
          let v = 0
          for (let k = 0; k < picos.length; k++) {
            const dx = x - picos[k][0], dy = y - picos[k][1]
            const e = Math.exp(-(dx * dx + dy * dy) / picos[k][2])
            if (e > v) v = e
          }
          return v + 0.06 * c.r.fbm(x * f, y * f, 2)
        }
      },
      niveis: (c, n) => lin(0.04, 0.85, n)
    },
    espiral: {
      padroes: { niveis: 24, escala: 1.2 },
      campo(c) {
        const f = 2.4 / c.escala
        const torsao = 9 * c.escala
        return (x, y) => {
          const dx = x - c.cx, dy = y - c.cy
          const d = Math.hypot(dx, dy)
          const a = d * torsao
          const co = Math.cos(a), si = Math.sin(a)
          return dx * co - dy * si + 0.14 * c.escala * c.r.fbm(x * f, y * f, 2)
        }
      },
      niveis(c, n) {
        const dmax = Math.sqrt(c.d2)
        return lin(-dmax, dmax, n + 2).slice(1, -1)
      }
    },
    grelha: {
      padroes: { niveis: 16, escala: 1.2 },
      campo(c) {
        const k = Math.PI * 2 * 4 / c.escala
        const f = 3 / c.escala
        const w = 0.16 * c.escala
        return (x, y) => {
          const wx = x + w * c.r.fbm(x * f + 11.3, y * f, 2)
          const wy = y + w * c.r.fbm(x * f, y * f + 7.7, 2)
          return Math.sin(wx * k) * Math.sin(wy * k)
        }
      },
      niveis: (c, n) => lin(-0.92, 0.92, n)
    },
    interferencia: {
      padroes: { niveis: 24, escala: 1.2 },
      campo(c) {
        const k = 12 / c.escala
        const f = 2 / c.escala
        const s = [
          limita(0.5 + c.r.perlin(2.3, 8.1) * 0.7, 0.12, 0.88) * c.W,
          limita(0.5 + c.r.perlin(5.9, 1.7) * 0.7, 0.12, 0.88) * c.H,
          limita(0.5 + c.r.perlin(9.2, 3.3) * 0.7, 0.12, 0.88) * c.W,
          limita(0.5 + c.r.perlin(7.4, 6.6) * 0.7, 0.12, 0.88) * c.H
        ]
        return (x, y) => {
          const d1 = Math.hypot(x - s[0], y - s[1])
          const d2 = Math.hypot(x - s[2], y - s[3])
          return 0.5 * Math.sin(d1 * k) + 0.5 * Math.sin(d2 * k) + 0.05 * c.r.fbm(x * f, y * f, 2)
        }
      },
      niveis: (c, n) => lin(-0.95, 0.95, n)
    },
    marmore: {
      padroes: { niveis: 26, escala: 1.5, angulo: 18 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a)
        const fv = 2.6 / c.escala
        const k = 34 / c.escala
        return (x, y) => {
          const q = c.r.fbm(x * fv, y * fv, 3)
          return Math.sin((x * co + y * si) * k + 4.8 * q)
        }
      },
      niveis: (c, n) => lin(-0.9, 0.9, n)
    },
    colmeia: {
      padroes: { niveis: 10, escala: 1, angulo: 15 },
      campo(c) {
        const f = 2 / c.escala
        const kk = (4 * Math.PI) / (Math.sqrt(3) * 0.12 * c.escala)
        const dirs = [0, 60, 120].map(g => [Math.cos(rad(c.angulo + g)), Math.sin(rad(c.angulo + g))])
        return (x, y) => {
          const wx = x + 0.012 * c.escala * c.r.fbm(x * f, y * f, 2)
          const wy = y + 0.012 * c.escala * c.r.fbm(x * f + 5.2, y * f + 1.3, 2)
          let t = 0
          for (let k = 0; k < 3; k++) t += Math.cos(kk * (wx * dirs[k][0] + wy * dirs[k][1]))
          return t / 3
        }
      },
      niveis: (c, n) => lin(-0.3, 0.45, n)
    },
    celulas: {
      padroes: { niveis: 14, escala: 1.1 },
      campo(c) {
        const s = 0.16 * c.escala, f = 2.4 / c.escala
        const cache = new Map()
        const pt = (i, j) => {
          const k = i * 100003 + j
          let p = cache.get(k)
          if (!p) {
            p = [
              (i + limita(0.5 + c.r.perlin(i * 1.713 + 0.37, j * 2.291 + 0.81) * 0.9, 0.08, 0.92)) * s,
              (j + limita(0.5 + c.r.perlin(i * 2.137 + 5.53, j * 1.419 + 3.27) * 0.9, 0.08, 0.92)) * s
            ]
            cache.set(k, p)
          }
          return p
        }
        return (x, y) => {
          const wx = x + 0.02 * c.escala * c.r.fbm(x * f, y * f, 2)
          const wy = y + 0.02 * c.escala * c.r.fbm(x * f + 5.2, y * f + 1.3, 2)
          const ci = Math.floor(wx / s), cj = Math.floor(wy / s)
          let m = Infinity
          for (let dj = -1; dj <= 1; dj++) {
            for (let di = -1; di <= 1; di++) {
              const p = pt(ci + di, cj + dj)
              const d = Math.hypot(wx - p[0], wy - p[1])
              if (d < m) m = d
            }
          }
          return m
        }
      },
      niveis: (c, n) => lin(0.015, 0.72 * 0.16 * c.escala, n)
    },
    agata: {
      padroes: { niveis: 28, escala: 1.2, centro: [0.42, 0.5] },
      campo(c) {
        const f = 1.5 / c.escala
        return (x, y) => Math.hypot(x - c.cx, (y - c.cy) * 1.6) + 0.22 * c.escala * c.r.fbm(x * f, y * f, 4)
      },
      niveis: (c, n) => lin(0.05, Math.sqrt(c.d2) * 1.5, n)
    },
    dunas: {
      padroes: { niveis: 24, escala: 1, angulo: 20 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 0.9 / c.escala
        return (x, y) => {
          const u = x * co + y * si, v = -x * si + y * co
          const q = c.r.fbm(u * f, v * f, 3)
          return v + 0.1 * c.escala * Math.sin(u * 5 / c.escala + 5 * q) + 0.12 * c.escala * q
        }
      },
      niveis(c, n) {
        const e = extensaoRodada(c, rad(c.angulo))
        return lin(e[0], e[1], n + 2).slice(1, -1)
      }
    },
    raios: {
      padroes: { niveis: 20, escala: 1 },
      campo(c) {
        const f = 2 / c.escala
        const N = limita(Math.round(8 / c.escala), 3, 24)
        return (x, y) => {
          const dx = x - c.cx, dy = y - c.cy
          return Math.sin(N * Math.atan2(dy, dx) + 1.6 * Math.hypot(dx, dy) + 1.8 * c.r.fbm(x * f, y * f, 2))
        }
      },
      niveis: (c, n) => lin(-0.92, 0.92, n)
    },
    pontos: {
      modo: 'grade',
      forma: 'ponto',
      padroes: { niveis: 38, escala: 1, angulo: 35 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 2.2 / c.escala
        return (x, y) => 0.9 * (x * co + y * si) + 0.55 * c.r.fbm(x * f, y * f, 3)
      }
    },
    mosaico: {
      modo: 'grade',
      forma: 'quadrado',
      padroes: { niveis: 30, escala: 1 },
      campo(c) {
        const f = 2.4 / c.escala
        return (x, y) => c.r.fbm(x * f, y * f, 3) + 0.25 * c.r.fbm(x * f * 3 + 9.1, y * f * 3 + 2.7, 2)
      }
    },
    aurora: {
      modo: 'malha',
      padroes: { escala: 1 },
      campo: () => () => 0
    },
    cubo: {
      modo: 'cubo',
      padroes: { niveis: 18, escala: 1, opacidade: 0.7, angulo: 0 },
      campo: () => () => 0
    },
    estrelas: {
      modo: 'estrelas',
      padroes: { niveis: 80, escala: 1, opacidade: 1, centro: [0.5, 1] },
      campo: () => () => 0
    }
  }

  const BASE_DARK = { cor: '#000824' }
  const PRESETS_BUILTIN = {
    topo: { estilo: 'topo', cor: '#000824' },
    waves: { estilo: 'waves', cor: '#02131f' },
    flow: { estilo: 'flow', cor: '#0b0a1e' },
    ripples: { estilo: 'ripples', cor: '#01121c' },
    ridges: { estilo: 'ridges', cor: '#160716' },
    picos: { estilo: 'picos', cor: '#1d1002' },
    espiral: { estilo: 'espiral', cor: '#150326' },
    grelha: { estilo: 'grelha', cor: '#0b0c10' },
    interferencia: { estilo: 'interferencia', cor: '#031a2e' },
    marmore: { estilo: 'marmore', cor: '#101418' },
    colmeia: { estilo: 'colmeia', cor: '#071608' },
    celulas: { estilo: 'celulas', cor: '#1a0610' },
    agata: { estilo: 'agata', cor: '#04181a' },
    dunas: { estilo: 'dunas', cor: '#efe6d4' },
    raios: { estilo: 'raios', cor: '#1a1405' },
    pontos: { estilo: 'pontos', cor: '#140512', linha: '#f472b6' },
    mosaico: { estilo: 'mosaico', cor: '#0a0f24', linha: '#818cf8' },
    aurora: { estilo: 'aurora', cor: '#050b1a', linha: '#22d3a6' },
    cubo: { estilo: 'cubo', cor: '#181c21' },
    estrelas: { estilo: 'estrelas', cor: '#090a0f', glow: '#321b35', linha: '#ffffff' }
  }

  // ----------------------------------------------------------- animação (SVG / SMIL)
  // Movimento que melhor assenta a cada estilo quando só se escreve custom-bg-animate.
  const ANIM_PADRAO = {
    topo: 'drift', waves: 'drift', flow: 'drift', ripples: 'breathe', ridges: 'drift',
    picos: 'breathe', espiral: 'rotate', grelha: 'drift', interferencia: 'breathe',
    marmore: 'drift', colmeia: 'drift', celulas: 'drift', agata: 'rotate', dunas: 'drift',
    raios: 'rotate', pontos: 'pulse', mosaico: 'pulse', aurora: 'drift',
    cubo: 'drift breathe rotate', estrelas: 'drift'
  }
  // Estilos cujos níveis de contorno dependem do tamanho do elemento (extensão rodada ou
  // distância ao canto): ao gerar área extra para o movimento, estendem-se os níveis.
  const ESTENDE = ['waves', 'flow', 'ripples', 'espiral', 'agata', 'dunas']
  Object.keys(ESTILOS).forEach(k => {
    ESTILOS[k].animPadrao = ANIM_PADRAO[k] || 'drift'
    ESTILOS[k].estende = ESTENDE.indexOf(k) >= 0
  })

  const ANIMS = ['drift', 'rotate', 'breathe', 'pulse']
  const ALIAS_ANIM = { deriva: 'drift', rodar: 'rotate', respirar: 'breathe', pulsar: 'pulse' }
  const n3 = v => +v.toFixed(3)

  // Curvas: 0 → +a → 0 → −a → 0 com easing de seno (SPL_SENO); ida-e-volta suave (SPL_SUAVE).
  const SPL_SENO = '0.61 1 0.88 1;0.12 0 0.39 0;0.61 1 0.88 1;0.12 0 0.39 0'
  const SPL_SUAVE = '0.37 0 0.63 1;0.37 0 0.63 1'
  const KT5 = '0;0.25;0.5;0.75;1'
  const KT3 = '0;0.5;1'
  const osc = (a, mk) => [mk(0), mk(a), mk(0), mk(-a), mk(0)]

  function animTransf(tipo, vals, dur, oscila) {
    return "<animateTransform attributeName='transform' type='" + tipo + "' values='" + vals.join(';') +
      "' keyTimes='" + (oscila ? KT5 : KT3) + "' calcMode='spline' keySplines='" + (oscila ? SPL_SENO : SPL_SUAVE) +
      "' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
  }

  // fase > 0 → begin negativo: a animação começa já “a meio”, desfasada das outras
  function animAttr(attr, vals, dur, fase) {
    return "<animate attributeName='" + attr + "' values='" + vals.join(';') + "' keyTimes='" + KT3 +
      "' calcMode='spline' keySplines='" + SPL_SUAVE + "' dur='" + r1(dur) + "s'" +
      (fase > 0 ? " begin='-" + r1(fase) + "s'" : '') + " repeatCount='indefinite'/>"
  }

  // Envolve o desenho em grupos animados (de fora para dentro: drift → rotate → breathe).
  function envolver(corpo, mov) {
    let s = corpo
    if (mov.breathe) {
      const b = mov.breathe
      s = "<g transform='translate(" + r1(b.cx) + ' ' + r1(b.cy) + ")'><g>" +
        animTransf('scale', [1, n3(1 + b.s), 1], b.t, false) +
        "<g transform='translate(" + r1(-b.cx) + ' ' + r1(-b.cy) + ")'>" + s + '</g></g></g>'
    }
    if (mov.rotate) {
      const r = mov.rotate
      s = '<g>' + animTransf('rotate', osc(r.ang, v => r1(v) + ' ' + r1(r.cx) + ' ' + r1(r.cy)), r.t, true) + s + '</g>'
    }
    if (mov.drift) {
      const d = mov.drift
      s = '<g>' + animTransf('translate', osc(d.ax, v => r1(v) + ' 0'), d.tx, true) +
        '<g>' + animTransf('translate', osc(d.ay, v => '0 ' + r1(v)), d.ty, true) + s + '</g></g>'
    }
    return s
  }

  // "drift_pulse" → ['drift','pulse'] · 'none' → [] · ausente → null
  function lerAnim(v, silencioso) {
    if (v == null || v === '') return null
    const lista = (Array.isArray(v) ? v : String(v).toLowerCase().split(/[\s,+]+/))
      .map(x => String(x).trim()).map(x => ALIAS_ANIM[x] || x).filter(Boolean)
    if (lista.some(x => /^(none|off|false|0|nenhuma)$/.test(x))) return []
    const ok = []
    lista.forEach(x => {
      if (ANIMS.indexOf(x) >= 0) {
        if (ok.indexOf(x) < 0) ok.push(x)
      } else if (!silencioso && typeof console !== 'undefined') {
        console.warn('[BreezeBackgrounds] animação desconhecida: "' + x + '" — usa: ' + ANIMS.join(', '))
      }
    })
    return ok
  }
  const ligado = v => v != null && v !== '' && !/^(0|false|no|none|off)$/i.test(String(v).trim())

  // ------------------------------------------------- normalização dos parâmetros
  const num = (v, d, a, b) => {
    const n = parseFloat(v)
    return isFinite(n) ? (a != null ? limita(n, a, b) : n) : d
  }

  function lerCentro(v, d) {
    if (Array.isArray(v) && v.length === 2) return v
    if (typeof v !== 'string') return d
    const p = v.trim().split(/[\s,]+/).map(x => (/%$/.test(x) ? parseFloat(x) / 100 : parseFloat(x)))
    if (p.length === 1 && isFinite(p[0])) return [p[0], p[0]]
    return p.length >= 2 && isFinite(p[0]) && isFinite(p[1]) ? [p[0], p[1]] : d
  }

  // bruto: { name, color, glow, line, 'line-soft', levels, … } (strings das variáveis CSS)
  // e/ou chaves de preset em português (estilo, cor, niveis, …). Devolve parâmetros tipados.
  function resolver(bruto, presets, silencioso) {
    const b = bruto || {}
    const nome = String(b.name || b.nome || b.estilo || BASE.estilo).trim()
    const preset = presets[nome] || PRESETS_BUILTIN[nome]
    const estiloNome = (preset && preset.estilo) || (ESTILOS[nome] ? nome : null)
    if (!preset && !estiloNome && !silencioso && typeof console !== 'undefined') {
      console.warn('[BreezeBackgrounds] estilo desconhecido: "' + nome + '" — a usar "topo"')
    }
    const estilo = ESTILOS[estiloNome] ? estiloNome : 'topo'
    const m = Object.assign({}, BASE, ESTILOS[estilo].padroes, preset || {})
    const pick = (en, pt) => (b[en] != null && b[en] !== '' ? b[en] : b[pt] != null && b[pt] !== '' ? b[pt] : null)

    const P = { estilo }
    const cor = pick('color', 'cor'), glow = pick('glow', 'glow'), linha = pick('line', 'linha'), suave = pick('line-soft', 'linhaSuave')
    P.cor = cor != null ? cor : m.cor
    P.glow = glow != null ? glow : m.glow
    P.linha = linha != null ? linha : m.linha
    P.linhaSuave = suave != null ? suave : m.linhaSuave
    P.niveis = Math.round(num(pick('levels', 'niveis'), m.niveis, 2, 80))
    P.escala = num(pick('scale', 'escala'), m.escala, 0.2, 5)
    P.seed = Math.round(num(pick('seed', 'seed'), m.seed))
    P.largura = num(pick('width', 'largura'), m.largura, 0.2, 10)
    P.opacidade = num(pick('opacity', 'opacidade'), m.opacidade, 0, 1)
    P.centro = lerCentro(pick('center', 'centro'), Array.isArray(m.centro) ? m.centro : lerCentro(m.centro, BASE.centro))
    P.angulo = num(pick('angle', 'angulo'), m.angulo)

    // animação: custom-bg-anim[...] manda; senão a do preset; senão custom-bg-animate / animar
    let anim = lerAnim(pick('anim', 'animacao'), silencioso)
    if (anim === null) anim = lerAnim(m.animacao, silencioso)
    if (anim === null) {
      const f = pick('animate', 'animar')
      anim = ligado(f != null ? f : m.animar) ? lerAnim(ESTILOS[estilo].animPadrao, true) : []
    }
    P.anim = anim
    P.animVel = num(pick('anim-speed', 'velocidade'), m.velocidade, 0.1, 5)
    P.animQtd = num(pick('anim-amount', 'amplitude'), m.amplitude, 0, 2.5)
    return P
  }

  // Modo "grade": pontos / quadrados cujo tamanho ou tom segue o campo (normalizado).
  // extra (px) > 0: estende a grelha para lá do elemento (área para o movimento);
  // a normalização usa só as células visíveis, por isso o instante 0 não muda.
  // A = { mov, pulso } quando animado.
  function gradeSvg(est, P, c, W, H, U, pal, extra, A) {
    const g = Math.max(W, H) / limita(P.niveis, 8, 80)
    const ncx = Math.ceil(W / g), ncy = Math.ceil(H / g)
    const e = extra > 0 ? Math.ceil(extra / g) : 0
    const nvx = ncx + 2 * e, nvy = ncy + 2 * e
    const campo = est.campo(c)
    const V = new Float32Array(nvx * nvy)
    let mn = Infinity, mx = -Infinity
    for (let j = 0; j < nvy; j++) {
      for (let i = 0; i < nvx; i++) {
        const v = campo(((i - e + 0.5) * g) / U, ((j - e + 0.5) * g) / U)
        V[j * nvx + i] = v
        if (i >= e && i < e + ncx && j >= e && j < e + ncy) {
          if (v < mn) mn = v
          if (v > mx) mx = v
        }
      }
    }
    const B = 6
    const grupos = []
    for (let k = 0; k < B; k++) grupos.push([])
    for (let j = 0; j < nvy; j++) {
      for (let i = 0; i < nvx; i++) {
        const t = limita((V[j * nvx + i] - mn) / (mx - mn || 1), 0, 1)
        grupos[limita(Math.floor(t * B), 0, B - 1)].push(i - e, j - e)
      }
    }
    const op = P.opacidade
    const pulso = A && A.pulso
    // cada faixa de tom cintila desfasada das outras
    const fecha = (o, k) => (pulso
      ? '>' + animAttr('fill-opacity', [n3(o), n3(o * (1 - pulso.k)), n3(o)], pulso.t, (k / B) * pulso.t) + '</path>'
      : '/>')
    let corpo = ''
    grupos.forEach((pts, k) => {
      if (!pts.length) return
      const t = k / (B - 1)
      let d = ''
      if (est.forma === 'ponto') {
        if (k === 0) return
        const r = r1(g * 0.5 * (0.12 + 0.82 * t) * P.largura)
        for (let n = 0; n < pts.length; n += 2) {
          const cx = r1((pts[n] + 0.5) * g), cy = r1((pts[n + 1] + 0.5) * g)
          d += 'M' + r1(cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + r1(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + r1(-2 * r) + ' 0'
        }
        const o = +(op * (0.4 + 0.55 * t)).toFixed(3)
        corpo += "<path d='" + d + "' fill='" + rgbStr(pal.linha) + "' fill-opacity='" + o + "'" + fecha(o, k)
      } else {
        const lado = r1(Math.max(1, g - Math.max(1, P.largura * 1.5)))
        const fol = (g - lado) / 2
        for (let n = 0; n < pts.length; n += 2) {
          d += 'M' + r1(pts[n] * g + fol) + ' ' + r1(pts[n + 1] * g + fol) + 'h' + lado + 'v' + lado + 'h' + -lado + 'z'
        }
        const o = +(op * (0.07 + 0.55 * t)).toFixed(3)
        corpo += "<path d='" + d + "' fill='" + rgbStr(mistura(pal.suave, pal.linha, t)) + "' fill-opacity='" + o + "'" + fecha(o, k)
      }
    })
    if (A) corpo = envolver(corpo, A.mov)
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'>" + corpo + '</svg>'
  }

  // Modo "malha": manchas de cor difusas (gradientes radiais), sem linhas.
  function blobsAurora(P, c, pal) {
    const hsl = rgb2hsl(pal.linha)
    const s = limita(Math.max(hsl.s, 0.6), 0, 1)
    const l = pal.escuro ? limita(hsl.l, 0.42, 0.6) : 0.7
    const offs = [0, 42, -48, 95, 150]
    const a0 = (pal.escuro ? 0.5 : 0.42) * P.opacidade
    return offs.map((o, k) => {
      const px = r1(limita(0.5 + c.r.perlin(k * 3.7 + 0.6, 1.9) * 0.9, 0.05, 0.95) * 100)
      const py = r1(limita(0.5 + c.r.perlin(k * 2.9 + 4.1, 7.3) * 0.9, 0.05, 0.95) * 100)
      const rx = r1(limita((32 + 22 * (c.r.perlin(k * 1.9 + 2.2, 5.5) + 0.7)) * c.escala, 15, 95))
      const ry = r1(limita(rx * (0.8 + 0.5 * (c.r.perlin(k * 4.3 + 1.1, 3.1) + 0.7)), 15, 95))
      const col = hsl2rgb(hsl.h + o + P.angulo, s, l)
      return { k, px, py, rx, ry, col, a0 }
    })
  }

  function camadasAurora(P, c, pal) {
    return blobsAurora(P, c, pal).map(b =>
      'radial-gradient(ellipse ' + b.rx + '% ' + b.ry + '% at ' + b.px + '% ' + b.py + '%, ' +
        rgba(b.col, b.a0) + ' 0%, ' + rgba(b.col, b.a0 * 0.45) + ' 38%, transparent 72%)')
  }

  // Versão animada: as mesmas manchas, em SVG. Cada uma deriva (trajectória própria) e/ou pulsa;
  // rotate / breathe actuam sobre o conjunto. No instante 0 coincide com a versão CSS.
  function svgAurora(P, c, pal, W, H, A) {
    const q = P.animQtd, vel = P.animVel
    const TX = [26, 33, 40, 47, 54], TY = [37, 29, 43, 33, 41], TP = [14, 19, 16, 22, 17]
    let defs = ''
    let corpo = ''
    blobsAurora(P, c, pal).forEach(b => {
      const id = 'a' + b.k
      const cor = rgbStr(b.col)
      defs += "<radialGradient id='" + id + "'>" +
        "<stop offset='0' stop-color='" + cor + "' stop-opacity='" + n3(b.a0) + "'/>" +
        "<stop offset='0.38' stop-color='" + cor + "' stop-opacity='" + n3(b.a0 * 0.45) + "'/>" +
        "<stop offset='0.72' stop-color='" + cor + "' stop-opacity='0'/></radialGradient>"
      let el = "<ellipse rx='" + r1((b.rx / 100) * W) + "' ry='" + r1((b.ry / 100) * H) + "' fill='url(#" + id + ")'"
      el += A.pulso
        ? '>' + animAttr('opacity', [1, n3(1 - A.pulso.k), 1], TP[b.k] / vel, b.k * 3.1) + '</ellipse>'
        : '/>'
      if (A.drift) {
        const ax = (0.07 + 0.015 * b.k) * W * q, ay = (0.08 + 0.012 * b.k) * H * q
        el = '<g>' + animTransf('translate', osc(ax, v => r1(v) + ' 0'), TX[b.k] / vel, true) +
          '<g>' + animTransf('translate', osc(ay, v => '0 ' + r1(v)), TY[b.k] / vel, true) + el + '</g></g>'
      }
      corpo += "<g transform='translate(" + r1((b.px / 100) * W) + ' ' + r1((b.py / 100) * H) + ")'>" + el + '</g>'
    })
    corpo = envolver(corpo, A.mov)
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'><defs>" +
      defs + '</defs>' + corpo + '</svg>'
  }

  // Modo "cubo": cubos isométricos sobre riscas diagonais. O mosaico é um <pattern> que
  // se repete para sempre, por isso a animação (SMIL no patternTransform) nunca descobre
  // margens — nem precisa de área extra. Geometria e cores fiéis ao componente original.
  function cubosSvg(P, W, H, A) {
    const s = 30 * P.escala // meia-largura do cubo (original: 30px)
    const k = s / 30
    const defs =
      "<linearGradient id='bz-cb-d' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#232526'/><stop offset='1' stop-color='#414345'/></linearGradient>" +
      "<linearGradient id='bz-cb-m' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#4b6cb7'/><stop offset='1' stop-color='#182848'/></linearGradient>" +
      "<linearGradient id='bz-cb-l' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='#a8edea'/><stop offset='1' stop-color='#fed6e3'/></linearGradient>"
    const cubo = (x, y) =>
      "<g transform='translate(" + r1(x) + ' ' + r1(y) + ")'>" +
      "<path d='M" + r1(-s) + ' 0L0 ' + r1(s / 2) + 'L0 ' + r1(s * 37 / 30) + 'L' + r1(-s) + ' ' + r1(s * 22 / 30) + "Z' fill='url(#bz-cb-d)'/>" +
      "<path d='M0 " + r1(s / 2) + 'L' + r1(s) + ' 0L' + r1(s) + ' ' + r1(s * 22 / 30) + 'L0 ' + r1(s * 37 / 30) + "Z' fill='url(#bz-cb-m)'/>" +
      "<path d='M0 " + r1(-s / 2) + 'L' + r1(s) + ' 0L0 ' + r1(s / 2) + 'L' + r1(-s) + " 0Z' fill='url(#bz-cb-l)'/></g>"
    // deslize para cima e volta (original: translateY(-20%) scale(1.02) rotate(1deg), 18s linear alternate)
    const dur = 18 / P.animVel, q = P.animQtd
    let anim = ''
    if (A && A.drift) {
      anim += "<animateTransform attributeName='patternTransform' type='translate' additive='sum' values='0 0;0 " + r1(-0.4 * H * q) + ";0 0' keyTimes='0;0.5;1' calcMode='linear' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
    }
    if (A && A.breathe) {
      anim += "<animateTransform attributeName='patternTransform' type='scale' additive='sum' values='1;" + n3(1 + 0.02 * q) + ";1' keyTimes='0;0.5;1' calcMode='linear' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
    }
    if (A && A.rotate) {
      anim += "<animateTransform attributeName='patternTransform' type='rotate' additive='sum' values='0;" + r1(q) + ";0' keyTimes='0;0.5;1' calcMode='linear' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
    }
    const mosaico =
      "<pattern id='bz-cb-p' patternUnits='userSpaceOnUse' width='" + r1(2 * s) + "' height='" + r1(52 * k) + "'>" +
      anim + cubo(0, 15 * k) + cubo(2 * s, 15 * k) + '</pattern>'
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "' opacity='" + n3(P.opacidade) + "'>" +
      '<defs>' + defs + '</defs>' + mosaico +
      "<rect width='" + W + "' height='" + H + "' fill='url(#bz-cb-p)'/>" +
      '</svg>'
  }

  // Modo "estrelas": campo de estrelas em 3 camadas (1/2/3px) que sobem continuamente,
  // cada uma à sua velocidade (50s/100s/150s por ciclo — parallax, como no original).
  // Cada camada é desenhada duas vezes e desliza exactamente um ciclo: o loop é perfeito.
  // pulse faz as estrelas cintilarem em grupos desfasados.
  function estrelasSvg(P, pal, W, H, A) {
    const dens = ((W * H) / 4e6) * (P.niveis / 80) // 1 = campo original (1000 estrelas / 2000×2000)
    const CAMADAS = [
      { r: 0.5, dur: 50, peso: 700 },
      { r: 1, dur: 100, peso: 200 },
      { r: 1.5, dur: 150, peso: 100 }
    ]
    const cor = rgbStr(pal.linha)
    let semente = (Math.abs(Math.round(P.seed)) || 1) % 233280
    const rnd = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280 }
    const B = A && A.pulso ? 4 : 1
    const o = +limita(P.opacidade, 0, 1).toFixed(3)
    let corpo = ''
    CAMADAS.forEach(L => {
      const n = Math.max(6, Math.round(dens * L.peso))
      const rr = r1(L.r * P.largura * P.escala)
      const buckets = []
      for (let k = 0; k < B; k++) buckets.push('')
      for (let i = 0; i < n; i++) {
        const x = r1(rnd() * W), y = r1(rnd() * H)
        buckets[i % B] += 'M' + r1(x - rr) + ' ' + y + 'a' + rr + ' ' + rr + ' 0 1 0 ' + r1(2 * rr) + ' 0a' + rr + ' ' + rr + ' 0 1 0 ' + r1(-2 * rr) + ' 0'
      }
      let dentro = ''
      buckets.forEach((d, k) => {
        if (!d) return
        const tw = A && A.pulso
          ? '>' + animAttr('fill-opacity', [o, n3(o * (1 - A.pulso.k)), o], A.pulso.t, (k / B) * A.pulso.t) + '</path>'
          : '/>'
        dentro += "<path d='" + d + "' fill='" + cor + "' fill-opacity='" + o + "'" + tw +
          "<path d='" + d + "' fill='" + cor + "' fill-opacity='" + o + "' transform='translate(0 " + r1(H) + ")'" + tw
      })
      corpo += A && A.drift
        ? '<g>' + "<animateTransform attributeName='transform' type='translate' values='0 0;0 " + r1(-H) + "' keyTimes='0;1' calcMode='linear' dur='" + r1(L.dur / P.animVel) + "s' repeatCount='indefinite'/>" + dentro + '</g>'
        : '<g>' + dentro + '</g>'
    })
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'>" + corpo + '</svg>'
  }

  // ---------------------------------------------------------------- gerador
  // opts.animar === false força a versão estática (o motor usa-o p.ex. com prefers-reduced-motion).
  function gerar(P, W, H, opts) {
    const est = ESTILOS[P.estilo]
    const U = Math.max(360, Math.max(W, H))
    const passo = limita(Math.max(W, H) / 100, 9, 20)
    const modo = est.modo || 'linhas'

    const cxp = P.centro[0] * W, cyp = P.centro[1] * H
    const q = P.animQtd
    const anim = !opts || opts.animar !== false ? (q > 0 ? P.anim || [] : []) : []
    const animado = anim.length > 0
    const tem = t => anim.indexOf(t) >= 0

    // movimento: amplitudes em px, períodos em s (divididos pela velocidade)
    const mov = {}
    let extra = 0 // área extra gerada em volta, para o movimento nunca “descobrir” margens
    if (animado) {
      const mx = Math.max(W, H)
      if (tem('drift') && modo !== 'malha') {
        mov.drift = { ax: 0.06 * mx * q, ay: 0.05 * mx * q, tx: 46 / P.animVel, ty: 61 / P.animVel }
        extra += Math.max(mov.drift.ax, mov.drift.ay)
      }
      if (tem('rotate')) {
        const R = Math.max(Math.hypot(cxp, cyp), Math.hypot(W - cxp, cyp), Math.hypot(cxp, H - cyp), Math.hypot(W - cxp, H - cyp))
        mov.rotate = { ang: 5 * q, t: 64 / P.animVel, cx: cxp, cy: cyp }
        if (modo !== 'malha') extra += R * rad(5 * q)
      }
      if (tem('breathe')) mov.breathe = { s: 0.07 * q, t: 28 / P.animVel, cx: cxp, cy: cyp }
      // múltiplo do passo da malha: os vértices coincidem com os da versão estática
      extra = Math.ceil(Math.min(extra, 0.45 * mx) / passo) * passo
    }
    const pulso = animado && tem('pulse') ? { k: limita(0.6 * q, 0, 0.92), t: (modo === 'grade' ? 6 : 9) / P.animVel } : null
    const A = animado ? { mov, pulso, drift: tem('drift'), rotate: tem('rotate'), breathe: tem('breathe') } : null

    const m = passo * 2 + extra
    const ox = -m, oy = -m
    const nx = Math.ceil((W + 2 * m) / passo) + 1
    const ny = Math.ceil((H + 2 * m) / passo) + 1

    const c = {
      W: W / U, H: H / U, cx: cxp / U, cy: cyp / U,
      r: criarRuido(P.seed), escala: P.escala, angulo: P.angulo, d2: 1
    }
    c.d2 = Math.max(
      Math.pow(c.cx, 2) + Math.pow(c.cy, 2),
      Math.pow(c.W - c.cx, 2) + Math.pow(c.cy, 2),
      Math.pow(c.cx, 2) + Math.pow(c.H - c.cy, 2),
      Math.pow(c.W - c.cx, 2) + Math.pow(c.H - c.cy, 2)
    ) || 1

    const pal = paleta(P)
    const op = P.opacidade
    let svg = ''
    let svgAnimado = false

    if (modo === 'grade') {
      svg = gradeSvg(est, P, c, W, H, U, pal, extra, A)
    } else if (modo === 'malha') {
      if (animado) {
        svg = svgAurora(P, c, pal, W, H, A)
        svgAnimado = true
      }
    } else if (modo === 'cubo') {
      svg = cubosSvg(P, W, H, A)
      svgAnimado = animado
    } else if (modo === 'estrelas') {
      svg = estrelasSvg(P, pal, W, H, A)
      svgAnimado = animado
    } else if (modo === 'linhas') {
      const campo = est.campo(c)
      const F = new Float32Array(nx * ny)
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) F[j * nx + i] = campo((ox + i * passo) / U, (oy + j * passo) / U)
      }

      let niveis = est.niveis(c, P.niveis)
      // área extra: continua a série de níveis (em número par à frente, para manter a alternância
      // principal / suave) nos estilos em que os níveis dependem do tamanho do elemento
      if (extra > 0 && est.estende && niveis.length >= 2) {
        const delta = niveis[1] - niveis[0]
        if (delta > 0) {
          let k = Math.ceil((extra * 1.5) / U / delta)
          k = Math.min(k + (k % 2), 60)
          const ini = niveis[0], fim = niveis[niveis.length - 1]
          const antes = [], depois = []
          for (let i = k; i >= 1; i--) antes.push(ini - i * delta)
          for (let i = 1; i <= k; i++) depois.push(fim + i * delta)
          niveis = antes.concat(niveis, depois)
        }
      }
      const minD = passo * 1.5
      const principais = []
      const suaves = []
      niveis.forEach((nv, k) => {
        const alvo = k % 2 === 0 ? principais : suaves
        contornos(F, nx, ny, ox, oy, passo, nv).forEach(ct => {
          if (ct.pts.length < 6) return
          const d = caminho(ct.pts, ct.fechada, minD)
          if (d) alvo.push(d)
        })
      })

      // pv: valores de opacidade animados (pulse) — alternados: as principais esbatem quando as suaves reforçam
      const traco = (ds, cor, o, w, pv) =>
        ds.length
          ? "<path d='" + ds.join('') + "' fill='none' stroke='" + rgbStr(cor) + "' stroke-opacity='" + +o.toFixed(3) +
            "' stroke-width='" + +w.toFixed(2) + "' stroke-linecap='round' stroke-linejoin='round'" +
            (pv ? '>' + animAttr('stroke-opacity', pv, pulso.t) + '</path>' : '/>')
          : ''
      const o1 = 0.74 * op, o2 = 0.52 * op
      const pv1 = pulso ? [n3(o1), n3(o1 * (1 - pulso.k)), n3(o1)] : null
      const pv2 = pulso ? [n3(o2), n3(Math.min(1, o2 * (1 + 1.1 * pulso.k))), n3(o2)] : null
      let corpo = traco(suaves, pal.suave, o2, 0.9 * P.largura, pv2) + traco(principais, pal.linha, o1, P.largura, pv1)
      if (A) corpo = envolver(corpo, mov)
      svg =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'>" +
        corpo +
        '</svg>'
    }

    // fundo em camadas (por cima → por baixo): linhas, brilho difuso, gradiente radial, linear
    const pc = r1(P.centro[0] * 100) + '% ' + r1(P.centro[1] * 100) + '%'
    const b = pal.base
    const camadas = []
    if (svg) {
      const uri = 'data:image/svg+xml,' + svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')
      camadas.push('url("' + uri + '")')
    }
    if (modo === 'malha' && !svgAnimado) Array.prototype.push.apply(camadas, camadasAurora(P, c, pal))
    if (modo === 'cubo') {
      // riscas diagonais do palco (o original: repeating-linear-gradient 135deg)
      const kk = P.escala
      const faixa = r1(60 * kk)
      const aC = mistura(b, BRANCO, 0.05)
      const cC = mistura(b, BRANCO, 0.18)
      camadas.push('repeating-linear-gradient(' + r1(135 + P.angulo) + 'deg, ' + rgba(aC) + ' 0px, ' + rgba(aC) + ' ' + faixa + 'px, ' + rgba(aC, 0.6) + ' ' + r1(faixa + 10 * kk) + 'px, ' + rgba(cC) + ' ' + r1(faixa + 70 * kk) + 'px)')
    } else if (modo === 'estrelas') {
      // aqui o brilho é o gradiente radial vindo de baixo (o “glow” do céu)
      if (pal.glow) camadas.push('radial-gradient(ellipse at ' + pc + ', ' + rgba(pal.glow) + ' 0%, ' + rgba(b) + ' 100%)')
    } else if (pal.glow) {
      const g = pal.glow
      camadas.push(
        'radial-gradient(ellipse 72% 82% at ' + pc + ', ' + rgba(escala(g, 1.25), 0.3) + ' 0%, ' + rgba(escala(g, 0.85), 0.13) + ' 32%, transparent 65%)',
        'radial-gradient(ellipse 48% 65% at ' + pc + ', ' + rgba(g, 0.92) + ' 0%, ' + rgba(mistura(b, g, 0.65), 0.78) + ' 34%, ' +
          rgba(mistura(b, g, 0.3), 0.52) + ' 66%, ' + rgba(b, 0.96) + ' 100%)'
      )
      camadas.push('linear-gradient(115deg, ' + rgba(b) + ' 0%, ' + rgba(mistura(b, g, 0.15)) + ' 48%, ' + rgba(b) + ' 100%)')
    } else {
      camadas.push('linear-gradient(115deg, ' + rgba(b) + ' 0%, ' + rgba(mistura(b, pal.linha, 0.1)) + ' 48%, ' + rgba(b) + ' 100%)')
    }
    const css =
      'background-image:' + camadas.join(',') + ';background-size:100% 100%;background-repeat:no-repeat;background-color:' + rgba(b)
    return { svg, css, paleta: pal, parametros: P, animado }
  }

  // ---------------------------------------------------------------- motor (DOM)
  function iniciarMotor(cfg, prefixo, presets) {
    const reToken = new RegExp('(^|:)' + esc(prefixo + 'custom-bg') + '(-[a-z-]+)?(\\[|!?$)')
    const alvos = new Map() // elemento → { id, tag, ro, t, w, h, chave, pronto }
    const nossos = new WeakSet()
    const cache = new Map() // chave → css
    const MARGEM = 200 // px: o fundo volta a animar um pouco antes de entrar no ecrã
    let contador = 0
    let agendado = false

    // as variáveis não herdam: senão todos os filhos de um custom-bg seriam alvos
    let registada = false
    try {
      if (global.CSS && typeof global.CSS.registerProperty === 'function') {
        VARS.forEach(v => {
          try {
            global.CSS.registerProperty({ name: '--cbg-' + v, syntax: '*', inherits: false })
          } catch (e) {
            if (!(e && e.name === 'InvalidModificationError')) throw e
          }
        })
        registada = true
      }
    } catch (e) {
      registada = false
    }

    function lerVars(el) {
      const cs = getComputedStyle(el)
      const o = {}
      let algum = false
      VARS.forEach(v => {
        const x = cs.getPropertyValue('--cbg-' + v).trim()
        if (x) {
          o[v] = x
          algum = true
        }
      })
      return algum ? o : null
    }

    function ehAlvo(el) {
      let ok = false
      for (const c of el.classList) {
        if (reToken.test(c)) {
          ok = true
          break
        }
      }
      return ok && !!lerVars(el)
    }

    const sel = a => '[data-cbg="' + a.id + '"]'

    // prefers-reduced-motion: fundo estático (a menos que respeitarMovimentoReduzido: false)
    const mqReduz = typeof global.matchMedia === 'function' ? global.matchMedia('(prefers-reduced-motion: reduce)') : null
    const reduzido = () => cfg.respeitarMovimentoReduzido !== false && !!(mqReduz && mqReduz.matches)
    const aoMudarReduzido = () => {
      alvos.forEach(a => { a.chave = '' })
      agendar()
    }
    if (mqReduz) {
      if (mqReduz.addEventListener) mqReduz.addEventListener('change', aoMudarReduzido)
      else if (mqReduz.addListener) mqReduz.addListener(aoMudarReduzido)
    }

    function noEcra(el) {
      const r = el.getBoundingClientRect()
      const vh = global.innerHeight || document.documentElement.clientHeight
      const vw = global.innerWidth || document.documentElement.clientWidth
      return r.bottom > -MARGEM && r.top < vh + MARGEM && r.right > -MARGEM && r.left < vw + MARGEM
    }

    function actualizar(el, a) {
      const w = Math.round(el.offsetWidth / 8) * 8
      const h = Math.round(el.offsetHeight / 8) * 8
      if (!w || !h) return
      const vars = lerVars(el)
      if (!vars) return
      const P0 = resolver(vars, presets, true)
      const animar = P0.anim.length > 0 && P0.animQtd > 0 && !reduzido() && a.visivel !== false
      const chave = JSON.stringify(vars) + '|' + w + 'x' + h + (animar ? '|anim' : '')
      if (chave === a.chave) return
      a.chave = chave
      let css = cache.get(chave)
      if (!css) {
        css = gerar(resolver(vars, presets), w, h, { animar }).css
        cache.set(chave, css)
        if (cache.size > 32) cache.delete(cache.keys().next().value)
      }
      const pseudo = cfg.pseudo === 'after' ? '::after' : '::before'
      a.tag.textContent =
        ':where(' + sel(a) + '){position:relative;isolation:isolate}' +
        sel(a) + pseudo + '{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;' + css + '}'
    }

    function registar(el) {
      const a = { id: ++contador, tag: document.createElement('style'), ro: null, io: null, t: 0, chave: '', pronto: false, visivel: true }
      a.tag.setAttribute('data-breeze', 'backgrounds')
      nossos.add(a.tag)
      el.setAttribute('data-cbg', String(a.id))
      document.head.appendChild(a.tag)
      alvos.set(el, a)
      // só anima enquanto está (quase) visível; o estado inicial é lido já, para não gerar duas vezes
      if (typeof IntersectionObserver !== 'undefined') {
        a.visivel = noEcra(el)
        a.io = new IntersectionObserver(es => {
          const v = es[es.length - 1].isIntersecting
          if (v === a.visivel) return
          a.visivel = v
          actualizar(el, a)
        }, { rootMargin: MARGEM + 'px' })
        a.io.observe(el)
      }
      if (typeof ResizeObserver !== 'undefined') {
        a.ro = new ResizeObserver(() => {
          if (!a.pronto) {
            a.pronto = true
            actualizar(el, a)
            return
          }
          clearTimeout(a.t)
          a.t = setTimeout(() => actualizar(el, a), 90)
        })
        a.ro.observe(el)
      } else {
        actualizar(el, a)
      }
    }

    function remover(el) {
      const a = alvos.get(el)
      if (!a) return
      if (a.ro) a.ro.disconnect()
      if (a.io) a.io.disconnect()
      clearTimeout(a.t)
      a.tag.remove()
      alvos.delete(el)
      if (el.isConnected) el.removeAttribute('data-cbg')
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      document.querySelectorAll('[class*="custom-bg"]').forEach(el => {
        const a = alvos.get(el)
        const activo = ehAlvo(el)
        if (activo && !a) registar(el)
        else if (activo && a) actualizar(el, a)
        else if (!activo && a) remover(el)
      })
      alvos.forEach((_, el) => {
        if (!el.isConnected) remover(el)
      })
    }

    const nosso = n => (n.nodeType === 1 && nossos.has(n)) || n.nodeType === 3
    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar(mutacoes) {
      if (mutacoes && mutacoes.length && mutacoes.every(m =>
        (m.target.nodeType === 1 && nossos.has(m.target)) ||
        (m.type === 'childList' && [].every.call(m.addedNodes, nosso) && [].every.call(m.removedNodes, nosso)))) return
      if (agendado) return
      agendado = true
      requestAnimationFrame(() => requestAnimationFrame(varrer))
    }

    new MutationObserver(agendar).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    global.addEventListener('resize', () => agendar(), { passive: true }) // variantes md:/lg: …
    global.addEventListener('load', () => agendar())
    // variantes de estado (hover:custom-bg-color[…], focus:…)
    ;['mouseover', 'mouseout', 'focusin', 'focusout'].forEach(ev =>
      document.addEventListener(ev, e => {
        if (e.target && e.target.closest && e.target.closest('[class*=":custom-bg"]')) agendar()
      }, true))
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => agendar())
    else agendar()

    return { varrer }
  }

  // ----------------------------------------------------------------- plugin
  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    const presets = Object.assign({}, cfg.presets)
    let motor = null
    return {
      nome: 'backgrounds',
      versao: VERSAO,
      setup(ctx) {
        const prefixo = (ctx.config && ctx.config.prefix) || ''
        // Se o Breeze já aplicou o prefixo (use() depois do init), aplicamo-lo nós.
        const fixas = (ctx.config && ctx.config.classesFixas) || {}
        const jaPrefixado = prefixo && prefixo + 'block' in fixas
        const nome = n => (jaPrefixado ? prefixo + n : n)

        Object.keys(CLASSES).forEach(n => ctx.addFixedClass(nome(n), CLASSES[n]))
        Object.keys(MAPEAMENTOS).forEach(p => ctx.addMapping(nome(p), MAPEAMENTOS[p]))

        if (typeof document === 'undefined') return
        if (!motor) motor = iniciarMotor(cfg, prefixo, presets)

        // use() depois do init: reprocessa os elementos já existentes
        if (global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      },
      actualizar() {
        if (motor) motor.varrer()
      },
      registar(nome, preset) {
        presets[nome] = preset
        if (motor) motor.varrer()
      },
      gerar(bruto, w, h, opts) {
        return gerar(resolver(bruto, presets), Math.max(1, Math.round(w || 1280)), Math.max(1, Math.round(h || 720)), opts)
      },
      estilos() {
        return Object.keys(Object.assign({}, PRESETS_BUILTIN, presets))
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeBackgrounds = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)

__breezeNucleo.arrancar({"cli":"1.0.0","motor":"2.2.5","prefix":"","plugins":["glass","progress","scrollbar","backgrounds"],"componentes":{},"paginas":4,"gerado":"2026-11-24 09:30"});
