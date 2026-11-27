#!/usr/bin/env node
'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · scripts/bench.js
//
// Benchmark da cache incremental. Gera 500 páginas sintéticas (200
// elementos cada, com hover:, md: e valores arbitrários) e mede:
//
//   1. build a frio (--split)
//   2. build a quente sem alterações (--split)
//   3. build a quente com 1 página alterada (--split)
//   4. build a frio (CSS único)
//   5. build a quente sem alterações (CSS único)
//   6. build a quente com 1 página alterada (CSS único)
//
// Objectivo: build a quente com 1 página alterada < 10% do tempo a frio
// (em --split). No modo CSS único o objectivo aplica-se ao caso "sem
// alterações"; com 1 página alterada o CSS único é reconstruído por
// definição (a união de classes pode mudar) — ver README.
//
// Uso: node scripts/bench.js [nPaginas]
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const CLI = path.join(__dirname, '..', 'bin', 'breeze.js')
const MOTOR = path.join(__dirname, '..', 'vendor', 'breeze.bundle.js')

const N_PAGINAS = parseInt(process.argv[2], 10) || 500
const N_ELEMENTOS = 200

// paleta de valores arbitrários (determinística, com variância entre páginas)
function cor(i) {
  const hex = (i * 2654435761) % 0xffffff
  return '#' + hex.toString(16).padStart(6, '0')
}
function espacamento(i) {
  return (i % 64) * 2 + 'px'
}

/** Gera uma página sintética: 200 elementos com hover:, md: e valores arbitrários. */
function gerarPagina(idx) {
  const partes = [
    '<!doctype html>',
    '<html><head><title>página ' + idx + '</title></head>',
    '<body class="flex p[' + espacamento(idx) + '] bg[' + cor(idx) + '] md:p[' + espacamento(idx + 7) + ']">',
  ]
  for (let e = 0; e < N_ELEMENTOS; e++) {
    const k = idx * N_ELEMENTOS + e
    const cls = [
      'rounded[' + (e % 20) + 'px]',
      'mt[' + espacamento(e + idx % 13) + ']',
      'hover:bg[' + cor(k) + ']',
      'md:mt[' + espacamento(e) + ']',
      e % 3 === 0 ? 'hover:rotate[' + (k % 45) + 'deg]' : '',
      e % 5 === 0 ? 'opacity[0.' + (k % 9) + ']' : '',
      e % 7 === 0 ? 'dark:text[' + cor(k * 3) + ']' : '',
      e % 11 === 0 ? 'focus:scale[1.' + (k % 5) + ']' : '',
    ].filter(Boolean)
    partes.push('  <div class="' + cls.join(' ') + '">el ' + e + '</div>')
  }
  partes.push('</body></html>')
  return partes.join('\n')
}

function criarProjecto(dir, n) {
  fs.mkdirSync(dir, { recursive: true })
  for (let i = 1; i <= n; i++) {
    fs.writeFileSync(path.join(dir, 'pag' + i + '.html'), gerarPagina(i))
  }
}

function correr(dir, args) {
  const t0 = process.hrtime.bigint()
  const res = execFileSync('node', [CLI, ...args, '--engine', MOTOR], { cwd: dir, encoding: 'utf8' })
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  const linha = /cache: (\d+) hits \/ (\d+) misses/.exec(res)
  return {
    ms: Math.round(ms),
    hits: linha ? +linha[1] : null,
    misses: linha ? +linha[2] : null,
  }
}

function apagarCache(dir) {
  fs.rmSync(path.join(dir, '.breeze-cache'), { recursive: true, force: true })
}

function formato(ms) {
  return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms + ' ms'
}

// ── setup ────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'breeze-bench-'))
const dirSplit = path.join(tmp, 'split')
const dirUnico = path.join(tmp, 'unico')
console.log('breeze bench — a gerar ' + N_PAGINAS + ' páginas × ' + N_ELEMENTOS + ' elementos…')
criarProjecto(dirSplit, N_PAGINAS)
criarProjecto(dirUnico, N_PAGINAS)

const resultado = {}

try {
  // ── modo --split ──────────────────────────────────────────────────────
  apagarCache(dirSplit)
  resultado.frioSplit = correr(dirSplit, ['--split'])
  resultado.quenteSplit = correr(dirSplit, ['--split'])

  // alterar UMA página (classes novas)
  fs.writeFileSync(
    path.join(dirSplit, 'pag7.html'),
    gerarPagina(7).replace('</body>', '<span class="gap[33px] shadow[0 0 4px] hover:skew-x[12deg]"></span></body>'),
  )
  resultado.quente1Split = correr(dirSplit, ['--split'])

  // ── modo CSS único ───────────────────────────────────────────────────
  apagarCache(dirUnico)
  resultado.frioUnico = correr(dirUnico, [])
  resultado.quenteUnico = correr(dirUnico, [])
  fs.writeFileSync(
    path.join(dirUnico, 'pag7.html'),
    gerarPagina(7).replace('</body>', '<span class="gap[33px] shadow[0 0 4px] hover:skew-x[12deg]"></span></body>'),
  )
  resultado.quente1Unico = correr(dirUnico, [])

  // ── relatório ────────────────────────────────────────────────────────
  console.log('')
  console.log('── --split (500 páginas) ' + '─'.repeat(38))
  console.log(
    '  frio (cache vazia)            : ' +
      formato(resultado.frioSplit.ms) +
      '  (' + resultado.frioSplit.misses + ' misses)',
  )
  console.log(
    '  quente (sem alterações)       : ' +
      formato(resultado.quenteSplit.ms) +
      '  (' + resultado.quenteSplit.hits + ' hits / ' + resultado.quenteSplit.misses + ' misses)',
  )
  console.log(
    '  quente (1 página alterada)    : ' +
      formato(resultado.quente1Split.ms) +
      '  (' + resultado.quente1Split.hits + ' hits / ' + resultado.quente1Split.misses + ' misses)',
  )
  const razao = (resultado.quente1Split.ms / resultado.frioSplit.ms) * 100
  console.log(
    '  → quente(1 pág.) = ' +
      razao.toFixed(1) +
      '% do frio  ' +
      (razao < 10 ? '✓ objectivo (< 10%)' : '✗ acima do objectivo (< 10%)'),
  )
  console.log('')
  console.log('── CSS único (500 páginas) ' + '─'.repeat(38))
  console.log(
    '  frio (cache vazia)            : ' +
      formato(resultado.frioUnico.ms) +
      '  (' + resultado.frioUnico.misses + ' misses)',
  )
  console.log(
    '  quente (sem alterações)       : ' +
      formato(resultado.quenteUnico.ms) +
      '  (' + resultado.quenteUnico.hits + ' hits / ' + resultado.quenteUnico.misses + ' misses)',
  )
  console.log(
    '  quente (1 página alterada)    : ' +
      formato(resultado.quente1Unico.ms) +
      '  (' + resultado.quente1Unico.hits + ' hits / ' + resultado.quente1Unico.misses + ' misses)',
  )
  const razaoQ = (resultado.quenteUnico.ms / resultado.frioUnico.ms) * 100
  console.log(
    '  → quente(sem alter.) = ' +
      razaoQ.toFixed(1) +
      '% do frio  ' +
      (razaoQ < 10 ? '✓ objectivo (< 10%)' : '✗ acima do objectivo (< 10%)'),
  )
  console.log('')

  // sair com erro se o objectivo principal não for atingido? Não — apenas
  // reporta (o README explica os limites do modo CSS único).
  process.exitCode = 0
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
