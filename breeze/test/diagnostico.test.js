'use strict'
// Testes dos diagnósticos (ponto 2 — fim das falhas silenciosas):
//   • códigos mínimo com posição ficheiro:linha:coluna;
//   • sugestões por Levenshtein ("querias dizer…?");
//   • só erro/aviso para classes com forma de Breeze; palavras simples só
//     com --verbose;
//   • --ignore, --strict, --report json;
//   • template literals dinâmicos → classe-dinamica-suspeita;
//   • diff do --watch (só novos/alterados).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const diagnostico = require('../lib/diagnostico')
const CLI = path.join(__dirname, '..', 'bin', 'breeze.js')
const { executar, projetoTemporario, limpar, MOTOR } = require('./helpers/exec')

// config mínima igual à do motor (para testes unitários de analisarClasse)
const CFG = {
  prefix: '',
  variantes: { hover: ':hover', focus: ':focus', dark: '.dark &' },
  breakpoints: { sm: '640px', md: '768px' },
  classesFixas: { flex: 'display:flex', 'rounded-full': 'x', hidden: 'x' },
  mapaPropriedades: { m: 'margin', p: 'padding', bg: 'background-color', w: 'width' },
  transformPrefixos: ['rotate', 'scale', 'translate-x'],
}

test('códigos de diagnóstico com mensagem e sugestão', () => {
  const casos = [
    ['p-4', 'estilo-tailwind', 'p[1rem]'],
    ['bg-blue-500', 'estilo-tailwind', 'bg[#3b82f6]'],
    ['w-full', 'estilo-tailwind', 'w[100%]'],
    ['marge[10px]', 'prefixo-desconhecido', null],
    ['aria-expanded:flex', 'variante-desconhecida', null],
    ['has-[x]:flex', 'variante-desconhecida', null],
    ['p[10px', 'sintaxe-invalida', null],
    ['p[]', 'sintaxe-invalida', null],
    ['p[1]0]', 'sintaxe-invalida', null],
    ['bg[#000]/50', 'modificador-opacidade-nao-suportado', 'bg[#00000080]'],
    ['flex', null, null], // válida
    ['rounded-full', null, null], // fixa válida
    ['rotate[45deg]', null, null], // transform válida
  ]
  for (const [classe, codigo, sugestao] of casos) {
    const r = diagnostico.analisarClasse(classe, CFG)
    if (codigo === null) {
      assert.strictEqual(r, null, classe + ' é válida/irrelevante')
    } else {
      assert.ok(r, classe + ' produz diagnóstico')
      assert.strictEqual(r.codigo, codigo, classe + ' → ' + codigo)
      if (sugestao) assert.strictEqual(r.sugestao, sugestao, classe + ' sugere ' + sugestao)
    }
  }
})

test('sugestão "querias dizer…?" por Levenshtein', () => {
  assert.strictEqual(diagnostico.distanciaLevenshtein('hover', 'hovre'), 2)
  const cfgErrada = {
    ...CFG,
    mapaPropriedades: { margin: '1', padding: '1', 'background-color': '1' },
  }
  const r = diagnostico.analisarClasse('paddig[10px]', cfgErrada)
  assert.ok(r && r.codigo === 'prefixo-desconhecido')
  assert.strictEqual(r.sugestao, 'padding[10px]', 'prefixo próximo sugerido')

  const rv = diagnostico.analisarClasse('hove:bg[red]', CFG)
  assert.ok(rv && rv.codigo === 'variante-desconhecida')
  assert.strictEqual(rv.sugestao, 'hover:bg[red]', 'variante próxima sugerida')
})

test('palavras simples só dão "nao-breeze"; Tailwind dá aviso', () => {
  assert.strictEqual(diagnostico.analisarClasse('cartao-destaque', CFG).codigo, 'nao-breeze')
  assert.strictEqual(diagnostico.analisarClasse('prose', CFG).codigo, 'nao-breeze')
  const res = diagnostico.diagnosticarProjecto({
    paginas: [{ rel: 'a.html', conteudo: '<div class="prose cartao"></div>' }],
    cfg: CFG,
  })
  assert.strictEqual(res.itens.length, 0, 'sem --verbose as palavras simples não aparecem')
  const resV = diagnostico.diagnosticarProjecto({
    paginas: [{ rel: 'a.html', conteudo: '<div class="prose cartao"></div>' }],
    cfg: CFG,
    verboso: true,
  })
  assert.strictEqual(resV.itens.length, 2, 'com --verbose aparecem as duas')
  assert.ok(resV.itens.every((d) => d.severidade === 'info'))
})

test('posições ficheiro:linha:coluna no HTML e nos scripts inline', () => {
  const html = '<!doctype html>\n<html>\n<body>\n  <div class="ok[1px] p-4"></div>\n  <script>classList.add(\'hover:p-4\')</script>\n</body>\n'
  const res = diagnostico.diagnosticarProjecto({ paginas: [{ rel: 'a.html', conteudo: html }], cfg: CFG })
  const p4 = res.itens.find((d) => d.classe === 'p-4')
  assert.ok(p4, 'p-4 diagnosticado')
  assert.strictEqual(p4.linha, 4, 'linha do atributo class')
  assert.strictEqual(p4.coluna, 23, 'coluna do token no valor do class')
  const script = res.itens.find((d) => d.classe === 'hover:p-4')
  assert.ok(script, 'classe citada em classList.add diagnosticada')
  assert.strictEqual(script.linha, 5, 'linha dentro do <script>')
})

test('template literals com [${…] → classe-dinamica-suspeita', () => {
  const html = '<div class="a[1px]"></div>\n<script>const s = `p[${n}px]`</script>'
  const res = diagnostico.diagnosticarProjecto({ paginas: [{ rel: 'a.html', conteudo: html }], cfg: CFG })
  const d = res.itens.find((x) => x.codigo === 'classe-dinamica-suspeita')
  assert.ok(d, 'literal dinâmico detectado')
  assert.ok(d.mensagem.includes('template literal'))
  assert.match(d.sugestao, /safelist/)
  assert.strictEqual(d.linha, 2, 'posição do literal no HTML')
})

test('avisos do motor entram como diagnósticos (aviso-motor)', () => {
  const res = diagnostico.diagnosticarProjecto({
    paginas: [],
    cfg: CFG,
    motorAvisos: ['plugin "x" não existe neste bundle'],
  })
  assert.strictEqual(res.avisos, 1)
  assert.strictEqual(res.itens[0].codigo, 'aviso-motor')
  assert.strictEqual(res.itens[0].ficheiro, '(motor)')
})

test('--ignore ignora classes por regex (CLI)', () => {
  const dir = projetoTemporario({
    'a.html': '<div class="p-4 bg[red] marge[9px] aria-expanded:flex"></div>',
  })
  try {
    const res = executar(['--engine', MOTOR, '--ignore', '^marge', '--ignore', 'p-4'], { cwd: dir })
    assert.ok(res.ok)
    assert.ok(!res.saida.includes('marge[9px]'), '--ignore remove marge')
    assert.ok(!res.saida.includes('p-4'), '--ignore remove p-4')
    assert.ok(res.saida.includes('diagnóstico'), 'restam outros diagnósticos')
    assert.ok(res.saida.includes('variante-desconhecida'), 'variante continua')
  } finally {
    limpar(dir)
  }
})

test('--strict devolve exit 1 quando há erros de diagnóstico', () => {
  const dir = projetoTemporario({
    'a.html': '<div class="p[4px] aria-expanded:flex"></div>',
  })
  try {
    const res = executar(['--engine', MOTOR, '--strict'], { cwd: dir })
    assert.ok(!res.ok, 'exit 1 com erros')
    assert.ok(res.saida.includes('variante-desconhecida'))
    // sem --strict o mesmo build passa
    const res2 = executar(['--engine', MOTOR], { cwd: dir })
    assert.ok(res2.ok, 'sem --strict o exit é 0')
  } finally {
    limpar(dir)
  }
})

test('--report json emite JSON válido para CI (só o JSON no stdout)', () => {
  const dir = projetoTemporario({
    'a.html': '<div class="p[4px] marge[1px]"></div>',
  })
  try {
    const res = executar(['--engine', MOTOR, '--report', 'json', '--strict'], { cwd: dir })
    assert.ok(!res.ok, 'exit 1 por erros com --strict')
    const json = JSON.parse(res.saida) // só JSON no stdout
    assert.strictEqual(json.motor, require('../lib/engine').versaoDeBundle(MOTOR))
    assert.ok(json.diagnostico.erros >= 1, 'erros contados')
    const item = json.diagnostico.itens.find((i) => i.codigo === 'prefixo-desconhecido')
    assert.ok(item && item.linha === 1 && item.coluna > 0, 'posição incluída no JSON')
  } finally {
    limpar(dir)
  }
})

test('prefixo do CLI: dica de escrita com prefixo', () => {
  const cfgPf = { ...CFG, prefix: 'bz-', mapaPropriedades: { 'bz-m': 'margin', 'bz-p': 'padding' }, classesFixas: { 'bz-flex': 'x' } }
  const r = diagnostico.analisarClasse('m[10px]', cfgPf)
  assert.ok(r && r.codigo === 'prefixo-desconhecido')
  assert.ok(r.mensagem.includes('bz-m[10px]'), 'sugere a forma com prefixo')
  const ok = diagnostico.analisarClasse('bz-m[10px]', cfgPf)
  assert.strictEqual(ok, null, 'com prefixo a classe é válida')
})

test('diff do --watch: só novos/alterados', () => {
  const d1 = { ficheiro: 'a.html', linha: 1, coluna: 5, classe: 'p-4', codigo: 'estilo-tailwind', severidade: 'aviso', mensagem: 'x' }
  const d2 = { ficheiro: 'a.html', linha: 2, coluna: 5, classe: 'marge[9px]', codigo: 'prefixo-desconhecido', severidade: 'erro', mensagem: 'y' }
  const primeira = diagnostico.filtrarNovos([d1, d2], new Set())
  assert.strictEqual(primeira.novos.length, 2)
  const segunda = diagnostico.filtrarNovos([d1, d2], primeira.chaves)
  assert.strictEqual(segunda.novos.length, 0, 'nada mudou → nada novo')
  const d2Alterado = { ...d2, mensagem: 'z' } // mesma chave → não é "novo"
  const terceira = diagnostico.filtrarNovos([d1, d2Alterado], segunda.chaves)
  assert.strictEqual(terceira.novos.length, 0, 'chave estável ignora mudança de mensagem')
  const novo = { ficheiro: 'b.html', linha: 1, coluna: 1, classe: 'w-full', codigo: 'estilo-tailwind', severidade: 'aviso', mensagem: 'n' }
  const quarta = diagnostico.filtrarNovos([d1, d2, novo], segunda.chaves)
  assert.strictEqual(quarta.novos.length, 1, 'só o novo diagnóstico aparece')
})

test('relatório de texto agrupa por ficheiro com ficheiro:linha:coluna', () => {
  const itens = [
    { ficheiro: 'a.html', linha: 3, coluna: 9, classe: 'p-4', severidade: 'aviso', codigo: 'estilo-tailwind', mensagem: 'm1', sugestao: 'p[1rem]' },
    { ficheiro: 'b.html', linha: 1, coluna: 2, classe: 'marge[9px]', severidade: 'erro', codigo: 'prefixo-desconhecido', mensagem: 'm2' },
  ]
  const texto = diagnostico.formatarTexto(itens)
  assert.ok(texto.includes('a.html:3:9'))
  assert.ok(texto.includes('b.html:1:2'))
  assert.ok(texto.includes('usa "p[1rem]"'), 'sugestão no texto')
  assert.ok(texto.indexOf('a.html') < texto.indexOf('b.html'), 'agrupado por ficheiro')
})

test('--watch: os rebuilds mostram só os diagnósticos novos/alterados', async () => {
  const { spawn } = require('child_process')
  const dir = projetoTemporario({
    'a.html': '<!doctype html><html><body class="flex p[8px]"><div class="marge[9px]">v1</div></body></html>\n',
  })
  const filho = spawn('node', [CLI, '--split', '--watch', '--engine', MOTOR], { cwd: dir })
  let saida = ''
  filho.stdout.on('data', (d) => (saida += d))
  filho.stderr.on('data', (d) => (saida += d))
  try {
    // build inicial
    for (let i = 0; i < 40 && !fs.existsSync(path.join(dir, 'css/a.css')); i++) {
      await new Promise((r) => setTimeout(r, 100))
    }
    for (let i = 0; i < 20 && !saida.includes('a vigiar alterações'); i++) {
      await new Promise((r) => setTimeout(r, 100))
    }
    await new Promise((r) => setTimeout(r, 400))
    assert.ok(saida.includes('marge[9px]'), 'build inicial mostra o diagnóstico')
    const vez1 = (saida.match(/marge\[9px\]/g) || []).length

    // nova classe problemática → rebuild → só o NOVO diagnóstico destacado
    fs.writeFileSync(
      path.join(dir, 'a.html'),
      '<!doctype html><html><body class="flex p[8px]"><div class="marge[9px] aria-expanded:flex">v2</div></body></html>\n',
    )
    let reconstruiu = false
    for (let i = 0; i < 30 && !reconstruiu; i++) {
      await new Promise((r) => setTimeout(r, 200))
      if (saida.includes('aria-expanded:flex')) reconstruiu = true
    }
    assert.ok(reconstruiu, 'novo diagnóstico aparece no rebuild')
    assert.ok(saida.includes('novos/alterados'), 'etiqueta de diff no watch')
    // o antigo não é repetido no rebuild (só contagem da 1.ª vez + 0)
    const vez2 = (saida.match(/marge\[9px\]/g) || []).length
    assert.strictEqual(vez2, vez1, 'diagnóstico antigo não repetido no rebuild')
  } finally {
    filho.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 200))
    limpar(dir)
  }
})

test('print:, motion-reduce:, motion-safe: e max-<bp>: são válidas (regressão)', () => {
  const validas = [
    'print:hidden',
    'motion-reduce:p[1px]',
    'motion-safe:p[2px]',
    'max-md:hidden',
    'max-sm:p[3px]',
    'md:print:p[0]',
    'hover:max-md:bg[red]',
  ]
  for (const c of validas) {
    assert.strictEqual(diagnostico.analisarClasse(c, CFG), null, c + ' não deve dar diagnóstico')
  }
  // max-<breakpoint inexistente> continua a ser erro
  const r = diagnostico.analisarClasse('max-huge:p[1px]', CFG)
  assert.ok(r && r.codigo === 'variante-desconhecida', 'max-huge: continua desconhecida')
})

test('--strict sai com 0 num projecto que só usa variantes de media válidas', () => {
  const dir = projetoTemporario({
    'index.html':
      '<div class="print:hidden motion-reduce:p[1px] motion-safe:p[2px] max-lg:p[3px] max-md:hidden"></div>',
  })
  try {
    const res = executar(['--strict', '--engine', MOTOR, '--no-cache'], { cwd: dir })
    assert.ok(res.ok, 'strict não deve falhar: ' + res.saida)
  } finally {
    limpar(dir)
  }
})
