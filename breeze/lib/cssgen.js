'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/cssgen.js
//
// Pós-processamento do CSS que sai do motor:
//   • remove as regras [data-breeze-id="bN"] (transforms do modo live) e
//     reconstrói as regras de transform com seletores de CLASSE — inclui a
//     combinação rotate/scale/translate… no mesmo elemento (seletor
//     composto .rotate\[45deg\].scale\[1.2\]), replicando o comportamento
//     do runtime sem depender de atributos dinâmicos;
//   • minificador CSS seguro (preserva strings e data-URIs);
//   • validação de classes (para avisar classes não reconhecidas);
//   • montagem do ficheiro final (cabeçalho, smooth, plugins).
// ─────────────────────────────────────────────────────────────────────────

const { cssEscape } = require('./escape')
const { valorSeguro } = require('./valor-seguro')

const RE_ARBITRARIO = /^(?<prefixo>[a-zA-Z-]+(?:-[a-zA-Z-]+)*)\[(?<valor>[^\]]+)\]$/

// Réplica exacta do motor (Engine._processarTransform / Cache.construirTransform)
const FUNCOES_TRANSFORM = {
  rotate: 'rotate',
  scale: 'scale',
  'scale-x': 'scaleX',
  'scale-y': 'scaleY',
  'translate-x': 'translateX',
  'translate-y': 'translateY',
  'skew-x': 'skewX',
  'skew-y': 'skewY',
}
const ORDEM_TRANSFORM = [
  'translateX',
  'translateY',
  'rotate',
  'scale',
  'scaleX',
  'scaleY',
  'skewX',
  'skewY',
]
const BORDER_PREFIXOS = new Set(['border', 'border-t', 'border-r', 'border-b', 'border-l'])

// ─────────────────────────────────────────────────────────────────────────
// Análise de classes
// ─────────────────────────────────────────────────────────────────────────

/** Réplica de Parser._separarQualificadores (colchetes conscientes). */
function separarQualificadores(classe, breakpoints, variantes) {
  if (!classe.includes(':') && !classe.includes('[')) {
    return { breakpoint: null, variantes: [], classeBase: classe }
  }
  const segmentos = []
  let atual = ''
  let dentroColchetes = false
  for (let i = 0; i < classe.length; i++) {
    const c = classe[i]
    if (c === '[') dentroColchetes = true
    if (c === ']') dentroColchetes = false
    if (c === ':' && !dentroColchetes) {
      segmentos.push(atual)
      atual = ''
    } else atual += c
  }
  segmentos.push(atual)
  if (segmentos.length > 33) return null
  const classeBase = segmentos.pop()
  let breakpoint = null
  const listaVariantes = []
  for (const seg of segmentos) {
    if (breakpoints[seg] !== undefined) breakpoint = seg
    else if (variantes[seg] !== undefined) listaVariantes.push(seg)
    else return null // qualificador desconhecido
  }
  return { breakpoint, variantes: listaVariantes, classeBase }
}

/**
 * Réplica de Parser.extrairClassesRelevantes — diz se uma classe vai gerar
 * CSS. `cfg` é a config INTERNA do motor capturada APÓS o init: as tabelas
 * já incluem as classes dos plugins e vêm prefixadas quando há prefix.
 * Por isso a procura usa o token/base TAL COMO escrito no HTML.
 */
function classeRelevante(classe, cfg) {
  const { classesFixas, mapaPropriedades, variantes, breakpoints } = cfg
  const norm = classe.endsWith('!') ? classe.slice(0, -1) : classe

  if (classesFixas[norm] !== undefined) return true
  if (!classe.includes(':') && !classe.includes('[')) return false

  const partes = separarQualificadores(norm, breakpoints, variantes)
  if (!partes) return false
  let base = partes.classeBase
  if (base.endsWith('!')) base = base.slice(0, -1)

  if (classesFixas[base] !== undefined) return true

  const m = RE_ARBITRARIO.exec(base)
  if (m) {
    const p = m.groups.prefixo
    return mapaPropriedades[p] !== undefined || BORDER_PREFIXOS.has(p)
  }
  return false
}

/** Analisa uma classe de transform (rotate/scale/…) e devolve os seus dados. */
function analisarTransform(classe, cfg) {
  let importante = false
  let token = classe
  if (token.endsWith('!')) {
    importante = true
    token = token.slice(0, -1)
  }
  const partes = separarQualificadores(token, cfg.breakpoints, cfg.variantes)
  if (!partes) return null
  let base = partes.classeBase
  if (base.endsWith('!')) {
    importante = true
    base = base.slice(0, -1)
  }
  let interno = base
  const pfT = cfg.prefix || ''
  if (pfT) {
    if (!base.startsWith(pfT)) return null
    interno = base.slice(pfT.length)
  }
  const m = RE_ARBITRARIO.exec(interno)
  if (!m) return null
  const fn = FUNCOES_TRANSFORM[m.groups.prefixo]
  if (!fn) return null
  let valor = m.groups.valor
  if (!valorSeguro(valor)) return null
  if (valor.endsWith('!')) {
    importante = true
    valor = valor.slice(0, -1)
  }
  const tema = cfg.tema || {}
  valor = tema.cores?.[valor] || tema.espacamento?.[valor] || tema.fontes?.[valor] || valor
  valor = require("./math-values").normalizarMatematica(valor)
  if (!require("./value-validation").supports("transform", fn + "(" + valor + ")")) return null
  return {
    token: classe,
    breakpoint: partes.breakpoint,
    variantes: partes.variantes,
    fn,
    valor,
    importante,
  }
}

/** Constrói a regra (individual ou combinada) com seletor de classe. */
function regraTransform(lista, cfg, seletorBase = null) {
  const fns = new Map()
  let importante = false
  for (const a of lista) {
    fns.set(a.fn, a.valor)
    if (a.importante) importante = true
  }
  const partes = []
  for (const fn of ORDEM_TRANSFORM) {
    if (fns.has(fn)) partes.push(fn + '(' + fns.get(fn) + ')')
  }
  const valor = partes.join(' ')

  // Seletor: classes compostas (ex.: .rotate\[45deg\].scale\[1.2\]) — ou um
  // seletor dado (ex.: componente .btn, com as pseudos das variantes)
  let seletor = seletorBase || lista.map((a) => '.' + cssEscape(a.token)).join('')
  for (const v of lista[0].variantes) {
    const pseudo = cfg.variantes[v]
    if (!pseudo) continue
    seletor = pseudo.includes('&') ? pseudo.replace(/&/g, seletor) : seletor + pseudo
  }

  let regra = `${seletor} { transform: ${valor}${importante ? ' !important' : ''}; }`
  if (lista[0].breakpoint) {
    const tam = cfg.breakpoints[lista[0].breakpoint]
    if (tam) regra = `@media (min-width: ${tam}) { ${regra} }`
  }
  return regra
}

/**
 * Gera as regras de TRANSFORM dos membros de componentes — ex.: componente
 * btn = […, 'hover:translate-x[3px]', 'hover:translate-y[-3px]', …] →
 *   .btn:hover { transform: translateX(3px); }
 *   .btn:hover { transform: translateX(3px) translateY(-3px); }
 * O motor emite estas regras com [data-breeze-id] (ou quebra o valor quando
 * há prefix), por isso o CLI constrói-as a partir dos membros brutos.
 * @param {Map<string, string[]>} componentes  nome no HTML → classes[]
 */
function construirRegrasTransformComponentes(componentes, cfg) {
  const regras = []
  if (!componentes || !componentes.size) return regras
  for (const [nome, classes] of componentes) {
    const transf = []
    for (const c of classes || []) {
      const a = analisarTransform(c, cfg)
      if (a) transf.push(a)
    }
    if (!transf.length) continue
    const seletor = '.' + cssEscape(nome)

    const individuais = new Set()
    for (const a of transf) {
      if (individuais.has(a.token)) continue
      individuais.add(a.token)
      regras.push(regraTransform([a], cfg, seletor))
    }
    const grupos = new Map()
    for (const a of transf) {
      const k = (a.breakpoint || '') + '|' + a.variantes.join(',')
      if (!grupos.has(k)) grupos.set(k, [])
      grupos.get(k).push(a)
    }
    for (const lista of grupos.values()) {
      if (lista.length < 2) continue
      regras.push(regraTransform(lista, cfg, seletor))
    }
  }
  return regras
}

/**
 * Gera TODAS as regras de transform a partir dos elementos (individual +
 * combinada por contexto breakpoint|variantes). Substitui as regras
 * [data-breeze-id] do motor, que são dinâmicas e não portáveis.
 */
function construirRegrasTransform(elementos, cfg) {
  const regras = []
  const individuais = new Set()
  const combinadas = new Set()

  for (const el of elementos) {
    if (!el || !el.classList) continue
    const transf = []
    for (const t of el.classList) {
      const a = analisarTransform(t, cfg)
      if (a) transf.push(a)
    }
    if (!transf.length) continue

    for (const a of transf) {
      if (individuais.has(a.token)) continue
      individuais.add(a.token)
      regras.push(regraTransform([a], cfg))
    }

    const grupos = new Map()
    for (const a of transf) {
      const k = (a.breakpoint || '') + '|' + a.variantes.join(',')
      if (!grupos.has(k)) grupos.set(k, [])
      grupos.get(k).push(a)
    }
    for (const lista of grupos.values()) {
      if (lista.length < 2) continue
      const chave =
        lista
          .map((a) => a.token)
          .join(' ') +
        '|' +
        (lista[0].breakpoint || '') +
        '|' +
        lista[0].variantes.join(',')
      if (combinadas.has(chave)) continue
      combinadas.add(chave)
      regras.push(regraTransform(lista, cfg))
    }
  }
  return regras
}

// ─────────────────────────────────────────────────────────────────────────
// Minificador (preserva strings, url(), data-URIs e calc())
// ─────────────────────────────────────────────────────────────────────────
function minificarCSS(css) {
  const parts = []
  let ultimo = '' // último caractere emitido (evita out.charAt, que achata a rope)
  const emit = (str) => { parts.push(str); ultimo = str[str.length - 1] }
  let emAspa = null
  const n = css.length
  for (let i = 0; i < n; i++) {
    const c = css[i]
    if (c === '\\' && i + 1 < n) { emit(c + css[++i]); continue }
    if (emAspa) {
      emit(c)
      if (c === emAspa) emAspa = null
      continue
    }
    if (c === '"' || c === "'") {
      emAspa = c
      emit(c)
      continue
    }
    if ((i === 0 || !/[\w-]/.test(css[i-1])) && /^url\(/i.test(css.slice(i,i+4))) {
      let j = i + 4, quote = null
      for (; j < n; j++) {
        const ch = css[j]
        if (ch === '\\') { j++; continue }
        if (quote) { if (ch === quote) quote = null; continue }
        if (ch === '"' || ch === "'") { quote = ch; continue }
        if (ch === ')') break
      }
      emit(css.slice(i, j+1)); i = j; continue
    }
    if (c === '/' && css[i + 1] === '*') {
      const fim = css.indexOf('*/', i + 2)
      i = fim === -1 ? n : fim + 1
      continue
    }
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      let j = i
      while (j < n && /\s/.test(css[j])) j++
      i = j - 1
      const antes = ultimo
      const depois = css[j] || ''
      if (!antes) continue
      if ('{};:,('.includes(antes)) continue
      if ('{};:,)'.includes(depois) || depois === '') continue
      emit(' ')
      continue
    }
    if (c === ';') {
      let j = i + 1
      while (j < n && /\s/.test(css[j])) j++
      if (css[j] === '}') {
        i = j - 1
        continue
      }
      emit(c)
      continue
    }
    emit(c)
  }
  return parts.join('').trim()
}

// ─────────────────────────────────────────────────────────────────────────
// Montagem do ficheiro
// ─────────────────────────────────────────────────────────────────────────

function cabecalho({ cliVersao, motorVersao, paginas, regras }) {
  const data = new Date()
  const pad = (x) => String(x).padStart(2, '0')
  const quando =
    data.getFullYear() +
    '-' +
    pad(data.getMonth() + 1) +
    '-' +
    pad(data.getDate()) +
    ' ' +
    pad(data.getHours()) +
    ':' +
    pad(data.getMinutes())
  return (
    `/* ═══════════════════════════════════════════════════════════\n` +
    ` *  CSS gerado por breeze CLI v${cliVersao} (motor BreezeCSS ${motorVersao})\n` +
    ` *  Páginas: ${paginas} · Regras: ${regras} · ${quando}\n` +
    ` *  NÃO EDITAR — regenerar com: npx breeze [--watch]\n` +
    ` * ═══════════════════════════════════════════════════════════ */`
  )
}

function juntarFicheiro({ regrasMotor, regrasTransform = [], pluginsCss = [], componentesCss = [], smooth = false, topo = '', extraCss = null }) {
  const partes = []
  if (topo) partes.push(topo)
  if (smooth) partes.push('html { scroll-behavior: smooth; }')

  const motor = regrasMotor.filter((r) => {
    // 1) regras [data-breeze-id="bN"] — dinâmicas, regeneradas pelo CLI
    //    (transforms de elementos e variantes de componentes)
    if (r.includes('[data-breeze-id=')) return false
    // 2) transform sem função (ex.: "transform: 45deg") — ocorre quando
    //    há prefix + classe de transform: o motor não aplica o prefixo aos
    //    transformPrefixos e deixa o valor cru. O CLI regenera-a correta.
    if (/\{\s*transform:\s*[^(){}]*;\s*\}/.test(r)) return false
    return true
  })
  if (motor.length) partes.push(motor.join('\n'))

  if (regrasTransform.length) {
    partes.push('')
    partes.push('/* ── transforms (combinados por elemento) ── */')
    partes.push(regrasTransform.join('\n'))
  }

  const regrasComponentes = componentesCss.flat()
  if (regrasComponentes.length) {
    partes.push('')
    partes.push('/* ── componentes (BreezeCSS.addComponent) ── */')
    partes.push(regrasComponentes.join('\n'))
  }

  for (const folha of pluginsCss) {
    partes.push('')
    partes.push('/* ── Plugin: ' + folha.plugin + ' ── */')
    partes.push(folha.css)
  }

  if (extraCss && extraCss.trim()) {
    partes.push('')
    partes.push(extraCss)
  }

  return partes.join('\n') + '\n'
}

// ─────────────────────────────────────────────────────────────────────────
// Plugins: CSS de suporte incluído só quando as classes são usadas
// ─────────────────────────────────────────────────────────────────────────

const PREFIXO_PLUGIN_CSS = {
  glass: /^glass(\[|-|$)/,
  dividers: /^divider-/,
  progress: /^progress(\[|-|$)/,
  scrollbar: /^scrollbar(\[|-|$)/,
  preloader: /^preloader(\[|-|$)/,
  backgrounds: /^custom-bg(\[|-|$)/,
}

/**
 * CSS estático do scrollbar — as mesmas regras que o plugin injeta no
 * browser ([data-breeze-scrollbar]::-webkit-scrollbar, Firefox com
 * scrollbar-color/width, hover, espessura, folga, canto, ocultação), mas
 * keyadas nas CLASSES .scrollbar / .scrollbar-none, para funcionarem sem
 * JavaScript (o runtime continua a aplicar os atributos e o espelho
 * body→html; estas regras são a rede de segurança sem-JS).
 * Os valores por omissão são os mesmos do BreezeScrollbar (8px, cinzento).
 */
function cssScrollbarEstatico(prefixo) {
  const c = (nome) => '.' + cssEscape(prefixo + nome)
  const s = c('scrollbar')
  const n = c('scrollbar-none')
  const tamanho = 'var(--scrollbar-size, 8px)'
  const thumb = 'var(--scrollbar-thumb, rgb(128 128 128 / 0.5))'
  const thumbHover = 'var(--scrollbar-thumb-hover, var(--scrollbar-thumb, rgb(128 128 128 / 0.8)))'
  return [
    '/* ── scrollbar estático (funciona sem JavaScript) ── */',
    `${s}::-webkit-scrollbar { width: ${tamanho}; height: ${tamanho}; background: transparent; }`,
    `${s}::-webkit-scrollbar-track { background: var(--scrollbar-track, transparent); border-radius: var(--scrollbar-radius, 9999px); }`,
    `${s}::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: var(--scrollbar-radius, 9999px); border: var(--scrollbar-gap, 0px) solid transparent; background-clip: padding-box; }`,
    `${s}::-webkit-scrollbar-thumb:hover { background: ${thumbHover}; background-clip: padding-box; }`,
    `${s}::-webkit-scrollbar-corner { background: var(--scrollbar-corner, transparent); }`,
    `${s}::-webkit-scrollbar-button { display: none; width: 0; height: 0; }`,
    `@supports not selector(::-webkit-scrollbar) {`,
    `  ${s} { scrollbar-width: var(--scrollbar-ff, thin); scrollbar-color: ${thumb} var(--scrollbar-track, transparent); }`,
    `}`,
    // classe no <body>: a barra da página (WebKit estiliza a do viewport;
    // o Firefox herda do bloco @supports acima, que também casa body.scrollbar)
    `body${s}::-webkit-scrollbar { width: ${tamanho}; height: ${tamanho}; }`,
    `body${s}::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: var(--scrollbar-radius, 9999px); }`,
    // esconder a barra sem perder o scroll
    `${n} { scrollbar-width: none; -ms-overflow-style: none; }`,
    `${n}::-webkit-scrollbar { display: none; width: 0; height: 0; }`,
  ].join('\n')
}

/** Base de um token sem qualificadores (hover:, md:), prefixo e '!'. */
function baseDeToken(t, prefixo) {
  let atual = ''
  let dentro = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c === '[') dentro = true
    if (c === ']') dentro = false
    if (c === ':' && !dentro) atual = ''
    else atual += c
  }
  let base = atual
  if (base.endsWith('!')) base = base.slice(0, -1)
  if (prefixo && base.startsWith(prefixo)) base = base.slice(prefixo.length)
  return base
}

/** O CSS de suporte deste plugin é preciso nesta página? */
function pluginUsado(nome, tokens, prefixo) {
  const re = PREFIXO_PLUGIN_CSS[nome]
  if (!re) return true // plugin desconhecido → incluir por segurança
  for (const t of tokens) {
    if (re.test(baseDeToken(t, prefixo))) return true
  }
  return false
}

// Palavras que são valores CSS válidos (não são nomes de tema)
const PALAVRAS_CSS = new Set([
  'none', 'auto', 'inherit', 'initial', 'unset', 'transparent', 'currentcolor',
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'silver', 'gold', 'cyan', 'magenta', 'brown',
  'lime', 'olive', 'navy', 'teal', 'aqua', 'fuchsia',
  // valores que não são cores mas aparecem muito em classes arbitrárias
  'monospace', 'serif', 'sans-serif', 'cursive', 'fantasy', 'system-ui',
  'solid', 'dashed', 'dotted', 'double', 'flex', 'grid', 'block', 'inline',
  'nowrap', 'wrap', 'bold', 'center', 'left', 'right', 'top', 'bottom',
])

/**
 * A classe parece referir um nome do tema?  bg[primaria] → sim;
 * bg[#003] / bg[rgb(...)] / p[16px] → não.  Aviso de diagnóstico.
 */
function pareceClasseTema(t, prefixo) {
  const base = baseDeToken(t, prefixo).replace(/!$/, '')
  const m = /^[a-z-]+\[([a-z][a-z0-9_-]{2,})\]$/.exec(base)
  if (!m) return false
  const valor = m[1].toLowerCase()
  if (PALAVRAS_CSS.has(valor)) return false
  // valores com unidades (solid_1px, 2rem…) não são nomes de tema
  if (/\d\s*(px|rem|em|%|svh|svw|vw|vh|vmin|vmax|deg|ms|s)\b/.test(valor)) return false
  return true
}

module.exports = {
  separarQualificadores,
  classeRelevante,
  analisarTransform,
  construirRegrasTransform,
  construirRegrasTransformComponentes,
  minificarCSS,
  cabecalho,
  juntarFicheiro,
  pluginUsado,
  cssScrollbarEstatico,
  baseDeToken,
  pareceClasseTema,
  FUNCOES_TRANSFORM,
  ORDEM_TRANSFORM,
  BORDER_PREFIXOS,
  RE_ARBITRARIO,
  PREFIXO_PLUGIN_CSS,
}
