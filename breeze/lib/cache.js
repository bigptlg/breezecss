'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/cache.js
//
// CACHE ENTRE BUILDS (incremental). O construir() volta a ler e compilar
// tudo em cada execução (500 páginas ≈ 6 s em CSS único, ≈ 10 s em --split).
// Esta cache guarda um manifest JSON em .breeze-cache/ com:
//
//   • IMPRESSÃO DIGITAL GLOBAL — sha256 de: versão do CLI, hash do motor,
//     prefix, reset, smooth, minify, split, plugins resolvidos, tema,
//     safelist efectiva, mapa de componentes e ficheiro de config.
//     Se mudar, INVALIDA TUDO.
//   • modo --split: chave por página = sha256(conteúdo normalizado +
//     fantasma de safelist + digital). A normalização (htmlscan) remove o
//     que o --inject acrescenta (link/script geridos, blocos js-guard,
//     comentários "bundle substituído") — sem isto a 2.ª execução falharia
//     sempre. Com a chave a coincidir e o CSS existente com o hash
//     registado, salta motor.build() e a escrita.
//   • modo CSS único: guarda as classes e as combinações de transform de
//     cada página; só reconstrói se a união/combinações ou a digital mudar.
//   • runtime JS: chave por assinatura de plugins + componentes + meta.
//
// Regras: manifest ausente/corrompido/de esquema antigo é ignorado e
// reconstruído — NUNCA faz o build falhar. Escritas atómicas (tmp + rename).
// A cache não pode alterar o resultado: só evita trabalho idêntico.
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Subir sempre que a LÓGICA de diagnóstico mudar: o manifest guarda os
// diagnósticos por página e repete-os em hits; sem isto uma cache antiga
// continuaria a mostrar diagnósticos errados depois de uma correcção.
// 2: correcção dos falsos positivos de print:/motion-*:/max-<bp>:
const ESQUEMA = 4 // 4: diagnóstico valor-perigoso
const NOME_MANIFEST = 'manifest.json'

function sha256(texto) {
  return crypto.createHash('sha256').update(String(texto), 'utf8').digest('hex')
}

function pastaCache(raiz, opcoes) {
  return path.resolve(raiz, (opcoes && opcoes.cacheDir) || '.breeze-cache')
}

/** Hash de um ficheiro existente; null se não existir/ilegível. */
function hashFicheiro(abs) {
  try {
    return sha256(fs.readFileSync(abs))
  } catch (e) {
    return null
  }
}

/**
 * Carrega o manifest; devolve null quando ausente, corrompido ou de outro
 * esquema — e nunca lança (a cache não pode derrubar um build).
 */
function carregar(dir) {
  try {
    const bruto = fs.readFileSync(path.join(dir, NOME_MANIFEST), 'utf8')
    const m = JSON.parse(bruto)
    if (!m || typeof m !== 'object' || m.esquema !== ESQUEMA) return null
    if (!m.paginas || typeof m.paginas !== 'object') return null
    return m
  } catch (e) {
    return null
  }
}

/** Escrita atómica: ficheiro temporário no mesmo volume + rename. */
function guardar(dir, manifest) {
  try {
    fs.mkdirSync(dir, { recursive: true })
    const tmp = path.join(dir, NOME_MANIFEST + '.tmp-' + process.pid)
    fs.writeFileSync(tmp, JSON.stringify(manifest))
    fs.renameSync(tmp, path.join(dir, NOME_MANIFEST))
    return true
  } catch (e) {
    // cache é optimizável: falha de escrita não derruba o build
    try {
      fs.rmSync(path.join(dir, NOME_MANIFEST + '.tmp-' + process.pid), { force: true })
    } catch (e2) {
      /* seguir */
    }
    return false
  }
}

function limpar(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
    return true
  } catch (e) {
    return false
  }
}

/**
 * JSON estável (chaves ordenadas) para as impressões digitais — a ordem
 * das chaves não pode mudar o hash entre execuções.
 */
function jsonEstavel(valor) {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor)
  if (Array.isArray(valor)) return '[' + valor.map(jsonEstavel).join(',') + ']'
  const chaves = Object.keys(valor).sort()
  return '{' + chaves.map((k) => JSON.stringify(k) + ':' + jsonEstavel(valor[k])).join(',') + '}'
}

/**
 * Impressão digital global do build — tudo o que, se mudar, invalida a
 * cache por inteiro. pluginsRegistar === null significa "todos".
 */
function impressaoDigital(dados) {
  const d = {
    cli: dados.cliVersao,
    motor: dados.hashMotor,
    prefix: dados.prefix || '',
    reset: !!dados.reset,
    smooth: !!dados.smooth,
    minify: !!dados.minify,
    split: !!dados.split,
    plugins: dados.plugins === null || dados.plugins === undefined ? 'all' : dados.plugins,
    tema: dados.tema || null,
    safelist: [...(dados.safelist || [])],
    componentes: dados.componentes instanceof Map ? Object.fromEntries(dados.componentes) : (dados.componentes || {}),
    config: dados.configCaminho ? dados.configCaminho + '\u0000' + (dados.configConteudo || '') : '',
  }
  return sha256(jsonEstavel(d))
}

/** Chave de uma página: sha256(conteúdo normalizado da página + fantasma de
 * safelist + impressão digital). O CLI passa o hash do conteúdo normalizado
 * (normHash) — insensível a tudo o que o --inject acrescenta. */
function chavePagina(assinaturaNormHash, fantasma, digital) {
  return sha256(assinaturaNormHash + '\u0000' + (fantasma || '') + '\u0000' + digital)
}

/** Chave do CSS único: união de classes + combinações + digital. */
function chaveCssUnico(uniaoClasses, combos, digital) {
  return sha256(jsonEstavel({ classes: uniaoClasses, combos, digital }))
}

/** Chave de um ficheiro de runtime: meta slim (sem o fonte dos plugins). */
function chaveRuntime(meta) {
  return sha256(jsonEstavel(meta))
}

/**
 * Assinatura das combinações de transform de uma página, na ordem do
 * documento (o CSS combinado depende da ordem de descoberta).
 * @param {string} html
 * @param {object} cfg config interna do motor
 * @returns {string[]} uma entrada por elemento com transforms, ex.:
 *                     "hover:translate-x[3px] hover:translate-y[-3px]"
 */
function combosTransformDe(html, cfg) {
  const cssgen = require('./cssgen')
  const combos = []
  for (const el of require('./htmlscan').parseHTML(html)) {
    if (!el || !el.classList) continue
    const dados = [...el.classList]
      .map((t) => cssgen.analisarTransform(t, cfg))
      .filter(Boolean)
    if (dados.length) combos.push(dados.map((a) => a.token).sort().join(' '))
  }
  return combos
}

/** Remove do manifest as entradas de páginas apagadas. */
function limparPaginasApagadas(manifest, relsActuais) {
  const actuais = new Set(relsActuais)
  let removidas = []
  for (const rel of Object.keys(manifest.paginas || {})) {
    if (!actuais.has(rel)) {
      removidas.push({ rel, entrada: manifest.paginas[rel] })
      delete manifest.paginas[rel]
    }
  }
  return removidas
}

module.exports = {
  ESQUEMA,
  NOME_MANIFEST,
  sha256,
  pastaCache,
  hashFicheiro,
  carregar,
  guardar,
  limpar,
  jsonEstavel,
  impressaoDigital,
  chavePagina,
  chaveCssUnico,
  chaveRuntime,
  combosTransformDe,
  limparPaginasApagadas,
}
