'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/escape.js
// CSS.escape compatível com os browsers (algoritmo do standard).
// Usado pelo motor dentro da VM e pelo gerador de regras de transform —
// assim os seletores ficam sempre iguais ao runtime.
// ─────────────────────────────────────────────────────────────────────────

// Caracteres que podem aparecer numa ident CSS sem escape.
const RE_INSEGURO = /[^a-zA-Z0-9_\u0080-\uFFFF-]/g

function cssEscape(s) {
  return String(s).replace(RE_INSEGURO, (c) => '\\' + c)
}

module.exports = { cssEscape }
