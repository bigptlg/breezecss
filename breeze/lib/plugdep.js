'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/plugdep.js
//
// Deteção de DEPENDÊNCIAS DE PLUGINS a partir dos tokens de classe usados
// numa página — incluindo as classes usadas DENTRO de componentes
// (BreezeCSS.addComponent), com expansão recursiva e protecção contra
// referências circulares.
//
//   card = ['glass', 'glass-dark', 'rounded[16px]']  →  glass: css ✓
//   galeria = ['card', 'divider-wave']               →  glass + dividers
//
// Devolve, por página e globais:
//   css[nomePlugin]  → o CSS de suporte do plugin é preciso
//   js[nomePlugin]   → o plugin tem JavaScript dinâmico que é preciso
//                      (progress/preloader/backgrounds/scrollbar sempre;
//                      glass só com glass-refract; dividers nunca)
// ─────────────────────────────────────────────────────────────────────────

const { baseDeToken } = require('./cssgen')

/**
 * Padrões de classe por plugin.
 *   css — classes que activam o plugin (CSS de suporte necessário)
 *   js  — classes que implicam comportamento dinâmico (JS necessário);
 *         null = o plugin nunca gera JS (dividers é 100% CSS)
 */
const PADROES = {
  glass: {
    css: /^glass(\[|-|$)/,
    js: /^glass-refract(\[|$)/, // refracção via SVG/ResizeObserver — só Chromium
  },
  dividers: {
    css: /^divider-/,
    js: null, // máscaras SVG em CSS puro
  },
  progress: {
    css: /^progress(\[|-|$)/,
    js: /^progress(\[|-|$)/, // cria a barra, escuta scroll, MutationObserver
  },
  scrollbar: {
    css: /^scrollbar(\[|-|$)/,
    js: /^scrollbar(\[|-|$)/, // aplica [data-breeze-scrollbar] + espelho body→html
  },
  preloader: {
    css: /^preloader(\[|-|$)/,
    js: /^preloader(\[|-|$)/, // cria o overlay, anima e remove
  },
  backgrounds: {
    css: /^custom-bg(\[|-|$)/,
    js: /^custom-bg(\[|-|$)/, // gera fundos em canvas, IntersectionObserver
  },
}

const NOMES = Object.keys(PADROES)

/**
 * Resolve os membros efectivos de um token que é nome de componente.
 * Expansão recursiva (componente dentro de componente) com protecção
 * contra referências circulares.
 * @param {string} token           classe usada no HTML
 * @param {Map<string, string[]>} mapaComponentes  nome → membros (brutos)
 * @param {Set<string>} vistos     protecção anti-circular (interno)
 * @returns {string[]}             membros efectivos (pode incluir nomes de
 *                                 componentes que não existem — devolve [])
 */
function membrosComponente(token, mapaComponentes, vistos = new Set()) {
  if (vistos.has(token)) return [] // referência circular → cortar aqui
  vistos.add(token)
  const membros = mapaComponentes && mapaComponentes.get(token)
  if (!membros) return []
  const saida = []
  for (const m of membros) {
    if (mapaComponentes.has(m)) saida.push(...membrosComponente(m, mapaComponentes, vistos))
    else saida.push(m)
  }
  return saida
}

/**
 * Analisa um token (classe do HTML, de safelist, de template ou membro de
 * componente) e devolve os plugins que ele activa.
 * @returns {{css: string[], js: string[]}}
 */
function analisarToken(token, prefixo, mapaComponentes) {
  const css = []
  const js = []
  const candidatos = [token, baseDeToken(token, prefixo)]
  const vistos = new Set()
  for (const c of candidatos) {
    for (const membros of [ [c], membrosComponente(c, mapaComponentes, vistos) ]) {
      for (const t of membros) {
        const base = baseDeToken(t, prefixo).replace(/!$/, '')
        for (const nome of NOMES) {
          const p = PADROES[nome]
          if (p.css.test(base) && !css.includes(nome)) css.push(nome)
          if (p.js && p.js.test(base) && !js.includes(nome)) js.push(nome)
        }
      }
    }
  }
  return { css, js }
}

/**
 * Analisa todas as páginas e devolve as dependências de plugins.
 * @param {object} op
 *   paginas           [{ rel, conteudo? }] — os HTML do projecto
 *   tokensPorPagina   Map<rel, Set<string>> opcional (senão extrai de conteudo)
 *   mapaComponentes   Map<string, string[]> — componentes descobertos
 *   prefix            prefixo das classes ('')
 *   initPlugins       string[] — plugins declarados no BreezeCSS.init (js)
 *   tokensGlobais     string[] — classes de templates/safelist (aplicam a
 *                     todas as páginas; ex.: classes de JSX/Vue)
 * @returns {{
 *   porPagina: Map<rel, {css: string[], js: string[], plugins: string[]}>,
 *   globalCss: string[], globalJs: string[],
 * }}
 */
function analisar(op) {
  const mapaComponentes = op.mapaComponentes || new Map()
  const prefixo = op.prefix || ''
  const porPagina = new Map()
  const globalCss = []
  const globalJs = []

  const fundir = (destino, css, js) => {
    for (const n of css) if (!destino.css.includes(n)) destino.css.push(n)
    for (const n of js) if (!destino.js.includes(n)) destino.js.push(n)
  }

  // base comum (templates JSX/Vue, safelist) — aplica a TODAS as páginas
  // mas não é "uso" de nenhuma página em concreto
  const base = { css: [], js: [] }
  if (op.tokensGlobais && op.tokensGlobais.length) {
    for (const t of op.tokensGlobais) {
      const r = analisarToken(t, prefixo, mapaComponentes)
      fundir(base, r.css, r.js)
    }
  }
  fundir({ css: globalCss, js: globalJs }, base.css, base.js)

  for (const p of op.paginas || []) {
    // NÃO semear com globalCss/globalJs: os plugins usados noutra página
    // pertencem a essa página (cada página leva só o que precisa)
    const acc = { css: [...base.css], js: [...base.js], plugins: [] }
    const tokens =
      (op.tokensPorPagina && op.tokensPorPagina.get(p.rel)) ||
      tokensDe(p.conteudo || '')
    for (const t of tokens) {
      const r = analisarToken(t, prefixo, mapaComponentes)
      fundir(acc, r.css, r.js)
    }
    acc.plugins = [...new Set([...acc.css, ...acc.js])]
    porPagina.set(p.rel, acc)
    // os plugins usados em QUALQUER página contam para os globais
    // (motor, modo --plugins auto, runtime global)
    fundir({ css: globalCss, js: globalJs }, acc.css, acc.js)
  }

  // plugins declarados explicitamente no BreezeCSS.init → JS garantido
  // (o programador pode chamar as APIs — BreezePreloader.iniciar(), etc.)
  if (op.initPlugins && op.initPlugins.length) {
    for (const nome of op.initPlugins) {
      const p = PADROES[nome]
      if (p && p.js && !globalJs.includes(nome)) globalJs.push(nome)
      if (p && !globalCss.includes(nome)) globalCss.push(nome)
    }
  }

  return { porPagina, globalCss, globalJs }
}

/** Extrai tokens de classe de um HTML — atributos class E strings de
 * scripts inline (className = '…', classList.add('…')), para SPAs cujas
 * classes só aparecem no JavaScript. */
function tokensDe(html) {
  const set = new Set()
  const re = /<[^>]+>/g
  let m
  while ((m = re.exec(html))) {
    const mc = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/.exec(m[0])
    const valor = (mc && (mc[2] !== undefined ? mc[2] : mc[3])) || ''
    for (const t of valor.split(/\s+/)) if (t) set.add(t)
  }
  // scripts inline: atribuições className/class e classList.add/toggle
  const RE_BLOCO = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  const RE_CLS = /\b(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g
  const RE_LISTA = /\bclassList\.(?:add|toggle|remove)\s*\(\s*['"]([^'"]+)['"]/g
  let ms
  const plausivel = (t) =>
    t && t.length <= 120 && !/\s/.test(t) && !/[{}();<>=&|!?*%$#@^~`\\/]/.test(t)
  while ((ms = RE_BLOCO.exec(html))) {
    const bloco = ms[1]
    let mc
    RE_CLS.lastIndex = 0
    while ((mc = RE_CLS.exec(bloco))) {
      const valor = mc[1] !== undefined ? mc[1] : mc[2] !== undefined ? mc[2] : mc[3]
      if (!valor) continue
      for (const t of valor.split(/\s+/)) if (plausivel(t)) set.add(t)
    }
    RE_LISTA.lastIndex = 0
    while ((mc = RE_LISTA.exec(bloco))) {
      if (plausivel(mc[1])) set.add(mc[1])
    }
  }
  return set
}

/** O plugin tem JavaScript de runtime? */
function temJs(nome) {
  const p = PADROES[nome]
  return !!(p && p.js)
}

module.exports = { PADROES, NOMES, analisar, analisarToken, membrosComponente, temJs, tokensDe }
