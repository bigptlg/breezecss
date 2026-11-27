'use strict'
// Testes da cache incremental (ponto 3):
//   • build a frio vs build com cache a quente dão ficheiros idênticos,
//     com e sem --inject, com e sem --split;
//   • duas execuções seguidas com --inject e sem alterações → 100% de hits
//     e zero ficheiros escritos (mtimes inalterados);
//   • mudar 1 página só reescreve o CSS dessa página;
//   • páginas apagadas → entradas do manifest e outputs órfãos removidos;
//   • manifest ausente/corrompido/de esquema antigo → reconstruído, sem
//     falhar o build;
//   • impressão digital: mudar config/tema/motor invalida tudo;
//   • --cache-dir, --no-cache, --clean-cache;
//   • o js-guard continua a funcionar com a cache activa.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const cache = require('../lib/cache')
const { executar, projetoTemporario, limpar, MOTOR } = require('./helpers/exec')

const CLI = path.join(__dirname, '..', 'bin', 'breeze.js')

function paginas(n) {
  const ficheiros = {}
  for (let i = 1; i <= n; i++) {
    ficheiros[`pag${i}.html`] =
      `<!doctype html><html><head><title>${i}</title></head>\n` +
      `<body class="flex p[${i}0px] bg[#0${i}${i}aa] hover:bg[#0${i}ff] md:p[${i}6px]">\n` +
      `  <div class="cartao${i} hover:rotate[${i}0deg] scale[1.${i}]">\n` +
      `    <p class="text[#1${i}3] mt[${i}2px]">página ${i}</p>\n` +
      `  </div>\n` +
      `  <script>BreezeCSS.addComponent('cartao${i}', ['shadow[0 2px 8px]', 'rounded[12px]'])</script>\n` +
      `</body></html>\n`
  }
  return ficheiros
}

/** mtimes com precisão de nanosegundos de todos os ficheiros do projecto. */
function instantes(dir) {
  const mapa = {}
  const visita = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name)
      if (e.isDirectory()) {
        if (e.name === '.breeze-cache') continue
        visita(abs)
      } else {
        mapa[path.relative(dir, abs).replace(/\\/g, '/')] = String(fs.statSync(abs, { bigint: true }).mtimeNs)
      }
    }
  }
  visita(dir)
  return mapa
}

/** hashes dos ficheiros de saída (css/js) e das páginas. */
function hashes(dir) {
  const mapa = {}
  const visita = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name)
      if (e.isDirectory()) {
        if (e.name === '.breeze-cache') continue
        visita(abs)
      } else {
        mapa[path.relative(dir, abs).replace(/\\/g, '/')] = cache.sha256(fs.readFileSync(abs))
      }
    }
  }
  visita(dir)
  return mapa
}

function linhasCache(saida) {
  const m = /cache: (\d+) hits \/ (\d+) misses/.exec(saida)
  return m ? { hits: +m[1], misses: +m[2] } : null
}

test('impressão digital: mudar algo invalida, repetir é estável', () => {
  const base = {
    cliVersao: '1.1.0',
    hashMotor: 'X',
    prefix: '',
    reset: true,
    smooth: true,
    minify: false,
    split: false,
    plugins: null,
    tema: null,
    safelist: [],
    componentes: new Map([['btn', ['p[10px]']]]),
    configCaminho: 'breeze.config.js',
    configConteudo: '// config',
  }
  const d1 = cache.impressaoDigital(base)
  const d2 = cache.impressaoDigital(base)
  assert.strictEqual(d1, d2, 'mesmos dados → mesma digital')
  for (const [chave, valor] of [
    ['hashMotor', 'Y'],
    ['prefix', 'bz-'],
    ['reset', false],
    ['minify', true],
    ['split', true],
    ['plugins', ['glass']],
    ['tema', { cores: { a: '#111' } }],
  ]) {
    const dif = cache.impressaoDigital({ ...base, [chave]: valor })
    assert.notStrictEqual(d1, dif, 'mudar ' + chave + ' invalida a digital')
  }
  const comp2 = new Map([['btn', ['p[20px]']]])
  assert.notStrictEqual(d1, cache.impressaoDigital({ ...base, componentes: comp2 }), 'componentes na digital')
  assert.notStrictEqual(d1, cache.impressaoDigital({ ...base, safelist: ['x[1px]'] }), 'safelist na digital')
  assert.notStrictEqual(
    d1,
    cache.impressaoDigital({ ...base, configConteudo: '// mudou' }),
    'config na digital',
  )
})

test('manifest corrompido/de esquema antigo é ignorado (e o build não falha)', () => {
  const dir = projetoTemporario(paginas(2))
  try {
    assert.ok(executar(['--split', '--engine', MOTOR], { cwd: dir }).ok)
    fs.writeFileSync(path.join(dir, '.breeze-cache/manifest.json'), 'isto não é json {{{')
    const res = executar(['--split', '--engine', MOTOR], { cwd: dir })
    assert.ok(res.ok, 'build não falha com manifest corrompido')
    const c = linhasCache(res.saida)
    assert.strictEqual(c.hits, 0, 'manifest corrompido → tudo reconstruído')

    const m = JSON.parse(fs.readFileSync(path.join(dir, '.breeze-cache/manifest.json'), 'utf8'))
    m.esquema = 0 // esquema antigo
    fs.writeFileSync(path.join(dir, '.breeze-cache/manifest.json'), JSON.stringify(m))
    const res2 = executar(['--split', '--engine', MOTOR], { cwd: dir })
    assert.ok(res2.ok, 'esquema antigo é reconstruído')
    assert.strictEqual(linhasCache(res2.saida).hits, 0)
    const m2 = JSON.parse(fs.readFileSync(path.join(dir, '.breeze-cache/manifest.json'), 'utf8'))
    assert.strictEqual(m2.esquema, cache.ESQUEMA, 'manifest reescrito com o esquema actual')
  } finally {
    limpar(dir)
  }
})

test('a frio vs a quente dão ficheiros idênticos (--split, sem inject)', () => {
  const dirA = projetoTemporario(paginas(3))
  const dirB = projetoTemporario(paginas(3))
  try {
    assert.ok(executar(['--split', '--no-cache', '--engine', MOTOR], { cwd: dirA }).ok, 'A frio (sem cache)')
    const resB1 = executar(['--split', '--engine', MOTOR], { cwd: dirB })
    assert.ok(resB1.ok)
    const resB2 = executar(['--split', '--engine', MOTOR], { cwd: dirB })
    assert.strictEqual(linhasCache(resB2.saida).hits, 3, 'quente: 3 hits')

    // o build quente NÃO reescreve → os ficheiros são exactamente os da
    // 1.ª corrida (hashes iguais aos de A, excepto o cabeçalho com data)
    const ha = hashes(dirA)
    const hb = hashes(dirB)
    for (const f of Object.keys(ha)) {
      if (f.endsWith('.js')) {
        assert.strictEqual(hb[f], ha[f], 'runtime JS byte-a-byte igual: ' + f)
      } else {
        const a = fs.readFileSync(path.join(dirA, f), 'utf8')
        const b = fs.readFileSync(path.join(dirB, f), 'utf8')
        const semCab = (t) => t.replace(/^\/\*[\s\S]*?\*\//, '') // sem cabeçalho (data/contagens)
        assert.strictEqual(semCab(b), semCab(a), 'CSS igual (sem cabeçalho com data): ' + f)
      }
    }
  } finally {
    limpar(dirA)
    limpar(dirB)
  }
})

test('a frio vs a quente dão ficheiros idênticos (CSS único, sem inject)', () => {
  const dirA = projetoTemporario(paginas(3))
  const dirB = projetoTemporario(paginas(3))
  try {
    assert.ok(executar(['--no-cache', '--engine', MOTOR], { cwd: dirA }).ok)
    const resB = executar(['--engine', MOTOR], { cwd: dirB })
    assert.ok(resB.ok)
    assert.strictEqual(linhasCache(resB.saida).hits, 0, '1.ª corrida de B: miss')
    const resB2 = executar(['--engine', MOTOR], { cwd: dirB })
    assert.strictEqual(linhasCache(resB2.saida).hits, 3, '2.ª corrida: páginas todas em hit')

    const a = fs.readFileSync(path.join(dirA, 'css/breeze.css'), 'utf8').replace(/^\/\*[\s\S]*?\*\//, '')
    const b = fs.readFileSync(path.join(dirB, 'css/breeze.css'), 'utf8').replace(/^\/\*[\s\S]*?\*\//, '')
    assert.strictEqual(b, a, 'CSS único igual entre a frio e a quente')
  } finally {
    limpar(dirA)
    limpar(dirB)
  }
})

test('duas execuções seguidas com --inject: 100% hits e ZERO ficheiros escritos', () => {
  const dir = projetoTemporario(paginas(3))
  try {
    // 1.ª corrida (fria, com inject) — o inject escreve as páginas
    const r1 = executar(['--split', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r1.ok, '1.ª corrida: ' + r1.saida.slice(0, 400))
    const m1 = instantes(dir)
    // 2.ª corrida: tudo em hit, nada escrito
    const r2 = executar(['--split', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r2.ok)
    const c2 = linhasCache(r2.saida)
    assert.strictEqual(c2.hits, 3, '2.ª corrida: 100% hits')
    assert.strictEqual(c2.misses, 0, '2.ª corrida: 0 misses')
    const m2 = instantes(dir)
    assert.deepStrictEqual(m2, m1, 'mtimes inalterados (zero ficheiros escritos)')
    // 3.ª corrida idem
    const r3 = executar(['--split', '--inject', '--engine', MOTOR], { cwd: dir })
    assert.strictEqual(linhasCache(r3.saida).hits, 3)
    assert.deepStrictEqual(instantes(dir), m2, '3.ª corrida também não escreve')
  } finally {
    limpar(dir)
  }
})

test('idem em CSS único com --inject', () => {
  const dir = projetoTemporario(paginas(2))
  try {
    assert.ok(executar(['--inject', '--engine', MOTOR], { cwd: dir }).ok)
    const m1 = instantes(dir)
    const r2 = executar(['--inject', '--engine', MOTOR], { cwd: dir })
    const c2 = linhasCache(r2.saida)
    assert.strictEqual(c2.hits, 2, 'CSS único: 2 hits (uma por página)')
    assert.strictEqual(c2.misses, 0)
    assert.deepStrictEqual(instantes(dir), m1, 'nada escrito')
  } finally {
    limpar(dir)
  }
})

test('mudar 1 página em --split só reescreve o CSS dessa página', () => {
  const dir = projetoTemporario(paginas(3))
  try {
    assert.ok(executar(['--split', '--engine', MOTOR], { cwd: dir }).ok)
    const m1 = instantes(dir)
    fs.writeFileSync(
      path.join(dir, 'pag2.html'),
      paginas(3)['pag2.html'].replace('p[20px]', 'p[25px]'),
    )
    const r = executar(['--split', '--engine', MOTOR], { cwd: dir })
    const c = linhasCache(r.saida)
    assert.strictEqual(c.hits, 2, 'as outras duas páginas estão em hit')
    assert.strictEqual(c.misses, 1, 'só a página alterada é reconstruída')
    const m2 = instantes(dir)
    assert.notStrictEqual(m2['css/pag2.css'], m1['css/pag2.css'], 'pag2.css reescrito')
    for (const f of ['css/pag1.css', 'css/pag3.css', 'pag1.html', 'pag3.html']) {
      assert.strictEqual(m2[f], m1[f], f + ' intacto')
    }
    const css = fs.readFileSync(path.join(dir, 'css/pag2.css'), 'utf8')
    assert.ok(css.includes('padding: 25px'), 'novo valor no CSS da página alterada')
  } finally {
    limpar(dir)
  }
})

test('CSS único: página alterada SEM classes novas não reescreve nada', () => {
  const dir = projetoTemporario(paginas(2))
  try {
    assert.ok(executar(['--engine', MOTOR], { cwd: dir }).ok)
    // mudar só o texto da página (classes iguais)
    fs.writeFileSync(
      path.join(dir, 'pag1.html'),
      paginas(2)['pag1.html'].replace('página 1', 'página um alterada'),
    )
    const m1 = instantes(dir) // estado depois da alteração do teste
    const r = executar(['--engine', MOTOR], { cwd: dir })
    const c = linhasCache(r.saida)
    // a assinatura da página (classes + scripts) não mudou → hit;
    // sem classes novas o CSS único NÃO é reescrito
    assert.strictEqual(c.hits, 2, 'as duas páginas mantêm a assinatura de classes')
    assert.strictEqual(c.misses, 0, 'nada a reconstruir')
    const m2 = instantes(dir)
    assert.strictEqual(m2['css/breeze.css'], m1['css/breeze.css'], 'CSS único NÃO reescrito')
    assert.strictEqual(m2['pag1.html'], m1['pag1.html'], 'página intacta')
  } finally {
    limpar(dir)
  }
})

test('CSS único: classes novas numa página reconstroem o CSS', () => {
  const dir = projetoTemporario(paginas(2))
  try {
    assert.ok(executar(['--engine', MOTOR], { cwd: dir }).ok)
    const antes = fs.readFileSync(path.join(dir, 'css/breeze.css'), 'utf8')
    assert.ok(!antes.includes('gap[9px]'))
    fs.writeFileSync(
      path.join(dir, 'pag1.html'),
      paginas(2)['pag1.html'].replace('</body>', '<span class="gap[9px]"></span></body>'),
    )
    const r = executar(['--engine', MOTOR], { cwd: dir })
    assert.strictEqual(linhasCache(r.saida).hits, 1)
    const depois = fs.readFileSync(path.join(dir, 'css/breeze.css'), 'utf8')
    assert.ok(depois.includes('gap: 9px'), 'nova classe no CSS')
  } finally {
    limpar(dir)
  }
})

test('páginas apagadas: entradas do manifest e outputs órfãos removidos', () => {
  const dir = projetoTemporario(paginas(3))
  try {
    assert.ok(executar(['--split', '--engine', MOTOR], { cwd: dir }).ok)
    assert.ok(fs.existsSync(path.join(dir, 'css/pag3.css')))
    fs.rmSync(path.join(dir, 'pag3.html'))
    const r = executar(['--split', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok)
    assert.ok(r.saida.includes('css/pag3.css'), 'órfão apagado e reportado')
    assert.ok(!fs.existsSync(path.join(dir, 'css/pag3.css')), 'css/pag3.css removido do disco')
    const m = JSON.parse(fs.readFileSync(path.join(dir, '.breeze-cache/manifest.json'), 'utf8'))
    assert.ok(!m.paginas['pag3.html'], 'entrada do manifest removida')
  } finally {
    limpar(dir)
  }
})

test('runtime JS agrupado também é cacheado', () => {
  const dir = projetoTemporario(paginas(3))
  try {
    assert.ok(executar(['--split', '--plugins', 'glass', '--engine', MOTOR], { cwd: dir }).ok)
    const m1 = instantes(dir)
    const r = executar(['--split', '--plugins', 'glass', '--engine', MOTOR], { cwd: dir })
    assert.ok(r.ok)
    assert.deepStrictEqual(instantes(dir), m1, 'nada reescrito (CSS e runtime em hit)')
  } finally {
    limpar(dir)
  }
})

test('--cache-dir personalizada, --no-cache e --clean-cache', () => {
  const dir = projetoTemporario(paginas(2))
  try {
    const r1 = executar(['--split', '--cache-dir', 'cache-custom', '--engine', MOTOR], { cwd: dir })
    assert.ok(r1.ok)
    assert.ok(fs.existsSync(path.join(dir, 'cache-custom/manifest.json')), 'manifest na pasta pedida')
    assert.ok(r1.saida.includes('cache-custom/'), 'relatório mostra a pasta')

    const r2 = executar(['--split', '--cache-dir', 'cache-custom', '--engine', MOTOR], { cwd: dir })
    assert.strictEqual(linhasCache(r2.saida).hits, 2)

    // --no-cache: ignora a cache e não escreve manifest
    const antesManifest = fs.readFileSync(path.join(dir, 'cache-custom/manifest.json'), 'utf8')
    const r3 = executar(['--split', '--no-cache', '--cache-dir', 'cache-custom', '--engine', MOTOR], { cwd: dir })
    assert.ok(r3.ok)
    assert.ok(!linhasCache(r3.saida), 'sem linha de cache no relatório')
    assert.strictEqual(
      fs.readFileSync(path.join(dir, 'cache-custom/manifest.json'), 'utf8'),
      antesManifest,
      'manifest intocado com --no-cache',
    )

    // --clean-cache apaga a pasta
    const r4 = executar(['--split', '--clean-cache', '--cache-dir', 'cache-custom', '--engine', MOTOR], { cwd: dir })
    assert.ok(r4.ok)
    assert.ok(!fs.existsSync(path.join(dir, 'cache-custom')), 'pasta apagada')
    assert.strictEqual(linhasCache(r4.saida).hits, 0, 'depois de limpar, tudo é miss')
  } finally {
    limpar(dir)
  }
})

test('impressão digital nova invalida a cache (tema diferente)', () => {
  const dir = projetoTemporario(paginas(2))
  try {
    assert.ok(executar(['--split', '--tema', 'cores.primaria=#123456', '--engine', MOTOR], { cwd: dir }).ok)
    const r = executar(['--split', '--tema', 'cores.primaria=#654321', '--engine', MOTOR], { cwd: dir })
    const c = linhasCache(r.saida)
    assert.strictEqual(c.hits, 0, 'tema mudou → tudo inválido')
    assert.strictEqual(c.misses, 2)
    const css = fs.readFileSync(path.join(dir, 'css/pag1.css'), 'utf8')
    assert.ok(css.includes('#654321'), 'novo tema no CSS')
  } finally {
    limpar(dir)
  }
})

test('o js-guard continua a funcionar com a cache activa', () => {
  const dir = projetoTemporario({
    'a.html':
      '<!doctype html><html><head><title>t</title></head>\n' +
      '<body class="p[8px]">\n' +
      '<script>BreezeCSS.init({ plugins: [BreezeGlass] })</script>\n' +
      '</body></html>\n',
  })
  try {
    const r1 = executar(['--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r1.ok)
    const html1 = fs.readFileSync(path.join(dir, 'a.html'), 'utf8')
    assert.ok(html1.includes('breeze:cli-guard:start'), 'guard aplicado na 1.ª corrida')
    assert.ok(html1.includes('if (typeof BreezeCSS'), 'chamada protegida')

    const r2 = executar(['--inject', '--engine', MOTOR], { cwd: dir })
    assert.ok(r2.ok)
    assert.strictEqual(linhasCache(r2.saida).hits, 1, 'assinatura ignora as guardas → hit')
    const html2 = fs.readFileSync(path.join(dir, 'a.html'), 'utf8')
    assert.strictEqual(html2, html1, '2.ª corrida não altera o HTML (idempotente)')
    const contaGuardas = (html2.match(/breeze:cli-guard:start/g) || []).length
    assert.strictEqual(contaGuardas, 1, 'guarda não duplicada')
  } finally {
    limpar(dir)
  }
})

test('ficheiros gerados não mudam com a cache activa vs --no-cache (com inject)', () => {
  const dirA = projetoTemporario(paginas(2))
  const dirB = projetoTemporario(paginas(2))
  try {
    const args = ['--inject', '--engine', MOTOR]
    assert.ok(executar([...args, '--no-cache'], { cwd: dirA }).ok, 'A: inject sem cache')
    assert.ok(executar([...args], { cwd: dirB }).ok, 'B: inject com cache (frio)')
    const rB2 = executar([...args], { cwd: dirB })
    assert.strictEqual(linhasCache(rB2.saida).hits, 2, 'B: quente → hits')

    const ha = hashes(dirA)
    const hb = hashes(dirB)
    assert.deepStrictEqual(Object.keys(hb).sort(), Object.keys(ha).sort(), 'mesmos ficheiros')
    for (const f of Object.keys(ha)) {
      if (f.endsWith('.js')) {
        assert.strictEqual(hb[f], ha[f], 'runtime igual: ' + f)
      } else if (f.endsWith('.css')) {
        const a = fs.readFileSync(path.join(dirA, f), 'utf8').replace(/^\/\*[\s\S]*?\*\//, '')
        const b = fs.readFileSync(path.join(dirB, f), 'utf8').replace(/^\/\*[\s\S]*?\*\//, '')
        assert.strictEqual(b, a, 'CSS igual (sem cabeçalho com data): ' + f)
      } else {
        // páginas HTML: o inject produz exactamente o mesmo resultado
        const a = fs.readFileSync(path.join(dirA, f), 'utf8')
        const b = fs.readFileSync(path.join(dirB, f), 'utf8')
        assert.strictEqual(b, a, 'HTML injectado igual: ' + f)
      }
    }
  } finally {
    limpar(dirA)
    limpar(dirB)
  }
})
