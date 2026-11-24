'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/glob.js
// Descoberta de ficheiros com globs simples (zero dependências).
// Suporta: **, *, ?, {a,b} — caminhos sempre em formato POSIX.
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

function escaparLiteral(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

/**
 * Converte um padrão glob numa RegExp ancorada.
 *   "estrela-estrela/estrela.html" → qualquer profundidade
 *   pages/estrela-estrela          → tudo dentro de pages/
 *   estrela.{html,htm}             → alternativas
 */
function globParaRegex(glob) {
  const g = String(glob).replace(/\\/g, '/')
  let re = ''
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*') {
      if (g[i + 1] === '*') {
        let j = i + 2
        while (g[j] === '*') j++
        if (g[j] === '/') {
          re += '(?:[^/]+/)*'
          i = j
        } else {
          re += '.*'
          i = j - 1
        }
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else if (c === '{') {
      const fim = g.indexOf('}', i)
      if (fim === -1) {
        re += escaparLiteral(c)
      } else {
        const alts = g
          .slice(i + 1, fim)
          .split(',')
          .map(escaparLiteral)
        re += '(?:' + alts.join('|') + ')'
        i = fim
      }
    } else {
      re += escaparLiteral(c)
    }
  }
  return new RegExp('^' + re + '$')
}

/**
 * Expande abreviaturas comuns nos excludes:
 *   "node_modules"        → qualquer pasta com esse nome (e o que está dentro)
 *   "node_modules/**"     → mantém-se
 */
function normalizarPadrao(p) {
  const g = String(p).replace(/\\/g, '/').replace(/^\.\//, '')
  if (!g.includes('/')) return ['**/' + g + '/**']
  if (g.endsWith('/**')) return [g, g.replace(/\/\*\*$/, '')]
  return [g]
}

function compilar(padroes) {
  const regexes = []
  for (const p of padroes || []) {
    for (const np of normalizarPadrao(p)) regexes.push(globParaRegex(np))
  }
  return regexes
}

function correspondeAAlguem(caminho, regexes) {
  for (const re of regexes) if (re.test(caminho)) return true
  return false
}

/**
 * Caminha recursivamente pela raiz devolvendo ficheiros (relativos, POSIX).
 * Poda pastas excluídas por performance.
 */
function caminhar(raiz, { excluidos = [], incluidos = [] } = {}) {
  const resExcl = compilar(excluidos)
  const resIncl = compilar(incluidos)
  const ficheiros = []

  const estaExcluido = (rel, ePasta) => {
    if (correspondeAAlguem(rel, resExcl)) return true
    if (ePasta && correspondeAAlguem(rel + '/x', resExcl)) return true
    return false
  }

  function entrar(dir) {
    let entradas
    try {
      entradas = fs.readdirSync(dir, { withFileTypes: true })
    } catch (e) {
      return
    }
    for (const entrada of entradas) {
      const abs = path.join(dir, entrada.name)
      let rel
      try {
        rel = path.relative(raiz, abs).replace(/\\/g, '/')
      } catch (e) {
        continue
      }
      if (entrada.isDirectory()) {
        if (estaExcluido(rel, true)) continue
        entrar(abs)
      } else if (entrada.isFile()) {
        if (estaExcluido(rel, false)) continue
        if (resIncl.length === 0 || correspondeAAlguem(rel, resIncl)) {
          ficheiros.push(rel)
        }
      }
    }
  }

  entrar(path.resolve(raiz))
  return ficheiros.sort()
}

/** Testa um caminho relativo contra incluídos/excluídos (para ficheiros soltos). */
function corresponde(rel, { excluidos = [], incluidos = [] } = {}) {
  const resExcl = compilar(excluidos)
  const resIncl = compilar(incluidos)
  if (correspondeAAlguem(rel, resExcl)) return false
  if (resIncl.length === 0) return true
  return correspondeAAlguem(rel, resIncl)
}

module.exports = { globParaRegex, caminhar, corresponde, compilar }
