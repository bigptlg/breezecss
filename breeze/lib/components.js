'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/components.js
//
// Descobre os COMPONENTES registados no browser com
//   BreezeCSS.addComponent("btn", ["no-underline", "p[15px]", …])
// para que o CLI os registe no motor antes do build e o CSS exportado
// inclua as regras .btn { … } / .btn:hover { … }.
//
// Fontes varridas:
//   • <script> inline dos próprios HTML processados (o caso mais comum)
//   • ficheiros .js/.mjs/.cjs do projecto (ex.: js/site.js)
//   • breeze.config.js via a chave "componentes: { btn: [ … ], … }"
//
// A extração é puramente textual (balanceamento de parênteses com respeito
// a strings e comentários) — nenhum código do projecto é executado.
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const glob = require('./glob')
const { extrairBalanceado } = require('./initscan')

const PADRAO_SCRIPT = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
const PADRAO_COMPONENTE = /(?:BreezeCSS|Breeze)\s*\.\s*addComponent\s*\(/g
const LIMITE_FICHEIRO = 1.5 * 1024 * 1024
const LIMITE_FICHEIROS = 1500

/** Nome de componente = nome de classe CSS válido. */
function nomeValido(n) {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(n)
}

/**
 * Extrai os addComponent(…) de um texto JS (script inline ou ficheiro .js).
 * @returns {{nome: string, classes: string[]}[]}
 */
function extrairDeTexto(texto) {
  const achados = []
  let m
  PADRAO_COMPONENTE.lastIndex = 0
  while ((m = PADRAO_COMPONENTE.exec(texto))) {
    const abreIdx = m.index + m[0].length - 1 // posição do "("
    const argumentos = extrairBalanceado(texto, abreIdx, '(', ')')
    if (!argumentos) continue

    // 1.º argumento: "nome" ou 'nome'
    const mn = /^\s*(['"])([^'"]+)\1\s*,/.exec(argumentos)
    if (!mn) continue
    const nome = mn[2].trim()
    if (!nomeValido(nome)) continue

    // 2.º argumento: [ lista de strings ]
    const iArr = argumentos.indexOf('[', mn[0].length - 1)
    if (iArr === -1) continue
    const lista = extrairBalanceado(argumentos, iArr, '[', ']')
    if (!lista) continue

    const classes = []
    const mi = /(['"])([^'"]*)\1/g
    let mi2
    while ((mi2 = mi.exec(lista))) {
      const c = mi2[2].trim()
      if (c) classes.push(c)
    }
    if (classes.length) achados.push({ nome, classes })
  }
  return achados
}

/** Extrai dos <script> inline de um HTML. */
function extrairDeHTML(html) {
  const achados = []
  let m
  PADRAO_SCRIPT.lastIndex = 0
  while ((m = PADRAO_SCRIPT.exec(html))) {
    achados.push(...extrairDeTexto(m[1]))
  }
  return achados
}

/** Ficheiros JS/TS/template do projecto que vale a pena varrer (exclui bundles/min). */
function ficheirosJS(raiz, outDir, excluirExtra = []) {
  const rels = glob.caminhar(raiz, {
    incluidos: [
      '**/*.js', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.mts', '**/*.cts',
      '**/*.jsx', '**/*.tsx', '**/*.vue', '**/*.svelte',
    ],
    excluidos: ['node_modules', '.git', outDir, ...excluirExtra.filter(Boolean)],
  })
  return rels
    .filter((r) => {
      const base = path.basename(r)
      if (/\.min\.js$/.test(base)) return false
      if (/^breeze(\.min)?\.bundle\.js$/.test(base)) return false
      return true
    })
    .slice(0, LIMITE_FICHEIROS)
    .map((r) => path.join(raiz, r))
}

/**
 * Descobre todos os componentes do projecto.
 * @param {object} opcoes
 *   raiz         pasta do projecto (process.cwd())
 *   paginas      [{ conteudo }] — HTML já lidos (varre os <script> inline)
 *   out          pasta de saída a excluir do varrimento
 *   excluirExtra pastas extra a excluir (ex.: jsOut do runtime gerado)
 *   config       objecto "componentes" vindo do breeze.config.js
 * @returns {Map<string, string[]>}  nome → classes (ordem de descoberta)
 */
function descobrirComponentes({ raiz, paginas = [], out = 'css', excluirExtra = [], config = null }) {
  const mapa = new Map()
  let fontes = { scripts: 0, js: 0, config: 0 }

  if (config && typeof config === 'object' && !Array.isArray(config)) {
    for (const [nome, lista] of Object.entries(config)) {
      if (Array.isArray(lista) && lista.length && nomeValido(nome)) {
        mapa.set(nome, lista.map(String))
        fontes.config++
      }
    }
  }

  for (const p of paginas) {
    for (const c of extrairDeHTML(p.conteudo || '')) {
      if (!mapa.has(c.nome)) {
        mapa.set(c.nome, c.classes)
        fontes.scripts++
      }
    }
  }

  for (const f of ficheirosJS(raiz, out, excluirExtra)) {
    let texto
    try {
      if (fs.statSync(f).size > LIMITE_FICHEIRO) continue
      texto = fs.readFileSync(f, 'utf8')
    } catch (e) {
      continue
    }
    if (!texto.includes('addComponent')) continue
    for (const c of extrairDeTexto(texto)) {
      if (!mapa.has(c.nome)) {
        mapa.set(c.nome, c.classes)
        fontes.js++
      }
    }
  }

  mapa._fontes = fontes
  return mapa
}

module.exports = { descobrirComponentes, extrairDeHTML, extrairDeTexto, nomeValido }
