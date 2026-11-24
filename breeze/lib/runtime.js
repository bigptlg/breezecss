'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/runtime.js
//
// RUNTIME BUILDER — extrai do breeze.bundle.js APENAS os IIFEs dos plugins
// (BreezeGlass, BreezeDividers, BreezeProgress, BreezeScrollbar,
// BreezePreloader, BreezeBackgrounds) e gera um ficheiro JavaScript
// autónomo que funciona SEM o bundle original e SEM o motor de geração CSS.
//
//   • Os IIFEs são extraídos 1:1 — nenhum comportamento dos plugins é
//     reescrito ou simplificado (refração SVG do Glass, barras do Progress,
//     atributos do Scrollbar, fundos canvas do Backgrounds, overlay do
//     Preloader — tudo código original).
//   • À volta deles, um NÚCLEO mínimo fornece:
//       - window.BreezeCSS compatível (init/use/addComponent/processar/…)
//         para páginas que chamam BreezeCSS.init() — sem erros, sem setup
//         duplicado;
//       - ponte de COMPONENTES: os scans dos plugins
//         (document.querySelectorAll('[class*="…"]')) passam a ver também
//         elementos que usam componentes cujos membros contêm a classe do
//         plugin (ex.: .card com 'glass-refract');
//       - registos e avisos do modo compilado (o CSS é estático — classes
//         novas em runtime exigem regenerar ou --safelist).
// ─────────────────────────────────────────────────────────────────────────

const PADRAO_FIM =
  /\}\)\(typeof window !== 'undefined' \? window : globalThis\)[;]?/g

const PLUGINS_CONHECIDOS = {
  BreezeGlass: 'glass',
  BreezeDividers: 'dividers',
  BreezeProgress: 'progress',
  BreezeScrollbar: 'scrollbar',
  BreezePreloader: 'preloader',
  BreezeBackgrounds: 'backgrounds',
}

/** Marcas que provam que um texto contém o MOTOR (nunca devem entrar no runtime). */
const MARCAS_MOTOR = ['processarElementos', 'BreezeCSS v2.2', '_construirConfig', 'insertRule']

/**
 * Extrai os IIFEs dos plugins do código-fonte do bundle.
 * @param {string} fonte  conteúdo do breeze.bundle.js
 * @returns {Array<{nome: string, global: string, versao: string, fonte: string}>}
 */
function extrairPlugins(fonte) {
  if (!fonte || typeof fonte !== 'string') {
    throw new Error('bundle vazio — não é possível extrair os plugins')
  }
  const achados = []
  PADRAO_FIM.lastIndex = 0
  let m
  while ((m = PADRAO_FIM.exec(fonte))) {
    const fim = m.index + m[0].length
    const inicioIIFE = fonte.lastIndexOf('(function (global) {', m.index)
    if (inicioIIFE === -1) continue
    // comentário de cabeçalho: o último /*! antes do IIFE
    const inicioComentario = fonte.lastIndexOf('/*!', inicioIIFE)
    if (inicioComentario === -1) continue
    const cabecalho = fonte.slice(inicioComentario, inicioIIFE)
    // o ÚLTIMO "BreezeXxx vN.N.N" do cabeçalho (Backgrounds tem duas notas)
    let nomeGlobal = null
    let versao = null
    const reNome = /Breeze(Glass|Dividers|Progress|Scrollbar|Preloader|Backgrounds) v([0-9][0-9.]*)/g
    let mn
    while ((mn = reNome.exec(cabecalho))) {
      nomeGlobal = 'Breeze' + mn[1]
      versao = mn[2]
    }
    if (!nomeGlobal) continue
    achados.push({
      nome: PLUGINS_CONHECIDOS[nomeGlobal],
      global: nomeGlobal,
      versao,
      fonte: fonte.slice(inicioComentario, fim),
    })
  }

  // validação: todos os 6, sem código do motor
  const esperados = Object.values(PLUGINS_CONHECIDOS)
  const nomes = achados.map((p) => p.nome)
  for (const e of esperados) {
    if (!nomes.includes(e)) {
      throw new Error(`plugin "${e}" não encontrado no bundle — extracção falhou`)
    }
  }
  if (nomes.length !== esperados.length) {
    throw new Error('extracção devolveu plugins duplicados/desconhecidos: ' + nomes.join(', '))
  }
  for (const p of achados) {
    for (const marca of MARCAS_MOTOR) {
      if (p.fonte.includes(marca)) {
        throw new Error(`código do motor detectado na extracção de "${p.nome}" (${marca})`)
      }
    }
    if (p.fonte.length < 500) {
      throw new Error(`extracção de "${p.nome}" suspeitamente curta (${p.fonte.length} chars)`)
    }
  }
  const ordem = { glass: 0, dividers: 1, progress: 2, scrollbar: 3, preloader: 4, backgrounds: 5 }
  achados.sort((a, b) => ordem[a.nome] - ordem[b.nome])
  return achados
}

// ─────────────────────────────────────────────────────────────────────────
// NÚCLEO do runtime (gerado como texto) — compatibilidade BreezeCSS,
// ponte de componentes e arranque dos plugins.
// ─────────────────────────────────────────────────────────────────────────
const NUCLEO = `;var __breezeNucleo = (function () {
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
    return String(s).replace(/([^a-zA-Z0-9_-])/g, '\\\\$1')
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
    var tokens = String(classe).split(/\\s+/)
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
    var RE_SCAN = /\\[class\\*=(?:"([^"]*)"|'([^']*)')\\]/
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
`

/**
 * Gera o ficheiro runtime completo (núcleo + IIFEs originais + arranque).
 * @param {object} op
 *   plugins       string[]  nomes dos plugins com JS dinâmico a incluir
 *   componentes   object    { nome: [membros] } (com aliases de prefixo)
 *   prefix        string
 *   cliVersao     string
 *   motorVersao   string
 *   extraccao     Array     resultado de extrairPlugins()
 *   paginas       number    nº de páginas (informativo)
 */
function construirRuntime(op) {
  const meta = {
    cli: op.cliVersao,
    motor: op.motorVersao,
    prefix: op.prefix || '',
    plugins: (op.plugins || []).slice(),
    componentes: op.componentes || {},
    paginas: op.paginas || 0,
    gerado: new Date().toISOString().slice(0, 16).replace('T', ' '),
  }
  const metaJSON = JSON.stringify(meta).replace(/</g, '\\u003c')

  const pedidos = meta.plugins
  const mapaNomes = {}
  for (const p of op.extraccao) mapaNomes[p.nome] = p

  const partes = []
  partes.push(
    `/*! breeze runtime v${op.cliVersao} — gerado por BreezeCLI a partir do breeze.bundle.js ${op.motorVersao}` +
      `\n *  Plugins com JavaScript: ${pedidos.length ? pedidos.join(', ') : 'nenhum (só compatibilidade BreezeCSS)'}` +
      `\n *  Páginas: ${meta.paginas} · gerado em ${meta.gerado}` +
      `\n *  NÃO EDITAR — regenerar com: node bin/breeze.js [--watch]` +
      `\n *  Comportamentos dos plugins: código original do bundle (1:1).` +
      `\n */`,
  )
  partes.push(NUCLEO)
  for (const nome of pedidos) {
    const p = mapaNomes[nome]
    if (!p) throw new Error(`plugin "${nome}" não está na extracção do bundle`)
    partes.push(`/* ═══ Plugin original: ${p.global} v${p.versao} (extraído 1:1 do bundle) ═══ */`)
    // ';' inicial: evita que o IIFE do plugin seja interpretado como chamada
    // do resultado do núcleo anterior (regra ASI)
    partes.push(';' + p.fonte.trim())
  }
  partes.push(`__breezeNucleo.arrancar(${metaJSON});`)
  return partes.join('\n\n') + '\n'
}

module.exports = { extrairPlugins, construirRuntime, NUCLEO, PLUGINS_CONHECIDOS }
