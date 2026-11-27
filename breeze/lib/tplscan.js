'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/tplscan.js
//
// Descobre classes do Breeze em código de SPAs — React/JSX/TSX
// (className="…"), Vue (:class="'…'" / class="…"), Svelte e templates
// Angular — SEM executar nada. Só strings citadas em atributos de classe:
//
//   <div className="flex p[16px] hover:bg[red]">
//   <article :class="'card ' + variante">          (parte citada apenas)
//   <section [class.activated]="'p[20px] glass'">  (parte citada apenas)
//
// É uma análise ESTÁTICA: apenas identifica classes quando é possível
// vê-las literalmente no ficheiro. Expressões dinâmicas calculadas em
// runtime continuam a exigir regeneração/--safelist (limitação do modo
// compilado, documentada no README).
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const glob = require('./glob')

const EXTENSOES = /\.(jsx|tsx|vue|svelte|js|mjs|cjs|ts|mts|cts)$/i
const LIMITE_FICHEIRO = 1.5 * 1024 * 1024
const LIMITE_FICHEIROS = 2000
const LIMITE_TOKENS = 20000

// className="…" / class="…" / :class="'…'" / [class.x]="'…'"
const RE_ATR_CLASSE = /(?:className|\[?class(?:\.[\w.-]+)?\]?|\[ngClass\])\s*=\s*(?:"([^"]*)"|'([^']*)')/g
// strings citadas DENTRO de expressões (Vue :class / Angular [ngClass])
const RE_STRING = /(['"])((?:\\.|(?!\1)[^\\])*)\1/g

/** Heurística: parece um token do Breeze (não é uma expressão JS livre). */
function tokenPlausivel(t) {
  if (!t || t.length > 120) return false
  if (/\s/.test(t)) return false
  // operadores JS/HTML que denunciam código em vez de classe
  if (/[{}();<>=&|!?*%$#@^~`\\/]/.test(t)) return false
  if (t.startsWith('-') && t.length > 1 && /\d/.test(t[1])) return false
  return /^[A-Za-z0-9_!:[\]().,\s#%_-]+$/.test(t)
}

/** Tabela de inícios de linha para converter índices em {linha, coluna}. */
function criarLinhas(texto) {
  const inicios = [0]
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '\n') inicios.push(i + 1)
  }
  return {
    de(abs) {
      let lo = 0
      let hi = inicios.length - 1
      while (lo < hi) {
        const meio = (lo + hi + 1) >> 1
        if (inicios[meio] <= abs) lo = meio
        else hi = meio - 1
      }
      return { linha: lo + 1, coluna: abs - inicios[lo] + 1 }
    },
  }
}

/**
 * Tokens de classe com posição absoluta (índice no texto dado).
 * Contextos: atributos class/className/:class/[ngClass], strings citadas
 * em expressões e classList.add/toggle/remove('…').
 * @returns {{token: string, abs: number}[]}
 */
function tokensAbs(texto) {
  const mapa = new Map()
  const regista = (token, abs) => {
    if (!tokenPlausivel(token)) return
    if (!mapa.has(token)) mapa.set(token, { token, abs })
  }
  const percorrer = (valor, absValor, reg) => {
    let j = 0
    while (j < valor.length) {
      while (j < valor.length && /\s/.test(valor[j])) j++
      const s = j
      while (j < valor.length && !/\s/.test(valor[j])) j++
      if (j > s) reg(valor.slice(s, j), absValor + s)
    }
  }
  let m
  RE_ATR_CLASSE.lastIndex = 0
  while ((m = RE_ATR_CLASSE.exec(texto))) {
    const bruto = m[1] !== undefined ? m[1] : m[2]
    if (!bruto) continue
    // valor directo (o atributo citado começa 1 carácter depois da aspa)
    const citado = m[1] !== undefined || m[2] !== undefined
    const absValor = m.index + m[0].length - bruto.length - (citado ? 1 : 0)
    percorrer(bruto, absValor, regista)
    // strings citadas dentro de expressões ('hover:bg[red]', …)
    if (/[+?:|&]/.test(bruto)) {
      let ms
      RE_STRING.lastIndex = 0
      while ((ms = RE_STRING.exec(bruto))) {
        const absStr = m.index + ms.index + 1 // +1: aspa de abertura
        percorrer(ms[2], absStr, regista)
      }
    }
  }
  // classList.add/toggle/remove('…') também é contexto de classe
  const RE_LISTA = /\bclassList\.(?:add|toggle|remove)\s*\(\s*(['"])([^'"]+)\1/g
  while ((m = RE_LISTA.exec(texto))) {
    const absValor = m.index + m[0].indexOf(m[2])
    percorrer(m[2], absValor, regista)
  }
  return [...mapa.values()]
}

/** Tabela de inícios de linha para converter índices em {linha, coluna}. */
function criarLinhas(texto) {
  const inicios = [0]
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '\n') inicios.push(i + 1)
  }
  return {
    de(abs) {
      let lo = 0
      let hi = inicios.length - 1
      while (lo < hi) {
        const meio = (lo + hi + 1) >> 1
        if (inicios[meio] <= abs) lo = meio
        else hi = meio - 1
      }
      return { linha: lo + 1, coluna: abs - inicios[lo] + 1 }
    },
  }
}

/**
 * Igual a extrairDeTexto mas devolve posição por token (linha/coluna, base 1).
 * @param {string} texto
 * @param {{tabela?: object, desloc?: number}} op  tabela de linhas externa +
 *        deslocamento absoluto (para scripts inline dentro de um HTML)
 * @returns {{token: string, linha: number, coluna: number}[]}
 */
function extrairDeTextoComPosicoes(texto, op = {}) {
  const tabela = op.tabela || criarLinhas(texto)
  const desloc = op.desloc || 0
  const mapa = new Map()
  for (const t of tokensAbs(texto)) {
    if (!mapa.has(t.token)) {
      mapa.set(t.token, { token: t.token, ...tabela.de(desloc + t.abs) })
    }
  }
  return [...mapa.values()]
}

/**
 * Template literals com classes dinâmicas (`p[${n}px]`) — não compiláveis:
 * o valor só existe em runtime. Devolve [{ token, linha, coluna }].
 */
function literaisDinamicos(texto, op = {}) {
  const tabela = op.tabela || criarLinhas(texto)
  const desloc = op.desloc || 0
  const lista = []
  const re = /`([^`\n]*\[\$\{[^`\n]*)`/g
  let m
  while ((m = re.exec(texto))) {
    lista.push({ token: m[1].trim(), ...tabela.de(desloc + m.index + 1) })
  }
  return lista
}

/** Extrai os tokens de classe citados num ficheiro de template/script. */
function extrairDeTexto(texto) {
  const set = new Set()
  let m
  RE_ATR_CLASSE.lastIndex = 0
  while ((m = RE_ATR_CLASSE.exec(texto))) {
    const bruto = m[1] !== undefined ? m[1] : m[2]
    if (!bruto) continue
    // 1.º: tokens separados por espaço no valor directo
    for (const t of bruto.split(/\s+/)) {
      if (tokenPlausivel(t)) set.add(t)
    }
    // 2.º: strings citadas dentro de expressões ('hover:bg[red]', …)
    if (/[+?:|&]/.test(bruto)) {
      let ms
      RE_STRING.lastIndex = 0
      while ((ms = RE_STRING.exec(bruto))) {
        for (const t of ms[2].split(/\s+/)) {
          if (tokenPlausivel(t)) set.add(t)
        }
      }
    }
  }
  return set
}

/**
 * Varre os ficheiros de templates/componentes do projecto.
 * @param {object} op { raiz, excluir: string[] (globs/paths), verboso }
 * @returns {Map<string, Set<string>>}  rel → tokens (ordem de ficheiro)
 */
function descobrirClassesTemplate(op = {}) {
  const raiz = op.raiz || process.cwd()
  const rels = glob.caminhar(raiz, {
    incluidos: [
      '**/*.jsx', '**/*.tsx', '**/*.vue', '**/*.svelte',
      '**/*.ts', '**/*.mts', '**/*.cts',
      '**/*.js', '**/*.mjs', '**/*.cjs',
    ],
    excluidos: op.excluir || [],
  })
  const mapa = new Map()
  let total = 0
  for (const rel of rels) {
    if (total >= LIMITE_FICHEIROS) break
    if (!EXTENSOES.test(rel)) continue
    const base = path.basename(rel)
    // bundles/motor do Breeze não interessam
    if (/\.min\.js$/.test(base) || /^breeze(\.min)?\.bundle\.js$/.test(base)) continue
    if (/(?:^|[/\\])test[/\\]|(?:^|[/\\])__tests__[/\\]/.test(rel)) continue
    const abs = path.join(raiz, rel)
    let texto
    try {
      if (fs.statSync(abs).size > LIMITE_FICHEIRO) continue
      texto = fs.readFileSync(abs, 'utf8')
    } catch (e) {
      continue
    }
    // só ficheiros com sinais de classes citadas
    if (!/className|:class|\[class|ngClass|\bclass\s*=/.test(texto)) continue
    const tokens = extrairDeTexto(texto)
    if (tokens.size) {
      mapa.set(rel, tokens)
      total += tokens.size
      if (total >= LIMITE_TOKENS) break
    }
  }
  return mapa
}

/**
 * Igual a descobrirClassesTemplate mas devolve também posição por token
 * e os literais dinâmicos de cada ficheiro.
 * @returns {Map<string, {tokens: [{token,linha,coluna}], dinamicos: [{token,linha,coluna}]}>}
 */
function descobrirClassesTemplateComPosicoes(op = {}) {
  const raiz = op.raiz || process.cwd()
  const rels = glob.caminhar(raiz, {
    incluidos: [
      '**/*.jsx', '**/*.tsx', '**/*.vue', '**/*.svelte',
      '**/*.ts', '**/*.mts', '**/*.cts',
      '**/*.js', '**/*.mjs', '**/*.cjs',
    ],
    excluidos: op.excluir || [],
  })
  const mapa = new Map()
  let total = 0
  for (const rel of rels) {
    if (total >= LIMITE_FICHEIROS) break
    if (!EXTENSOES.test(rel)) continue
    const base = path.basename(rel)
    if (/\.min\.js$/.test(base) || /^breeze(\.min)?\.bundle\.js$/.test(base)) continue
    if (/(?:^|[/\\])test[/\\]|(?:^|[/\\])__tests__[/\\]/.test(rel)) continue
    const abs = path.join(raiz, rel)
    let texto
    try {
      if (fs.statSync(abs).size > LIMITE_FICHEIRO) continue
      texto = fs.readFileSync(abs, 'utf8')
    } catch (e) {
      continue
    }
    if (!/className|:class|\[class|ngClass|\bclass\s*=|classList\./.test(texto)) continue
    const tokens = extrairDeTextoComPosicoes(texto)
    const dinamicos = literaisDinamicos(texto)
    if (tokens.length || dinamicos.length) {
      mapa.set(rel, { tokens, dinamicos })
      total += tokens.length
      if (total >= LIMITE_TOKENS) break
    }
  }
  return mapa
}

/**
 * Extrai os tokens de classe dos <script> inline de um HTML
 * (className="…", classList.add('…'), class='…').
 * @param {string} html
 * @returns {Set<string>}
 */
function extrairDeHTML(html) {
  const set = new Set()
  const RE_BLOCO = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = RE_BLOCO.exec(html))) {
    for (const t of extrairDeTexto(m[1])) set.add(t)
  }
  return set
}

/**
 * Versão com posições de extrairDeHTML: tokens citados nos <script> inline
 * + literais dinâmicos (template literals com [${…}]) — posições relativas
 * ao HTML COMPLETO (linha/coluna do documento, não do bloco).
 * @returns {{ tokens: [{token,linha,coluna}], dinamicos: [{token,linha,coluna}] }}
 */
function extrairDeHTMLComPosicoes(html) {
  const mapa = new Map()
  const dinamicos = []
  const tabela = criarLinhas(html)
  const RE_BLOCO = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = RE_BLOCO.exec(html))) {
    if (m[1].trim() === '') continue
    // início absoluto do conteúdo do bloco dentro do HTML
    const inicioConteudo = m.index + m[0].indexOf(m[1])
    for (const t of tokensAbs(m[1])) {
      if (!mapa.has(t.token)) {
        mapa.set(t.token, { token: t.token, ...tabela.de(inicioConteudo + t.abs) })
      }
    }
    dinamicos.push(...literaisDinamicos(m[1], { tabela, desloc: inicioConteudo }))
  }
  return { tokens: [...mapa.values()], dinamicos }
}

module.exports = {
  descobrirClassesTemplate,
  descobrirClassesTemplateComPosicoes,
  tokensAbs,
  extrairDeTexto,
  extrairDeTextoComPosicoes,
  extrairDeHTML,
  extrairDeHTMLComPosicoes,
  literaisDinamicos,
  tokenPlausivel,
}
