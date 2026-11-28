'use strict'
// ─────────────────────────────────────────────────────────────────────────
// lib/valor-seguro.js
//
// Valores arbitrários (p[...], bg[...]) vão para o CSS tal como escritos.
// Um valor perigoso pode fechar a tag <style>, comentar o resto da folha ou
// injectar regras (`}` `{` `;`). O motor rejeita-os (valorSeguro no bundle);
// esta é a versão do CLI e devolve o MOTIVO, para o diagnóstico
// `valor-perigoso` — antes a classe desaparecia sem nenhum aviso.
//
// A lógica tem de coincidir com `valorSeguro` do breeze.bundle.js: há um
// teste de paridade em test/valor-seguro.test.js.
// ─────────────────────────────────────────────────────────────────────────

/** @returns {string|null} motivo da rejeição, ou null se o valor é seguro. */
function motivoInseguro(valor) {
  if (/<\/style/i.test(valor)) return 'fecha a tag <style> (permitiria injectar HTML se o CSS for inline)'
  let aspas = null
  const pilha = []
  for (let i = 0; i < valor.length; i++) {
    const c = valor[i]
    if (c === '\\') {
      if (++i >= valor.length) return 'termina em "\\" (escape por completar)'
      continue
    }
    if (aspas) {
      if (c === aspas) aspas = null
      continue
    }
    if (c === '"' || c === "'") {
      aspas = c
      continue
    }
    if (c === '(') {
      pilha.push(/url$/i.test(valor.slice(0, i)))
      continue
    }
    if (c === ')') {
      if (!pilha.length) return 'parêntese ")" sem abertura'
      pilha.pop()
      continue
    }
    if (pilha.includes(true)) continue
    if (c === '/' && valor[i + 1] === '*') {
      const fim = valor.indexOf('*/', i + 2)
      if (fim < 0) return 'comentário "/*" sem fecho (comentaria as regras seguintes)'
      i = fim + 1
      continue
    }
    if (c === '{' || c === '}') return 'contém "' + c + '" (injecção de regras CSS)'
    if (c === ';' && !pilha.length) return 'contém ";" fora de parênteses (injecção de declarações CSS)'
  }
  if (aspas) return 'aspas por fechar'
  if (pilha.length) return 'parêntese "(" por fechar'
  return null
}

module.exports = { motivoInseguro, valorSeguro: (v) => motivoInseguro(v) === null }
