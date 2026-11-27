'use strict'
// Testes da coerência de versões (ponto 1):
//   • vendor/ e o bundle da raiz têm a MESMA versão no cabeçalho;
//   • scripts/sync-engine.js corre sem erros e mantém essa igualdade;
//   • a versão do CLI tem UMA fonte (package.json): --help, --version e o
//     cabeçalho do CSS gerado leem dela, e o README está sincronizado;
//   • --engine com motor abaixo da mínima suportada → erro (a não ser com
//     --force-engine);
//   • --inject avisa quando a página refere um bundle de outra versão.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const { executar, projetoTemporario, limpar, MOTOR, CLI } = require('./helpers/exec')

const RAIZ_REPO = path.join(__dirname, '..', '..')
const BUNDLE_RAIZ = path.join(RAIZ_REPO, 'breeze.bundle.js')
const BUNDLE_VENDOR = path.join(__dirname, '..', 'vendor', 'breeze.bundle.js')
const SYNC_ENGINE = path.join(__dirname, '..', 'scripts', 'sync-engine.js')
const FALSO_ANTIGO = path.join(__dirname, 'fixtures', 'motor-falso-2.2.5.js')

function versaoDe(caminho) {
  const m = /BreezeCSS\s+(\d+\.\d+\.\d+)/.exec(fs.readFileSync(caminho, 'utf8').slice(0, 4000))
  return m ? m[1] : null
}

test('vendor/ e o bundle da raiz têm a mesma versão', () => {
  assert.ok(fs.existsSync(BUNDLE_RAIZ), 'bundle da raiz existe (' + BUNDLE_RAIZ + ')')
  const vRaiz = versaoDe(BUNDLE_RAIZ)
  const vVendor = versaoDe(BUNDLE_VENDOR)
  assert.ok(vRaiz, 'cabeçalho da raiz declara "BreezeCSS x.y.z"')
  assert.ok(vVendor, 'cabeçalho do vendor declara "BreezeCSS x.y.z"')
  assert.strictEqual(vVendor, vRaiz, 'vendor e raiz têm a mesma versão do motor')
})

test('scripts/sync-engine.js copia o motor e sai com 0', () => {
  if (!fs.existsSync(BUNDLE_RAIZ)) return // pacote publicado sem a raiz
  const res = executar([SYNC_ENGINE], { cwd: path.join(__dirname, '..') })
  // executar() corre o binário do CLI — aqui queremos o node directamente
  const { execFileSync } = require('child_process')
  let ok = true
  try {
    execFileSync('node', [SYNC_ENGINE], { cwd: path.join(__dirname, '..'), encoding: 'utf8' })
  } catch (e) {
    ok = false
  }
  assert.ok(ok, 'sync-engine corre sem erro')
  assert.strictEqual(versaoDe(BUNDLE_VENDOR), versaoDe(BUNDLE_RAIZ), 'versões iguais depois do sync')
})

test('a versão do CLI vem do package.json (--version, --help e README)', () => {
  const versao = require('../package.json').version
  const rVersao = executar(['--version'], { cwd: projetoTemporario({ 'a.html': '<p class="p[1px]">x</p>' }) })
  assert.ok(rVersao.ok, '--version corre')
  assert.ok(rVersao.saida.includes('breeze v' + versao), '--version mostra a versão do package.json')

  const rAjuda = executar(['--help'], { cwd: process.cwd() })
  assert.ok(rAjuda.ok && rAjuda.saida.includes('breeze v' + versao), '--help mostra a versão do package.json')

  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8')
  assert.ok(
    readme.includes('# breeze — BreezeCLI ' + versao),
    'README do CLI sincronizado com package.json (cabeçalho)',
  )
})

test('o cabeçalho do CSS gerado mostra a versão do CLI e a do motor', () => {
  const dir = projetoTemporario({ 'a.html': '<p class="p[4px] hover:bg[red]">x</p>' })
  try {
    const res = executar(['--engine', MOTOR], { cwd: dir })
    assert.ok(res.ok, 'build correu: ' + res.saida)
    const css = fs.readFileSync(path.join(dir, 'css/breeze.css'), 'utf8')
    assert.ok(css.includes('breeze CLI v' + require('../package.json').version), 'cabeçalho com a versão do CLI')
    assert.ok(css.includes('motor BreezeCSS ' + versaoDe(MOTOR)), 'cabeçalho com a versão do motor')
  } finally {
    limpar(dir)
  }
})

test('motor abaixo da versão mínima → erro; --force-engine passa a verificação', () => {
  const dir = projetoTemporario({ 'a.html': '<p class="p[4px]">x</p>' })
  try {
    const res = executar(['--engine', FALSO_ANTIGO], { cwd: dir })
    assert.ok(!res.ok, 'sem --force-engine o build falha')
    assert.ok(res.saida.includes('versão mínima suportada'), 'mensagem de erro da política de versões')
    assert.ok(res.saida.includes('2.2.5'), 'indica a versão do motor antigo')

    const res2 = executar(['--engine', FALSO_ANTIGO, '--force-engine'], { cwd: dir })
    assert.ok(!res2.ok, 'o motor falso não é executável (sem BreezeCSS.build)')
    assert.ok(!res2.saida.includes('versão mínima suportada'), '--force-engine passou a verificação de versão')
  } finally {
    limpar(dir)
  }
})

test('--inject avisa quando a página refere um bundle de outra versão', () => {
  const dir = projetoTemporario({
    'a.html':
      '<!doctype html><html><head><title>t</title>' +
      '<script src="velho/breeze.bundle.js"></script></head>' +
      '<body class="p[4px] glass">x</body></html>\n',
    'velho/breeze.bundle.js': fs.readFileSync(FALSO_ANTIGO, 'utf8'),
  })
  try {
    const res = executar(['--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(res.ok, 'build correu: ' + res.saida)
    assert.ok(
      res.saida.includes('refere "velho/breeze.bundle.js" (motor 2.2.5) mas o build usa'),
      'aviso de versão por página',
    )
  } finally {
    limpar(dir)
  }
})

test('sync-engine.js: o vendor segue a versão do bundle da raiz', () => {
  const { execFileSync } = require('child_process')
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sync-test-'))
  try {
    // estrutura igual à do repo: <tmp>/breeze/{scripts,vendor}, bundle na raiz <tmp>/
    const pacote = path.join(tmp, 'breeze')
    fs.mkdirSync(path.join(pacote, 'vendor'), { recursive: true })
    fs.mkdirSync(path.join(pacote, 'scripts'), { recursive: true })
    fs.copyFileSync(SYNC_ENGINE, path.join(pacote, 'scripts', 'sync-engine.js'))
    // vendor "desactualizado" (cabeçalho adulterado) e raiz com 9.9.9
    fs.writeFileSync(
      path.join(pacote, 'vendor', 'breeze.bundle.js'),
      fs.readFileSync(BUNDLE_RAIZ, 'utf8').replace(/BreezeCSS \d+\.\d+\.\d+/, 'BreezeCSS 2.2.5'),
    )
    fs.writeFileSync(
      path.join(tmp, 'breeze.bundle.js'),
      fs.readFileSync(BUNDLE_RAIZ, 'utf8').replace(/BreezeCSS \d+\.\d+\.\d+/, 'BreezeCSS 9.9.9'),
    )
    fs.writeFileSync(path.join(pacote, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }))
    const saida = execFileSync('node', [path.join(pacote, 'scripts', 'sync-engine.js')], {
      cwd: pacote,
      encoding: 'utf8',
    })
    assert.strictEqual(versaoDe(path.join(pacote, 'vendor', 'breeze.bundle.js')), '9.9.9',
      'vendor ficou com a versão da raiz depois do sync')
    assert.ok(saida.includes('motor 9.9.9 copiado da raiz para vendor'), 'mensagem de sync')
  } finally {
    limpar(tmp)
  }
})

test('sync-engine.js --check verifica sem escrever nada', () => {
  if (!fs.existsSync(BUNDLE_RAIZ)) return
  const { execFileSync } = require('child_process')
  const antes = fs.statSync(BUNDLE_VENDOR).mtimeMs
  const saida = execFileSync('node', [SYNC_ENGINE, '--check'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' })
  assert.match(saida, /OK/)
  assert.strictEqual(fs.statSync(BUNDLE_VENDOR).mtimeMs, antes, '--check não pode escrever no vendor/')
})
