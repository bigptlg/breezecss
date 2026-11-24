'use strict'
// Testes do --inject: CSS + JS, idempotência, caminhos relativos, substituição
// do bundle original e preservação dos scripts do utilizador.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const { executar, projetoTemporario, limpar, MOTOR } = require('./helpers/exec')

function ler(dir, rel) {
  return fs.readFileSync(path.join(dir, rel), 'utf8')
}

const PAGINA = `<!doctype html><html><head><title>t</title>
<script src="vendor/breeze.bundle.js"></script>
<script>meuInit()</script>
</head>
<body class="progress"><main class="glass">x</main>
<script src="js/app.js"></script>
</body></html>`

test('inject: <link> + <script data-breeze-cli="runtime"> inseridos', () => {
  const dir = projetoTemporario({ 'index.html': PAGINA })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const html = ler(dir, 'index.html')
    assert.ok(html.includes('<link rel="stylesheet" href="css/index.css" data-breeze-cli="css">'), 'link do CSS')
    assert.ok(/<script src="js\/index\.runtime\.js"[^>]*data-breeze-cli="runtime">/.test(html), 'script do runtime')
    assert.ok(html.includes('<!-- breeze:css -->'), 'marcador css')
    assert.ok(html.includes('<!-- breeze:runtime -->'), 'marcador runtime')
    // bundle original substituído (1ª referência), resto intacto
    assert.ok(!html.includes('src="vendor/breeze.bundle.js"'), 'bundle original removido')
    assert.ok(html.includes('meuInit()'), 'script do utilizador PRESERVADO')
    assert.ok(html.includes('src="js/app.js"'), 'script do utilizador 2 PRESERVADO')
    // substituição no lugar do bundle (sync, antes do meuInit)
    const posBundle = html.indexOf('data-breeze-cli="runtime"')
    const posInit = html.indexOf('meuInit()')
    assert.ok(posBundle !== -1 && posBundle < posInit, 'runtime ANTES dos scripts que usam BreezeCSS')
    assert.ok(!/data-breeze-cli="runtime"[^>]*>/.test(html.match(/<script src="js\/index\.runtime\.js"[^>]*>/)[0]) ||
      !html.match(/<script src="js\/index\.runtime\.js"[^>]*>/)[0].includes('defer'),
      'sem defer quando substitui o bundle (semântica sync preservada)')
  } finally {
    limpar(dir)
  }
})

test('inject: 2ª execução não duplica e mantém a semântica defer/sync', () => {
  const dir = projetoTemporario({ 'index.html': PAGINA })
  try {
    executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    const primeira = ler(dir, 'index.html')
    const r2 = executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r2.ok, r2.saida)
    const segunda = ler(dir, 'index.html')
    assert.strictEqual(segunda, primeira, 're-execução é idempotente (byte a byte)')
    assert.strictEqual((segunda.match(/breeze:css/g) || []).length, 1, '1 marcador css')
    assert.strictEqual((segunda.match(/breeze:runtime/g) || []).length, 1, '1 marcador runtime')
    assert.strictEqual((segunda.match(/data-breeze-cli="css"/g) || []).length, 1, '1 link')
    assert.strictEqual((segunda.match(/data-breeze-cli="runtime"/g) || []).length, 1, '1 script')
  } finally {
    limpar(dir)
  }
})

test('inject: caminhos actualizados quando a pasta de saída muda', () => {
  const dir = projetoTemporario({ 'index.html': PAGINA })
  try {
    executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    const r = executar(['--split', '--plugins', 'auto', '--inject', '-o', 'dist/css', '--js-out', 'dist/js', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const html = ler(dir, 'index.html')
    assert.ok(html.includes('href="dist/css/index.css"'), 'novo caminho do CSS')
    assert.ok(html.includes('src="dist/js/index.runtime.js"'), 'novo caminho do JS')
    assert.ok(!html.includes('href="css/index.css"'), 'caminho antigo removido')
  } finally {
    limpar(dir)
  }
})

test('inject: subpastas recebem caminhos relativos correctos', () => {
  const dir = projetoTemporario({
    'index.html': PAGINA,
    'blog/post.html': PAGINA,
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const raiz = ler(dir, 'index.html')
    const sub = ler(dir, 'blog/post.html')
    assert.ok(raiz.includes('href="css/index.css"'), 'raiz: caminho directo')
    assert.ok(sub.includes('href="../css/blog_post.css"'), 'subpasta: ../css/blog_post.css')
    const mSrc = /src="(\.\.\/js\/[\w.]+\.runtime\.js)"/.exec(sub)
    assert.ok(mSrc, 'subpasta: src=../js/*.runtime.js relativo')
  } finally {
    limpar(dir)
  }
})

test('inject: BreezeCSS.init() inline continua a funcionar (runtime antes do init)', () => {
  const dir = projetoTemporario({
    'spa.html': `<!doctype html><html><head><title>s</title></head>
<body class="p[20px]">
<script>
  BreezeCSS.init({ plugins: [BreezeGlass, BreezeProgress], log: false, tema: { cores: { primaria: '#003' } } })
</script>
<div class="glass">x</div>
</body></html>`,
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const html = ler(dir, 'spa.html')
    const posRuntime = html.indexOf('data-breeze-cli="runtime"')
    const posInit = html.indexOf('BreezeCSS.init(')
    assert.ok(posRuntime !== -1 && posRuntime < posInit, 'runtime inserido ANTES do init inline')
    assert.ok(!html.match(/<script src="js\/spa\.runtime\.js"[^>]*>/)[0].includes('defer'), 'sem defer (sync)')
    // init declara glass+progress → ambos no runtime
    const js = ler(dir, 'js/spa.runtime.js')
    assert.ok(js.includes('global.BreezeGlass = plugin'), 'glass do init no runtime')
    assert.ok(js.includes('global.BreezeProgress = plugin'), 'progress do init no runtime')
  } finally {
    limpar(dir)
  }
})

test('inject: página que deixou de precisar de runtime perde o <script>', () => {
  const dir = projetoTemporario({ 'index.html': PAGINA })
  try {
    executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(ler(dir, 'index.html').includes('data-breeze-cli="runtime"'))
    // remover as classes dinâmicas → sem runtime → script gerido removido
    const sem = PAGINA.replace('class="progress"', 'class="p[10px]"')
    fs.writeFileSync(path.join(dir, 'index.html'), sem)
    const r = executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const html = ler(dir, 'index.html')
    assert.ok(!html.includes('data-breeze-cli="runtime"'), 'script stale removido')
    assert.ok(html.includes('data-breeze-cli="css"'), 'CSS mantido')
  } finally {
    limpar(dir)
  }
})

test('inject: referências breeze--*.js (plugins soltos) também são substituídas', () => {
  const dir = projetoTemporario({
    'index.html': `<!doctype html><html><head><title>t</title>
<script src="breeze--glass.js"></script>
<script src="breeze--progress.js"></script>
<script src="breeze.min.js"></script>
</head><body class="glass progress">x</body></html>`,
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const html = ler(dir, 'index.html')
    assert.ok(!html.includes('src="breeze--glass.js"'), 'plugin solto substituído')
    assert.ok(!html.includes('src="breeze.min.js"'), 'bundle min substituído')
    assert.ok((html.match(/breeze:cli — "breeze--progress\.js"/g) || []).length === 1, '2ª referência comentada')
    assert.ok((html.match(/data-breeze-cli="runtime"/g) || []).length === 1, 'um só runtime')
  } finally {
    limpar(dir)
  }
})

test('inject: se runtime não carregar, chamadas BreezeCSS não bloqueiam scripts de terceiros', () => {
  const vm = require('node:vm')
  const dir = projetoTemporario({
    'index.html': `<!doctype html><html><head><title>t</title></head><body class="bg[primaria]">
<script src="breeze.bundle.js"></script>
<script>
BreezeCSS.init({ tema: { cores: { primaria: '#003', secundaria: '#005', tercearia: '#fff' } } });
BreezeCSS.addComponent('btn', ['text[tercearia]']);
Emerge.init();
window.funcionou = true;
</script></body></html>`,
  })
  try {
    const args = ['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR]
    const r = executar(args, { cwd: dir })
    assert.ok(r.ok, r.saida)
    const html = ler(dir, 'index.html')
    assert.ok(!html.includes('src="breeze.bundle.js"'), 'bundle original substituído/removido')
    assert.match(html, /if \(typeof BreezeCSS !== 'undefined'\)/)
    const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1]).filter((s) => s.includes('Emerge.init()'))
    assert.equal(inline.length, 1)
    const ctx = { Emerge: { init: () => { ctx.executou = true } }, window: {} }
    vm.runInNewContext(inline[0], ctx)
    assert.equal(ctx.executou, true, 'Emerge.init executa mesmo sem BreezeCSS')
    assert.equal(ctx.window.funcionou, true, 'restante JavaScript continua')
    const css = ler(dir, 'css/index.css')
    assert.match(css, /--breeze-tercearia:\s*#fff/)
    const segunda = executar(args, { cwd: dir })
    assert.ok(segunda.ok, segunda.saida)
    assert.equal(ler(dir, 'index.html'), html, 'injeção repetida é idempotente')
  } finally {
    limpar(dir)
  }
})
