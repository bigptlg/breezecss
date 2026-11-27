#!/usr/bin/env node
'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze — CLI que varre todos os HTML do projecto e gera o CSS estático
// do BreezeCSS (motor real breeze.bundle.js numa VM) + o RUNTIME JavaScript
// dos plugins, sem o bundle original.
//
//   npx breeze                        → css/breeze.css (todas as páginas)
//   npx breeze --split                → css/index.css, css/settings.css, …
//   npx breeze --split --plugins auto --inject
//        → CSS + js/<página>.runtime.js + <link>+<script> nos HTML
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const glob = require('../lib/glob')
const htmlscan = require('../lib/htmlscan')
const engineMod = require('../lib/engine')
const { criarHospedeiro, prefixarClasse, MOTOR_VERSAO_MINIMA, compararVersoes, versaoDeBundle } = require('../lib/engine')
const cssgen = require('../lib/cssgen')
const configJS = require('../lib/config')
const initscan = require('../lib/initscan')
const compJS = require('../lib/components')
const plugdep = require('../lib/plugdep')
const runtimeJS = require('../lib/runtime')
const tplscan = require('../lib/tplscan')
const diagnosticoJS = require('../lib/diagnostico')
const cacheJS = require('../lib/cache')

const VERSAO = require('../package.json').version

// Ordem canónica dos plugins (relatórios e runtime)
const ORDEM_PLUGINS = ['glass', 'dividers', 'progress', 'scrollbar', 'preloader', 'backgrounds']

// ─────────────────────────────────────────────────────────────────────────
// Ajuda
// ─────────────────────────────────────────────────────────────────────────
const AJUDA = `breeze v${VERSAO} — CSS estático + runtime JavaScript dos plugins do BreezeCSS

Uso:
  npx breeze [opções] [ficheiro.html …]

Sem opções: varre o projecto (**/*.html) e gera um único css/breeze.css
com as classes de todas as páginas (zero dependências).

Saída
  -o, --out <pasta>      Pasta de saída do CSS (por omissão: css/)
  --js-out <pasta>       Pasta do runtime JS (por omissão: js/, ao lado de out)
  -n, --name <nome>      Nome do CSS único (por omissão: breeze → css/breeze.css)
  --split                Um CSS por página: css/index.css, css/settings.css, …
  -f, --file <ficheiro>  Processa apenas este(s) HTML (repetível;
                         também aceita caminhos directos como argumento)

Plugins e runtime
  --plugins <modo>       all (por omissão) · auto (só o que o projecto usa,
                         lendo HTML, componentes, templates JSX/Vue/Angular
                         e o BreezeCSS.init) · lista: glass,dividers,…
  --no-plugins           Não registar nenhum plugin
  --all-plugin-css       Inclui o CSS completo de TODOS os plugins registados
  --no-runtime           Não gerar runtime JavaScript (só CSS estático)
  --runtime              Forçar runtime em todas as páginas (mesmo sem
                         plugins dinâmicos — mantém BreezeCSS.init a funcionar)
  --tpl                  Compilar para o CSS as classes citadas em
                         JSX/TSX/Vue/Angular/Svelte (com --plugins auto isto
                         já é feito para deps; --tpl força em qualquer modo)
  --no-tpl               Não varrer templates de SPA

Filtros
  --include <glob>       Padrões a incluir (repetível; omissão: **/*.html **/*.htm)
  --exclude <glob>       Padrões a excluir (repetível; omissão: node_modules, .git, <out>)
  -p, --prefix <pfx>     Prefixo das classes (ex.: bz-) — igual ao BreezeConfig.prefix

CSS
  --minify               CSS minificado numa linha só
  --no-reset             Não incluir o reset CSS do Breeze
  --no-smooth            Não incluir html { scroll-behavior: smooth }
  --safelist <classe>    Gerar classes mesmo sem uso no HTML (repetível/vírgulas)
  --tema <tema>          Tema igual ao BreezeCSS.init: JSON completo ou
                         secção.nome=valor (repetível). Ex.:
                         --tema '{"cores":{"primaria":"#003"}}'  ou
                         --tema cores.primaria=#003 --tema cores.secundaria=#005
  --engine <ficheiro>    Caminho do breeze.bundle.js (por omissão procura no
                         projecto e nas pastas acima; senão usa a cópia incluída)
  --force-engine         Aceita um motor abaixo da versão mínima suportada
                         (MOTOR_VERSAO_MINIMA em lib/engine.js)
  --inject               Insere/actualiza nos HTML o <link> do CSS E o
                         <script> do runtime (idempotente; substitui o
                         breeze.bundle.js original pelo runtime compilado)

Diagnóstico (fim das falhas silenciosas)
  --strict               Código de saída 1 se houver ERROS de diagnóstico
  --report text|json     Relatório em texto (agrupado por ficheiro) ou JSON
                         para CI (por omissão: text)
  --ignore <regex>       Ignora classes que casem a RegExp (repetível;
                         também no breeze.config.js: chave "ignore")

Cache incremental
  --cache-dir <pasta>    Pasta da cache (por omissão: .breeze-cache/, excluída
                         do varrimento e adicionada ao .gitignore sugerido)
  --no-cache             Ignora a cache (build completo, não escreve manifest)
  --clean-cache          Apaga a pasta da cache antes de gerar

Configuração
  --config <ficheiro>    Ficheiro de config (por omissão procura breeze.config.js
                         na pasta actual). Aceita o mesmo objecto do
                         BreezeCSS.init: tema, componentes, plugins, prefix,
                         safelist, log (ignorado) + omissões de saída: out,
                         name, split, minify, allPluginCss, runtime, jsOut,
                         tpl, include, exclude…
  --init <ficheiro>      Força a leitura do init apenas deste ficheiro
                         (normalmente desnecessário: --file tem prioridade)
  --no-init              Não procurar o BreezeCSS.init(…) no projecto

Componentes
  Os componentes registados com BreezeCSS.addComponent("btn", […]) são
  descobertos automaticamente nos <script> inline dos HTML processados e
  nos ficheiros .js/.ts/.jsx/.tsx/.vue do projecto — nada é executado.
  Também podem ficar no breeze.config.js com a chave "componentes":

    module.exports = {
      componentes: { btn: ['no-underline', 'p[15px]', 'hover:translate-x[3px]'] },
    }

  As classes de MEMBROS também contam para a deteção de plugins: um
  componente com 'glass' ou 'glass-refract' leva o CSS/JS do Glass para o
  output, mesmo que o HTML só use <div class="card">.

Extras
  -w, --watch            Vigia os HTML, breeze.config.js e reconstrói ao guardar
  --clean                Apaga a pasta de saída antes de gerar
  --verbose              Páginas, classes não reconhecidas e avisos do motor
  -v, --version          Versão do CLI
  -h, --help             Esta ajuda

Exemplos
  npx breeze                                  → css/breeze.css
  npx breeze --split                          → um CSS por página
  npx breeze --split --plugins auto --inject  → CSS + runtime por página,
                                                <link>+<script> injetados
  npx breeze --plugins glass,progress         → só estes plugins
  npx breeze --watch --inject                 → build contínuo
  npx breeze --tema cores.primaria=#003       → bg[primaria] passa a #003
`

// Exemplo de breeze.config.js (o mesmo objecto do BreezeCSS.init no browser):
//
//   module.exports = {
//     log: false,
//     plugins: 'auto',
//     runtime: true,
//     tema: {
//       cores: { primaria: '#003', secundaria: '#005', terceira: '#fff' },
//     },
//     componentes: { card: ['glass', 'glass-dark', 'rounded[16px]', 'p[20px]'] },
//   }


// ─────────────────────────────────────────────────────────────────────────
// Argumentos
// ─────────────────────────────────────────────────────────────────────────

function falhaOpcao(nome) {
  console.error('breeze: a opção "' + nome + '" precisa de um valor (use --help)')
  process.exit(1)
}

function analisarArgs(argv) {
  const opcoes = {
    out: 'css',
    jsOut: null, // por omissão: js/ ao lado da pasta de CSS
    nome: 'breeze',
    split: false,
    ficheiros: [],
    incluir: [],
    excluir: [],
    prefix: '',
    minify: false,
    watch: false,
    inject: false,
    clean: false,
    verboso: false,
    reset: true,
    smooth: true,
    safelist: [],
    plugins: null, // null = all · 'auto' · [] · lista de nomes
    tema: null,
    allPluginCss: false,
    runtime: null, // null = automático · false = nunca · true = sempre
    tpl: false,
    config: null,
    init: null,
    semInit: false,
    engine: null,
    forcarEngine: false,
    // diagnóstico
    strict: false,
    report: null, // null = text
    ignorar: [],
    // cache incremental
    semCache: false,
    limparCache: false,
    cacheDir: null,
    ajuda: false,
    versao: false,
  }
  const definidas = new Set()

  for (let i = 0; i < argv.length; i++) {
    let a = argv[i]
    let inline = null
    if (a.startsWith('--') && a.includes('=')) {
      const idx = a.indexOf('=')
      inline = a.slice(idx + 1)
      a = a.slice(0, idx)
    }
    const valor = () => {
      if (inline !== null) return inline
      const v = argv[++i]
      if (v === undefined || v.startsWith('--')) falhaOpcao(a)
      return v
    }
    switch (a) {
      case '-h':
      case '--help':
        opcoes.ajuda = true
        break
      case '-v':
      case '--version':
        opcoes.versao = true
        break
      case '--verbose':
        opcoes.verboso = true
        definidas.add('verboso')
        break
      case '--split':
        opcoes.split = true
        definidas.add('split')
        break
      case '--minify':
      case '--min':
        opcoes.minify = true
        definidas.add('minify')
        break
      case '-w':
      case '--watch':
        opcoes.watch = true
        definidas.add('watch')
        break
      case '--inject':
        opcoes.inject = true
        definidas.add('inject')
        break
      case '--clean':
        opcoes.clean = true
        definidas.add('clean')
        break
      case '--no-reset':
        opcoes.reset = false
        definidas.add('reset')
        break
      case '--no-smooth':
        opcoes.smooth = false
        definidas.add('smooth')
        break
      case '--no-plugins':
        opcoes.plugins = []
        definidas.add('plugins')
        break
      case '--all-plugin-css':
        opcoes.allPluginCss = true
        definidas.add('allPluginCss')
        break
      case '--no-runtime':
        opcoes.runtime = false
        definidas.add('runtime')
        break
      case '--runtime':
        opcoes.runtime = true
        definidas.add('runtime')
        break
      case '--tpl':
        opcoes.tpl = true
        definidas.add('tpl')
        break
      case '--no-tpl':
        opcoes.tpl = false
        definidas.add('tpl')
        break
      case '-o':
      case '--out':
        opcoes.out = valor()
        definidas.add('out')
        break
      case '--js-out':
        opcoes.jsOut = valor()
        definidas.add('jsOut')
        break
      case '-n':
      case '--name':
        opcoes.nome = valor()
        definidas.add('nome')
        break
      case '-f':
      case '--file':
        opcoes.ficheiros.push(valor())
        definidas.add('ficheiros')
        break
      case '--include':
        opcoes.incluir.push(valor())
        definidas.add('incluir')
        break
      case '-e':
      case '--exclude':
        opcoes.excluir.push(valor())
        definidas.add('excluir')
        break
      case '-p':
      case '--prefix':
        opcoes.prefix = valor()
        definidas.add('prefix')
        break
      case '--safelist':
        opcoes.safelist.push(
          ...valor()
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
        definidas.add('safelist')
        break
      case '--plugins': {
        const bruto = valor()
        if (/^(all|todos)$/i.test(bruto)) {
          opcoes.plugins = null
        } else if (/^auto$/i.test(bruto)) {
          opcoes.plugins = 'auto'
        } else {
          opcoes.plugins = bruto
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        }
        definidas.add('plugins')
        break
      }
      case '--tema': {
        const temaArg = configJS.parseTemaArg(valor())
        opcoes.tema = configJS.fundirTema(opcoes.tema, temaArg)
        definidas.add('tema')
        break
      }
      case '--config':
        opcoes.config = valor()
        definidas.add('config')
        break
      case '--init':
        opcoes.init = valor()
        definidas.add('init')
        break
      case '--no-init':
        opcoes.semInit = true
        definidas.add('semInit')
        break
      case '--engine':
        opcoes.engine = valor()
        definidas.add('engine')
        break
      case '--force-engine':
        opcoes.forcarEngine = true
        definidas.add('forcarEngine')
        break
      case '--strict':
        opcoes.strict = true
        definidas.add('strict')
        break
      case '--report': {
        const modo = valor()
        if (modo !== 'text' && modo !== 'json') {
          console.error('breeze: --report espera "text" ou "json" (recebido: "' + modo + '")')
          process.exit(1)
        }
        opcoes.report = modo
        definidas.add('report')
        break
      }
      case '--ignore':
        opcoes.ignorar.push(valor())
        definidas.add('ignorar')
        break
      case '--cache-dir':
        opcoes.cacheDir = valor()
        definidas.add('cacheDir')
        break
      case '--no-cache':
        opcoes.semCache = true
        definidas.add('semCache')
        break
      case '--clean-cache':
        opcoes.limparCache = true
        definidas.add('limparCache')
        break
      default:
        if (a.startsWith('-')) {
          console.error('breeze: opção desconhecida "' + a + '" (use --help)')
          process.exit(1)
        }
        opcoes.ficheiros.push(a)
        definidas.add('ficheiros')
    }
  }
  opcoes.definidas = definidas
  return opcoes
}

// ─────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────

let emWatch = false
function erro(msg) {
  if (emWatch) throw new Error(msg)
  console.error('breeze: ' + msg)
  process.exit(1)
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1).replace('.', ',') + ' KB'
}

function slugPagina(rel) {
  return rel.replace(/\.[^.]+$/, '').replace(/[/\\]+/g, '_')
}

/** Ordena nomes de plugins pela ordem canónica. */
function ordenarPlugins(lista) {
  return ORDEM_PLUGINS.filter((n) => lista.includes(n))
}

/** A página refere BreezeCSS/BreezeConfig/plugins no HTML (init inline, etc.)? */
function paginaUsaBreeze(html) {
  return /BreezeCSS|BreezeConfig|Breeze(Preloader|Glass|Progress|Scrollbar|Backgrounds|Dividers)/.test(
    html,
  )
}

/** Pasta do runtime: --js-out > js/ ao lado da pasta de CSS. */
function pastaJS(raiz, opcoes) {
  if (opcoes.jsOut) return path.resolve(raiz, opcoes.jsOut)
  const foraAbs = path.resolve(raiz, opcoes.out)
  return path.join(path.dirname(foraAbs), 'js')
}

/** Procura o motor: --engine > projecto e pais > cópia do pacote. */
function localizarMotor(raiz, explicito) {
  if (explicito) {
    const abs = path.resolve(raiz, explicito)
    if (!fs.existsSync(abs)) erro('motor não encontrado (--engine): ' + explicito)
    return abs
  }
  const candidatos = []
  let dir = raiz
  for (;;) {
    candidatos.push(path.join(dir, 'breeze.bundle.js'))
    candidatos.push(path.join(dir, 'breeze.min.js'))
    const pai = path.dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  candidatos.push(path.join(__dirname, '..', 'vendor', 'breeze.bundle.js'))
  for (const c of candidatos) {
    try {
      if (fs.statSync(c).isFile()) return c
    } catch (e) {
      /* continuar */
    }
  }
  erro(
    'motor breeze.bundle.js não encontrado.\n' +
      '  Coloca-o no projecto ou usa --engine <caminho>.',
  )
}

/**
 * Aplica breeze.config.js (ou --config <ficheiro>) às opções do CLI.
 * Precedência: omissões < config < flags já definidas na linha de comandos.
 * Mutates opcoes; devolve { caminho, avisos, tema } ou null.
 */
function aplicarConfigFicheiro(opcoes) {
  const raiz = process.cwd()
  let res
  try {
    res = configJS.carregarConfig(raiz, opcoes.config)
  } catch (e) {
    erro('config: ' + e.message)
  }
  if (!res) {
    if (opcoes.config) erro('ficheiro de config não encontrado: ' + opcoes.config)
    return null
  }
  for (const avisos of res.avisos) {
    console.error('breeze: aviso — ' + avisos)
  }
  opcoes._fixadasConfig = new Set(Object.keys(res.valores))
  opcoes._caminhoConfig = res.caminho
  try {
    opcoes._conteudoConfig = fs.readFileSync(res.caminho, 'utf8')
  } catch (e) {
    opcoes._conteudoConfig = ''
  }
  for (const [chave, valor] of Object.entries(res.valores)) {
    if (!opcoes.definidas.has(chave)) opcoes[chave] = valor
  }
  if (res.tema) opcoes.tema = configJS.fundirTema(res.tema, opcoes.tema)
  if (res.componentes) {
    opcoes._componentesConfig = { ...(opcoes._componentesConfig || {}), ...res.componentes }
  }
  return res
}

// ─────────────────────────────────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────────────────────────────────

/** Exclui o pacote do próprio CLI quando estiver dentro do projecto. */
function excluirPacoteCli(raiz) {
  const rel = path.relative(raiz, path.resolve(__dirname, '..')).replace(/\\/g, '/')
  if (!rel || rel === '..' || rel.startsWith('../') || path.isAbsolute(rel)) return []
  return [rel + '/**']
}

function construir(opcoes) {
  const t0 = Date.now()
  const raiz = process.cwd()
  const exclusoesCli = excluirPacoteCli(raiz)
  const relCaminho = (abs) => path.relative(raiz, abs).replace(/\\/g, '/')

  // ── cache incremental: snapshot do manifest anterior + manifest de trabalho ──
  // Duas leituras = dois objectos independentes: o anterior é a referência
  // para reutilização de análises e limpeza de órfãos.
  const usarCache = !opcoes.semCache
  const dirCache = cacheJS.pastaCache(raiz, opcoes)
  let manifestAnterior = null
  let manifest = null
  if (usarCache) {
    if (opcoes.limparCache) cacheJS.limpar(dirCache)
    const novoManifest = () => ({
      esquema: cacheJS.ESQUEMA,
      geradoEm: '',
      digital: null,
      digitalPre: null,
      paginas: {},
      cssUnico: null,
      runtimes: {},
      fontes: {},
      fontesResultados: {},
      init: null,
      avisosMotor: [],
      errosMotor: [],
    })
    manifestAnterior = cacheJS.carregar(dirCache)
    manifest = cacheJS.carregar(dirCache) || novoManifest()
    for (const k of ['paginas', 'runtimes', 'fontes', 'fontesResultados']) {
      if (!manifest[k]) manifest[k] = {}
    }
    if (!manifest.avisosMotor) manifest.avisosMotor = []
    if (!manifest.errosMotor) manifest.errosMotor = []
  }

  // ── páginas (ler primeiro: init, componentes e deps dependem delas) ──
  const paginas = []
  if (opcoes.ficheiros.length) {
    for (const f of opcoes.ficheiros) {
      const abs = path.resolve(raiz, f)
      if (!fs.existsSync(abs)) erro('ficheiro não encontrado: ' + f)
      if (!/\.(html?|htm)$/i.test(abs)) erro('--file espera um .html: ' + f)
      paginas.push({ rel: path.relative(raiz, abs).replace(/\\/g, '/'), abs })
    }
  } else {
    const incluir = opcoes.incluir.length ? opcoes.incluir : ['**/*.html', '**/*.htm']
    const excluir = [
      ...opcoes.excluir,
      opcoes.out,
      usarCache ? (opcoes.cacheDir || '.breeze-cache') : null,
      ...exclusoesCli,
    ].filter(Boolean)
    const rels = glob.caminhar(raiz, { excluidos: excluir, incluidos: incluir })
    paginas.push(...rels.map((r) => ({ rel: r, abs: path.join(raiz, r) })))
  }
  if (!paginas.length) {
    erro(
      'nenhum HTML encontrado em ' +
        raiz +
        (opcoes.ficheiros.length ? '' : '\n  (usa --file, --include ou cria páginas .html)'),
    )
  }
  for (const p of paginas) p.conteudo = fs.readFileSync(p.abs, 'utf8')

  // hash normalizado por página — insensível a tudo o que o --inject
  // acrescenta; é a base de todas as reutilizações por página
  for (const p of paginas) {
    p.normHash = usarCache ? cacheJS.sha256(htmlscan.normalizarParaCache(p.conteudo)) : null
    const ent = usarCache ? (manifest.paginas[p.rel] || null) : null
    p._dados = ent && p.normHash !== null && ent.normHash === p.normHash ? ent : null
  }

  // ── varrimento partilhado dos ficheiros JS/template ─────────────────
  // Uma única passagem: hash de cada ficheiro + extracções reutilizadas
  // pelo hash (tokens de template, componentes, posições e literais
  // dinâmicos para os diagnósticos).
  const exclusoesCodigo = [
    opcoes.out,
    opcoes.jsOut || path.relative(raiz, pastaJS(raiz, opcoes)),
    'node_modules',
    '.git',
    usarCache ? (opcoes.cacheDir || '.breeze-cache') : null,
    ...exclusoesCli,
  ].filter(Boolean)
  const ficheirosCodigo = glob.caminhar(raiz, {
    incluidos: [
      '**/*.js', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.mts', '**/*.cts',
      '**/*.jsx', '**/*.tsx', '**/*.vue', '**/*.svelte',
    ],
    excluidos: exclusoesCodigo,
  })
  const shaJS = {}
  const resultadosJS = {}
  for (const rel of ficheirosCodigo) {
    let texto = ''
    let sha = null
    try {
      texto = fs.readFileSync(path.join(raiz, rel), 'utf8')
      sha = cacheJS.sha256(texto)
    } catch (e) {
      continue
    }
    shaJS[rel] = sha
    const guardado = usarCache && manifest.fontes[rel] === sha ? manifest.fontesResultados[rel] : null
    if (guardado && guardado.tokens && guardado.componentes) {
      resultadosJS[rel] = guardado
    } else {
      resultadosJS[rel] = {
        tokens: [...tplscan.extrairDeTexto(texto)],
        componentes: compJS.extrairDeTexto(texto),
        tokensComPosicoes: tplscan.extrairDeTextoComPosicoes(texto),
        dinamicos: tplscan.literaisDinamicos(texto),
      }
      if (usarCache) {
        manifest.fontes[rel] = sha
        manifest.fontesResultados[rel] = resultadosJS[rel]
      }
    }
  }

  // ── descobrir o BreezeCSS.init(…)/BreezeConfig do projecto ───────────
  // Resultado reutilizado quando NENHUMA fonte varrida mudou (páginas por
  // normHash, ficheiros JS por sha, ficheiro explícito por sha).
  let initDescoberto = null
  if (!opcoes.semInit) {
    let initSha = ''
    if (opcoes.init) {
      try {
        initSha = cacheJS.sha256(fs.readFileSync(path.resolve(raiz, opcoes.init)))
      } catch (e) {
        erro('init: ficheiro não encontrado: ' + opcoes.init)
      }
    }
    const hashFontes = cacheJS.sha256(
      cacheJS.jsonEstavel({
        js: shaJS,
        paginas: paginas.map((p) => [p.rel, p.normHash || cacheJS.sha256(p.conteudo)]),
        init: opcoes.init || '',
        initSha,
      }),
    )
    const guardado =
      usarCache && manifest.init && manifest.init.hashFontes === hashFontes
        ? manifest.init.resultado
        : undefined
    if (guardado !== undefined) {
      initDescoberto = guardado
    } else {
      try {
        initDescoberto = initscan.descobrirInit(raiz, {
          explicito: opcoes.init,
          paginas: opcoes.ficheiros,
          excluir: exclusoesCli,
          out: opcoes.out,
          verboso: opcoes.verboso,
        })
      } catch (e) {
        erro('init: ' + e.message)
      }
      if (usarCache) manifest.init = { hashFontes, resultado: initDescoberto }
    }
    if (initDescoberto) {
      const fixadasCfg = opcoes._fixadasConfig || new Set()
      if (initDescoberto.tema) {
        opcoes.tema = configJS.fundirTema(initDescoberto.tema, opcoes.tema)
      }
      if (
        initDescoberto.plugins !== undefined &&
        !opcoes.definidas.has('plugins') &&
        !fixadasCfg.has('plugins')
      ) {
        opcoes.plugins = initDescoberto.plugins
      }
      if (
        initDescoberto.prefix &&
        !opcoes.definidas.has('prefix') &&
        !fixadasCfg.has('prefix')
      ) {
        opcoes.prefix = initDescoberto.prefix
      }
      if (
        initDescoberto.safelist &&
        !opcoes.definidas.has('safelist') &&
        !fixadasCfg.has('safelist')
      ) {
        opcoes.safelist.push(...initDescoberto.safelist)
      }
      for (const nota of initDescoberto.notas || []) {
        console.error('breeze: aviso — init em ' + initDescoberto.caminho + ': ' + nota)
      }
    }
  }
  const temaAplicado = !!(opcoes.tema && Object.keys(opcoes.tema).length)

  // ── componentes (BreezeCSS.addComponent) ────────────────────────────
  // ordem de descoberta preservada: config < páginas (em ordem) < ficheiros
  const jsDirAbs = pastaJS(raiz, opcoes)
  const mapaComponentes = new Map()
  const fontesComponentes = { config: 0, scripts: 0, js: 0 }
  if (opcoes._componentesConfig) {
    for (const [nome, lista] of Object.entries(opcoes._componentesConfig)) {
      if (Array.isArray(lista) && lista.length && compJS.nomeValido(nome) && !mapaComponentes.has(nome)) {
        mapaComponentes.set(nome, lista.map(String))
        fontesComponentes.config++
      }
    }
  }
  for (const p of paginas) {
    const guardado = p._dados
    const itens = guardado
      ? guardado.componentesScripts || []
      : compJS.extrairDeHTML(p.conteudo).map((c) => [c.nome, c.classes])
    if (!guardado && usarCache) p._componentesScriptsNovos = itens
    for (const [nome, classes] of itens) {
      if (!mapaComponentes.has(nome)) {
        mapaComponentes.set(nome, classes)
        fontesComponentes.scripts++
      }
    }
  }
  for (const rel of Object.keys(resultadosJS)) {
    for (const c of resultadosJS[rel].componentes || []) {
      if (!mapaComponentes.has(c.nome)) {
        mapaComponentes.set(c.nome, c.classes)
        fontesComponentes.js++
      }
    }
  }

  // ── templates SPA (JSX/TSX/Vue/Angular) ──────────────────────────────
  const modoAuto = opcoes.plugins === 'auto'
  const tokensTpl = new Set()
  if (opcoes.tpl || modoAuto) {
    for (const rel of Object.keys(resultadosJS)) {
      for (const t of resultadosJS[rel].tokens || []) tokensTpl.add(t)
    }
    for (const p of paginas) {
      const guardado = p._dados
      const tokens = guardado ? guardado.tokensScript || [] : [...tplscan.extrairDeHTML(p.conteudo)]
      if (!guardado && usarCache) p._tokensScriptNovos = tokens
      for (const t of tokens) tokensTpl.add(t)
    }
  }

  // classes de templates compilam para o CSS quando --tpl (ou auto);
  // os tokens do utilizador (--safelist) mantêm-se sempre
  const safelistEfetiva = [...opcoes.safelist]
  if (opcoes.tpl || modoAuto) {
    for (const t of tokensTpl) if (!safelistEfetiva.includes(t)) safelistEfetiva.push(t)
  }

  // ── impressão digital PRE (sem os plugins: as deps vêm a seguir) ─────
  // deps/diagnóstico de uma página dependem de: conteúdo (normHash) +
  // componentes + prefix + tokens globais + tema — tudo na digitalPre
  const digitalPre = cacheJS.impressaoDigital({
    cliVersao: VERSAO,
    hashMotor: null, // preenchida depois (caminhoMotor ainda não resolvido)
    prefix: opcoes.prefix,
    reset: opcoes.reset,
    smooth: opcoes.smooth,
    minify: opcoes.minify,
    split: opcoes.split,
    plugins: '__pre__',
    tema: opcoes.tema,
    safelist: safelistEfetiva,
    componentes: mapaComponentes,
    configCaminho: opcoes._caminhoConfig ? relCaminho(opcoes._caminhoConfig) : '',
    configConteudo: opcoes._conteudoConfig || '',
  })

  // ── deteção de dependências de plugins (por página) ──────────────────
  // páginas inalteradas + mesmo contexto (digitalPre) → deps guardadas
  const initPluginsRuntime =
    initDescoberto && Array.isArray(initDescoberto.plugins) ? initDescoberto.plugins : []
  const deps = { porPagina: new Map(), globalCss: [], globalJs: [] }
  const fundir = (destino, css, js) => {
    for (const n of css) if (!destino.css.includes(n)) destino.css.push(n)
    for (const n of js) if (!destino.js.includes(n)) destino.js.push(n)
  }
  const base = { css: [], js: [] }
  for (const t of [...tokensTpl, ...opcoes.safelist]) {
    const r = plugdep.analisarToken(t, opcoes.prefix, mapaComponentes)
    fundir(base, r.css, r.js)
  }
  fundir({ css: deps.globalCss, js: deps.globalJs }, base.css, base.js)

  const paginasADep = []
  for (const p of paginas) {
    const guardado = p._dados
    if (guardado && guardado.deps && manifestAnterior && manifestAnterior.digitalPre === digitalPre) {
      deps.porPagina.set(p.rel, { css: [...guardado.deps.css], js: [...guardado.deps.js] })
      fundir({ css: deps.globalCss, js: deps.globalJs }, guardado.deps.css, guardado.deps.js)
    } else {
      paginasADep.push(p)
    }
  }
  if (paginasADep.length) {
    const depsNovas = plugdep.analisar({
      paginas: paginasADep,
      mapaComponentes,
      prefix: opcoes.prefix,
      initPlugins: [],
      tokensGlobais: [],
    })
    for (const p of paginasADep) {
      const d = depsNovas.porPagina.get(p.rel) || { css: [], js: [] }
      const completa = {
        css: [...new Set([...base.css, ...d.css])],
        js: [...new Set([...base.js, ...d.js])],
      }
      deps.porPagina.set(p.rel, completa)
      fundir({ css: deps.globalCss, js: deps.globalJs }, d.css, d.js)
      if (usarCache) p._depsNovas = completa
    }
  }
  // plugins declarados no init → JS garantido (igual a plugdep.analisar)
  for (const nome of initPluginsRuntime) {
    const pad = plugdep.PADROES[nome]
    if (pad && pad.js && !deps.globalJs.includes(nome)) deps.globalJs.push(nome)
    if (pad && !deps.globalCss.includes(nome)) deps.globalCss.push(nome)
  }
  for (const p of paginas) {
    const d = deps.porPagina.get(p.rel)
    p._depsCss = d ? d.css : []
    p._depsJs = d ? d.js : []
  }

  // ── sanitização de componentes (protecção anti-circular) ───────────
  // O motor expande componentes recursivamente SEM detecção de ciclos
  // (interpretarClasse no bundle) — dois componentes que se referem
  // mutuamente rebentam o build. O CLI regista a lista FLATTENADA com
  // protecção de ciclo; o CSS resultante é o mesmo.
  const mapaSeguro = new Map()
  for (const [nome, classes] of mapaComponentes) {
    const achatados = plugdep.membrosComponente(nome, mapaComponentes)
    mapaSeguro.set(nome, achatados.length ? achatados : classes)
  }
  // ── plugins a registar no motor ──────────────────────────────────────
  let pluginsRegistar
  if (Array.isArray(opcoes.plugins)) {
    pluginsRegistar = opcoes.plugins
  } else if (modoAuto) {
    const detectados = new Set([...deps.globalCss, ...deps.globalJs, ...initPluginsRuntime])
    pluginsRegistar = ordenarPlugins([...detectados])
    if (!pluginsRegistar.length && opcoes.verboso) {
      console.error('breeze: --plugins auto — nenhum plugin detectado (só CSS base)')
    }
  } else {
    pluginsRegistar = null // all (comportamento do 1.1.0)
  }

  // ── política de versões + impressão digital global ───────────────────
  const caminhoMotor = localizarMotor(raiz, opcoes.engine)
  const versaoMotorFicheiro = versaoDeBundle(caminhoMotor)
  if (
    versaoMotorFicheiro &&
    compararVersoes(versaoMotorFicheiro, MOTOR_VERSAO_MINIMA) < 0 &&
    !opcoes.forcarEngine
  ) {
    erro(
      'motor ' +
        versaoMotorFicheiro +
        ' (' + caminhoMotor + ') é anterior à versão mínima suportada (' +
        MOTOR_VERSAO_MINIMA + ')\n' +
        '  Actualiza o breeze.bundle.js (scripts/sync-engine.js) ou repete com --force-engine.',
    )
  }
  const versaoMotor = versaoMotorFicheiro || '?'
  const digital = cacheJS.impressaoDigital({
    cliVersao: VERSAO,
    hashMotor: cacheJS.hashFicheiro(caminhoMotor) || caminhoMotor,
    prefix: opcoes.prefix,
    reset: opcoes.reset,
    smooth: opcoes.smooth,
    minify: opcoes.minify,
    split: opcoes.split,
    plugins: pluginsRegistar,
    tema: opcoes.tema,
    safelist: safelistEfetiva,
    componentes: mapaComponentes,
    configCaminho: opcoes._caminhoConfig ? relCaminho(opcoes._caminhoConfig) : '',
    configConteudo: opcoes._conteudoConfig || '',
  })
  if (usarCache) {
    manifest.digital = digital
    manifest.digitalPre = digitalPre
    manifest.geradoEm = new Date().toISOString()
    manifest.motor = versaoMotor
  }
  // reutilização das análises dependentes da config (diagnóstico,
  // desconhecidas, tema): válida quando a digital global não mudou
  const analiseReutilizavel = usarCache && !!manifestAnterior && manifestAnterior.digital === digital

  // ── motor: criado só quando é preciso (páginas novas/alteradas) ──────
  let motor = null
  let cfgMotor = null
  function obterMotor() {
    if (!motor) {
      motor = criarHospedeiro({
        caminhoBundle: caminhoMotor,
        config: {
          prefix: opcoes.prefix,
          reset: opcoes.reset,
          scrollSmooth: opcoes.smooth,
          safelist: safelistEfetiva,
          plugins: pluginsRegistar,
          tema: opcoes.tema || undefined,
        },
        verboso: opcoes.verboso,
      })
      if (!motor.configInterna) erro('não foi possível capturar a configuração do motor')
      cfgMotor = motor.configInterna
      // registar componentes no motor (para o CSS .card { … }) — listas
      // achatadas (sem ciclos) para o motor expandir sem estourar a pilha
      for (const [nome, classes] of mapaSeguro) {
        motor.registarComponente(nome, classes)
      }
      if (usarCache) {
        manifest.avisosMotor = motor.avisos || []
        manifest.errosMotor = motor.erros || []
      }
    }
    return motor
  }
  // nomes de componentes tal como o motor os vê (aliases com prefixo) —
  // replicado sem criar a VM para builds 100% em hit
  const nomesComponentesLista = new Set()
  for (const nome of mapaComponentes.keys()) {
    const nomeHTML = opcoes.prefix && !nome.startsWith(opcoes.prefix) ? opcoes.prefix + nome : nome
    nomesComponentesLista.add(nomeHTML)
    if (nomeHTML !== nome) nomesComponentesLista.add(nome)
  }

  const desconhecidas = new Set()
  const possiveisTema = new Set()
  let totalRegras = 0
  const escritos = []
  let folhasPluginsMemo = null
  let regrasComponentesMemo = null
  function folhasPluginsDe() {
    obterMotor()
    if (!folhasPluginsMemo) folhasPluginsMemo = motor.estilosPlugins()
    return folhasPluginsMemo
  }
  function regrasComponentesDe() {
    obterMotor()
    if (!regrasComponentesMemo) regrasComponentesMemo = motor.regrasComponentes([...motor.componentes.keys()])
    return regrasComponentesMemo
  }

  // ── diagnósticos ─────────────────────────────────────────────────────
  // por página: reutilizados quando normHash + digital coincidem; por
  // ficheiro JS/template: reutilizados quando sha + digital coincidem
  function diagnosticarPagina(p) {
    obterMotor()
    return diagnosticoJS.diagnosticarProjecto({
      paginas: [p],
      cfg: cfgMotor,
      verboso: true, // guarda tudo; o filtro verbose/ignore é feito no relatório
      ignorar: [],
    })
  }
  const itensDiag = []
  for (const p of paginas) {
    const guardado = p._dados
    if (guardado && guardado.diagnostico && analiseReutilizavel) {
      itensDiag.push(...guardado.diagnostico)
    } else {
      const res = diagnosticarPagina(p)
      itensDiag.push(...res.itens)
      if (usarCache) p._diagnosticoNovo = res.itens
    }
  }
  for (const rel of Object.keys(resultadosJS)) {
    const dados = resultadosJS[rel]
    const guardado =
      usarCache &&
      manifest.fontes[rel] === shaJS[rel] &&
      manifest.fontesResultados[rel] &&
      manifest.fontesResultados[rel].diagItens &&
      manifestAnterior &&
      manifestAnterior.digital === digital
        ? manifest.fontesResultados[rel].diagItens
        : null
    if (guardado) {
      itensDiag.push(...guardado)
    } else {
      obterMotor()
      const res = diagnosticoJS.diagnosticarTokens(rel, dados.tokensComPosicoes, dados.dinamicos, cfgMotor)
      itensDiag.push(...res)
      if (usarCache) {
        manifest.fontesResultados[rel] = { ...dados, diagItens: res }
      }
    }
  }
  // avisos do próprio motor (da execução actual ou guardados)
  if (motor) {
    for (const a of motor.avisos) itensDiag.push(diagnosticoJS.itemAvisoMotor(a))
  } else if (usarCache && manifest.avisosMotor.length) {
    for (const a of manifest.avisosMotor) itensDiag.push(diagnosticoJS.itemAvisoMotor(a))
  }

  // ── escreverCSS ──────────────────────────────────────────────────────
  const escreverCSS = (nomeFicheiro, { regras, elementos }, pagina, coletor) => {
    obterMotor()
    const folhasPlugins = folhasPluginsDe()
    const regrasComponentes = regrasComponentesDe()
    const nomesComponentes = new Set(motor.componentes.keys())
    const regrasTransform = cssgen.construirRegrasTransform(elementos, cfgMotor)
    const topo = cssgen.cabecalho({
      cliVersao: VERSAO,
      motorVersao: motor.versao,
      paginas: paginas.length,
      regras: regras.length + regrasTransform.length,
    })

    const tokens = new Set()
    for (const el of elementos) {
      for (const t of el.classList) tokens.add(t)
    }
    if (!temaAplicado) {
      for (const t of tokens) {
        if (cssgen.pareceClasseTema(t, opcoes.prefix)) possiveisTema.add(t)
        if (coletor) coletor.temaTokens.add(t)
      }
    }

    // CSS de suporte dos plugins: só dos plugins detectados na página
    // (deps inclui membros de componentes); --all-plugin-css inclui tudo.
    const cssDeps = (() => {
      if (opcoes.split) {
        const d = deps.porPagina.get(pagina.rel)
        return new Set(d ? d.css : [])
      }
      const todas = new Set()
      for (const d of deps.porPagina.values()) for (const n of d.css) todas.add(n)
      return todas
    })()
    const folhasFinais = opcoes.allPluginCss
      ? folhasPlugins
      : folhasPlugins.filter((f) => {
          if (!cssgen.PREFIXO_PLUGIN_CSS[f.plugin]) return true // plugin desconhecido
          return cssDeps.has(f.plugin)
        })
    const scrollbarIncluido =
      opcoes.allPluginCss || folhasFinais.some((f) => f.plugin === 'scrollbar')

    // Regras de variante (.btn:hover…) só dos componentes usados nesta página
    const componentesCss = []
    const componentesUsados = new Map()
    for (const nome of nomesComponentes) {
      if (tokens.has(nome)) componentesUsados.set(nome, regrasComponentes.get(nome) || [])
    }
    if (componentesUsados.size) {
      const membros = new Map()
      for (const nome of componentesUsados.keys()) {
        const classes = mapaComponentes.get(nome) || motor.componentes.get(nome) || []
        membros.set(nome, classes.map((c) => prefixarClasse(c, opcoes.prefix)))
      }
      componentesCss.push(...cssgen.construirRegrasTransformComponentes(membros, cfgMotor))
      for (const [, regras] of componentesUsados) componentesCss.push(...regras)
    }

    let css = cssgen.juntarFicheiro({
      regrasMotor: regras,
      regrasTransform,
      pluginsCss: folhasFinais,
      componentesCss,
      smooth: opcoes.smooth,
      topo,
      extraCss: scrollbarIncluido ? cssgen.cssScrollbarEstatico(opcoes.prefix) : null,
    })
    if (opcoes.minify) css = cssgen.minificarCSS(css)

    fs.mkdirSync(path.dirname(nomeFicheiro), { recursive: true })
    fs.writeFileSync(nomeFicheiro, css)
    totalRegras += regras.length + regrasTransform.length
    escritos.push({ abs: nomeFicheiro, bytes: Buffer.byteLength(css) })

    for (const el of elementos) {
      for (const t of el.classList) {
        if (!nomesComponentes.has(t) && !cssgen.classeRelevante(t, cfgMotor)) {
          desconhecidas.add(t)
          if (coletor) coletor.desconhecidas.add(t)
        }
      }
    }
    return regras.length + regrasTransform.length
  }

  // ── loops de CSS (split / único) com cache ───────────────────────────
  const outAbs = path.resolve(raiz, opcoes.out)
  let cacheHits = 0
  let cacheMisses = 0
  let paginasRemovidas = []
  const fantasmaDe = () =>
    safelistEfetiva.length ? '<i class="' + safelistEfetiva.join(' ') + '"></i>' : ''

  if (opcoes.split) {
    if (usarCache) paginasRemovidas = cacheJS.limparPaginasApagadas(manifest, paginas.map((p) => p.rel))
    for (const p of paginas) {
      const fantasma = fantasmaDe()
      const cssAbs = path.join(outAbs, slugPagina(p.rel) + '.css')
      p.cssAbs = cssAbs
      let feito = false
      if (usarCache) {
        // chave por página = sha256(conteúdo normalizado + fantasma + digital)
        const chave = cacheJS.chavePagina(p.normHash, fantasma, digital)
        const ent = manifest.paginas[p.rel]
        if (ent && ent.chave === chave && ent.cssAbs === relCaminho(cssAbs)) {
          const h = cacheJS.hashFicheiro(cssAbs)
          if (h !== null && h === ent.cssHash) {
            // HIT — nada é compilado nem escrito
            cacheHits++
            p._cacheHit = true
            totalRegras += ent.regras || 0
            if (ent.desconhecidas) for (const t of ent.desconhecidas) desconhecidas.add(t)
            if (ent.temaTokens) for (const t of ent.temaTokens) possiveisTema.add(t)
            feito = true
          }
        }
        if (!feito) {
          cacheMisses++
          const coletor = { desconhecidas: new Set(), temaTokens: new Set() }
          const buildFinal = obterMotor().build(p.conteudo + fantasma)
          const nRegras = escreverCSS(cssAbs, buildFinal, p, coletor)
          manifest.paginas[p.rel] = {
            ...(manifest.paginas[p.rel] || {}),
            chave,
            cssAbs: relCaminho(cssAbs),
            cssHash: cacheJS.hashFicheiro(cssAbs),
            regras: nRegras,
            normHash: p.normHash,
            desconhecidas: [...coletor.desconhecidas],
            temaTokens: [...coletor.temaTokens],
          }
        }
      } else {
        const coletor = { desconhecidas: new Set(), temaTokens: new Set() }
        const buildFinal = obterMotor().build(p.conteudo + fantasma)
        escreverCSS(cssAbs, buildFinal, p, coletor)
      }
    }
  } else {
    // modo CSS único: assinatura de classes por página (guardada); só
    // reconstrói quando a assinatura de alguma página muda (ou a digital)
    let houveMudanca = usarCache ? false : true
    if (usarCache) {
      paginasRemovidas = cacheJS.limparPaginasApagadas(manifest, paginas.map((p) => p.rel))
      for (const p of paginas) {
        const ent = manifest.paginas[p.rel]
        if (ent && ent.normHash === p.normHash && ent.classesHash) {
          // conteúdo igual ao da última execução → contribuição idêntica
          cacheHits++
          continue
        }
        // o conteúdo mudou: comparar a ASSINATURA de classes — se for igual
        // (mudança só de texto), a contribuição para o CSS é a mesma
        const assin = htmlscan.assinaturaPagina(p.conteudo)
        const classesHash = cacheJS.sha256(cacheJS.jsonEstavel([...new Set(assin.els.flat())].sort()))
        const sigScripts = cacheJS.sha256(cacheJS.jsonEstavel(assin.scripts))
        p._classesNovas = { classesHash, sigScripts }
        if (ent && ent.classesHash === classesHash && ent.sigScripts === sigScripts) {
          cacheHits++
        } else {
          cacheMisses++
          houveMudanca = true
        }
      }
      if (manifestAnterior && manifestAnterior.digital !== digital) houveMudanca = true
    }
    const fantasma = fantasmaDe()
    const cssAbs = path.join(outAbs, opcoes.nome.replace(/\.css$/, '') + '.css')
    let hitCss = false
    if (usarCache && !houveMudanca && manifest.cssUnico) {
      const chaveUnico = cacheJS.chaveCssUnico(
        paginas.map(
          (p) => (p._classesNovas || manifest.paginas[p.rel] || {}).classesHash || p.normHash,
        ),
        digital,
      )
      const h = cacheJS.hashFicheiro(cssAbs)
      if (manifest.cssUnico.chave === chaveUnico && h !== null && h === manifest.cssUnico.cssHash) {
        // HIT — CSS intacto: assinaturas de classes e digital iguais
        hitCss = true
        totalRegras += manifest.cssUnico.regras || 0
        if (manifest.cssUnico.desconhecidas) {
          for (const t of manifest.cssUnico.desconhecidas) desconhecidas.add(t)
        }
        if (manifest.cssUnico.temaTokens) {
          for (const t of manifest.cssUnico.temaTokens) possiveisTema.add(t)
        }
        for (const p of paginas) p.cssAbs = cssAbs
      }
    }
    if (!hitCss) {
      const htmlTodas = paginas.map((p) => p.conteudo).join('\n') + fantasma
      const coletor = { desconhecidas: new Set(), temaTokens: new Set() }
      const build = obterMotor().build(htmlTodas)
      const nRegras = escreverCSS(cssAbs, build, paginas[0], coletor)
      if (usarCache) {
        const classesHashes = []
        for (const p of paginas) {
          let classesHash = (p._classesNovas || manifest.paginas[p.rel] || {}).classesHash
          let sigScripts = (p._classesNovas || manifest.paginas[p.rel] || {}).sigScripts
          if (!classesHash) {
            const assin = htmlscan.assinaturaPagina(p.conteudo)
            classesHash = cacheJS.sha256(cacheJS.jsonEstavel([...new Set(assin.els.flat())].sort()))
            sigScripts = cacheJS.sha256(cacheJS.jsonEstavel(assin.scripts))
          }
          classesHashes.push(classesHash)
          manifest.paginas[p.rel] = {
            ...(manifest.paginas[p.rel] || {}),
            normHash: p.normHash,
            classesHash,
            sigScripts,
          }
        }
        manifest.cssUnico = {
          chave: cacheJS.chaveCssUnico(classesHashes, digital),
          cssAbs: relCaminho(cssAbs),
          cssHash: cacheJS.hashFicheiro(cssAbs),
          regras: nRegras,
          desconhecidas: [...coletor.desconhecidas],
          temaTokens: [...coletor.temaTokens],
        }
      }
      for (const p of paginas) p.cssAbs = cssAbs
    }
  }

  // ── runtime JavaScript dos plugins ───────────────────────────────────
  const runtimeFicheiros = []
  if (opcoes.runtime !== false) {
    const extraccao = runtimeJS.extrairPlugins(fs.readFileSync(caminhoMotor, 'utf8'))

    // componentes para o runtime (todos os descobertos + aliases com prefixo)
    const componentesRuntime = {}
    for (const [nome, classes] of mapaComponentes) {
      componentesRuntime[nome] = classes
      if (opcoes.prefix && !componentesRuntime[opcoes.prefix + nome]) {
        componentesRuntime[opcoes.prefix + nome] = classes
      }
    }

    const pluginsJsPagina = (p) => {
      const d = deps.porPagina.get(p.rel)
      return d ? ordenarPlugins(d.js) : []
    }
    const usaBreezePagina = (p) => {
      const guardado = p._dados
      if (guardado && guardado.usaBreeze !== undefined) return guardado.usaBreeze
      const usa = paginaUsaBreeze(p.conteudo)
      if (usarCache) p._usaBreezeNovo = usa
      return usa
    }

    const construirMeta = (pluginsJs) => ({
      plugins: pluginsJs,
      componentes: componentesRuntime,
      prefix: opcoes.prefix,
      cliVersao: VERSAO,
      motorVersao: versaoMotor,
      extraccao,
      paginas: paginas.length,
    })

    // chave do runtime: meta sem o fonte dos plugins (o hash do motor já
    // está na impressão digital) — agrupamento por assinatura de plugins
    const metaSlim = (pluginsJs) => ({
      plugins: pluginsJs,
      componentes: componentesRuntime,
      prefix: opcoes.prefix,
      cliVersao: VERSAO,
      motorVersao: versaoMotor,
      extraccao: extraccao.map((x) => x.nome + ':' + x.versao),
      paginas: paginas.length,
    })

    const gerarFicheiro = (abs, pluginsJs) => {
      const meta = construirMeta(pluginsJs)
      const rel = relCaminho(abs)
      let feito = false
      if (usarCache) {
        const chaveJS = cacheJS.chaveRuntime(metaSlim(pluginsJs))
        const ent = manifest.runtimes[rel]
        const h = cacheJS.hashFicheiro(abs)
        if (ent && ent.chave === chaveJS && h !== null && h === ent.hash) {
          feito = true // HIT — runtime idêntico, não reescreve
        } else {
          const js = runtimeJS.construirRuntime(meta)
          fs.mkdirSync(path.dirname(abs), { recursive: true })
          fs.writeFileSync(abs, js)
          escritos.push({ abs, bytes: Buffer.byteLength(js) })
          manifest.runtimes[rel] = { chave: chaveJS, hash: cacheJS.hashFicheiro(abs) }
        }
      } else {
        const js = runtimeJS.construirRuntime(meta)
        fs.mkdirSync(path.dirname(abs), { recursive: true })
        fs.writeFileSync(abs, js)
        escritos.push({ abs, bytes: Buffer.byteLength(js) })
      }
      runtimeFicheiros.push(abs)
      return abs
    }

    // plugins que o init declara garantem compatibilidade em todas as páginas
    const baseJs = ordenarPlugins([...initPluginsRuntime])

    if (opcoes.split) {
      // agrupar páginas por assinatura de runtime (plugins iguais → 1 ficheiro)
      const grupos = new Map() // assinatura → páginas
      for (const p of paginas) {
        const precisa =
          opcoes.runtime === true || pluginsJsPagina(p).length > 0 || usaBreezePagina(p)
        p._precisaRuntime = precisa
        if (!precisa) continue
        const sig = pluginsJsPagina(p).join(',')
        if (!grupos.has(sig)) grupos.set(sig, [])
        grupos.get(sig).push(p)
      }
      for (const [sig, grupo] of grupos) {
        let nomeFicheiro
        if (grupo.length > 1) nomeFicheiro = 'breeze.shared.runtime.js'
        else nomeFicheiro = slugPagina(grupo[0].rel) + '.runtime.js'
        const abs = path.join(jsDirAbs, nomeFicheiro)
        const pluginsJs = sig ? sig.split(',').filter(Boolean) : []
        gerarFicheiro(abs, ordenarPlugins([...pluginsJs, ...baseJs]))
        for (const p of grupo) p.jsAbs = abs
      }
      for (const p of paginas) if (!p._precisaRuntime) p.jsAbs = null
    } else {
      const precisa = paginas.some(
        (p) => opcoes.runtime === true || pluginsJsPagina(p).length > 0 || usaBreezePagina(p),
      )
      if (precisa || opcoes.runtime === true) {
        const jsTodas = new Set(baseJs)
        for (const p of paginas) for (const n of pluginsJsPagina(p)) jsTodas.add(n)
        const abs = path.join(jsDirAbs, opcoes.nome.replace(/\.css$/, '') + '.runtime.js')
        gerarFicheiro(abs, ordenarPlugins([...jsTodas]))
        for (const p of paginas) p.jsAbs = abs
      }
    }
  } else {
    for (const p of paginas) p.jsAbs = null
  }

  // ── limpeza de órfãos da cache (páginas apagadas, runtimes extintos) ──
  const orfaos = []
  if (usarCache && manifestAnterior) {
    if (opcoes.split) {
      for (const rem of paginasRemovidas) {
        const ent = rem.entrada
        if (ent && ent.cssAbs) {
          const abs = path.resolve(raiz, ent.cssAbs)
          if (abs.startsWith(outAbs + path.sep) && fs.existsSync(abs)) {
            try {
              fs.rmSync(abs, { force: true })
              orfaos.push(ent.cssAbs)
            } catch (e) {
              /* seguir */
            }
          }
        }
      }
    }
    const esperados = new Set(runtimeFicheiros.map(relCaminho))
    for (const relOrfao of Object.keys(manifestAnterior.runtimes || {})) {
      if (!esperados.has(relOrfao)) {
        const abs = path.resolve(raiz, relOrfao)
        if (path.dirname(abs) === jsDirAbs && fs.existsSync(abs)) {
          try {
            fs.rmSync(abs, { force: true })
            orfaos.push(relOrfao)
          } catch (e) {
            /* seguir */
          }
        }
      }
    }
    if (orfaos.length) orfaos.sort()
  }

  // ── inject: CSS + JS ─────────────────────────────────────────────────
  let injetados = 0
  const duplicacoes = []
  const substituidosBundle = []
  const avisosInject = []
  const avisosVersaoBundle = []
  const diagNovasPorPagina = new Map() // rel → diagnóstico pós-inject
  if (opcoes.inject) {
    for (const p of paginas) {
      // páginas que referem um breeze.bundle.js com versão diferente da do
      // motor usado na compilação → aviso por página (antes de substituir)
      for (const srcRef of htmlscan.referenciasBundle(p.conteudo)) {
        const absBundle = path.resolve(path.dirname(p.abs), srcRef.split(/[?#]/)[0])
        const vRef = versaoDeBundle(absBundle)
        if (vRef && vRef !== versaoMotor) {
          avisosVersaoBundle.push(
            p.rel + ': refere "' + srcRef + '" (motor ' + vRef + ') mas o build usa ' + versaoMotor,
          )
        }
      }
      let html = p.conteudo
      let alterou = false

      const href = path.relative(path.dirname(p.abs), p.cssAbs).replace(/\\/g, '/')
      const resCss = htmlscan.injetarStylesheet(html, href)
      if (resCss.alterado) alterou = true
      html = resCss.html

      if (p.jsAbs) {
        const src = path.relative(path.dirname(p.abs), p.jsAbs).replace(/\\/g, '/')
        const resJs = htmlscan.injetarRuntime(html, { src, defer: true })
        if (resJs.alterado) alterou = true
        html = resJs.html
        substituidosBundle.push(...resJs.substituidos)
        for (const a of resJs.avisos) avisosInject.push(p.rel + ': ' + a)
      } else {
        const resStale = htmlscan.removerRuntime(html)
        if (resStale.alterado) {
          alterou = true
          html = resStale.html
        }
      }

      // Proteger só as chamadas BreezeCSS independentes. Um BreezeCSS
      // ausente não deve interromper Emerge, Elyra nem o restante JS inline.
      // As definições permanecem no HTML para a próxima compilação.
      const resGuard = htmlscan.protegerChamadasBreeze(html)
      if (resGuard.alterado) alterou = true
      html = resGuard.html

      if (alterou) {
        fs.writeFileSync(p.abs, html)
        injetados++
        if (usarCache) {
          // o ficheiro mudou: actualizar normHash, chave, classes e
          // diagnóstico do estado FINAL (posições correctas para as
          // próximas execuções). O conteúdo normalizado é o mesmo de
          // antes do inject — o CSS construído continua válido.
          p.normHash = cacheJS.sha256(htmlscan.normalizarParaCache(html))
          const assin = htmlscan.assinaturaPagina(html)
          const ent = manifest.paginas[p.rel] || {}
          ent.normHash = p.normHash
          if (opcoes.split && p.cssAbs) {
            ent.chave = cacheJS.chavePagina(p.normHash, fantasmaDe(), digital)
          }
          ent.classesHash = cacheJS.sha256(cacheJS.jsonEstavel([...new Set(assin.els.flat())].sort()))
          ent.sigScripts = cacheJS.sha256(cacheJS.jsonEstavel(assin.scripts))
          const resDiag = diagnosticarPagina(p)
          ent.diagnostico = resDiag.itens
          manifest.paginas[p.rel] = ent
          diagNovasPorPagina.set(p.rel, resDiag.itens)
        }
      }
      p.conteudo = html

      const conta = htmlscan.contarGeridos(html)
      if (conta.css > 1 || conta.js > 1) {
        duplicacoes.push(p.rel + ` (${conta.css} css, ${conta.js} js)`)
      }
    }
  }
  if (diagNovasPorPagina.size) {
    // substitui, de uma vez, os diagnósticos das páginas que o inject alterou
    const semPaginasAlteradas = itensDiag.filter(
      (d) => d && !diagNovasPorPagina.has(d.ficheiro),
    )
    itensDiag.length = 0
    itensDiag.push(...semPaginasAlteradas)
    for (const itens of diagNovasPorPagina.values()) itensDiag.push(...itens)
  }
  for (const mensagem of new Set(motor ? motor.erros : (manifest.errosMotor || []))) {
    if (mensagem.startsWith('Valor CSS inválido:')) itensDiag.push({ ...diagnosticoJS.itemAvisoMotor(mensagem), codigo: 'valor-css-invalido', severidade: 'erro' })
  }
  const diagnosticoFinal = itensDiag.filter(Boolean)
  const diagnostico = {
    itens: diagnosticoFinal,
    erros: diagnosticoFinal.filter((d) => d.severidade === 'erro').length,
    avisos: diagnosticoFinal.filter((d) => d.severidade === 'aviso').length,
  }

  // ── consolidar análises por página no manifest e guardar ─────────────
  if (usarCache) {
    for (const p of paginas) {
      const ent = manifest.paginas[p.rel] || {}
      if (p._depsNovas) ent.deps = { css: p._depsNovas.css, js: p._depsNovas.js }
      if (p._diagnosticoNovo) ent.diagnostico = p._diagnosticoNovo
      if (p._componentesScriptsNovos) ent.componentesScripts = p._componentesScriptsNovos
      if (p._tokensScriptNovos) ent.tokensScript = p._tokensScriptNovos
      if (p._usaBreezeNovo !== undefined) ent.usaBreeze = p._usaBreezeNovo
      ent.normHash = p.normHash
      manifest.paginas[p.rel] = ent
    }
    // escrita atómica; falha nunca derruba o build
    if (!opcoes.limparCache) cacheJS.guardar(dirCache, manifest)
  }

  const ms = Date.now() - t0
  return {
    paginas,
    escritos,
    totalRegras,
    desconhecidas: [...desconhecidas],
    possiveisTema: [...possiveisTema].sort(),
    temaAplicado,
    componentes: [...nomesComponentesLista],
    fontesComponentes,
    initDescoberto: initDescoberto ? initDescoberto.caminho : null,
    injetados,
    duplicacoes,
    substituidosBundle,
    avisosInject,
    avisosVersaoBundle,
    runtimeFicheiros,
    pluginsRegistar,
    orfaos,
    diagnostico,
    cache: usarCache ? { hits: cacheHits, misses: cacheMisses, pasta: relCaminho(dirCache) } : null,
    usarCache,
    ms,
    motor: motor || { versao: versaoMotor, caminho: caminhoMotor, avisos: usarCache ? manifest.avisosMotor : [], erros: usarCache ? manifest.errosMotor : [] },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Relatório
// ─────────────────────────────────────────────────────────────────────────

function imprimirRelatorio(res, opcoes, diagItens) {
  const bytesCss = res.escritos
    .filter((f) => f.abs.endsWith('.css'))
    .reduce((a, f) => a + f.bytes, 0)
  const bytesJs = res.escritos
    .filter((f) => f.abs.endsWith('.js'))
    .reduce((a, f) => a + f.bytes, 0)
  const rel = (abs) => path.relative(process.cwd(), abs).replace(/\\/g, '/')
  const itensDiag = diagnosticoJS.filtrarDiagnosticos(
    diagItens || (res.diagnostico && res.diagnostico.itens) || [],
    opcoes,
  )

  console.log(`BreezeCLI ${VERSAO}`)
  console.log('')

  if (opcoes.split) {
    for (const p of res.paginas) {
      const plugins = ordenarPlugins([...(p._depsCss || []), ...(p._depsJs || [])])
      console.log(`✓ ${p.rel}`)
      console.log(`  CSS: ${rel(p.cssAbs)}`)
      if (p.jsAbs) console.log(`  JS:  ${rel(p.jsAbs)}`)
      console.log(`  Plugins: ${plugins.length ? plugins.join(', ') : 'nenhum'}`)
      console.log('')
    }
  } else {
    const plugins = ordenarPlugins([
      ...new Set(res.paginas.flatMap((p) => [...(p._depsCss || []), ...(p._depsJs || [])])),
    ])
    console.log(`✓ todas as páginas (${res.paginas.length})`)
    console.log(`  CSS: ${rel(res.paginas[0].cssAbs)}`)
    const jsAbs = res.paginas.map((p) => p.jsAbs).find(Boolean)
    if (jsAbs) console.log(`  JS:  ${rel(jsAbs)}`)
    console.log(`  Plugins: ${plugins.length ? plugins.join(', ') : 'nenhum'}`)
    console.log('')
  }

  if (opcoes.inject) {
    console.log(`✓ CSS${res.runtimeFicheiros.length ? ' e JavaScript' : ''} injetados`)
    if (res.duplicacoes.length) {
      console.log('  ⚠ referências duplicadas em: ' + res.duplicacoes.join(', '))
    } else {
      console.log('✓ Nenhuma referência duplicada')
    }
    for (const s of res.substituidosBundle.slice(0, 5)) {
      console.log(`  · bundle original substituído: ${s}`)
    }
    for (const a of res.avisosInject.slice(0, 5)) {
      console.log('  ⚠ ' + a)
    }
    for (const a of (res.avisosVersaoBundle || []).slice(0, 5)) {
      console.log('  ⚠ ' + a + ' — o runtime compilado substitui-o; regenera o bundle ou alinha as versões')
    }
  }

  const partes = [
    res.paginas.length === 1 ? '1 página' : res.paginas.length + ' páginas',
    res.totalRegras + ' regras',
    kb(bytesCss) + ' CSS',
    bytesJs ? kb(bytesJs) + ' runtime' : null,
    res.ms + ' ms',
    'motor ' + res.motor.versao,
  ].filter(Boolean)
  console.log('✓ ' + partes.join(' · '))
  if (res.usarCache && res.cache) {
    console.log(`✓ cache: ${res.cache.hits} hits / ${res.cache.misses} misses (${res.cache.pasta}/)`)
    if (res.orfaos && res.orfaos.length) {
      console.log('  · órfãos apagados: ' + res.orfaos.join(', '))
    }
  }
  console.log('✓ Zero dependências npm externas')

  // diagnósticos (texto agrupado por ficheiro; --report json usa o JSON)
  if (itensDiag.length) {
    const erros = itensDiag.filter((d) => d.severidade === 'erro').length
    const avisos = itensDiag.filter((d) => d.severidade === 'aviso').length
    const infos = itensDiag.length - erros - avisos
    const partesDiag = [erros + ' erro(s)', avisos + ' aviso(s)']
    if (infos) partesDiag.push(infos + ' nota(s)')
    const etiqueta = opcoes.watch && diagItens ? 'novos/alterados' : 'diagnóstico'
    console.log(`⚠ ${etiqueta}: ${partesDiag.join(', ')} em ${new Set(itensDiag.map((d) => d.ficheiro)).size} ficheiro(s)`)
    console.log(diagnosticoJS.formatarTexto(itensDiag))
  }

  // notas (mantidas do 1.1.0)
  if (res.desconhecidas.length) {
    console.log(
      `  nota: ${res.desconhecidas.length} classe(s) não geradas (não são do Breeze)`,
    )
    if (opcoes.verboso) {
      for (const c of res.desconhecidas.slice(0, 20)) console.log('    - ' + c)
      if (res.desconhecidas.length > 20) console.log('    - … +' + (res.desconhecidas.length - 20))
    }
  }
  if (opcoes.allPluginCss) {
    console.log('  nota: CSS completo dos plugins incluído (--all-plugin-css)')
  }
  if (res.initDescoberto) {
    console.log('  nota: tema/plugins lidos de ' + res.initDescoberto + ' (BreezeCSS.init)')
  }
  if (res.componentes && res.componentes.length) {
    const fc = res.fontesComponentes || {}
    const fontes = [
      fc.config ? 'breeze.config.js' : null,
      fc.scripts ? '<script> inline' : null,
      fc.js ? 'ficheiros .js/.jsx/.vue' : null,
    ]
      .filter(Boolean)
      .join(' + ')
    console.log(
      '  nota: componentes exportados: ' +
        res.componentes.join(', ') +
        (fontes ? '  (' + fontes + ')' : ''),
    )
  }
  if (!res.temaAplicado && res.possiveisTema.length) {
    const exemplos = res.possiveisTema.slice(0, 5).join(', ')
    console.log(
      '  nota: ' +
        res.possiveisTema.length +
        ' classe(s) parecem usar nomes do tema (' +
        exemplos +
        ') mas nenhum tema foi aplicado',
    )
    console.log(
      '        → cria um breeze.config.js com o tema, usa --tema, ou garante o',
    )
    console.log('          BreezeCSS.init(…) no projecto (é descoberto automaticamente)')
  }
  if (opcoes.verboso) {
    console.log('  motor: ' + res.motor.caminho)
    console.log(
      '  plugins registados: ' +
        (res.pluginsRegistar === null
          ? 'todos'
          : res.pluginsRegistar.length
            ? res.pluginsRegistar.join(', ')
            : 'nenhum'),
    )
    console.log(
      '  runtime: ' +
        (res.runtimeFicheiros.length
          ? res.runtimeFicheiros.map(rel).join(', ')
          : 'não gerado'),
    )
    if (opcoes.tema) {
      const seccoes = Object.entries(opcoes.tema)
        .map(([s, v]) => s + '(' + Object.keys(v).length + ')')
        .join(', ')
      console.log('  tema: ' + seccoes)
    }
    if (res.motor.avisos.length) {
      console.log('  avisos do motor:')
      for (const a of res.motor.avisos.slice(0, 10)) console.log('    - ' + a)
    }
    if (res.motor.erros.length) {
      console.log('  erros do motor:')
      for (const e of res.motor.erros.slice(0, 10)) console.log('    - ' + e)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Relatório JSON (--report json — para CI; sai pelo stdout)
// ─────────────────────────────────────────────────────────────────────────

function imprimirRelatorioJSON(res, opcoes) {
  const rel = (abs) => path.relative(process.cwd(), abs).replace(/\\/g, '/')
  const d0 = res.diagnostico || { itens: [], erros: 0, avisos: 0 }
  const itensF = diagnosticoJS.filtrarDiagnosticos(d0.itens, opcoes)
  const d = {
    itens: itensF,
    erros: itensF.filter((x) => x.severidade === 'erro').length,
    avisos: itensF.filter((x) => x.severidade === 'aviso').length,
  }
  const saida = {
    cli: VERSAO,
    motor: res.motor.versao,
    motorCaminho: rel(res.motor.caminho),
    paginas: res.paginas.length,
    regras: res.totalRegras,
    escritos: res.escritos.map((f) => rel(f.abs)),
    injetados: res.injetados,
    orfaos: (res.orfaos || []).map(rel),
    cache: res.usarCache ? { hits: res.cache.hits, misses: res.cache.misses } : null,
    plugins: res.pluginsRegistar === null ? 'all' : res.pluginsRegistar,
    ms: res.ms,
    diagnostico: {
      erros: d.erros,
      avisos: d.avisos,
      itens: d.itens.map((i) => ({
        ficheiro: i.ficheiro,
        linha: i.linha,
        coluna: i.coluna,
        classe: i.classe,
        severidade: i.severidade,
        codigo: i.codigo,
        mensagem: i.mensagem,
        sugestao: i.sugestao,
      })),
    },
  }
  console.log(JSON.stringify(saida, null, 2))
}

// ─────────────────────────────────────────────────────────────────────────
// Watch
// ─────────────────────────────────────────────────────────────────────────

function vigiar(opcoes, resInicial) {
  emWatch = true
  const raiz = process.cwd()
  const outAbs = path.resolve(raiz, opcoes.out)
  const jsAbs = pastaJS(raiz, opcoes)
  const cacheAbs = cacheJS.pastaCache(raiz, opcoes)
  const pendentes = new Set()
  let temporizador = null
  const watchers = []
  // o build inicial já mostrou os diagnósticos — o diff começa deles
  let chavesDiagAnteriores = new Set(
    (((resInicial && resInicial.diagnostico) || { itens: [] }).itens || []).map((d) =>
      diagnosticoJS.chaveDiagnostico(d),
    ),
  )

  console.log('\nbreeze: a vigiar alterações — Ctrl+C para sair')

  function relevante(f) {
    const abs = path.resolve(raiz, f)
    if (abs === outAbs || abs.startsWith(outAbs + path.sep)) return false
    if (abs === jsAbs || abs.startsWith(jsAbs + path.sep)) return false
    if (abs === cacheAbs || abs.startsWith(cacheAbs + path.sep)) return false
    if (/[/\\]node_modules[/\\]/.test(f) || f.startsWith('.git')) return false
    if (/[/\\]vendor[/\\]/.test(f) || /\.min\.js$/.test(f)) return false
    return (
      /\.(html?|htm)$/i.test(f) ||
      /breeze(\.min)?\.bundle\.js$/.test(f) ||
      /^breeze\.config\.(js|cjs|json)$/.test(f) ||
      /\.(js|mjs|cjs|ts|mts|cts|jsx|tsx|vue|svelte)$/i.test(f)
    )
  }

  function agendar() {
    clearTimeout(temporizador)
    temporizador = setTimeout(() => {
      const mudados = [...pendentes]
      pendentes.clear()
      const hits = mudados.filter(relevante)
      if (!hits.length) return
      console.log('\nbreeze: alteração em ' + hits[0] + (hits.length > 1 ? ` (+${hits.length - 1})` : ''))
      try {
        const res = construir(opcoes)
        // no watch, os diagnósticos repetidos são escondidos: só aparecem
        // os novos ou alterados (a cache evita o loop com as escritas do
        // inject: rebuild sem alterações → hits → zero ficheiros escritos)
        const itensDiag = res.diagnostico ? res.diagnostico.itens : []
        const diff = diagnosticoJS.filtrarNovos(itensDiag, chavesDiagAnteriores)
        chavesDiagAnteriores = diff.chaves
        imprimirRelatorio(res, opcoes, diff.novos)
        console.log('\nbreeze: a vigiar alterações — Ctrl+C para sair')
      } catch (e) {
        console.error('breeze: build falhou — ' + e.message)
      }
    }, 150)
  }

  try {
    watchers.push(fs.watch(raiz, { recursive: true }, (ev, f) => {
      if (f) pendentes.add(f.replace(/\\/g, '/'))
      agendar()
    }))
  } catch (e) {
    // fallback sem recursividade: vigiar cada pasta (podada)
    const pastas = []
    ;(function recolher(dir) {
      pastas.push(dir)
      let entradas
      try {
        entradas = fs.readdirSync(dir, { withFileTypes: true })
      } catch (e2) {
        return
      }
      for (const ent of entradas) {
        if (!ent.isDirectory()) continue
        const abs = path.join(dir, ent.name)
        const rel = path.relative(raiz, abs).replace(/\\/g, '/')
        if (/node_modules|^\..*|^\.git/.test(rel)) continue
        if (abs === outAbs || abs === jsAbs) continue
        recolher(abs)
      }
    })(raiz)
    for (const pasta of pastas) {
      try {
        watchers.push(
          fs.watch(pasta, (ev, f) => {
            if (f) pendentes.add(path.relative(raiz, path.join(pasta, f)).replace(/\\/g, '/'))
            agendar()
          }),
        )
      } catch (e2) {
        /* ignorar */
      }
    }
  }

  process.on('SIGINT', () => {
    console.log('\nbreeze: até já')
    process.exit(0)
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

function main() {
  const opcoes = analisarArgs(process.argv.slice(2))

  if (opcoes.ajuda) {
    console.log(AJUDA)
    return
  }
  if (opcoes.versao) {
    console.log('breeze v' + VERSAO)
    return
  }

  const configAplicada = aplicarConfigFicheiro(opcoes)
  if (configAplicada && opcoes.verboso) {
    console.log(
      'breeze: config carregada de ' +
        path.relative(process.cwd(), configAplicada.caminho).replace(/\\/g, '/'),
    )
  }

  if (opcoes.clean) {
    fs.rmSync(path.resolve(process.cwd(), opcoes.out), { recursive: true, force: true })
    fs.rmSync(pastaJS(process.cwd(), opcoes), { recursive: true, force: true })
  }

  const res = construir(opcoes)

  const itensFiltrados = diagnosticoJS.filtrarDiagnosticos(
    (res.diagnostico && res.diagnostico.itens) || [],
    opcoes,
  )
  const errosDiag = itensFiltrados.filter((d) => d.severidade === 'erro').length
  if (opcoes.report === 'json') {
    // CI: só o JSON no stdout (avisos continuam no stderr)
    imprimirRelatorioJSON(res, opcoes)
  } else {
    imprimirRelatorio(res, opcoes)
  }

  // --strict: código de saída 1 quando há erros de diagnóstico
  if (opcoes.strict && errosDiag > 0) process.exitCode = 1

  if (opcoes.watch) vigiar(opcoes, res)
}

main()
