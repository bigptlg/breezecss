'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/initscan.js
//
// Descobre a configuração que o projecto usa no browser — a chamada
// BreezeCSS.init({ plugins, tema, … }) ou window.BreezeConfig = { … } —
// varrendo os .js/.mjs/.cjs e os <script> inline dos .html.
//
// O objecto é extraído por balanceamento de parênteses/chavetas (com
// respeito a strings e comentários) e avaliado numa VM pequena: os
// identificadores que não existem (BreezeGlass, …) viram "stubs" que
// registam o próprio nome — assim plugins: [BreezeGlass, BreezeDividers]
// é convertido para ['glass', 'dividers'] sem executar o projecto.
//
// Só interessam dados simples (tema, nomes). Se o objecto depender de
// lógica externa que não dá para avaliar, o resultado é ignorado.
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const vm = require('vm')
const glob = require('./glob')
const { validarTema } = require('./config')
const { PLUGIN_GLOBALS } = require('./engine')

const PADRAO_INIT = /BreezeCSS\s*\.\s*init\s*\(/g
const PADRAO_CONFIG = /(?:window\s*\.\s*)?BreezeConfig\s*=\s*/g
const PADRAO_SCRIPT = /<script\b[^>]*>([\s\S]*?)<\/script>/gi

// ficheiros/funções do próprio CLI ou do motor — nunca são "init" do utilizador
const GUARDA_CONTEUDO = ['criarHospedeiro', 'breeze-cli-sonda', '__breezeRuntime', 'breeze runtime']
const LIMITE_FICHEIRO = 1.5 * 1024 * 1024
const LIMITE_FICHEIROS = 1500

// ── extração balanceada ──────────────────────────────────────────────────

/** A partir do índice do abre ( ou {, devolve o conteúdo até ao par certo. */
function extrairBalanceado(texto, abreIdx, abre, fecha) {
  let prof = 1
  const n = texto.length
  for (let i = abreIdx + 1; i < n; i++) {
    const c = texto[i]
    if (c === '/' && texto[i + 1] === '/') {
      while (i < n && texto[i] !== '\n') i++
      continue
    }
    if (c === '/' && texto[i + 1] === '*') {
      i += 2
      while (i < n && !(texto[i] === '*' && texto[i + 1] === '/')) i++
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c
      i++
      while (i < n) {
        if (texto[i] === '\\') {
          i++
        } else if (q === '`' && texto[i] === '$' && texto[i + 1] === '{') {
          // interpolação — saltar até à chaveta correspondente
          let d = 1
          i += 2
          while (i < n && d > 0) {
            if (texto[i] === '{') d++
            else if (texto[i] === '}') d--
            i++
          }
          continue
        } else if (texto[i] === q) {
          break
        }
        i++
      }
      continue
    }
    if (c === abre) prof++
    else if (c === fecha) {
      prof--
      if (prof === 0) return texto.slice(abreIdx + 1, i)
    }
  }
  return null
}

/** Todas as expressões candidatas a config num texto (js ou html cru). */
function candidatas(texto) {
  const lista = []
  let m
  PADRAO_INIT.lastIndex = 0
  while ((m = PADRAO_INIT.exec(texto))) {
    const abreIdx = m.index + m[0].length - 1
    const src = extrairBalanceado(texto, abreIdx, '(', ')')
    if (src && /[{:]/.test(src)) lista.push(src)
  }
  PADRAO_CONFIG.lastIndex = 0
  while ((m = PADRAO_CONFIG.exec(texto))) {
    let i = m.index + m[0].length
    while (i < texto.length && /\s/.test(texto[i])) i++
    if (texto[i] === '{') {
      const src = extrairBalanceado(texto, i, '{', '}')
      // recolocar as chavetas: o conteúdo extraído não é expressão por si
      if (src && /[:]/.test(src)) lista.push('{' + src + '}')
    }
  }
  return lista
}

// ── avaliação com stubs ──────────────────────────────────────────────────

const SEGUROS = { Math, JSON, Object, Array, String, Number, Boolean }

function criarStub(nome) {
  const fn = function () {}
  return new Proxy(fn, {
    get(t, k) {
      if (k === '__breezeStubNome') return nome
      if (typeof k === 'symbol') return undefined
      return criarStub(nome + '.' + String(k))
    },
    apply() {
      return criarStub(nome + '()')
    },
    construct() {
      return criarStub('new ' + nome)
    },
    has() {
      return true
    },
  })
}

function avaliar(src) {
  const alvo = new Proxy(
    {},
    {
      has: () => true,
      get(t, k) {
        if (typeof k === 'symbol') return undefined
        if (k === 'undefined') return undefined
        if (k === 'NaN') return NaN
        if (k === 'Infinity') return Infinity
        if (k in SEGUROS) return SEGUROS[k]
        return criarStub(String(k))
      },
    },
  )
  const codigo =
    '(function(){ with(__breezeAlvo) { return (' + src + '); } })()'
  return vm.runInNewContext(codigo, { __breezeAlvo: alvo }, { timeout: 300 })
}

// ── normalização ─────────────────────────────────────────────────────────

function nomePluginDe(item) {
  if (typeof item === 'string') return item.trim().toLowerCase()
  if (typeof item === 'function') {
    const nome = item.__breezeStubNome
    if (nome) {
      const globalNome = nome.split('.')[0]
      for (const chave of Object.keys(PLUGIN_GLOBALS)) {
        if (PLUGIN_GLOBALS[chave] === globalNome) return chave
      }
      const sufixo = globalNome.replace(/^Breeze/, '').toLowerCase()
      if (Object.keys(PLUGIN_GLOBALS).includes(sufixo)) return sufixo
    }
  }
  return null
}

/** Limpa o tema: mantém só dados simples; rejeita o que depender de código. */
function limparTema(tema) {
  if (!tema || typeof tema !== 'object' || Array.isArray(tema)) return null
  const limpo = {}
  for (const [secao, valores] of Object.entries(tema)) {
    if (!valores || typeof valores !== 'object' || Array.isArray(valores)) return null
    const vals = {}
    for (const [nome, valor] of Object.entries(valores)) {
      const tipo = typeof valor
      if (tipo === 'string' || tipo === 'number') vals[nome] = valor
      else return null // função/stub/expressão → tema não avaliável
    }
    limpo[secao] = vals
  }
  return Object.keys(limpo).length ? limpo : null
}

/** Avalia todas as candidatas; devolve a primeira que produza dados úteis. */
function normalizarCandidatas(lista, caminhoRel) {
  const notas = []
  for (const src of lista) {
    let valor
    try {
      valor = avaliar(src)
    } catch (e) {
      notas.push('expressão não avaliável: ' + e.message)
      continue
    }
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
      notas.push('resultado não é um objecto de config')
      continue
    }

    let tema = null
    if (valor.tema) {
      try {
        tema = validarTema(limparTema(valor.tema) || {}, 'init descoberto')
        if (!Object.keys(tema).length) tema = null
      } catch (e) {
        notas.push('tema ignorado (' + e.message + ')')
        tema = null
      }
    }

    let plugins
    if (Array.isArray(valor.plugins)) {
      const nomes = valor.plugins.map(nomePluginDe)
      if (nomes.every((n) => n)) plugins = nomes
      else {
        plugins = null // não deu para identificar todos → ficar com todos
        notas.push('nomes de plugins não reconhecidos — a usar todos os disponíveis')
      }
    } else if (valor.plugins === false) {
      plugins = []
    }

    const prefix =
      typeof valor.prefix === 'string' && valor.prefix ? valor.prefix : null
    const safelist = Array.isArray(valor.safelist)
      ? valor.safelist.filter((s) => typeof s === 'string')
      : null

    if (!tema && plugins === undefined && !prefix && !safelist) {
      notas.push('config sem tema/plugins/prefix úteis')
      continue
    }
    return {
      caminho: caminhoRel,
      tema,
      plugins,
      prefix,
      safelist,
      notas,
    }
  }
  return null
}

// ── varrimento do projecto ───────────────────────────────────────────────

function ficheirosAScanear(raiz, explicito, outDir, paginas = [], excluir = []) {
  if (explicito) {
    const abs = path.resolve(raiz, explicito)
    if (!fs.existsSync(abs)) {
      throw new Error('ficheiro não encontrado (--init): ' + explicito)
    }
    return [{ rel: path.relative(raiz, abs).replace(/\\/g, '/'), abs }]
  }
  // O init dos HTML que serão compilados tem prioridade. Antes, a ordem
  // alfabética do varrimento podia escolher breeze/test/fixtures/init.html
  // em vez de index2.html e exportar só parte das cores do tema.
  const normalizar = (rel) => path.relative(raiz, path.resolve(raiz, rel)).replace(/\\/g, '/')
  const selecionados = paginas.map(normalizar).filter((rel) =>
    !rel.startsWith('../') && rel !== '..' && /\.html?$/i.test(rel) && fs.existsSync(path.join(raiz, rel)),
  )
  const rels = glob.caminhar(raiz, {
    incluidos: [
      '**/*.js', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.mts', '**/*.cts',
      '**/*.jsx', '**/*.tsx', '**/*.vue',
      '**/*.html', '**/*.htm',
    ],
    excluidos: ['node_modules', '.git', outDir, ...excluir],
  })
  // Sem --file, privilegiar HTML na raiz; os JS e os exemplos aninhados
  // continuam disponíveis como fallback quando não houver init nos HTML.
  const htmlRaiz = rels.filter((r) => !r.includes('/') && /\.html?$/i.test(r))
  const ordenados = [...new Set([...selecionados, ...htmlRaiz, ...rels])]
  return ordenados.slice(0, LIMITE_FICHEIROS).map((r) => ({ rel: r, abs: path.join(raiz, r) }))
}

/**
 * Procura BreezeCSS.init(…) / BreezeConfig = {…} no projecto.
 * @returns {null | {caminho, tema, plugins, prefix, safelist, notas}}
 */
function descobrirInit(raiz, { explicito, out = 'css', paginas = [], excluir = [], verboso = false } = {}) {
  const ficheiros = ficheirosAScanear(raiz, explicito, out, paginas, excluir)
  let varridos = 0
  for (const f of ficheiros) {
    const base = path.basename(f.abs)
    if (!explicito) {
      if (/\.min\.js$/.test(base) || base === 'breeze.bundle.js' || base === 'breeze.min.js') {
        continue
      }
    }
    let texto
    try {
      const stat = fs.statSync(f.abs)
      if (stat.size > LIMITE_FICHEIRO) continue
      texto = fs.readFileSync(f.abs, 'utf8')
    } catch (e) {
      continue
    }
    if (!explicito && GUARDA_CONTEUDO.some((g) => texto.includes(g))) continue
    if (/\.html?$/i.test(base)) {
      // só o conteúdo dos <script> inline interessa nos HTML
      const blocos = []
      let m
      PADRAO_SCRIPT.lastIndex = 0
      while ((m = PADRAO_SCRIPT.exec(texto))) blocos.push(m[1])
      varridos++
      if (!blocos.length) continue
      const res = normalizarCandidatas(
        blocos.flatMap((b) => candidatas(b)),
        f.rel,
      )
      if (res) return res
      continue
    }
    varridos++
    if (!/BreezeCSS|BreezeConfig/.test(texto)) continue
    const res = normalizarCandidatas(candidatas(texto), f.rel)
    if (res) return res
  }
  if (verboso) {
    console.error('breeze: init — nenhum BreezeCSS.init/BreezeConfig encontrado em ' + varridos + ' ficheiro(s)')
  }
  return null
}

module.exports = { descobrirInit, candidatas, avaliar, extrairBalanceado }
