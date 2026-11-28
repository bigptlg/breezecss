'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/diagnostico.js
//
// FIM DAS FALHAS SILENCIOSAS — o motor descarta classes inválidas, variantes
// inexistentes e classes ao estilo Tailwind sem dizer nada. Este módulo
// analisa os tokens do projecto ANTES/INDEPENDENTE do motor e produz
// diagnósticos com posição:
//
//   { ficheiro, linha, coluna, classe, severidade, codigo, mensagem, sugestao }
//
// Códigos:
//   prefixo-desconhecido            erro    marge[10px]  (sem mapeamento)
//   variante-desconhecida           erro    aria-expanded:flex, has-[x]:flex
//   sintaxe-invalida                erro    p[10px, p[] , p[1]0]
//   estilo-tailwind                 aviso   p-4, bg-blue-500, w-full
//   modificador-opacidade-nao-…     erro    bg[#000]/50
//   classe-dinamica-suspeita        aviso   `p[${n}px]`  → --safelist
//   aviso-motor                     aviso   avisos emitidos pelo próprio motor
//   nao-breeze                      info    só com --verbose (classes próprias)
//
// Regra de ruído: só classes com FORMA DE BREEZE (contêm "[" ou um
// qualificador "x:") dão erro/aviso. Palavras simples que não são do Breeze
// (CSS próprio do utilizador) ficam no nível info (só --verbose).
// ─────────────────────────────────────────────────────────────────────────

const htmlscan = require('./htmlscan')
const tplscan = require('./tplscan')
const cssgen = require('./cssgen')

const { motivoInseguro } = require('./valor-seguro')
const MEDIAS_FIXAS = new Set(['print', 'motion-reduce', 'motion-safe'])

const CODIGO_SEVERIDADE = {
  'prefixo-desconhecido': 'erro',
  'variante-desconhecida': 'erro',
  'sintaxe-invalida': 'erro',
  'valor-perigoso': 'erro',
  'modificador-opacidade-nao-suportado': 'erro',
  'estilo-tailwind': 'aviso',
  'classe-dinamica-suspeita': 'aviso',
  'aviso-motor': 'aviso',
  'nao-breeze': 'info',
}

// ─────────────────────────────────────────────────────────────────────────
// Levenshtein — sugestões "querias dizer…?"
// ─────────────────────────────────────────────────────────────────────────

function distanciaLevenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let anterior = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) anterior[j] = j
  for (let i = 1; i <= a.length; i++) {
    const atual = [i]
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      atual[j] = Math.min(
        anterior[j] + 1, // apagar
        atual[j - 1] + 1, // inserir
        anterior[j - 1] + custo, // substituir
      )
    }
    anterior = atual
  }
  return anterior[b.length]
}

/** Tolerância por tamanho: palavras curtas só aceitam 1 erro de escrita. */
function tolerancia(palavra) {
  const n = String(palavra || '').length
  if (n <= 4) return 1
  if (n <= 9) return 2
  return 3
}

/**
 * A candidata mais próxima dentro da tolerância (empate → primeira).
 * @returns {string|null}
 */
function sugerir(palavra, candidatas) {
  let melhor = null
  let melhorDist = Infinity
  const tol = tolerancia(palavra)
  for (const c of candidatas) {
    const d = distanciaLevenshtein(palavra, c)
    if (d < melhorDist && d <= tol) {
      melhor = c
      melhorDist = d
    }
  }
  return melhor
}

// ─────────────────────────────────────────────────────────────────────────
// Equivalências Tailwind → Breeze (para estilo-tailwind)
// ─────────────────────────────────────────────────────────────────────────

// Escala de espaçamento Tailwind: n × 0.25rem
const PREFIXOS_ESPACO = new Set([
  'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
  'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
  'w', 'h', 'min-w', 'max-w', 'min-h', 'max-h',
  'gap', 'gap-x', 'gap-y', 'top', 'bottom', 'left', 'right', 'inset',
])

// dimensões literais
const DIMENSOES = {
  'w-full': 'w[100%]',
  'h-full': 'h[100%]',
  'w-screen': 'w[100vw]',
  'h-screen': 'h[100vh]',
  'w-fit': 'w[fit-content]',
  'h-fit': 'h[fit-content]',
  'min-w-full': 'min-w[100%]',
  'min-h-screen': 'min-h[100vh]',
}

// tamanhos de letra (text-* é cor no Breeze → font-size[…])
const TAMANHOS_LETRA = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
}

// paleta mínima (tons mais usados) — só onde o equivalente é conhecido
const CORES = {
  black: '#000',
  white: '#fff',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'orange-500': '#f97316',
  'amber-500': '#f59e0b',
  'yellow-500': '#eab308',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'emerald-500': '#10b981',
  'teal-500': '#14b8a6',
  'cyan-500': '#06b6d4',
  'sky-500': '#0ea5e9',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'indigo-500': '#6366f1',
  'violet-500': '#8b5cf6',
  'purple-500': '#a855f7',
  'fuchsia-500': '#d946ef',
  'pink-500': '#ec4899',
  'rose-500': '#f43f5e',
  'gray-100': '#f3f4f6',
  'gray-500': '#6b7280',
  'gray-900': '#111827',
  'slate-100': '#f1f5f9',
  'slate-500': '#64748b',
  'slate-900': '#0f172a',
}

const PREFIXOS_COR = ['bg', 'text', 'border-color']

/**
 * Equivalente Breeze de uma classe ao estilo Tailwind, quando conhecido.
 * Tenta os dois cortes possíveis (min-w-4 → "min-w"+"4"; bg-blue-500 →
 * "bg"+"blue-500") e devolve a primeira equivalência conhecida.
 * @returns {string|null} ex.: "p[1rem]" para "p-4"
 */
function equivalenteTailwind(classe, prefixoMotor) {
  let t = classe
  let negativo = false
  if (t.startsWith('-') && !t.startsWith('--')) {
    negativo = true
    t = t.slice(1)
  }
  if (prefixoMotor && t.startsWith(prefixoMotor)) t = t.slice(prefixoMotor.length)
  if (!negativo && DIMENSOES[t]) return DIMENSOES[t]

  const cortes = []
  const ult = t.lastIndexOf('-')
  if (ult !== -1) cortes.push([t.slice(0, ult), t.slice(ult + 1)])
  const prim = t.indexOf('-')
  if (prim !== -1 && prim !== ult) cortes.push([t.slice(0, prim), t.slice(prim + 1)])

  for (const [prefixo, valor] of cortes) {
    if (!prefixo || !valor) continue
    // tamanho de letra primeiro (text-* é COR no Breeze → font-size[…])
    if (prefixo === 'text' && TAMANHOS_LETRA[valor] && !negativo) {
      return `font-size[${TAMANHOS_LETRA[valor]}]`
    }
    // cor: bg-blue-500 → bg[#3b82f6]
    if (PREFIXOS_COR.includes(prefixo)) {
      const hex = CORES[valor]
      if (hex) return `${prefixo}[${hex}]`
    }
    // opacity-50 → opacity[0.5]
    if (prefixo === 'opacity' && /^\d+$/.test(valor) && !negativo) {
      return `opacity[${parseInt(valor, 10) / 100}]`
    }
    // rounded-4 → rounded[1rem]
    if (prefixo === 'rounded' && /^\d+(\.\d+)?$/.test(valor)) {
      return `rounded[${negativo ? '-' : ''}${parseFloat(valor) * 0.25}rem]`
    }
    // espaçamento numérico: p-4 → p[1rem]
    if (PREFIXOS_ESPACO.has(prefixo) && /^\d+(\.\d+)?$/.test(valor)) {
      const rem = parseFloat(valor) * 0.25
      return `${prefixo}[${negativo ? '-' : ''}${rem}rem]`
    }
  }
  return null
}

/** Parece classe Tailwind (p-4, bg-blue-500)? Heurística conservadora. */
function pareceTailwind(classe, prefixoMotor) {
  let t = classe
  if (t.startsWith('-')) t = t.slice(1)
  if (prefixoMotor && t.startsWith(prefixoMotor)) t = t.slice(prefixoMotor.length)
  if (t.includes('[') || t.includes(':')) return false
  // p-4 · bg-blue-500 · w-full · text-sm · gap-x-2
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9.]+)+$/i.test(t)) return false
  if (DIMENSOES[t]) return true
  const cortes = []
  const ult = t.lastIndexOf('-')
  if (ult !== -1) cortes.push([t.slice(0, ult), t.slice(ult + 1)])
  const prim = t.indexOf('-')
  if (prim !== -1 && prim !== ult) cortes.push([t.slice(0, prim), t.slice(prim + 1)])
  for (const [prefixo, valor] of cortes) {
    if (PREFIXOS_ESPACO.has(prefixo)) return true
    if (prefixo === 'text' || prefixo === 'opacity' || prefixo === 'rounded') return true
    if (PREFIXOS_COR.includes(prefixo) && (CORES[valor] || /^[a-z]+-\d{2,3}$/.test(valor))) return true
  }
  return false
}

/** Divide pelos ':' fora de colchetes (réplica do parser do motor). */
function dividirQualificadores(classe) {
  const segmentos = []
  let atual = ''
  let dentro = false
  for (let i = 0; i < classe.length; i++) {
    const c = classe[i]
    if (c === '[') dentro = true
    if (c === ']') dentro = false
    if (c === ':' && !dentro) {
      segmentos.push(atual)
      atual = ''
    } else atual += c
  }
  segmentos.push(atual)
  return segmentos
}

/**
 * Analisa uma classe contra a config interna do motor (cfg da sonda).
 * @returns {object|null} {codigo, mensagem, sugestao} ou null se válida/
 *                        irrelevante (chamador decide o nível info).
 */
function analisarClasse(classe, cfg) {
  const norm = classe.endsWith('!') ? classe.slice(0, -1) : classe
  if (!norm) return null
  const prefixoMotor = (cfg && cfg.prefix) || ''

  // 1) sintaxe: colchetes/parênteses equilibrados
  const conta = (s, ch) => {
    let n = 0
    for (const c of s) if (c === ch) n++
    return n
  }
  if (conta(norm, '[') !== conta(norm, ']')) {
    return { codigo: 'sintaxe-invalida', mensagem: 'colchetes sem par — a classe é descartada pelo motor' }
  }
  if (conta(norm, '(') !== conta(norm, ')')) {
    return { codigo: 'sintaxe-invalida', mensagem: 'parênteses sem par — a classe é descartada pelo motor' }
  }

  // 2) qualificadores (variantes/breakpoints)
  const segmentos = dividirQualificadores(norm)
  const base = segmentos.pop()
  const tabelasQual = { ...(cfg.variantes || {}), ...(cfg.breakpoints || {}) }
  // O motor trata estas famílias à parte (Parser._separarQualificadores):
  // print, motion-reduce, motion-safe e max-<breakpoint> não estão em
  // cfg.variantes nem em cfg.breakpoints, mas são válidas.
  const eMedia = (seg) =>
    MEDIAS_FIXAS.has(seg) ||
    (seg.startsWith('max-') && (cfg.breakpoints || {})[seg.slice(4)] !== undefined)
  for (const seg of segmentos) {
    if (tabelasQual[seg] !== undefined || eMedia(seg)) continue
    const cand = sugerir(seg, Object.keys(tabelasQual))
    const sufixo = cand ? ` (querias dizer "${cand}:${base}"?)` : ''
    return {
      codigo: 'variante-desconhecida',
      mensagem: `variante "${seg}:" não existe neste motor — a classe é descartada${sufixo}`,
      sugestao: cand ? `${cand}:${base}` : undefined,
    }
  }

  let baseLimpa = base.endsWith('!') ? base.slice(0, -1) : base

  // valor arbitrário que o motor rejeita por segurança (</style>, /* sem
  // fecho, { } ;) — antes era descartado sem qualquer aviso
  const mVal = /^[a-zA-Z-]+\[([^\]]+)\]$/.exec(baseLimpa)
  if (mVal) {
    const motivo = motivoInseguro(mVal[1])
    if (motivo) {
      return {
        codigo: 'valor-perigoso',
        mensagem: 'valor arbitrário rejeitado por segurança: ' + motivo + ' — a classe é descartada',
      }
    }
  }

  // classes fixas do motor (tabelas já prefixadas) — token TAL COMO escrito
  if ((cfg.classesFixas || {})[baseLimpa] !== undefined) return null

  // modificador de opacidade bg[#000]/50 — antes do valor arbitrário: a
  // classe não acaba em "]", acaba no alfa
  const mOp = /\]\/(?:\[([^\]]*)\]|\d+(?:\.\d+)?|[^\[\]]+)$/.exec(baseLimpa)
  if (mOp) {
    const alfa = mOp[1] !== undefined ? mOp[1] : mOp[0].slice(2)
    return {
      codigo: 'modificador-opacidade-nao-suportado',
      mensagem:
        `modificador de opacidade "/${alfa}" não é suportado pelo Breeze — usa o alfa no próprio valor`,
      sugestao: sugestaoAlfa(baseLimpa, alfa),
    }
  }

  // 3) valor arbitrário  p[10px]
  const mGreedy = /^([a-zA-Z][a-zA-Z0-9-]*)\[(.*)\]$/.exec(baseLimpa)
  if (mGreedy) {
    const valor = mGreedy[2]
    if (valor.includes(']')) {
      return {
        codigo: 'sintaxe-invalida',
        mensagem: '"]" dentro do valor — a classe é descartada pelo motor',
      }
    }
    if (valor.trim() === '') {
      return {
        codigo: 'sintaxe-invalida',
        mensagem: 'valor vazio entre colchetes — a classe é descartada pelo motor',
      }
    }
    // prefixo conhecido? (mapaPropriedades já prefixado; transforms à parte)
    // prefixo conhecido? (mapaPropriedades já prefixado; transforms à parte)
    const pref = mGreedy[1]
    const semPf = prefixoMotor && pref.startsWith(prefixoMotor) ? pref.slice(prefixoMotor.length) : pref
    const mapaP = cfg.mapaPropriedades || {}
    const conhecido =
      mapaP[pref] !== undefined ||
      mapaP[semPf] !== undefined ||
      (cfg.transformPrefixos || []).includes(semPf) ||
      (cfg.transformPrefixos || []).includes(pref) ||
      cssgen.BORDER_PREFIXOS.has(semPf) ||
      cssgen.BORDER_PREFIXOS.has(pref)
    if (!conhecido) {
      // candidatas: prefixos do motor SEM o prefixo do utilizador + borders
      const candidatas = new Set([...cssgen.BORDER_PREFIXOS])
      for (const k of Object.keys(mapaP)) {
        candidatas.add(prefixoMotor && k.startsWith(prefixoMotor) ? k.slice(prefixoMotor.length) : k)
      }
      for (const k of cfg.transformPrefixos || []) candidatas.add(k)
      const cand = sugerir(semPf, [...candidatas])
      const dicaFaltaPf =
        prefixoMotor && mapaP[prefixoMotor + semPf] !== undefined && mapaP[pref] === undefined
          ? ` — com o prefixo "${prefixoMotor}" escreve "${prefixoMotor}${semPf}[${valor}]"`
          : ''
      return {
        codigo: 'prefixo-desconhecido',
        mensagem: `prefixo "${pref}[…]" não é do Breeze — a classe é descartada${dicaFaltaPf}${cand ? ` (querias dizer "${cand}[…]"?)` : ''}`,
        sugestao: cand ? `${cand}[${valor}]` : undefined,
      }
    }
    return null // valor arbitrário válido
  }

  // 4) sem "[" e sem ":" — Tailwind ou classe própria
  if (!norm.includes(':') && !norm.includes('[')) {
    if (pareceTailwind(norm, prefixoMotor)) {
      const eq = equivalenteTailwind(norm, prefixoMotor)
      return {
        codigo: 'estilo-tailwind',
        mensagem: 'classe ao estilo Tailwind — o Breeze não tem escala fixa, usa o valor directo',
        sugestao: eq || undefined,
      }
    }
    return { codigo: 'nao-breeze', mensagem: 'classe não é do Breeze (CSS próprio do utilizador)' }
  }

  // 5) tem ":" (válido) mas base sem "[" nem fixa — ex. hover:minha-classe
  if (pareceTailwind(baseLimpa, prefixoMotor)) {
    const eq = equivalenteTailwind(baseLimpa, prefixoMotor)
    return {
      codigo: 'estilo-tailwind',
      mensagem: 'classe ao estilo Tailwind — o Breeze não tem escala fixa, usa o valor directo',
      sugestao: eq || undefined,
    }
  }
  return { codigo: 'nao-breeze', mensagem: 'classe não é do Breeze (CSS próprio do utilizador)' }
}

/** bg[#000]/50 → bg[#00000080] quando o valor é hex e o alfa é percentagem. */
function sugestaoAlfa(classe, alfa) {
  const m = /^([a-zA-Z][a-zA-Z0-9-]*)\[([^\]]+)\]\/(\d+(?:\.\d+)?)$/.exec(classe)
  if (!m) return undefined
  const [, pref, valor, pct] = m
  let hex = valor.trim()
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = '#' + hex[1] + hex[2] + hex[3] + hex[1] + hex[2] + hex[3]
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return undefined
  const p = parseFloat(pct)
  if (isNaN(p) || p < 0 || p > 100) return undefined
  const a = Math.round((p / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${pref}[${hex}${a}]`
}

// ─────────────────────────────────────────────────────────────────────────
// Diagnóstico do projecto inteiro
// ─────────────────────────────────────────────────────────────────────────

/** Chave estável de um diagnóstico (para dedup e diff do --watch). */
function chaveDiagnostico(d) {
  return (
    d.ficheiro +
    ':' +
    (d.linha === null || d.linha === undefined ? '-' : d.linha) +
    ':' +
    (d.coluna === null || d.coluna === undefined ? '-' : d.coluna) +
    ':' +
    d.codigo +
    ':' +
    d.classe
  )
}

/** Compila as expressões de --ignore (inválidas são ignoradas com aviso). */
function compilarIgnorar(padroes) {
  const res = []
  for (const p of padroes || []) {
    try {
      res.push(new RegExp(p))
    } catch (e) {
      console.error('breeze: aviso — --ignore com RegExp inválida: ' + p)
    }
  }
  return res
}

/**
 * Varre páginas (HTML + scripts inline) e templates SPA e devolve os
 * diagnósticos ordenados e sem duplicados.
 * @param {object} op
 *   paginas        [{ rel, conteudo }]
 *   cfg            config interna do motor (sonda) — obrigatória
 *   mapaTpl        Map<rel, {tokens, dinamicos}> de descobrirClassesTemplateComPosicoes
 *   motorAvisos    string[] — avisos emitidos pelo motor no build
 *   verboso        incluir nível info (nao-breeze)
 *   ignorar        string[] — regexes de classes a ignorar
 * @returns {{ itens: object[], erros: number, avisos: number }}
 */
function diagnosticarProjecto(op = {}) {
  const cfg = op.cfg
  const verboso = !!op.verboso
  const ignorarRes = compilarIgnorar(op.ignorar)
  const porChave = new Map()

  const ignora = (classe) => ignorarRes.some((re) => re.test(classe))

  function add(d) {
    if (!d) return
    if (d.severidade === 'info' && !verboso) return
    if (ignora(d.classe)) return
    const k = chaveDiagnostico(d)
    if (!porChave.has(k)) porChave.set(k, d)
  }

  function classificar(ficheiro, token, pos) {
    const res = analisarClasse(token, cfg)
    if (!res) return
    add({
      ficheiro,
      linha: pos ? pos.linha : null,
      coluna: pos ? pos.coluna : null,
      classe: token,
      severidade: CODIGO_SEVERIDADE[res.codigo] || 'aviso',
      codigo: res.codigo,
      mensagem: res.mensagem,
      sugestao: res.sugestao,
    })
  }

  // 1) páginas: classes no markup (com posição) e nos scripts inline
  for (const p of op.paginas || []) {
    const html = p.conteudo || ''
    for (const el of htmlscan.parseHTML(html)) {
      for (const t of el.classList) {
        if (el._posicoesClasses && el._posicoesClasses.has(t)) {
          classificar(p.rel, t, el._posicoesClasses.get(t))
        } else {
          classificar(p.rel, t, null)
        }
      }
    }
    const inline = tplscan.extrairDeHTMLComPosicoes(html)
    for (const t of inline.tokens) classificar(p.rel, t.token, t)
    for (const d of inline.dinamicos) {
      add({
        ficheiro: p.rel,
        linha: d.linha,
        coluna: d.coluna,
        classe: d.token.length > 60 ? d.token.slice(0, 57) + '…' : d.token,
        severidade: CODIGO_SEVERIDADE['classe-dinamica-suspeita'],
        codigo: 'classe-dinamica-suspeita',
        mensagem:
          'classe construída com template literal — o valor só existe em runtime e não é compilado',
        sugestao: 'lista as variantes em --safelist (ou breeze.config.js)',
      })
    }
  }

  // 2) templates SPA (JSX/TSX/Vue/Angular/Svelte)
  for (const [rel, dados] of op.mapaTpl || []) {
    for (const t of dados.tokens || []) classificar(rel, t.token, t)
    for (const d of dados.dinamicos || []) {
      add({
        ficheiro: rel,
        linha: d.linha,
        coluna: d.coluna,
        classe: d.token.length > 60 ? d.token.slice(0, 57) + '…' : d.token,
        severidade: CODIGO_SEVERIDADE['classe-dinamica-suspeita'],
        codigo: 'classe-dinamica-suspeita',
        mensagem:
          'classe construída com template literal — o valor só existe em runtime e não é compilado',
        sugestao: 'lista as variantes em --safelist (ou breeze.config.js)',
      })
    }
  }

  // 3) avisos do próprio motor (engolidos pelo sandbox em engine.js)
  for (const a of op.motorAvisos || []) {
    add({
      ficheiro: '(motor)',
      linha: null,
      coluna: null,
      classe: a.length > 80 ? a.slice(0, 77) + '…' : a,
      severidade: CODIGO_SEVERIDADE['aviso-motor'],
      codigo: 'aviso-motor',
      mensagem: a,
    })
  }

  const itens = [...porChave.values()].sort((a, b) => {
    if (a.ficheiro !== b.ficheiro) return a.ficheiro < b.ficheiro ? -1 : 1
    const la = a.linha === null ? -1 : a.linha
    const lb = b.linha === null ? -1 : b.linha
    if (la !== lb) return la - lb
    const ca = a.coluna === null ? -1 : a.coluna
    const cb = b.coluna === null ? -1 : b.coluna
    if (ca !== cb) return ca - cb
    return a.codigo < b.codigo ? -1 : 1
  })
  return {
    itens,
    erros: itens.filter((d) => d.severidade === 'erro').length,
    avisos: itens.filter((d) => d.severidade === 'aviso').length,
  }
}

/**
 * Diff para o --watch: só os diagnósticos NOVOS ou ALTERADOS desde a
 * última reconstrução (comparação por chave estável).
 * @returns {{ novos: object[], chaves: Set<string> }}
 */
function filtrarNovos(itens, chavesAnteriores) {
  const anteriores = chavesAnteriores || new Set()
  const novos = []
  const chaves = new Set()
  for (const d of itens) {
    const k = chaveDiagnostico(d)
    chaves.add(k)
    if (!anteriores.has(k)) novos.push(d)
  }
  return { novos, chaves }
}

/** Relatório em texto, agrupado por ficheiro, com ficheiro:linha:coluna. */
function formatarTexto(itens) {
  const porFicheiro = new Map()
  for (const d of itens) {
    if (!porFicheiro.has(d.ficheiro)) porFicheiro.set(d.ficheiro, [])
    porFicheiro.get(d.ficheiro).push(d)
  }
  const linhas = []
  for (const [ficheiro, lista] of porFicheiro) {
    linhas.push(`  ${ficheiro}`)
    for (const d of lista) {
      const onde =
        d.linha === null || d.linha === undefined
          ? ''
          : `:${d.linha}:${d.coluna === null || d.coluna === undefined ? '-' : d.coluna}`
      const sugestao = d.sugestao ? ` → usa "${d.sugestao}"` : ''
      linhas.push(
        `    ${ficheiro}${onde} [${d.severidade}] ${d.codigo}: ${d.classe} — ${d.mensagem}${sugestao}`,
      )
    }
  }
  return linhas.join('\n')
}

/** Diagnóstico pronto para um aviso emitido pelo próprio motor. */
function itemAvisoMotor(mensagem) {
  return {
    ficheiro: '(motor)',
    linha: null,
    coluna: null,
    classe: String(mensagem).length > 80 ? String(mensagem).slice(0, 77) + '…' : String(mensagem),
    severidade: CODIGO_SEVERIDADE['aviso-motor'],
    codigo: 'aviso-motor',
    mensagem,
  }
}

/**
 * Diagnóstico de tokens JÁ extraídos com posição (ficheiros JS/template):
 * tokens citados + literais dinâmicos.
 */
function diagnosticarTokens(ficheiro, tokensComPosicoes, dinamicos, cfg) {
  const itens = []
  for (const t of tokensComPosicoes || []) {
    const res = analisarClasse(t.token, cfg)
    if (!res) continue
    itens.push({
      ficheiro,
      linha: t.linha,
      coluna: t.coluna,
      classe: t.token,
      severidade: CODIGO_SEVERIDADE[res.codigo] || 'aviso',
      codigo: res.codigo,
      mensagem: res.mensagem,
      sugestao: res.sugestao,
    })
  }
  for (const d of dinamicos || []) {
    itens.push({
      ficheiro,
      linha: d.linha,
      coluna: d.coluna,
      classe: d.token.length > 60 ? d.token.slice(0, 57) + '…' : d.token,
      severidade: CODIGO_SEVERIDADE['classe-dinamica-suspeita'],
      codigo: 'classe-dinamica-suspeita',
      mensagem: 'classe construída com template literal — o valor só existe em runtime e não é compilado',
      sugestao: 'lista as variantes em --safelist (ou breeze.config.js)',
    })
  }
  return itens
}

/**
 * Filtro do relatório: só com --verbose aparecem as notas (nivel info);
 * --ignore remove classes que casem as regexes. As análises guardadas na
 * cache são SEMPRE completas — o filtro aplica-se ao imprimir.
 */
function filtrarDiagnosticos(itens, opcoes) {
  const verboso = !!(opcoes && opcoes.verboso)
  const ignorarRes = compilarIgnorar(opcoes && opcoes.ignorar)
  return (itens || []).filter(
    (d) =>
      (verboso || d.severidade !== 'info') &&
      !ignorarRes.some((re) => re.test(d.classe)),
  )
}

module.exports = {
  CODIGO_SEVERIDADE,
  itemAvisoMotor,
  diagnosticarTokens,
  filtrarDiagnosticos,
  distanciaLevenshtein,
  sugerir,
  equivalenteTailwind,
  pareceTailwind,
  analisarClasse,
  diagnosticarProjecto,
  chaveDiagnostico,
  filtrarNovos,
  formatarTexto,
  compilarIgnorar,
}
