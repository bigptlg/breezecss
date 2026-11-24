'use strict'
// Helper: corre o CLI num projecto temporário e devolve o resultado.
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CLI = path.join(__dirname, '..', '..', 'bin', 'breeze.js')

function executar(args, { cwd, stdio = 'pipe' } = {}) {
  try {
    const saida = execFileSync('node', [CLI, ...args], { cwd, encoding: 'utf8', stdio })
    return { ok: true, saida }
  } catch (e) {
    return { ok: false, saida: (e.stdout || '') + (e.stderr || ''), erro: e }
  }
}

function projetoTemporario(ficheiros, prefixo = 'breeze-test-') {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), prefixo))
  for (const [rel, conteudo] of Object.entries(ficheiros)) {
    const abs = path.join(dir, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, conteudo)
  }
  return dir
}

function limpar(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (e) {
    /* seguir */
  }
}

const MOTOR = path.join(__dirname, '..', '..', 'vendor', 'breeze.bundle.js')

module.exports = { executar, projetoTemporario, limpar, CLI, MOTOR }
