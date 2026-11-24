'use strict'
// Testes de compilação CSS: split, plugins (all/auto/lista), componentes com
// dependências de plugins, CSS estático do scrollbar, temas e prefixos.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const { executar, projetoTemporario, limpar, MOTOR } = require('./helpers/exec')

const HTML_BASE = (classe) => `<!doctype html><html><head><title>t</title></head><body class="${classe}"><main>x</main></body></html>`

function ler(dir, rel) {
  return fs.readFileSync(path.join(dir, rel), 'utf8')
}

test('compilação base: classes fixas, arbitrárias e transform combinado', () => {
  const dir = projetoTemporario({
    'index.html': HTML_BASE(
      'flex p[16px] rotate[45deg] scale[1.2] hover:bg[red] md:w[50%] hidden!',
    ),
  })
  try {
    const r = executar(['--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/breeze.css')
    assert.ok(css.includes('display: flex'), 'classe fixa')
    assert.ok(css.includes('padding: 16px'), 'arbitrária')
    assert.ok(css.includes('transform: rotate(45deg)'), 'transform individual')
    assert.ok(css.includes('transform: rotate(45deg) scale(1.2)'), 'rotate + scale combinados')
        assert.ok(css.includes(':hover'), 'variante hover')
    assert.ok(css.includes('min-width: 768px'), 'breakpoint md')
    assert.ok(css.includes('!important'), 'hidden! importante')
  } finally {
    limpar(dir)
  }
})

test('--plugins auto: só os plugins detectados registam-se e o CSS inclui o suporte', () => {
  const dir = projetoTemporario({
    'a.html': HTML_BASE('glass glass-lg p[16px]'),
    'b.html': HTML_BASE('divider-wave h[80px] bg[#003]'),
    'c.html': HTML_BASE('flex p[8px]'),
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const a = ler(dir, 'css/a.css')
    const b = ler(dir, 'css/b.css')
    const c = ler(dir, 'css/c.css')
    assert.ok(a.includes('backdrop-filter'), 'glass: suporte na página a')
    assert.ok(a.includes('--glass-blur'), 'glass-lg')
    assert.ok(b.includes('divider-wave'), 'dividers: máscara na página b')
    assert.ok(!a.includes('divider-wave'), 'dividers não vão para a página a')
    assert.ok(!c.includes('backdrop-filter'), 'página sem plugins não leva suporte')
  } finally {
    limpar(dir)
  }
})

test('--plugins glass,progress: lista explícita', () => {
  const dir = projetoTemporario({ 'a.html': HTML_BASE('progress progress-lg') })
  try {
    const r = executar(['--plugins', 'glass,progress', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/breeze.css')
    assert.ok(css.includes('--progress-h: 6px'), 'progress-lg registado')
    assert.ok(!css.includes('backdrop-filter'), 'glass não usado → sem suporte')
  } finally {
    limpar(dir)
  }
})

test('componente com membros do plugin leva o CSS/JS do plugin (deteção recursiva)', () => {
  const dir = projetoTemporario({
    'index.html':
      HTML_BASE('card galeria') +
      `<script>
        BreezeCSS.addComponent('card', ['glass', 'glass-dark', 'rounded[16px]', 'p[20px]'])
        BreezeCSS.addComponent('galeria', ['card', 'divider-wave', 'glass-refract'])
      </script>`,
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/index.css')
    assert.ok(css.includes('.card'), 'CSS do componente exportado')
    assert.ok(css.includes('backdrop-filter'), 'suporte do Glass incluído via componente')
    assert.ok(css.includes('prefers-reduced-transparency'), 'regras de acessibilidade do Glass')
    assert.ok(css.includes('glass-refract'), 'classe do membro presente')
    // glass-refract é efeito dinâmico → runtime gerado
    assert.ok(fs.existsSync(path.join(dir, 'js/index.runtime.js')), 'runtime com Glass')
    const js = ler(dir, 'js/index.runtime.js')
    assert.ok(js.includes('global.BreezeGlass = plugin'), 'BreezeGlass no runtime')
    assert.ok(js.includes('"card"'), 'componente embedado no runtime')
    // glass-refract (membro do componente galeria, que depende de card) → JS
    assert.ok(js.includes('global.BreezeGlass = plugin'), 'BreezeGlass no runtime (via glass-refract)')
    assert.ok(js.includes('global.BreezeDividers = plugin') === false, 'dividers é só CSS → sem JS')
    assert.ok(js.includes('"galeria"'), 'componente recursivo embedado')
  } finally {
    limpar(dir)
  }
})

test('protecção contra referências circulares entre componentes', () => {
  const dir = projetoTemporario({
    'index.html':
      HTML_BASE('a') +
      `<script>
        BreezeCSS.addComponent('a', ['b', 'glass'])
        BreezeCSS.addComponent('b', ['a', 'progress'])
      </script>`,
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida && 'build deve terminar sem travar')
    const css = ler(dir, 'css/index.css')
    assert.ok(css.includes('backdrop-filter'), 'glass detectado apesar do ciclo')
    assert.ok(css.includes('--progress-on'), 'progress detectado apesar do ciclo')
  } finally {
    limpar(dir)
  }
})

test('scrollbar: CSS estático (WebKit + Firefox + body + none) incluído', () => {
  const dir = projetoTemporario({
    'a.html': HTML_BASE('scrollbar scrollbar-thin scrollbar-thumb[#6366f1]'),
    'b.html': HTML_BASE('overflow-auto scrollbar-none h[100px]'),
  })
  try {
    const r = executar(['--split', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const a = ler(dir, 'css/a.css')
    assert.ok(a.includes('.scrollbar::-webkit-scrollbar'), 'WebKit: ::-webkit-scrollbar nas classes')
    assert.ok(a.includes('::-webkit-scrollbar-thumb:hover'), 'hover do polegar')
    assert.ok(a.includes('scrollbar-width'), 'Firefox: scrollbar-width')
    assert.ok(a.includes('scrollbar-color'), 'Firefox: scrollbar-color')
    assert.ok(a.includes('body.scrollbar::-webkit-scrollbar'), 'página: classe no body')
    assert.ok(a.includes('--scrollbar-thumb-hover'), 'variável de hover')
    assert.ok(a.includes('--scrollbar-gap'), 'folga')
    const b = ler(dir, 'css/b.css')
    assert.ok(b.includes('.scrollbar-none'), 'ocultação sem JS')
    assert.ok(b.includes('display: none'), '::-webkit-scrollbar display none')
    // sem a classe scrollbar, o CSS estático não entra
    const outro = projetoTemporario({ 'c.html': HTML_BASE('flex') })
    try {
      const r2 = executar(['--engine', MOTOR], { cwd: outro })
      assert.ok(r2.ok)
      assert.ok(!ler(outro, 'css/breeze.css').includes('::-webkit-scrollbar'))
    } finally {
      limpar(outro)
    }
  } finally {
    limpar(dir)
  }
})

test('tema: variáveis :root e resolução de nomes (bg[primaria])', () => {
  const dir = projetoTemporario({
    'index.html': HTML_BASE('bg[primaria] text[secundaria] p[16px]'),
  })
  try {
    const r = executar(
      ['--tema', 'cores.primaria=#003', '--tema', 'cores.secundaria=#005', '--engine', MOTOR],
      { cwd: dir },
    )
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/breeze.css')
    assert.ok(css.includes('--breeze-primaria: #003'), 'variável do tema')
    assert.ok(css.includes('--breeze-secundaria: #005'), 'variável 2')
    assert.ok(css.includes('background-color: #003'), 'classe resolve pelo nome do tema')
  } finally {
    limpar(dir)
  }
})

test('prefixo: classes bz-* compiladas e runtime com ctx prefixado', () => {
  const dir = projetoTemporario({
    'index.html': HTML_BASE('bz-flex bz-progress bz-p[10px] bz-scrollbar-none'),
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--prefix', 'bz-', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/index.css')
    assert.ok(css.includes('.bz-flex'), 'classe com prefixo')
    assert.ok(css.includes('.bz-scrollbar'), 'scrollbar estático com prefixo')
    assert.ok(css.includes('.bz-progress'), 'progress com prefixo')
    const js = ler(dir, 'js/index.runtime.js')
    assert.ok(js.includes('"prefix":"bz-"'), 'prefix no meta do runtime')
    assert.ok(js.includes('global.BreezeProgress = plugin'), 'progress (efeito dinâmico) no runtime')
  } finally {
    limpar(dir)
  }
})

test('--safelist gera classes sem uso no HTML', () => {
  const dir = projetoTemporario({ 'index.html': HTML_BASE('flex') })
  try {
    const r = executar(['--safelist', 'bg[red],hidden', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/breeze.css')
    assert.ok(css.includes('background-color: red'), 'safelist arbitrária')
    assert.ok(css.includes('display: none'), 'safelist fixa')
  } finally {
    limpar(dir)
  }
})

test('minificação', () => {
  const dir = projetoTemporario({ 'index.html': HTML_BASE('flex p[16px]') })
  try {
    const r = executar(['--minify', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/breeze.css')
    assert.ok(!css.includes('\n\n'), 'sem linhas vazias')
    assert.ok(!css.includes('/* '), 'sem comentários')
    assert.ok(css.includes('display: flex') || css.includes('display:flex'), 'regras preservadas')
  } finally {
    limpar(dir)
  }
})

test('classes de JSX/Vue (--tpl) entram no CSS', () => {
  const dir = projetoTemporario({
    'index.html': HTML_BASE('flex'),
    'Cartao.jsx': `export default function Cartao() {
      return <div className="glass glass-lg p[24px] rounded-2xl">olá</div>
    }`,
    'Lista.vue': `<template>
      <div :class="aberto ? 'progress progress-lg' : 'hidden'">x</div>
    </template>`,
  })
  try {
    const r = executar(['--tpl', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/breeze.css')
    assert.ok(css.includes('backdrop-filter'), 'classes do JSX compiladas')
    assert.ok(css.includes('--progress-h: 6px'), 'classes do Vue compiladas')
  } finally {
    limpar(dir)
  }
})

test('init automático prioriza o HTML escolhido com --file, sem --init', () => {
  const dir = projetoTemporario({
    'a-config-antiga.js': `BreezeCSS.init({ tema: { cores: { primaria: '#003' } } })`,
    'breeze/test/fixtures/init.html': `<script>BreezeCSS.init({ tema: { cores: { primaria: '#003' } } })</script>`,
    'index2.html': `<!doctype html><html><head></head><body class="bg[secundaria] text[tercearia] progress-track[tercearia]">
      <script>BreezeCSS.init({ tema: { cores: { primaria: '#003', secundaria: '#005', tercearia: '#fff' } } })</script>
    </body></html>`,
  })
  try {
    const r = executar(['--file', 'index2.html', '--split', '--plugins', 'auto', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/index2.css')
    assert.ok(css.includes('--breeze-secundaria: #005'), 'cor secundaria encontrada no HTML escolhido')
    assert.ok(css.includes('--breeze-tercearia: #fff'), 'cor tercearia encontrada no HTML escolhido')
    assert.ok(css.includes('background-color: #005'), 'bg[secundaria] resolvido')
    assert.ok(css.includes('--progress-track: #fff'), 'progress-track[tercearia] resolvido')
    assert.ok(r.saida.includes('index2.html (BreezeCSS.init)'), 'relatório mostra origem correta')
  } finally {
    limpar(dir)
  }
})

test('init automático sem --file prefere HTML da raiz a fixtures e JS', () => {
  const dir = projetoTemporario({
    'a-config-antiga.js': `BreezeCSS.init({ tema: { cores: { primaria: '#003' } } })`,
    'breeze/test/fixtures/init.html': `<script>BreezeCSS.init({ tema: { cores: { primaria: '#003' } } })</script>`,
    'index2.html': `<!doctype html><html><head></head><body class="bg[secundaria] text[tercearia]">
      <script>BreezeCSS.init({ tema: { cores: { primaria: '#003', secundaria: '#005', tercearia: '#fff' } } })</script>
    </body></html>`,
  })
  try {
    const r = executar(['--split', '--plugins', 'auto', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok, r.saida)
    const css = ler(dir, 'css/index2.css')
    assert.ok(css.includes('--breeze-secundaria: #005'), 'cor secundaria resolvida sem --file')
    assert.ok(css.includes('--breeze-tercearia: #fff'), 'cor tercearia resolvida sem --file')
    assert.ok(r.saida.includes('index2.html (BreezeCSS.init)'), 'origem correta')
  } finally {
    limpar(dir)
  }
})

test('CLI dentro do projecto não compila os próprios exemplos nem usa o init das fixtures', () => {
  const cp = require('node:child_process')
  const dir = projetoTemporario({
    'index2.html': `<!doctype html><html><head></head><body class="bg[secundaria] progress-track[tercearia]">
      <script>BreezeCSS.init({ tema: { cores: { primaria: '#003', secundaria: '#005', tercearia: '#fff' } } })</script>
    </body></html>`,
  })
  try {
    const pacote = path.resolve(__dirname, '..')
    const cliLocal = path.join(dir, 'breeze')
    fs.mkdirSync(cliLocal, { recursive: true })
    fs.copyFileSync(path.join(pacote, 'package.json'), path.join(cliLocal, 'package.json'))
    for (const sub of ['bin', 'lib', 'vendor']) {
      fs.cpSync(path.join(pacote, sub), path.join(cliLocal, sub), { recursive: true })
    }
    // A fixture simula um init incorreto dentro do pacote do CLI.
    fs.mkdirSync(path.join(cliLocal, 'test', 'fixtures'), { recursive: true })
    fs.writeFileSync(path.join(cliLocal, 'test', 'fixtures', 'init.html'),
      '<script>BreezeCSS.init({ tema: { cores: { primaria: "#003" } } })</script>')
    fs.mkdirSync(path.join(cliLocal, 'exemplo'), { recursive: true })
    fs.writeFileSync(path.join(cliLocal, 'exemplo', 'doc.html'), '<body class="bg[red]">exemplo</body>')
    const r = cp.spawnSync(process.execPath, ['breeze/bin/breeze.js', '--split', '--plugins', 'auto', '--inject'],
      { cwd: dir, encoding: 'utf8' })
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''))
    const css = ler(dir, 'css/index2.css')
    assert.ok(css.includes('--breeze-secundaria: #005'))
    assert.ok(css.includes('--progress-track: #fff'))
    assert.ok(!fs.existsSync(path.join(dir, 'css', 'doc.css')), 'exemplos do CLI excluídos')
    assert.ok(!fs.existsSync(path.join(dir, 'css', 'init.css')), 'fixtures do CLI excluídas')
    assert.ok(r.stdout.includes('1 página'), 'só o HTML do utilizador é compilado')
  } finally {
    limpar(dir)
  }
})
