'use strict'
// ─────────────────────────────────────────────────────────────────────────
// breeze · lib/htmlscan.js
// Parser HTML mínimo (zero dependências) que devolve os elementos com
// classes — é ele que alimenta o motor BreezeCSS dentro da VM (DOMParser).
// Inclui também a injeção idempotente de <link rel="stylesheet">.
// ─────────────────────────────────────────────────────────────────────────

const { protegerChamadasBreeze } = require('./js-guard')

const ENTIDADES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
}

function decodificarEntidades(s) {
  if (!s.includes('&')) return s
  let out = s
  for (const [de, para] of Object.entries(ENTIDADES)) out = out.split(de).join(para)
  return out
}

function analisarAtributos(bruto) {
  const attrs = {}
  const re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g
  let m
  while ((m = re.exec(bruto))) {
    const nome = m[1].toLowerCase()
    if (nome in attrs) continue // 1.º atributo ganha (comportamento do browser)
    attrs[nome] = decodificarEntidades(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] || '')
  }
  return attrs
}

function criarElemento(tag, attrs, posicoesClasses) {
  const classList = (attrs.class || '').trim().split(/\s+/).filter(Boolean)
  classList.contains = (c) => classList.indexOf(c) !== -1
  return {
    nodeType: 1,
    tagName: tag,
    attrs,
    classList,
    // posição (linha/coluna, base 1) de cada classe no HTML de origem —
    // usada pelos diagnósticos; o motor e o CSS gerado não mudam.
    _posicoesClasses: posicoesClasses || new Map(),
    getAttribute(n) {
      const v = attrs[String(n).toLowerCase()]
      return v === undefined ? null : v
    },
    setAttribute(n, v) {
      attrs[String(n).toLowerCase()] = String(v)
    },
    removeAttribute(n) {
      delete attrs[String(n).toLowerCase()]
    },
  }
}

/**
 * Tabela de inícios de linha (índice absoluto de cada '\n' + 1) para
 * converter índices absolutos em {linha, coluna} (base 1).
 */
function criarTabelaLinhas(html) {
  const inicios = [0]
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '\n') inicios.push(i + 1)
  }
  return {
    de(abs) {
      // procura binária: última linha cujo início <= abs
      let lo = 0
      let hi = inicios.length - 1
      while (lo < hi) {
        const meio = (lo + hi + 1) >> 1
        if (inicios[meio] <= abs) lo = meio
        else hi = meio - 1
      }
      return { linha: lo + 1, coluna: abs - inicios[lo] + 1 }
    },
  }
}

/**
 * Encontra o valor do 1.º atributo class num bloco de atributos bruto e
 * devolve o índice absoluto (dentro do HTML) do primeiro caractere do valor,
 * ou -1. Aspas simples/duplas ou valor nu.
 */
function inicioValorClass(brutoAttrs, baseAbs) {
  const m = /(^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/i.exec(brutoAttrs)
  if (!m) return -1
  const valor = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] || ''
  if (!valor) return -1
  if (m[2] !== undefined || m[3] !== undefined) {
    // valor citado: começa 1 carácter antes do fim do match (a aspa de fecho)
    return baseAbs + m.index + m[0].length - valor.length - 1
  }
  return baseAbs + m.index + m[0].length - valor.length
}

/**
 * Analisa HTML e devolve a lista de elementos que têm atributo class.
 * Ignora comentários, doctype e o conteúdo de <script>/<style>.
 * Elementos dentro de <template> SÃO lidos (as classes acabam no DOM).
 * Cada elemento traz _posicoesClasses: Map<classe, {linha, coluna}>.
 */
function parseHTML(html, { posicoesClasses = true } = {}) {
  const elementos = []
  const n = html.length
  let i = 0
  let minus = null
  let linhas = null // tabela de linhas preguiçosa (só com atributos class)
  const linhaCol = (abs) => {
    if (!linhas) linhas = criarTabelaLinhas(html)
    return linhas.de(abs)
  }

  while (i < n) {
    const lt = html.indexOf('<', i)
    if (lt === -1) break

    const prox4 = html.slice(lt, lt + 4)
    if (prox4.startsWith('<!--')) {
      const fim = html.indexOf('-->', lt + 4)
      i = fim === -1 ? n : fim + 3
      continue
    }

    const c1 = html[lt + 1]
    if (c1 === '!' || c1 === '?') {
      const fim = html.indexOf('>', lt)
      i = fim === -1 ? n : fim + 1
      continue
    }
    if (c1 === '/') {
      const fim = html.indexOf('>', lt)
      i = fim === -1 ? n : fim + 1
      continue
    }
    if (!/[a-zA-Z]/.test(c1 || '')) {
      i = lt + 1
      continue
    }

    // nome da tag
    let k = lt + 1
    while (k < n && /[^\s/>]/.test(html[k])) k++
    const nome = html.slice(lt + 1, k).toLowerCase()

    // atributos até ao '>' (respeitando aspas)
    let emAspa = null
    let fimTag = -1
    for (let j = k; j < n; j++) {
      const ch = html[j]
      if (emAspa) {
        if (ch === emAspa) emAspa = null
      } else if (ch === '"' || ch === "'") {
        emAspa = ch
      } else if (ch === '>') {
        fimTag = j
        break
      }
    }
    if (fimTag === -1) break // HTML truncado

    const brutoAttrs = html.slice(k, fimTag)
    const autoFecho = /\/\s*$/.test(brutoAttrs)
    i = fimTag + 1

    const attrs = analisarAtributos(brutoAttrs)

    if ((nome === 'script' || nome === 'style') && !autoFecho) {
      minus ??= html.toLowerCase()
      const fecho = minus.indexOf('</' + nome, i)
      if (fecho === -1) {
        i = n
      } else {
        const gt = html.indexOf('>', fecho)
        i = gt === -1 ? n : gt + 1
      }
    }

    if (attrs.class && attrs.class.trim()) {
      // posições por classe: percorre o valor bruto do atributo class
      const posicoes = new Map()
      const valAbs = posicoesClasses ? inicioValorClass(brutoAttrs, k) : -1
      if (valAbs >= 0) {
        const valor = attrs.class
        let j = 0
        while (j < valor.length) {
          while (j < valor.length && /\s/.test(valor[j])) j++
          const s = j
          while (j < valor.length && !/\s/.test(valor[j])) j++
          if (j > s) {
            const token = valor.slice(s, j)
            if (!posicoes.has(token)) posicoes.set(token, linhaCol(valAbs + s))
          }
        }
      }
      elementos.push(criarElemento(nome, attrs, posicoes))
    }
  }

  return elementos
}

// ─────────────────────────────────────────────────────────────────────────
// Injeção de <link> + <script> (idempotente, marcada com comentários)
//
//   <!-- breeze:css -->      … <link rel="stylesheet" … data-breeze-cli="css">
//   <!-- breeze:runtime -->  … <script src="…" data-breeze-cli="runtime"></script>
//
// Também substitui referências ao bundle original do BreezeCSS
// (breeze.bundle.js / breeze.min.js / breeze--<plugin>.js) pelo runtime
// compilado — primeiro igual no lugar, as restantes ficam comentadas.
// Referências não reconhecidas NUNCA são tocadas (só avisam).
// ─────────────────────────────────────────────────────────────────────────

const MARCADOR = '<!-- breeze:css -->'
const MARCADOR_JS = '<!-- breeze:runtime -->'

// <link> gerido: marcador + link (nas duas ordens; com ou sem data-breeze-cli
// para apanhar também as injecções antigas do breeze 1.1.0)
const RE_EXISTENTE =
  /<!--\s*breeze:css\s*-->\s*<link[^>]*>|<link[^>]*>\s*<!--\s*breeze:css\s*-->/
const RE_SCRIPT_GERIDO =
  /<!--\s*breeze:runtime\s*-->\s*<script[^>]*data-breeze-cli="runtime"[^>]*>\s*<\/script>|<script[^>]*data-breeze-cli="runtime"[^>]*>\s*<\/script>\s*<!--\s*breeze:runtime\s*-->/

// scripts do Breeze original reconhecíveis pelo NOME do ficheiro
const RE_SCRIPT_BREEZE =
  /(breeze(?:\.min)?\.bundle\.js|breeze\.min\.js|breeze--glass\.js|breeze--dividers\.js|breeze--progress\.js|breeze--scrollbar\.js|breeze--preloader\.js|breeze--backgrounds\.js)/i

/** Extrai o valor do atributo src de uma tag <script>. */
function srcDe(tag) {
  const m = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
  return m ? (m[1] || m[2] || m[3] || '').trim() : ''
}

/** Normaliza para comparação: só o nome do ficheiro, minúsculas. */
function baseFicheiro(caminho) {
  const p = String(caminho || '').split(/[?#]/)[0]
  const partes = p.split(/[/\\]/)
  return (partes[partes.length - 1] || '').toLowerCase()
}

/**
 * Insere (ou actualiza) o <link> do CSS gerado no HTML.
 * Devolve { html, alterado }.
 */
function injetarStylesheet(html, href) {
  const tag = `<link rel="stylesheet" href="${href}" data-breeze-cli="css">\n  ${MARCADOR}`

  if (RE_EXISTENTE.test(html)) {
    const novo = html.replace(RE_EXISTENTE, tag)
    return { html: novo, alterado: novo !== html }
  }

  if (/<\/head\s*>/i.test(html)) {
    return {
      html: html.replace(/<\/head\s*>/i, `${tag}\n</head>`),
      alterado: true,
    }
  }
  const abreHead = /<head[^>]*>/i.exec(html)
  if (abreHead) {
    const pos = abreHead.index + abreHead[0].length
    return {
      html: html.slice(0, pos) + '\n  ' + tag + html.slice(pos),
      alterado: true,
    }
  }
  const abreHtml = /<html[^>]*>/i.exec(html)
  if (abreHtml) {
    const pos = abreHtml.index + abreHtml[0].length
    return {
      html: html.slice(0, pos) + '\n  <head>\n  ' + tag + '\n  </head>' + html.slice(pos),
      alterado: true,
    }
  }
  return { html: '<head>\n  ' + tag + '\n</head>\n' + html, alterado: true }
}

/**
 * Insere o <script> do runtime gerado, sem duplicar referências:
 *   • se já existe um <script> gerido (data-breeze-cli="runtime"),
 *     actualiza o caminho;
 *   • se existe referência ao bundle original (breeze.bundle.js/…), a
 *     PRIMEIRA é substituída no lugar pelo runtime (mantém a ordem de
 *     execução — os BreezeCSS.init() inline continuam a funcionar) e as
 *     restantes ficam comentadas com uma nota;
 *   • sem bundle: insere no </head> com defer — excepto se a página tiver
 *     scripts inline que usam BreezeCSS/plugins ANTES disso, caso em que o
 *     runtime é inserido ANTES (sem defer) para não haver erros de
 *     referência.
 * @param {object} op { html, src, defer=true }
 * @returns {{ html, alterado, substituidos: string[], avisos: string[], removidoStale: boolean }}
 */
function injetarRuntime(html, { src, defer = true }) {
  const avisos = []
  const substituidos = []
  let alterado = false

  const tagDe = (caminho, comDefer) =>
    `<script src="${caminho}"${comDefer ? ' defer' : ''} data-breeze-cli="runtime"></script>\n  ${MARCADOR_JS}`
  const comentarioRemovido = (ficheiro) =>
    `<!-- breeze:cli — "${ficheiro}" já não é necessário: os plugins vão no runtime compilado -->`

  // 1) já existe script gerido → actualizar caminho (idempotente).
  //    PRESERVA o estado defer/sync do existente: se foi inserido sem
  //    defer (bundle substituído ou scripts inline com BreezeCSS),
  //    continuar sem defer — senão os BreezeCSS.init() inline quebrariam.
  if (RE_SCRIPT_GERIDO.test(html)) {
    const existente = RE_SCRIPT_GERIDO.exec(html)[0]
    const comDefer = /\sdefer[\s>]/.test(existente)
    const novo = html.replace(RE_SCRIPT_GERIDO, tagDe(src, comDefer))
    return {
      html: novo,
      alterado: novo !== html,
      substituidos,
      avisos,
      removidoStale: false,
    }
  }

  // 2) referências ao bundle original → substituir/comentar
  if (RE_SCRIPT_BREEZE.test(html)) {
    let primeira = true
    const novo = html.replace(/<script\b[^>]*\ssrc\s*=[^>]*>\s*<\/script>/gi, (tag) => {
      const srcAttr = srcDe(tag)
      const base = baseFicheiro(srcAttr)
      if (!RE_SCRIPT_BREEZE.test(base)) return tag // não é do Breeze → intacto
      if (primeira) {
        primeira = false
        substituidos.push(srcAttr)
        // no lugar do bundle: SEM defer (mesma semântica de execução)
        return tagDe(src, false)
      }
      substituidos.push(srcAttr)
      return comentarioRemovido(base)
    })
    if (substituidos.length) {
      return { html: novo, alterado: novo !== html, substituidos, avisos, removidoStale: false }
    }
  }

  // 3) sem bundle → inserir no head; antes de scripts inline que usam o
  //    BreezeCSS/plugins se existirem (senão defer no fim do head).
  //    Detecção LARGA: inclui referências "nuas" — plugins: [BreezeGlass] —
  //    que rebentariam com defer (BreezeGlass is not defined).
  const tag = tagDe(src, defer)
  const usaBreeze =
    /\b(?:BreezeCSS|BreezeConfig|BreezeGlass|BreezeDividers|BreezeProgress|BreezeScrollbar|BreezePreloader|BreezeBackgrounds)\b/
  let alvoInline = null
  const reInline = /<script(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi
  let mi
  while ((mi = reInline.exec(html))) {
    if (usaBreeze.test(mi[1])) {
      alvoInline = mi.index
      break
    }
  }
  if (alvoInline !== null) {
    // inserir imediatamente antes do 1.º script inline que usa o Breeze —
    // SEM defer: tem de existir quando esse script executa
    const abre = html.lastIndexOf('<script', alvoInline)
    if (abre !== -1) {
      avisos.push('runtime inserido sem defer (scripts inline usam BreezeCSS antes do fim do head)')
      const tagSync = tagDe(src, false)
      return {
        html: html.slice(0, abre) + tagSync + '\n  ' + html.slice(abre),
        alterado: true,
        substituidos,
        avisos,
        removidoStale: false,
      }
    }
  }

  if (/<\/head\s*>/i.test(html)) {
    return {
      html: html.replace(/<\/head\s*>/i, `${tag}\n</head>`),
      alterado: true,
      substituidos,
      avisos,
      removidoStale: false,
    }
  }
  const abreHead = /<head[^>]*>/i.exec(html)
  if (abreHead) {
    const pos = abreHead.index + abreHead[0].length
    return {
      html: html.slice(0, pos) + '\n  ' + tag + html.slice(pos),
      alterado: true,
      substituidos,
      avisos,
      removidoStale: false,
    }
  }
  const abreHtml = /<html[^>]*>/i.exec(html)
  if (abreHtml) {
    const pos = abreHtml.index + abreHtml[0].length
    return {
      html: html.slice(0, pos) + '\n  <head>\n  ' + tag + '\n  </head>' + html.slice(pos),
      alterado: true,
      substituidos,
      avisos,
      removidoStale: false,
    }
  }
  return {
    html: '<head>\n  ' + tag + '\n</head>\n' + html,
    alterado: true,
    substituidos,
    avisos,
    removidoStale: false,
  }
}

/**
 * Remove o <script> gerido quando a página deixou de precisar de runtime.
 * @returns {{ html, alterado }}
 */
function removerRuntime(html) {
  if (!RE_SCRIPT_GERIDO.test(html)) return { html, alterado: false }
  return {
    html: html.replace(RE_SCRIPT_GERIDO, ''),
    alterado: true,
  }
}

/** Conta referências geridas (para o relatório de duplicações). */
function contarGeridos(html) {
  const css = (html.match(/<!--\s*breeze:css\s*-->/g) || []).length
  const js = (html.match(/<!--\s*breeze:runtime\s*-->/g) || []).length
  return { css, js }
}

// bloco de protecção js-guard → desembrulhar mantém a instrução original
const RE_GUARDA_DES =
  /\/\* breeze:cli-guard:start \*\/\s*if \(typeof BreezeCSS !== 'undefined'\) \{\s*([\s\S]*?)\s*\}\s*\/\* breeze:cli-guard:end \*\//g

/**
 * Desembrulha os blocos de protecção do js-guard (`/* breeze:cli-guard:start
 * *\/* … *\/* breeze:cli-guard:end *\/`), mantendo a instrução original —
 * é o que existia antes do --inject.
 */
function desembrulharGuardas(texto) {
  return String(texto).replace(RE_GUARDA_DES, '$1')
}

// padrões geridos (para a normalização de cache de conteúdo)
const RE_EXISTENTE_N =
  /[ \t\n]*<!--\s*breeze:css\s*-->\s*<link[^>]*>|[ \t\n]*<link[^>]*>\s*<!--\s*breeze:css\s*-->/g
const RE_COMENTARIO_SUBSTITUIDO_N = /<!--\s*breeze:cli\s*[\u2014\u2013-][\s\S]*?-->/g
const RE_MARCADORES_N = /<!--\s*breeze:(?:css|runtime)\s*-->/g
const RE_SCRIPTS_EXTERNOS_N = /[ \t\n]*<script\b[^>]*\ssrc\s*=[^>]*>\s*<\/script>[ \t]*\n?/gi

/**
 * Normaliza o conteúdo de uma página para o HASH da cache: remove o que o
 * próprio --inject acrescenta/altera (link/script geridos com marcadores,
 * blocos js-guard — desembrulhados, comentários "bundle substituído") e
 * todos os <script src> externos (nenhum tem classes; não alteram o CSS).
 * Os <script> INLINE ficam (as classes citadas alimentam as dependências).
 * Por fim colapsa o whitespace — mudanças de whitespace nunca alteram o CSS
 * gerado. A chave da página = sha256(normalizado + digital).
 */
function normalizarParaCache(html) {
  return String(html)
    .replace(RE_EXISTENTE_N, '')
    .replace(RE_GUARDA_DES, '$1')
    .replace(RE_COMENTARIO_SUBSTITUIDO_N, '')
    .replace(RE_MARCADORES_N, '')
    .replace(RE_SCRIPTS_EXTERNOS_N, '')
    .replace(/[ \t]*\n[ \t\n]*/g, '\n')
    .replace(/^[ \t\n]+/, '')
    .replace(/[ \t\n]+$/, '')
}

/**
 * Assinatura de uma página para a CACHE incremental: só o que influencia o
 * CSS gerado —
 *   • as classes de cada elemento, por ordem de documento (o motor gera as
 *     regras por classe; a ordem define a ordem das regras no ficheiro);
 *   • o conteúdo dos <script> inline (alimenta as dependências de plugins),
 *     com as guardas js-guard desembrulhadas e o whitespace colapsado.
 * Tudo o que o --inject acrescenta (<link>/<script src> geridos — sem
 * classes —, marcadores e comentários) fica FORA por construção: os
 * <script> com src não têm conteúdo e o <link> não tem classe. Por isso a
 * 2.ª execução com --inject dá sempre hit, mesmo depois de injetar.
 */
function assinaturaPagina(html) {
  const els = []
  for (const el of parseHTML(html, { posicoesClasses: false })) els.push([...el.classList])
  const scripts = []
  const RE_BLOCO = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = RE_BLOCO.exec(html))) {
    const c = m[1]
    if (!c.trim()) continue // bloco vazio (ex.: <script src=…></script>)
    scripts.push(desembrulharGuardas(c).trim())
  }
  return { els, scripts }
}

/**
 * Lista os valores src de <script> que apontam para o bundle original do
 * BreezeCSS (breeze.bundle.js / breeze.min.js) — para avisar quando a
 * versão do bundle referido difere da do motor usado na compilação.
 */
function referenciasBundle(html) {
  const lista = []
  const re = /<script\b[^>]*\ssrc\s*=[^>]*>\s*<\/script>/gi
  let m
  while ((m = re.exec(html))) {
    const src = srcDe(m[0])
    if (src && RE_SCRIPT_BREEZE.test(baseFicheiro(src))) lista.push(src)
  }
  return lista
}

/** Tokens de classe de todos os elementos (com duplicados já removidos). */
function tokensClasses(html) {
  const set = new Set()
  for (const el of parseHTML(html, { posicoesClasses: false })) {
    for (const t of el.classList) set.add(t)
  }
  return [...set]
}

module.exports = {
  parseHTML,
  injetarStylesheet,
  protegerChamadasBreeze,
  injetarRuntime,
  removerRuntime,
  contarGeridos,
  tokensClasses,
  desembrulharGuardas,
  normalizarParaCache,
  assinaturaPagina,
  referenciasBundle,
  MARCADOR,
  MARCADOR_JS,
}
