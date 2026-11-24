'use strict'
// Testes do --watch: rebuild automático quando os HTML mudam.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const { projetoTemporario, limpar, MOTOR, CLI } = require('./helpers/exec')

test('--watch reconstrói ao guardar o HTML', async () => {
  const dir = projetoTemporario({
    'index.html': '<!doctype html><html><body class="flex p[10px]">v1</body></html>',
  })
  const filho = spawn('node', [CLI, '--split', '--watch', '--engine', MOTOR], { cwd: dir })
  let saida = ''
  filho.stdout.on('data', (d) => {
    saida += d
  })
  filho.stderr.on('data', (d) => {
    saida += d
  })
  try {
    // 1.º build inicial
    await new Promise((resolve) => {
      const t = setInterval(() => {
        if (fs.existsSync(path.join(dir, 'css/index.css'))) {
          clearInterval(t)
          resolve()
        }
      }, 50)
      setTimeout(resolve, 4000)
    })
    assert.ok(fs.existsSync(path.join(dir, 'css/index.css')), 'build inicial')
    const antes = fs.readFileSync(path.join(dir, 'css/index.css'), 'utf8')
    assert.ok(!antes.includes('background-color: red'))

    // esperar o watcher estar instalado (mensagem pós-install + folga)
    for (let i = 0; i < 20 && !saida.includes('a vigiar alterações'); i++) {
      await new Promise((r) => setTimeout(r, 100))
    }
    await new Promise((r) => setTimeout(r, 400))

    // alteração no HTML → rebuild
    fs.writeFileSync(
      path.join(dir, 'index.html'),
      '<!doctype html><html><body class="flex bg[red] p[10px]">v2</body></html>',
    )
    let reconstruido = false
    for (let i = 0; i < 30 && !reconstruido; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const css = fs.readFileSync(path.join(dir, 'css/index.css'), 'utf8')
      if (css.includes('background-color: red')) reconstruido = true
    }
    assert.ok(reconstruido, 'watch reconstruiu com a nova classe')
    assert.ok(saida.includes('alteração'), 'mensagem de alteração')
  } finally {
    filho.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 200))
    limpar(dir)
  }
})
