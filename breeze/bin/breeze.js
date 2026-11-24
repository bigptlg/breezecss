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
const { criarHospedeiro, prefixarClasse } = require('../lib/engine')
const cssgen = require('../lib/cssgen')
const configJS = require('../lib/config')
const initscan = require('../lib/initscan')
const compJS = require('../lib/components')
const plugdep = require('../lib/plugdep')
const runtimeJS = require('../lib/runtime')
const tplscan = require('../lib/tplscan')

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
  --inject               Insere/actualiza nos HTML o <link> do CSS E o
                         <script> do runtime (idempotente; substitui o
                         breeze.bundle.js original pelo runtime compilado)

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

function erro(msg) {
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

  // ── descobrir o BreezeCSS.init(…)/BreezeConfig do projecto ───────────
  let initDescoberto = null
  if (!opcoes.semInit) {
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

  // ── páginas (ler primeiro: a deteção de plugins depende delas) ───────
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
    const excluir = [...opcoes.excluir, opcoes.out, ...exclusoesCli]
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

  // ── componentes (BreezeCSS.addComponent) ────────────────────────────
  const jsDirAbs = pastaJS(raiz, opcoes)
  const mapaComponentes = compJS.descobrirComponentes({
    raiz,
    paginas,
    out: opcoes.out,
    excluirExtra: [opcoes.jsOut || path.relative(raiz, jsDirAbs), ...exclusoesCli],
    config: opcoes._componentesConfig || null,
  })
  const fontesComponentes = mapaComponentes._fontes || { config: 0, scripts: 0, js: 0 }

  // ── templates SPA (JSX/TSX/Vue/Angular) ──────────────────────────────
  const modoAuto = opcoes.plugins === 'auto'
  let tokensTpl = new Set()
  if (opcoes.tpl || modoAuto) {
    const mapaTpl = tplscan.descobrirClassesTemplate({
      raiz,
      excluir: [opcoes.out, opcoes.jsOut || path.relative(raiz, jsDirAbs), 'node_modules', '.git', ...exclusoesCli],
    })
    for (const tokens of mapaTpl.values()) {
      for (const t of tokens) tokensTpl.add(t)
    }
    // e os <script> inline das próprias páginas (SPAs com classes só no JS)
    for (const p of paginas) {
      for (const t of tplscan.extrairDeHTML(p.conteudo || '')) tokensTpl.add(t)
    }
  }

  // ── deteção de dependências de plugins (por página) ──────────────────
  const initPluginsRuntime =
    initDescoberto && Array.isArray(initDescoberto.plugins) ? initDescoberto.plugins : []
  const deps = plugdep.analisar({
    paginas,
    mapaComponentes,
    prefix: opcoes.prefix,
    initPlugins: initPluginsRuntime,
    tokensGlobais: [...tokensTpl, ...opcoes.safelist],
  })
  // deps por página ficam na própria página (relatório e runtime)
  for (const p of paginas) {
    const d = deps.porPagina.get(p.rel)
    p._depsCss = d ? d.css : []
    p._depsJs = d ? d.js : []
  }

  // classes de templates compilam para o CSS quando --tpl (ou auto);
  // os tokens do utilizador (--safelist) mantêm-se sempre
  const safelistEfetiva = [...opcoes.safelist]
  if (opcoes.tpl || modoAuto) {
    for (const t of tokensTpl) if (!safelistEfetiva.includes(t)) safelistEfetiva.push(t)
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

  const caminhoMotor = localizarMotor(raiz, opcoes.engine)
  const motor = criarHospedeiro({
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

  // registar componentes no motor (para o CSS .card { … }) — listas
  // achatadas (sem ciclos) para o motor expandir sem estourar a pilha
  for (const [nome, classes] of mapaSeguro) {
    motor.registarComponente(nome, classes)
  }
  const regrasComponentes = motor.regrasComponentes([...motor.componentes.keys()])
  const nomesComponentes = new Set(motor.componentes.keys())

  const cfg = motor.configInterna
  const folhasPlugins = motor.estilosPlugins()
  const desconhecidas = new Set()
  const possiveisTema = new Set()
  let totalRegras = 0
  const escritos = []

  // deps de CSS de uma página (ou globais, no modo não-split)
  function cssDepsDa(pagina) {
    if (opcoes.split) {
      const d = deps.porPagina.get(pagina.rel)
      return new Set(d ? d.css : [])
    }
    const todas = new Set()
    for (const d of deps.porPagina.values()) for (const n of d.css) todas.add(n)
    return todas
  }

  const escreverCSS = (nomeFicheiro, { regras, elementos }, pagina) => {
    const regrasTransform = cssgen.construirRegrasTransform(elementos, cfg)
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
      }
    }

    // CSS de suporte dos plugins: só dos plugins detectados na página
    // (deps inclui membros de componentes); --all-plugin-css inclui tudo.
    const cssDeps = cssDepsDa(pagina)
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
    for (const nome of motor.componentes.keys()) {
      if (tokens.has(nome)) componentesUsados.set(nome, regrasComponentes.get(nome) || [])
    }
    if (componentesUsados.size) {
      const membros = new Map()
      for (const nome of componentesUsados.keys()) {
        const classes = mapaComponentes.get(nome) || motor.componentes.get(nome) || []
        membros.set(nome, classes.map((c) => prefixarClasse(c, opcoes.prefix)))
      }
      componentesCss.push(...cssgen.construirRegrasTransformComponentes(membros, cfg))
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
        if (!nomesComponentes.has(t) && !cssgen.classeRelevante(t, cfg)) desconhecidas.add(t)
      }
    }
    return nomeFicheiro
  }

  const outAbs = path.resolve(raiz, opcoes.out)

  if (opcoes.split) {
    for (const p of paginas) {
      const fantasma = safelistEfetiva.length
        ? '<i class="' + safelistEfetiva.join(' ') + '"></i>'
        : ''
      const buildFinal = motor.build(p.conteudo + fantasma)
      const cssAbs = path.join(outAbs, slugPagina(p.rel) + '.css')
      escreverCSS(cssAbs, buildFinal, p)
      p.cssAbs = cssAbs
    }
  } else {
    const fantasma = safelistEfetiva.length
      ? '<i class="' + safelistEfetiva.join(' ') + '"></i>'
      : ''
    const htmlTodas = paginas.map((p) => p.conteudo).join('\n') + fantasma
    const build = motor.build(htmlTodas)
    const cssAbs = path.join(outAbs, opcoes.nome.replace(/\.css$/, '') + '.css')
    escreverCSS(cssAbs, build, paginas[0])
    for (const p of paginas) p.cssAbs = cssAbs
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

    const construirMeta = (pluginsJs) => ({
      plugins: pluginsJs,
      componentes: componentesRuntime,
      prefix: opcoes.prefix,
      cliVersao: VERSAO,
      motorVersao: motor.versao,
      extraccao,
      paginas: paginas.length,
    })

    const gerarFicheiro = (abs, pluginsJs) => {
      const js = runtimeJS.construirRuntime(construirMeta(pluginsJs))
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, js)
      escritos.push({ abs, bytes: Buffer.byteLength(js) })
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
          opcoes.runtime === true ||
          pluginsJsPagina(p).length > 0 ||
          paginaUsaBreeze(p.conteudo)
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
        (p) => opcoes.runtime === true || pluginsJsPagina(p).length > 0 || paginaUsaBreeze(p.conteudo),
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

  // ── inject: CSS + JS ─────────────────────────────────────────────────
  let injetados = 0
  const duplicacoes = []
  const substituidosBundle = []
  const avisosInject = []
  if (opcoes.inject) {
    for (const p of paginas) {
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
      }
      p.conteudo = html

      const conta = htmlscan.contarGeridos(html)
      if (conta.css > 1 || conta.js > 1) {
        duplicacoes.push(p.rel + ` (${conta.css} css, ${conta.js} js)`)
      }
    }
  }

  const ms = Date.now() - t0
  return {
    paginas,
    escritos,
    totalRegras,
    desconhecidas: [...desconhecidas],
    possiveisTema: [...possiveisTema].sort(),
    temaAplicado,
    componentes: [...nomesComponentes],
    fontesComponentes,
    initDescoberto: initDescoberto ? initDescoberto.caminho : null,
    injetados,
    duplicacoes,
    substituidosBundle,
    avisosInject,
    runtimeFicheiros,
    pluginsRegistar,
    ms,
    motor,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Relatório
// ─────────────────────────────────────────────────────────────────────────

function imprimirRelatorio(res, opcoes) {
  const bytesCss = res.escritos
    .filter((f) => f.abs.endsWith('.css'))
    .reduce((a, f) => a + f.bytes, 0)
  const bytesJs = res.escritos
    .filter((f) => f.abs.endsWith('.js'))
    .reduce((a, f) => a + f.bytes, 0)
  const rel = (abs) => path.relative(process.cwd(), abs).replace(/\\/g, '/')

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
  }

  const partes = [
    res.paginas.length === 1 ? '1 página' : res.paginas.length + ' páginas',
    res.totalRegras + ' regras',
    kb(bytesCss) + ' CSS',
    bytesJs ? kb(bytesJs) + ' runtime' : null,
    res.ms + ' ms',
  ].filter(Boolean)
  console.log('✓ ' + partes.join(' · '))
  console.log('✓ Zero dependências npm externas')

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
// Watch
// ─────────────────────────────────────────────────────────────────────────

function vigiar(opcoes) {
  const raiz = process.cwd()
  const outAbs = path.resolve(raiz, opcoes.out)
  const jsAbs = pastaJS(raiz, opcoes)
  const pendentes = new Set()
  let temporizador = null
  const watchers = []

  console.log('\nbreeze: a vigiar alterações — Ctrl+C para sair')

  function relevante(f) {
    const abs = path.resolve(raiz, f)
    if (abs === outAbs || abs.startsWith(outAbs + path.sep)) return false
    if (abs === jsAbs || abs.startsWith(jsAbs + path.sep)) return false
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
        imprimirRelatorio(res, opcoes)
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
  imprimirRelatorio(res, opcoes)

  if (opcoes.watch) vigiar(opcoes)
}

main()
