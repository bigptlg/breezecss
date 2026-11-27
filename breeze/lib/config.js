'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/config.js
//
// Suporte a breeze.config.js — o mesmo objecto que se passa a
// BreezeCSS.init({...}) no browser (tema, plugins, safelist, prefix, log),
// mais opções de saída do CLI (out, name, split, minify, allPluginCss…).
//
// Ordem de precedência:  omissões do CLI  <  breeze.config.js  <  flags CLI
//
// Chaves aceites no ficheiro de config:
//   tema          { cores?, espacamento?, fontes? }  — igual ao init
//   componentes   { btn: ['no-underline', …], … }    — o mesmo que
//                 BreezeCSS.addComponent(…) no browser (alias: components)
//   plugins       'all' | 'auto' | false | ['glass', …]  — igual ao init;
//                 'auto' analisa o projecto (HTML, componentes, templates
//                 JSX/Vue/Angular, init) e só regista/exporta o necessário
//   prefix        string                              — igual ao init (BreezeConfig.prefix)
//   safelist      string[]                            — igual ao init
//   log           (aceite e ignorado — só faz sentido no browser)
//   allPluginCss  boolean  — exporta o CSS completo de TODOS os plugins
//                            mesmo quando as suas classes não são usadas
//   runtime       boolean  — gera o runtime JavaScript dos plugins
//                            (js/*.runtime.js). Por omissão é automático:
//                            só nas páginas com plugins dinâmicos.
//   jsOut         string   — pasta do runtime (por omissão: js/ ao lado
//                            da pasta de CSS)
//   tpl           boolean  — compila as classes citadas em JSX/TSX/Vue/
//                            Angular/Svelte para o CSS (auto já as analisa
//                            para deps; isto compila-as também)
//   out, name, split, minify, reset, smooth, inject,
//   include, exclude, engine                 — omissões para as flags do CLI
//   strict        boolean — código de saída 1 quando há erros de diagnóstico
//   report        'text' | 'json' — formato do relatório (json para CI)
//   ignore        string[] — regexes de classes a ignorar nos diagnósticos
//   cacheDir      string — pasta da cache (por omissão .breeze-cache)
//   cache         boolean — false equivale a --no-cache
//   forceEngine   boolean — aceita motor abaixo da versão mínima
//   (aceita também os aliases pt: nome, incluir, excluir)
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const NOMES_FICHEIRO = ['breeze.config.js', 'breeze.config.cjs', 'breeze.config.json']
const SECCOES_TEMA = ['cores', 'espacamento', 'fontes']

// chaves de config → chaves internas das opcoes do CLI
const MAPA_ALIAS = {
  out: 'out',
  name: 'nome',
  nome: 'nome',
  split: 'split',
  minify: 'minify',
  reset: 'reset',
  smooth: 'smooth',
  inject: 'inject',
  include: 'incluir',
  incluir: 'incluir',
  exclude: 'excluir',
  excluir: 'excluir',
  prefix: 'prefix',
  safelist: 'safelist',
  plugins: 'plugins',
  engine: 'engine',
  allPluginCss: 'allPluginCss',
  runtime: 'runtime',
  jsOut: 'jsOut',
  tpl: 'tpl',
  templates: 'tpl',
  // diagnósticos e cache (novidade 1.1)
  strict: 'strict',
  report: 'report',
  ignore: 'ignorar',
  cacheDir: 'cacheDir',
  cache: 'cache',
  forceEngine: 'forcarEngine',
}

const BOLEANAS = new Set(['split', 'minify', 'reset', 'smooth', 'inject', 'allPluginCss', 'runtime', 'tpl', 'strict', 'forcarEngine', 'cache'])
const CHAVES_COMPONENTES = new Set(['componentes', 'components'])
const STRINGS = new Set(['out', 'nome', 'prefix', 'engine', 'jsOut', 'report', 'cacheDir'])
const LISTAS = new Set(['incluir', 'excluir', 'safelist', 'ignorar'])

function falha(msg) {
  throw new Error(msg)
}

/** Valida uma secção do tema (cores/espacamento/fontes: mapa nome→valor). */
function validarSecaoTema(secao, valores, onde) {
  if (!valores || typeof valores !== 'object' || Array.isArray(valores)) {
    falha(`tema.${secao} deve ser um objecto { nome: valor } em ${onde}`)
  }
  const limpo = {}
  for (const [nome, valor] of Object.entries(valores)) {
    if (!/^[A-Za-z0-9_-]+$/.test(String(nome))) {
      falha(`tema.${secao}: nome de variável inválido "${nome}" em ${onde}`)
    }
    limpo[String(nome)] = String(valor)
  }
  return limpo
}

/** Valida e normaliza o objecto tema do utilizador. */
function validarTema(tema, onde) {
  if (!tema || typeof tema !== 'object' || Array.isArray(tema)) {
    falha(`"tema" deve ser um objecto em ${onde}`)
  }
  const limpo = {}
  for (const [chave, valores] of Object.entries(tema)) {
    if (!SECCOES_TEMA.includes(chave)) {
      falha(
        `tema: secção desconhecida "${chave}" em ${onde} (aceites: ${SECCOES_TEMA.join(', ')})`,
      )
    }
    limpo[chave] = validarSecaoTema(chave, valores, onde)
  }
  return limpo
}

/** Valida o objecto componentes: { btn: ['no-underline', …], … }. */
function validarComponentes(comp, onde) {
  if (!comp || typeof comp !== 'object' || Array.isArray(comp)) {
    falha(`"componentes" deve ser um objecto { nome: [classes] } em ${onde}`)
  }
  const limpo = {}
  for (const [nome, lista] of Object.entries(comp)) {
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(String(nome))) {
      falha(`componentes: nome inválido "${nome}" em ${onde}`)
    }
    if (!Array.isArray(lista) || !lista.length || !lista.every((x) => typeof x === 'string' || typeof x === 'number')) {
      falha(`componentes.${nome} deve ser uma lista de classes em ${onde}`)
    }
    limpo[nome] = lista.map(String)
  }
  return Object.keys(limpo).length ? limpo : null
}

/** Recebe o valor de --tema: JSON completo ou pares secção.nome=valor. */
function parseTemaArg(texto) {
  const t = String(texto).trim()
  if (t.startsWith('{')) {
    let obj
    try {
      obj = JSON.parse(t)
    } catch (e) {
      falha('--tema: JSON inválido (' + e.message + ')')
    }
    return validarTema(obj, '--tema')
  }
  const m = /^(cores|espacamento|fontes)\.([A-Za-z0-9_-]+)=(.+)$/.exec(t)
  if (!m) {
    falha(
      '--tema: esperado JSON ou secção.nome=valor — ex.: --tema cores.primaria=#003',
    )
  }
  return { [m[1]]: { [m[2]]: m[3] } }
}

/** Junta dois temas; os valores de "b" ganham. */
function fundirTema(a, b) {
  const r = {}
  for (const sec of SECCOES_TEMA) {
    const ea = (a && a[sec]) || {}
    const eb = (b && b[sec]) || {}
    if (Object.keys(ea).length || Object.keys(eb).length) {
      r[sec] = { ...ea, ...eb }
    }
  }
  return Object.keys(r).length ? r : null
}

function comoLista(v, chave, onde) {
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number')) {
    return v.map(String)
  }
  falha(`"${chave}" deve ser uma lista de strings (ou string separada por vírgulas) em ${onde}`)
}

/**
 * Procura e carrega o ficheiro de config.
 * @returns {null | {caminho: string, valores: object, avisos: string[], tema: object|null}}
 */
function carregarConfig(raiz, explicito) {
  let caminho = null
  if (explicito) {
    caminho = path.resolve(raiz, explicito)
    if (!fs.existsSync(caminho)) {
      falha('ficheiro de config não encontrado (--config): ' + explicito)
    }
  } else {
    for (const nome of NOMES_FICHEIRO) {
      const c = path.join(raiz, nome)
      try {
        if (fs.statSync(c).isFile()) {
          caminho = c
          break
        }
      } catch (e) {
        /* continuar */
      }
    }
  }
  if (!caminho) return null

  let bruto
  try {
    // limpa a cache para o watch apanhar alterações ao ficheiro
    delete require.cache[require.resolve(caminho)]
    bruto = require(caminho)
  } catch (e) {
    if (e && e.code === 'ERR_REQUIRE_ESM') {
      falha(
        path.basename(caminho) +
          ' é um módulo ESM — renomeia para breeze.config.cjs ou usa module.exports',
      )
    }
    falha('falha ao carregar ' + path.basename(caminho) + ': ' + e.message)
  }
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    falha(path.basename(caminho) + ' deve exportar um objecto (module.exports = { … })')
  }
  const onde = path.basename(caminho)

  const valores = {}
  const avisos = []
  let tema = null
  let componentes = null

  for (const [chave, valor] of Object.entries(bruto)) {
    if (chave === 'tema') {
      tema = validarTema(valor, onde)
      continue
    }
    if (CHAVES_COMPONENTES.has(chave)) {
      componentes = validarComponentes(valor, onde)
      continue
    }
    if (chave === 'log') continue // aceite e ignorado (só faz sentido no browser)
    const alvo = MAPA_ALIAS[chave]
    if (!alvo) {
      avisos.push(`chave ignorada em ${onde}: "${chave}"`)
      continue
    }
    if (chave === 'plugins') {
      if (valor === 'all' || valor === 'todos') valores.plugins = null
      else if (valor === 'auto') valores.plugins = 'auto'
      else if (valor === false) valores.plugins = []
      else if (Array.isArray(valor)) {
        valores.plugins = valor.map(String)
      } else {
        falha(`"plugins" deve ser 'all', 'auto', false ou uma lista de nomes em ${onde}`)
      }
      continue
    }
    if (BOLEANAS.has(alvo)) {
      if (typeof valor !== 'boolean') falha(`"${chave}" deve ser true/false em ${onde}`)
      // cache: false equivale a --no-cache (opção interna semCache)
      valores[alvo === 'cache' ? 'semCache' : alvo] = alvo === 'cache' ? !valor : valor
      continue
    }
    if (alvo === 'report') {
      if (valor !== 'text' && valor !== 'json') {
        falha(`"report" deve ser 'text' ou 'json' em ${onde}`)
      }
      valores.report = valor
      continue
    }
    if (STRINGS.has(alvo)) {
      if (typeof valor !== 'string') falha(`"${chave}" deve ser uma string em ${onde}`)
      valores[alvo] = valor
      continue
    }
    if (LISTAS.has(alvo)) {
      valores[alvo] = comoLista(valor, chave, onde)
      continue
    }
  }

  return { caminho, valores, avisos, tema, componentes }
}

module.exports = {
  carregarConfig,
  parseTemaArg,
  fundirTema,
  validarTema,
  validarComponentes,
  SECCOES_TEMA,
  NOMES_FICHEIRO,
}
