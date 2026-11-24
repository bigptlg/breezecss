'use strict'
// Protege chamadas BreezeCSS independentes em <script> inline durante --inject.
// Mantém o código de configuração visível para os scanners estáticos do CLI.
// Não altera scripts externos, JSON, strings, comentários nem expressões embutidas.

const METODOS = /\bBreezeCSS\s*\.\s*(?:init|addComponent|exportar|use|processar|reiniciar|refresh)\s*\(/g
const INICIO = '/* breeze:cli-guard:start */'
const FIM = '/* breeze:cli-guard:end */'

/** Máscara de JavaScript: strings e comentários viram espaços, mantendo índices. */
function mascarar(codigo) {
  const a = codigo.split('')
  const n = codigo.length
  let i = 0
  const limpar = (ini, fim) => {
    for (let j = ini; j < fim; j++) if (a[j] !== '\n' && a[j] !== '\r') a[j] = ' '
  }
  while (i < n) {
    const c = codigo[i]
    const prox = codigo[i + 1]
    if (c === '/' && prox === '/') {
      const ini = i
      i += 2
      while (i < n && codigo[i] !== '\n') i++
      limpar(ini, i)
    } else if (c === '/' && prox === '*') {
      const ini = i
      i += 2
      while (i < n && !(codigo[i] === '*' && codigo[i + 1] === '/')) i++
      i = Math.min(n, i + 2)
      limpar(ini, i)
    } else if (c === '"' || c === "'" || c === '`') {
      const ini = i
      const aspas = c
      i++
      while (i < n) {
        if (codigo[i] === '\\') { i += 2; continue }
        if (codigo[i] === aspas) { i++; break }
        i++
      }
      limpar(ini, i)
    } else {
      i++
    }
  }
  return a.join('')
}

function intervalosProtegidos(codigo) {
  const lista = []
  let cursor = 0
  while (true) {
    const ini = codigo.indexOf(INICIO, cursor)
    if (ini < 0) break
    const fim = codigo.indexOf(FIM, ini + INICIO.length)
    if (fim < 0) break
    lista.push([ini, fim + FIM.length])
    cursor = fim + FIM.length
  }
  return lista
}

/** Aceita apenas instruções independentes, não usos em expressões. */
function inicioDeInstrucao(mascara, pos) {
  let i = pos - 1
  while (i >= 0 && /[ \t\r]/.test(mascara[i])) i--
  if (i < 0 || /[;{}]/.test(mascara[i])) return true
  if (mascara[i] !== '\n') return false
  // Uma quebra de linha depois de '=', 'return', '=>' etc. não cria instrução.
  let j = i - 1
  while (j >= 0 && /\s/.test(mascara[j])) j--
  if (j < 0 || /[;{}]/.test(mascara[j])) return true
  if (/[=,+\-*/?:.(&|!\[]/.test(mascara[j])) return false
  const anterior = mascara.slice(Math.max(0, j - 12), j + 1)
  if (/\b(?:return|throw|yield|await|new|void|delete|typeof)\s*$/.test(anterior)) return false
  return true
}

function fimDeChamada(mascara, abre) {
  let profundidade = 0
  for (let i = abre; i < mascara.length; i++) {
    if (mascara[i] === '(') profundidade++
    else if (mascara[i] === ')') {
      profundidade--
      if (profundidade === 0) return i + 1
    }
  }
  return -1
}

function fimDeInstrucao(mascara, depois) {
  let i = depois
  while (i < mascara.length && /[ \t\r]/.test(mascara[i])) i++
  if (mascara[i] === ';') return i + 1
  if (i >= mascara.length || mascara[i] === '}') return depois
  if (mascara[i] === '\n') {
    // Não quebrar encadeamentos que continuam na linha seguinte.
    const resto = mascara.slice(i).match(/^\s*(?:\?\.|\.|\[|\()/)
    return resto ? -1 : depois
  }
  // Não modificar encadeamentos, operadores ou argumentos adicionais.
  return -1
}

function protegerCodigo(codigo) {
  const mascara = mascarar(codigo)
  const protegidos = intervalosProtegidos(codigo)
  const alteracoes = []
  METODOS.lastIndex = 0
  let m
  while ((m = METODOS.exec(mascara))) {
    const ini = m.index
    if (protegidos.some(([a, b]) => ini >= a && ini < b)) continue
    if (!inicioDeInstrucao(mascara, ini)) continue
    const abre = ini + m[0].length - 1
    const depois = fimDeChamada(mascara, abre)
    if (depois < 0) continue
    const fim = fimDeInstrucao(mascara, depois)
    if (fim < 0) continue
    // Evitar proteger chamadas embutidas dentro de outra já selecionada.
    if (alteracoes.some((a) => ini < a.fim && fim > a.ini)) continue
    alteracoes.push({ ini, fim })
    METODOS.lastIndex = fim
  }
  if (!alteracoes.length) return { codigo, alterado: false, protegidas: 0 }
  let resultado = codigo
  for (let i = alteracoes.length - 1; i >= 0; i--) {
    const { ini, fim } = alteracoes[i]
    const instrucao = codigo.slice(ini, fim)
    const bloco = `${INICIO}\nif (typeof BreezeCSS !== 'undefined') {\n${instrucao}\n}\n${FIM}`
    resultado = resultado.slice(0, ini) + bloco + resultado.slice(fim)
  }
  return { codigo: resultado, alterado: true, protegidas: alteracoes.length }
}

function protegerChamadasBreeze(html) {
  let protegidas = 0
  const novo = html.replace(/(<script\b([^>]*)>)([\s\S]*?)(<\/script\s*>)/gi, (original, abre, atributos, codigo, fecha) => {
    if (/(?:^|\s)src\s*=/.test(atributos)) return original
    const tipo = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(atributos)
    if (tipo && !/^(?:module|(?:text|application)\/(?:java|ecma)script)$/i.test(tipo[1] || tipo[2] || tipo[3])) return original
    const res = protegerCodigo(codigo)
    protegidas += res.protegidas
    return abre + res.codigo + fecha
  })
  return { html: novo, alterado: novo !== html, protegidas }
}

module.exports = { protegerChamadasBreeze, protegerCodigo }
