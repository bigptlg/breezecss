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

module.exports = { descobrirClassesTemplate, extrairDeTexto, extrairDeHTML, tokenPlausivel }
