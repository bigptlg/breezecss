#!/usr/bin/env node
'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · scripts/sync-engine.js
//
// Sincroniza o MOTOR e a VERSÃO do CLI entre os vários sítios onde aparecem:
//
//   1. Copia o bundle da RAIZ do repositório (breeze.bundle.js) para
//      breeze/vendor/breeze.bundle.js — o motor vendorizado é o que o CLI
//      usa quando o projecto não tem bundle próprio.
//   2. Falha (exit 1) se as versões lidas dos cabeçalhos ("BreezeCSS x.y.z")
//      divergirem depois da cópia — protege contra cópias parcialmente
//      escritas ou ficheiros trocados a meio.
//   3. Sincroniza a versão do CLI nos README (única fonte: package.json) —
//      o cabeçalho "# breeze — BreezeCLI x.y.z" do README do CLI e as
//      menções "BreezeCLI x.y.z" do README da raiz passam a ler da versão
//      do pacote.
//
// Uso:  node scripts/sync-engine.js        (a partir de qualquer pasta)
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const RAIZ_REPO = path.resolve(__dirname, '..', '..') // repo (pai do pacote breeze/)
const PACOTE = path.resolve(__dirname, '..') // pasta breeze/

const ARGS = process.argv.slice(2)
const MODO_CHECK = ARGS.includes('--check') // só verifica; não copia nem escreve nada
const ARG_FONTE = ARGS.find((a) => !a.startsWith('--'))
const FONTE = ARG_FONTE ? path.resolve(ARG_FONTE) : path.join(RAIZ_REPO, 'breeze.bundle.js')
const VENDOR = path.join(PACOTE, 'vendor', 'breeze.bundle.js')
const README_CLI = path.join(PACOTE, 'README.md')
const README_RAIZ = path.join(RAIZ_REPO, 'README.md')

function versaoDe(caminho) {
  let fonte
  try {
    fonte = fs.readFileSync(caminho, 'utf8')
  } catch (e) {
    return null
  }
  const m = /BreezeCSS\s+(\d+\.\d+\.\d+)/.exec(fonte.slice(0, 4000))
  return m ? m[1] : null
}

function falhar(msg) {
  console.error('sync-engine: ' + msg)
  process.exit(1)
}

// 1) versões dos cabeçalhos
const versaoFonte = versaoDe(FONTE)
if (!versaoFonte) {
  falhar('o bundle da raiz não declara a versão no cabeçalho ("BreezeCSS x.y.z"): ' + FONTE)
}

// 1b) --check: compara versões e conteúdo sem alterar ficheiros
if (MODO_CHECK) {
  const versaoV = versaoDe(VENDOR)
  if (versaoV !== versaoFonte) {
    falhar('vendor/ está na versão ' + (versaoV || '(sem versão)') + ' e a raiz na ' + versaoFonte + ' — corre `node scripts/sync-engine.js`')
  }
  if (!fs.readFileSync(FONTE).equals(fs.readFileSync(VENDOR))) {
    falhar('vendor/ tem a mesma versão (' + versaoV + ') mas conteúdo diferente da raiz — corre `node scripts/sync-engine.js`')
  }
  console.log('sync-engine: OK — motor ' + versaoFonte + ' idêntico em raiz e vendor/')
  process.exit(0)
}

// 2) copiar raiz → vendor (o vendor é sempre cópia da raiz)
fs.mkdirSync(path.dirname(VENDOR), { recursive: true })
fs.copyFileSync(FONTE, VENDOR)

// 3) validação: as versões dos DOIS ficheiros têm de coincidir
const versaoVendor = versaoDe(VENDOR)
if (!versaoVendor || versaoVendor !== versaoFonte) {
  falhar(
    'versões divergentes depois da cópia — raiz ' + versaoFonte +
    ' ≠ vendor ' + (versaoVendor || '(sem versão)') + '. Ficheiro trocado a meio?',
  )
}

// 4) sincronizar a versão do CLI nos README (fonte única: package.json)
const versaoCli = require(path.join(PACOTE, 'package.json')).version
let readmeMudou = false

function sincronizar(caminho, padrao, descricao) {
  let texto
  try {
    texto = fs.readFileSync(caminho, 'utf8')
  } catch (e) {
    return // README ausente (pacote publicado) → nada a fazer
  }
  const novo = texto.replace(padrao, (m) => m.replace(/(\d+\.\d+\.\d+)$/, versaoCli))
  if (novo !== texto) {
    fs.writeFileSync(caminho, novo)
    readmeMudou = true
    console.log('sync-engine: ' + descricao + ' → BreezeCLI ' + versaoCli)
  }
}

// README do CLI: cabeçalho "# breeze — BreezeCLI 1.2.3" (e menções soltas)
sincronizar(README_CLI, /(# breeze — BreezeCLI )(\d+\.\d+\.\d+)/g, 'breeze/README.md')
// README da raiz: menções "(BreezeCLI 1.2.3)"
sincronizar(README_RAIZ, /(BreezeCLI )(\d+\.\d+\.\d+)/g, 'README.md da raiz')

console.log('sync-engine: motor ' + versaoFonte + ' copiado da raiz para vendor/ (idêntico)')
console.log('sync-engine: versão do CLI ' + versaoCli + ' (fonte única: breeze/package.json)')
if (!readmeMudou) console.log('sync-engine: READMEs já estavam sincronizados')
