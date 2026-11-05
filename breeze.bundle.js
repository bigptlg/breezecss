/*! Breeze bundle — BreezeCSS 2.2.5 + BreezeGlass 1.0.0 + BreezeDividers 1.2.0 + BreezeProgress 1.0.0 (ficheiro único) */
/*!
 * BreezeGlass v1.0.0 — plugin "glass" para o BreezeCSS (>= 2.2)
 *
 * Camada 1 (todos os browsers): utilitários CSS ao vivo — backdrop-filter, tint,
 *   brilho especular e rebordo em box-shadow. Sem snapshot, sem WebGL.
 * Camada 2 (só Chromium, opcional): refracção real via SVG feDisplacementMap
 *   aplicada ao backdrop. Nos outros browsers degrada para a camada 1.
 *
 * Uso (recomendado — antes do BreezeCSS):
 *   <script src="breeze--glass.js"></script>
 *   <script>window.BreezeConfig = { plugins: [BreezeGlass] }</script>
 *   <script src="breeze.min.js"></script>
 *
 * Uso (depois do BreezeCSS já inicializado):
 *   BreezeCSS.use(BreezeGlass)
 *
 * Opções:  BreezeGlass.criar({ refracao: 'auto' | true | false,
 *            intensidade: 16, bisel: 0.3, resolucaoMax: 200 })
 *
 * Classes:
 *   glass                       base (obrigatória)
 *   glass-sm|md|lg|xl           desfoque (8 / 16 / 28 / 40 px)
 *   glass-light | glass-dark    tom
 *   glass-pill | glass-circle   forma
 *   glass-refract               refracção (Chromium) — glass-refract[24] = 24px
 *   glass-blur[20px]  glass-saturate[2]  glass-brightness[1.1]
 *   glass-tint[0.3]   glass-shadow[0.4]  glass-rgb[12_16_24]  glass-bezel[0.4]
 *   Variantes do Breeze funcionam: hover:glass-dark, md:glass-lg, etc.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.0.0'
  const PADROES = { refracao: 'auto', intensidade: 16, bisel: 0.3, resolucaoMax: 200 }

  // ---------------------------------------------------------------- classes
  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const FILTRO =
    'var(--glass-refract-url,) blur(var(--glass-blur, 16px)) ' +
    'saturate(var(--glass-saturate, 1.8)) brightness(var(--glass-brightness, 1.06))'

  const CLASSES = {
    glass: [
      '--glass-t: var(--glass-tint, var(--glass-tone-tint, 0.14))',
      'background-color: rgb(var(--glass-rgb, 255 255 255) / var(--glass-t))',
      'background-image: linear-gradient(135deg, rgb(255 255 255 / calc(var(--glass-t) * 1.8)) 0%, rgb(255 255 255 / 0) 42%, rgb(255 255 255 / 0) 58%, rgb(255 255 255 / calc(var(--glass-t) * 0.8)) 100%)',
      '-webkit-backdrop-filter: ' + FILTRO,
      'backdrop-filter: ' + FILTRO,
      'box-shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.55), inset 0 -1px 0 0 rgb(255 255 255 / 0.1), inset 0 0 0 1px rgb(255 255 255 / 0.16), inset 0 0 22px 0 rgb(255 255 255 / 0.07), 0 12px 32px -10px rgb(0 0 0 / var(--glass-shadow, 0.3))',
      'transition-property: background-color, box-shadow, transform',
      'transition-duration: 250ms',
      'transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1)'
    ].join('; '),
    'glass-sm': '--glass-blur: 8px',
    'glass-md': '--glass-blur: 16px',
    'glass-lg': '--glass-blur: 28px; --glass-saturate: 2',
    'glass-xl': '--glass-blur: 40px; --glass-saturate: 2.2',
    'glass-light': '--glass-rgb: 255 255 255',
    'glass-dark': '--glass-rgb: 12 16 24; --glass-tone-tint: 0.3',
    'glass-pill': 'border-radius: 9999px',
    'glass-circle': 'border-radius: 9999px; aspect-ratio: 1 / 1',
    'glass-refract': '--glass-refract-px: 16'
  }

  // Valores arbitrários: glass-blur[20px] → --glass-blur: 20px
  const MAPEAMENTOS = {
    'glass-blur': '--glass-blur',
    'glass-saturate': '--glass-saturate',
    'glass-brightness': '--glass-brightness',
    'glass-tint': '--glass-tint',
    'glass-shadow': '--glass-shadow',
    'glass-rgb': '--glass-rgb',
    'glass-bezel': '--glass-bezel',
    'glass-refract': '--glass-refract-px'
  }

  // ------------------------------------------------- estilos de apoio / a11y
  function esc(s) {
    return global.CSS && typeof global.CSS.escape === 'function' ? global.CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&')
  }

  function injectarEstilos(prefixo) {
    if (document.getElementById('breeze-glass-estilos')) return
    const g = '.' + esc(prefixo + 'glass')
    const s = g + g // .x.x → especificidade maior que os utilitários, para a11y ganhar
    const css = `
@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  ${s} { background-color: rgb(var(--glass-rgb, 255 255 255) / 0.78); }
}
@media (prefers-reduced-transparency: reduce) {
  ${s} { -webkit-backdrop-filter: none; backdrop-filter: none; background-image: none; background-color: rgb(var(--glass-rgb, 255 255 255) / 0.92); }
}
@media (prefers-contrast: more) {
  ${s} { -webkit-backdrop-filter: none; backdrop-filter: none; background-image: none; background-color: rgb(var(--glass-rgb, 255 255 255) / 0.95); box-shadow: inset 0 0 0 2px currentColor; }
}
@media (prefers-reduced-motion: reduce) {
  ${s} { transition: none; }
}`
    const el = document.createElement('style')
    el.id = 'breeze-glass-estilos'
    el.setAttribute('data-breeze', 'glass')
    el.textContent = css
    document.head.appendChild(el)
  }
  // ------------------------------------------------ refracção (só Chromium)
  function refracaoSuportada(cfg) {
    if (cfg.refracao === false) return false
    if (typeof ResizeObserver === 'undefined') return false
    if (cfg.refracao === true) return true
    const ua = navigator.userAgent || ''
    const marcas = navigator.userAgentData && navigator.userAgentData.brands
    const chromium = marcas ? marcas.some(b => /Chromium/i.test(b.brand)) : /Chrome\/\d+/.test(ua)
    return chromium && !/(iPhone|iPad|iPod)/.test(ua)
  }

  // Mapa de deslocamento: R/G = vector (128 = neutro). Junto à borda, o vector
  // aponta para fora (lente convexa), com queda quadrática para o interior.
  function gerarMapa(w, h, raio, bisel, resMax) {
    const passo = Math.max(1, Math.ceil(Math.max(w, h) / resMax))
    const cw = Math.max(1, Math.ceil(w / passo))
    const ch = Math.max(1, Math.ceil(h / passo))
    const cv = gerarMapa._cv || (gerarMapa._cv = document.createElement('canvas'))
    cv.width = cw
    cv.height = ch
    const ctx = cv.getContext('2d')
    const img = ctx.createImageData(cw, ch)
    const d = img.data
    const hx = w / 2
    const hy = h / 2
    const r = Math.min(raio, hx, hy)
    const largura = Math.max(2, Math.min(w, h) * bisel)

    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        const dx = ((i + 0.5) * w) / cw - hx
        const dy = ((j + 0.5) * h) / ch - hy
        const qx = Math.abs(dx) - (hx - r)
        const qy = Math.abs(dy) - (hy - r)
        const fora = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
        const prof = -(fora + Math.min(Math.max(qx, qy), 0) - r) // >0 dentro da forma
        let mx = 0
        let my = 0
        if (prof > 0 && prof < largura) {
          const t = 1 - prof / largura
          const m = t * t
          let nx, ny
          if (qx > 0 && qy > 0) {
            const n = Math.hypot(qx, qy)
            nx = (Math.sign(dx) * qx) / n
            ny = (Math.sign(dy) * qy) / n
          } else if (qx > qy) {
            nx = Math.sign(dx)
            ny = 0
          } else {
            nx = 0
            ny = Math.sign(dy)
          }
          mx = m * nx
          my = m * ny
        }
        const k = (j * cw + i) * 4
        d[k] = 128 + 127 * mx
        d[k + 1] = 128 + 127 * my
        d[k + 2] = 128
        d[k + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return cv.toDataURL()
  }

  function iniciarRefraccao(cfg) {
    const NS = 'http://www.w3.org/2000/svg'
    const alvos = new Map() // elemento → { filtro, img, disp, w, h, raio, px, bisel }
    let svg = null
    let contador = 0
    let agendado = false

    const lerPx = el => parseFloat(getComputedStyle(el).getPropertyValue('--glass-refract-px')) || 0

    function garantirSvg() {
      if (svg) return svg
      svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('width', '0')
      svg.setAttribute('height', '0')
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'
      svg.appendChild(document.createElementNS(NS, 'defs'))
      document.body.appendChild(svg)
      return svg
    }

    function actualizar(el, a) {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (!w || !h) return
      const cs = getComputedStyle(el)
      const brut = cs.borderTopLeftRadius || '0'
      const raio = brut.includes('%') ? (parseFloat(brut) / 100) * Math.min(w, h) : parseFloat(brut) || 0
      const px = lerPx(el) || a.px
      const bisel = parseFloat(cs.getPropertyValue('--glass-bezel')) || cfg.bisel
      if (w === a.w && h === a.h && raio === a.raio && px === a.px && bisel === a.bisel) return
      Object.assign(a, { w, h, raio, px, bisel })
      a.img.setAttribute('href', gerarMapa(w, h, raio, bisel, cfg.resolucaoMax))
      a.img.setAttribute('x', '0')
      a.img.setAttribute('y', '0')
      a.img.setAttribute('width', String(w))
      a.img.setAttribute('height', String(h))
      a.disp.setAttribute('scale', String(px * 2))
    }

    const ro = new ResizeObserver(entradas => {
      entradas.forEach(e => {
        const a = alvos.get(e.target)
        if (a) actualizar(e.target, a)
      })
    })

    function registar(el, px) {
      const id = 'bz-lg-' + ++contador
      const filtro = document.createElementNS(NS, 'filter')
      filtro.setAttribute('id', id)
      filtro.setAttribute('x', '0%')
      filtro.setAttribute('y', '0%')
      filtro.setAttribute('width', '100%')
      filtro.setAttribute('height', '100%')
      filtro.setAttribute('color-interpolation-filters', 'sRGB')
      const img = document.createElementNS(NS, 'feImage')
      img.setAttribute('result', 'mapa')
      img.setAttribute('preserveAspectRatio', 'none')
      const disp = document.createElementNS(NS, 'feDisplacementMap')
      disp.setAttribute('in', 'SourceGraphic')
      disp.setAttribute('in2', 'mapa')
      disp.setAttribute('xChannelSelector', 'R')
      disp.setAttribute('yChannelSelector', 'G')
      filtro.appendChild(img)
      filtro.appendChild(disp)
      garantirSvg().firstChild.appendChild(filtro)
      alvos.set(el, { filtro, img, disp, w: 0, h: 0, raio: -1, px, bisel: 0 })
      el.style.setProperty('--glass-refract-url', 'url(#' + id + ')')
      ro.observe(el) // o 1.º callback gera o mapa
    }

    function remover(el) {
      const a = alvos.get(el)
      if (!a) return
      ro.unobserve(el)
      a.filtro.remove()
      el.style.removeProperty('--glass-refract-url')
      alvos.delete(el)
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      document.querySelectorAll('[class*="glass-refract"]').forEach(el => {
        const px = lerPx(el)
        const a = alvos.get(el)
        if (px > 0 && !a) registar(el, px)
        else if (px > 0 && a && a.px !== px) actualizar(el, a)
        else if (px <= 0 && a) remover(el)
      })
      alvos.forEach((_, el) => {
        if (!el.isConnected) remover(el)
      })
    }

    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar(mutacoes) {
      if (svg && mutacoes && mutacoes.every(m => svg.contains(m.target))) return
      if (agendado) return
      agendado = true
      requestAnimationFrame(() => requestAnimationFrame(varrer))
    }

    new MutationObserver(agendar).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => agendar())
    else agendar()

    return { varrer }
  }

  // ----------------------------------------------------------------- plugin
  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    let motor = null
    return {
      nome: 'glass',
      versao: VERSAO,
      setup(ctx) {
        const prefixo = (ctx.config && ctx.config.prefix) || ''
        // Se o Breeze já aplicou o prefixo (use() depois do init), aplicamo-lo nós.
        const fixas = (ctx.config && ctx.config.classesFixas) || {}
        const jaPrefixado = prefixo && prefixo + 'block' in fixas
        const nome = n => (jaPrefixado ? prefixo + n : n)

        Object.keys(CLASSES).forEach(n => ctx.addFixedClass(nome(n), CLASSES[n]))
        Object.keys(MAPEAMENTOS).forEach(p => ctx.addMapping(nome(p), MAPEAMENTOS[p]))

        if (typeof document === 'undefined') return
        injectarEstilos(prefixo)
        if (!motor && refracaoSuportada(cfg)) motor = iniciarRefraccao(cfg)

        // use() depois do init: reprocessa os elementos já existentes
        if (global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      },
      actualizar() {
        if (motor) motor.varrer()
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeGlass = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)

;/*!
 * BreezeDividers v1.2.0 — plugin "dividers" para o BreezeCSS (>= 2.2)
 *
 * Transforma qualquer elemento num divisor de secção. O formato é uma máscara
 * SVG aplicada ao próprio elemento: a COR vem do bg (cor, gradiente ou imagem)
 * e o TAMANHO das classes w / h normais. Sem elementos extra, sem SVG inline.
 *
 * Uso (junto do BreezeGlass, depois do bundle e antes do DOMContentLoaded):
 *   <script>window.BreezeConfig = { plugins: [BreezeGlass, BreezeDividers] }</script>
 *
 *   <div class="w[100%] h[80px] bg[#000033] divider-wave"></div>
 *
 * Formatos  (orientação por omissão = a dos exemplos de referência)
 *   divider-wave        onda            cor em cima, onda em baixo        [n ondas = 4]
 *   divider-diagonal    diagonal        cor em baixo, sobe p/ a direita
 *   divider-curve       arco            cor em cima, arco a descer
 *   divider-triangle    seta            cor em cima, ponta a descer
 *   divider-zigzag      serrilhado      cor em cima, dentes em baixo      [n dentes = 10]
 *   divider-notch       curva central   cor em baixo, entalhe suave no centro
 *   divider-bump        colina central  cor em baixo, elevação suave no centro
 *   divider-layers      camadas         3 diagonais translúcidas, cor em baixo
 *   divider-waves       ondas em camadas 3 ondas translúcidas, cor em baixo [n = 3]
 *   divider-steps       degraus         escada a subir p/ a direita        [n degraus = 5]
 *   divider-peaks       montanhas       picos irregulares, cor em baixo   [n picos = 5]
 *   divider-scallop     leques          cor em baixo, leques em cima      [n leques = 8]
 *   divider-arches      arcos           cor em cima, arcos em baixo       [n arcos = 6]
 *   divider-columns     colunas         cor em baixo, colunas arredondadas [n colunas = 8]
 *   divider-castle      ameias          muralha com merlões, cor em baixo [n ameias = 8]
 *   divider-clouds      nuvens          cor em baixo, montes variáveis    [n montes = 5]
 *   divider-fins        barbatanas      cor em baixo, barbatanas curvas   [n = 5]
 *   divider-skyline     silhueta        cor em baixo, blocos urbanos      [n blocos = 9]
 *   divider-dunes       dunas           2 colinas translúcidas, cor em baixo
 *
 * Modificadores (sufixos)
 *   -flip   inverte na vertical     divider-wave-flip
 *   -mirror inverte na horizontal   divider-diagonal-mirror
 *   -flip-mirror  ambos             divider-layers-flip-mirror
 *
 * Repetições: divider-wave[6]  divider-zigzag-flip[17]  divider-scallop[12]
 * As camadas translúcidas (layers / waves / dunes) usam o bg como tinta: a
 * opacidade de cada camada é relativa à cor que definires.
 *
 * Variantes do Breeze funcionam: md:divider-wave-flip, hover:divider-curve, etc.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.2.0'
  const W = 1200 // largura do viewBox (a máscara é esticada ao elemento)
  const H = 100

  // ------------------------------------------------------------ geometria
  // Cada formato devolve uma lista de camadas {d, op}; op = opacidade (0–1).
  // Orientação natural; flip/mirror são aplicados com um transform no <g>.
  const n2 = x => +x.toFixed(2)
  const camada = (d, op) => ({ d, op: op == null ? 1 : op })

  function onda(n) {
    // Espessura oscila entre 37.5 % e 72.5 %, a começar num vale. Cada meia-onda
    // é uma cúbica com tangentes horizontais nos extremos (aprox. de co-seno).
    const meio = 55
    const amp = 17.5
    const passos = n * 2
    const dx = W / passos
    const k = dx * 0.3642
    let d = 'M0 0V' + n2(meio + amp)
    for (let i = 0; i < passos; i++) {
      const x0 = i * dx
      const x1 = (i + 1) * dx
      const y0 = meio + (i % 2 === 0 ? amp : -amp)
      const y1 = meio + (i % 2 === 0 ? -amp : amp)
      d += 'C' + n2(x0 + k) + ' ' + n2(y0) + ' ' + n2(x1 - k) + ' ' + n2(y1) + ' ' + n2(x1) + ' ' + n2(y1)
    }
    return [camada(d + 'V0Z')]
  }

  function dentes(n) {
    const dx = W / (n * 2)
    let d = 'M0 0V40'
    for (let i = 1; i <= n * 2; i++) d += 'L' + n2(i * dx) + ' ' + (i % 2 ? 90 : 40)
    return [camada(d + 'V0Z')]
  }

  // Senoide com cor em baixo: y = meio - amp·sin(2π·n·x/W + fase)
  function senoide(n, fase, meio, amp) {
    const pts = Math.max(48, n * 24)
    let d = 'M0 ' + H
    for (let i = 0; i <= pts; i++) {
      const x = (i / pts) * W
      d += 'L' + n2(x) + ' ' + n2(meio - amp * Math.sin((2 * Math.PI * n * x) / W + fase))
    }
    return d + 'V' + H + 'Z'
  }

  function ondasCamadas(n) {
    return [
      camada(senoide(n, 0, 42, 12), 0.3),
      camada(senoide(n, 2.1, 60, 12), 0.5),
      camada(senoide(n, 4.2, 78, 10), 1)
    ]
  }

  function degraus(n) {
    let d = 'M0 ' + H
    for (let i = 0; i < n; i++) {
      d += 'V' + n2(H * (1 - (i + 1) / n)) + 'H' + n2(((i + 1) * W) / n)
    }
    return [camada(d + 'V' + H + 'Z')]
  }

  function picos(n) {
    // alturas irregulares mas determinísticas (sem Math.random → resultado estável)
    const dx = W / n
    let d = 'M0 ' + H + 'V80'
    for (let i = 0; i < n; i++) {
      const f = (i * 0.618034 + 0.2) % 1
      const topo = 8 + f * 52
      d += 'L' + n2(i * dx + dx / 2) + ' ' + n2(topo) + 'L' + n2((i + 1) * dx) + ' 80'
    }
    return [camada(d + 'V' + H + 'Z')]
  }

  // Raio mínimo de um arco que liga dois pontos afastados `corda` subindo
  // exatamente `altura` (fórmula do círculo circunscrito ao triângulo corda/flecha).
  const raioParaAltura = (corda, altura) => (altura * altura + (corda * corda) / 4) / (2 * altura)

  function leques(n) {
    // Semicírculos encostados sobre uma base: scallop clássico. A altura dos
    // leques é limitada a 74 para não sair do viewBox em poucas repetições.
    const dx = W / n
    const altura = Math.min(dx / 2, 74)
    const r = raioParaAltura(dx, altura)
    let d = 'M0 ' + H + 'V80'
    for (let i = 1; i <= n; i++) d += 'A' + n2(r) + ' ' + n2(r) + ' 0 0 1 ' + n2(i * dx) + ' 80'
    return [camada(d + 'V' + H + 'Z')]
  }

  function arcos(n) {
    // Aqueduto: parede em cima e arcos semicirculares abertos junto à base.
    const dx = W / n
    const r = Math.min(dx * 0.35, 92)
    const vao = dx * 0.7
    const margem = dx * 0.15
    let d = 'M0 0H' + W + 'V' + H
    for (let i = n; i >= 1; i--) {
      const b = n2(i * dx - margem)
      d += 'L' + b + ' ' + H + 'A' + n2(r) + ' ' + n2(r) + ' 0 0 0 ' + n2(b - vao) + ' ' + H
    }
    return [camada(d + 'L0 ' + H + 'Z')]
  }

  function colunas(n) {
    // Colunas com topos arredondados e intervalos transparentes entre elas.
    const dx = W / n
    const cw = dx * 0.62
    const r = cw / 2
    const cap = 34 + r
    let d = ''
    for (let i = 0; i < n; i++) {
      const x0 = n2(i * dx + (dx - cw) / 2)
      d += 'M' + x0 + ' ' + H + 'V' + n2(cap) + 'A' + n2(r) + ' ' + n2(r) + ' 0 0 1 ' + n2(x0 + cw) + ' ' + n2(cap) + 'V' + H + 'Z'
    }
    return [camada(d)]
  }

  function ameias(n) {
    // Muralha de castelo: merlões no topo (y 30) e reentrâncias (y 56).
    const dx = W / n
    const mw = dx * 0.55
    let d = 'M0 30'
    for (let i = 0; i < n; i++) {
      d += 'H' + n2(i * dx + mw) + 'V56H' + n2((i + 1) * dx) + 'V30'
    }
    return [camada(d + 'V' + H + 'H0Z')]
  }

  function nuvens(n) {
    // Montes arredondados com alturas variáveis (determinísticas) sobre a base 62.
    const dx = W / n
    let d = 'M0 ' + H + 'V62'
    for (let i = 0; i < n; i++) {
      const f = (i * 0.618034 + 0.35) % 1
      const r = raioParaAltura(dx, 16 + f * 36)
      d += 'A' + n2(r) + ' ' + n2(r) + ' 0 0 1 ' + n2((i + 1) * dx) + ' 62'
    }
    return [camada(d + 'V' + H + 'Z')]
  }

  function barbatanas(n) {
    // Dentes curvos assimétricos: aresta dianteira convexa e traseira côncava.
    const dx = W / n
    let d = 'M0 ' + H + 'V78'
    for (let i = 0; i < n; i++) {
      const x0 = i * dx
      const x1 = (i + 1) * dx
      const f = (i * 0.618034 + 0.25) % 1
      const pico = 14 + f * 26
      const xp = x0 + dx * 0.42
      d += 'C' + n2(x0 + dx * 0.2) + ' 74 ' + n2(x0 + dx * 0.32) + ' ' + n2(pico + 6) + ' ' + n2(xp) + ' ' + n2(pico)
      d += 'C' + n2(xp + dx * 0.16) + ' ' + n2(pico + 10) + ' ' + n2(x1 - dx * 0.06) + ' 76 ' + n2(x1) + ' 78'
    }
    return [camada(d + 'V' + H + 'Z')]
  }

  function blocos(n) {
    // Silhueta urbana: blocos de larguras e alturas variáveis (determinísticas).
    const dx = W / n
    let d = 'M0 ' + H
    let x = 0
    let i = 0
    while (x < W - 1) {
      const f1 = (i * 0.618034 + 0.15) % 1
      const f2 = (i * 0.381966 + 0.55) % 1
      const x2 = Math.min(x + dx * (0.55 + f1 * 0.75), W)
      d += 'V' + n2(16 + f2 * 44) + 'H' + n2(x2)
      x = x2
      i++
    }
    return [camada(d + 'V' + H + 'Z')]
  }

  const FORMATOS = {
    wave: { padrao: 4, caminho: onda, repete: true },
    zigzag: { padrao: 10, caminho: dentes, repete: true },
    waves: { padrao: 3, caminho: ondasCamadas, repete: true },
    steps: { padrao: 5, caminho: degraus, repete: true },
    peaks: { padrao: 5, caminho: picos, repete: true },
    diagonal: { caminho: () => [camada('M0 ' + H + 'L' + W + ' 0V' + H + 'Z')] },
    curve: { caminho: () => [camada('M0 0V30Q' + W / 2 + ' 170 ' + W + ' 30V0Z')] },
    triangle: { caminho: () => [camada('M0 0L' + W / 2 + ' ' + H + 'L' + W + ' 0Z')] },
    notch: {
      caminho: () => [camada('M0 0H450C520 0 540 70 600 70S680 0 750 0H1200V' + H + 'H0Z')]
    },
    bump: {
      caminho: () => [camada('M0 ' + H + 'V72H450C520 72 540 0 600 0S680 72 750 72H1200V' + H + 'Z')]
    },
    layers: {
      caminho: () => [
        camada('M0 60L330 18L700 62L1200 8V' + H + 'H0Z', 0.3),
        camada('M0 82L420 42L820 72L1200 28V' + H + 'H0Z', 0.55),
        camada('M0 ' + H + 'L1200 38V' + H + 'Z', 1)
      ]
    },
    scallop: { padrao: 8, caminho: leques, repete: true },
    arches: { padrao: 6, caminho: arcos, repete: true },
    columns: { padrao: 8, caminho: colunas, repete: true },
    castle: { padrao: 8, caminho: ameias, repete: true },
    clouds: { padrao: 5, caminho: nuvens, repete: true },
    fins: { padrao: 5, caminho: barbatanas, repete: true },
    skyline: { padrao: 9, caminho: blocos, repete: true },
    dunes: {
      // Fixo (como layers): duas colinas translúcidas desfasadas.
      caminho: () => [
        camada('M0 ' + H + 'V64C140 30 300 22 470 44C560 55 640 62 720 58C860 50 980 22 1200 44V' + H + 'Z', 0.38),
        camada('M0 ' + H + 'V78C120 60 210 54 330 62C450 70 520 82 660 80C800 78 900 58 1030 60C1100 61 1160 68 1200 72V' + H + 'Z', 1)
      ]
    }
  }

  const ORIENTACOES = {
    '': '',
    '-flip': 'matrix(1 0 0 -1 0 ' + H + ')',
    '-mirror': 'matrix(-1 0 0 1 ' + W + ' 0)',
    '-flip-mirror': 'matrix(-1 0 0 -1 ' + W + ' ' + H + ')'
  }

  // Devolve o valor da propriedade `mask`: url(<svg>) + posição/tamanho/repetição.
  // Nota: o Breeze separa declarações por ";" — encodeURIComponent escapa-o (%3B)
  // e o SVG não usa aspas simples/duplas literais.
  function mascara(formato, orient, n) {
    const camadas = FORMATOS[formato].caminho(n)
    const t = ORIENTACOES[orient]
    const paths = camadas
      .map(c => '<path d="' + c.d + '"' + (c.op < 1 ? ' fill-opacity="' + c.op + '"' : '') + '/>')
      .join('')
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      (t ? '<g transform="' + t + '">' + paths + '</g>' : paths) +
      '</svg>'
    const uri = 'data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27')
    return 'url("' + uri + '") center / 100% 100% no-repeat'
  }

  function lerRepeticoes(valor, padrao) {
    const n = Math.round(parseFloat(valor))
    if (!isFinite(n) || n < 1) return padrao
    return Math.min(n, 60)
  }

  // ----------------------------------------------------------------- plugin
  function criar() {
    return {
      nome: 'dividers',
      versao: VERSAO,
      setup(ctx) {
        const prefixo = (ctx.config && ctx.config.prefix) || ''
        // Se o Breeze já aplicou o prefixo (use() depois do init), aplicamo-lo nós.
        const fixas = (ctx.config && ctx.config.classesFixas) || {}
        const jaPrefixado = prefixo && prefixo + 'block' in fixas
        const nome = n => (jaPrefixado ? prefixo + n : n)

        Object.keys(FORMATOS).forEach(formato => {
          const f = FORMATOS[formato]
          Object.keys(ORIENTACOES).forEach(orient => {
            const classe = 'divider-' + formato + orient
            const m = mascara(formato, orient, f.padrao)
            // fixa:  divider-wave
            ctx.addFixedClass(nome(classe), 'mask: ' + m + '; -webkit-mask: ' + m)
            // arbitrária: divider-wave[6]
            if (f.repete) {
              ctx.addMapping(nome(classe), 'mask; -webkit-mask')
              ctx.addProcessor(nome(classe), v => mascara(formato, orient, lerRepeticoes(v, f.padrao)))
            }
          })
        })

        // use() depois do init: reprocessa os elementos já existentes
        if (typeof document !== 'undefined' && global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeDividers = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)

;/*!
 * BreezeProgress v1.0.0 — plugin "progress" para o BreezeCSS (>= 2.2)
 *
 * Barra de progresso em qualquer elemento. Basta adicionar a classe `progress`:
 *   • no <body> (ou <html>)  → progresso de scroll da página inteira, fixa no viewport
 *   • num elemento com scroll interno (overflow auto/scroll) → progresso do scroll dele
 *   • num elemento normal (ex.: uma <section> ou <article>) → progresso da leitura
 *     do elemento enquanto passa pelo ecrã
 * Nos dois últimos casos a barra só é visível enquanto o elemento está visível e
 * fica limitada à largura/altura dele (não ultrapassa as bordas do elemento).
 *
 * Sem elementos extra no HTML: o plugin cria a barra sozinho (fica fora do fluxo
 * do elemento, por isso não estraga flex/grid/nth-child).
 *
 * Uso (junto dos outros plugins, antes do DOMContentLoaded):
 *   <script>window.BreezeConfig = { plugins: [BreezeGlass, BreezeDividers, BreezeProgress] }</script>
 *
 *   <body class="progress">                      barra no topo da página
 *   <body class="progress progress-bottom">      barra em baixo
 *   <article class="progress progress-color[#e11d48]">…</article>
 *   <div class="h[300px] overflow-auto progress progress-lg">…</div>
 *
 * Classes
 *   progress                    activa a barra (obrigatória)
 *   progress-top|bottom|left|right   posição (por omissão: top). left/right = barra vertical
 *   progress-sm|md|lg|xl        espessura (2 / 4 / 6 / 10 px)
 *   progress-h[6px]             espessura arbitrária
 *   progress-color[#6366f1]     cor da barra (aceita gradientes: progress-color[linear-gradient(90deg,#f0f,#0ff)])
 *   progress-track[rgb(0_0_0/_.1)]  cor do fundo (trilho) — transparente por omissão
 *   progress-radius[9999px]     arredondamento — ou a classe fixa progress-rounded
 *   progress-z[50]              z-index (por omissão 9990)
 *   progress-dur[200ms]         duração da animação — ou progress-smooth (200ms) / progress-instant (0)
 *   progress-reverse            enche da direita→esquerda (ou de baixo→cima)
 *   progress-scroll | progress-view | progress-auto   modo de medição
 *        scroll → usa o scroll do próprio elemento
 *        view   → usa a passagem do elemento pelo viewport
 *        auto   → scroll se o elemento tiver scroll interno, senão view (por omissão)
 *   Variantes do Breeze funcionam: md:progress, md:progress-lg, dark:progress-color[#fff]…
 *
 * Extras para o programador
 *   • o elemento recebe a variável CSS --progress (0 a 1), útil para animar outras coisas
 *   • evento 'breeze:progress' no elemento: e.detail = { progresso: 0..1, percentagem: 0..100 }
 *   • BreezeProgress.criar({ altura: 4, cor: '#3b82f6', z: 9990 }) altera os valores por omissão
 *
 * Nota: se um antepassado do elemento tiver transform/filter, a barra fixa pode
 * não alinhar; nesse caso use progress-scroll/view num elemento fora dele.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.0.0'
  const PADROES = { altura: 4, cor: '#3b82f6', z: 9990 }

  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const CLASSES = {
    progress: '--progress-on: 1',
    'progress-top': '--progress-pos: top',
    'progress-bottom': '--progress-pos: bottom',
    'progress-left': '--progress-pos: left',
    'progress-right': '--progress-pos: right',
    'progress-sm': '--progress-h: 2px',
    'progress-md': '--progress-h: 4px',
    'progress-lg': '--progress-h: 6px',
    'progress-xl': '--progress-h: 10px',
    'progress-rounded': '--progress-radius: 9999px',
    'progress-smooth': '--progress-dur: 200ms',
    'progress-instant': '--progress-dur: 0ms',
    'progress-reverse': '--progress-reverse: 1',
    'progress-auto': '--progress-mode: auto',
    'progress-scroll': '--progress-mode: scroll',
    'progress-view': '--progress-mode: view'
  }

  // Valores arbitrários: progress-color[#f00] → --progress-color: #f00
  const MAPEAMENTOS = {
    'progress-h': '--progress-h',
    'progress-color': '--progress-color',
    'progress-track': '--progress-track',
    'progress-radius': '--progress-radius',
    'progress-z': '--progress-z',
    'progress-dur': '--progress-dur'
  }

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // ---------------------------------------------------------------- motor
  function iniciarMotor(cfg, prefixo) {
    const reToken = new RegExp('(^|:)' + esc(prefixo + 'progress') + '!?$')
    const alvos = new Map() // elemento → { host, fill, c, chave, pct }
    const hosts = new WeakSet()
    let pendente = false
    let agendado = false

    // --progress-on não herda: senão todos os filhos de um <body class="progress">
    // seriam tratados como alvos.
    let registada = false
    try {
      if (global.CSS && typeof global.CSS.registerProperty === 'function') {
        global.CSS.registerProperty({ name: '--progress-on', syntax: '<number>', inherits: false, initialValue: '0' })
        registada = true
      }
    } catch (e) {
      registada = !!(e && e.name === 'InvalidModificationError') // já registada
    }

    const reduzMovimento = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ePagina = el => el === document.body || el === document.documentElement

    function ehAlvo(el) {
      let ok = false
      for (const c of el.classList) {
        if (reToken.test(c)) {
          ok = true
          break
        }
      }
      if (!ok) return false
      if (!registada) return true
      return parseFloat(getComputedStyle(el).getPropertyValue('--progress-on')) > 0
    }

    function configurar(el, a) {
      const cs = getComputedStyle(el)
      const v = n => cs.getPropertyValue(n).trim()
      const pos = v('--progress-pos')
      const modo = v('--progress-mode')
      const c = {
        pos: ['top', 'bottom', 'left', 'right'].indexOf(pos) >= 0 ? pos : 'top',
        h: v('--progress-h') || cfg.altura + 'px',
        cor: v('--progress-color') || cfg.cor,
        trilho: v('--progress-track') || 'transparent',
        raio: v('--progress-radius') || '0',
        z: v('--progress-z') || String(cfg.z),
        dur: reduzMovimento() ? '0ms' : v('--progress-dur') || '80ms',
        inverso: v('--progress-reverse') === '1',
        modo: modo === 'scroll' || modo === 'view' ? modo : 'auto'
      }
      const vert = c.pos === 'left' || c.pos === 'right'
      const prev = a.c
      a.c = c
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) return
      const hs = a.host.style
      hs.cssText =
        'position:fixed;left:0;top:0;margin:0;padding:0;box-sizing:border-box;pointer-events:none;overflow:hidden;' +
        'visibility:hidden;background:' + c.trilho + ';border-radius:' + c.raio + ';z-index:' + c.z
      const fs = a.fill.style
      fs.cssText =
        'width:100%;height:100%;will-change:transform;background:' + c.cor + ';' +
        'transition:transform ' + c.dur + ' linear;' +
        'transform-origin:' + (vert ? (c.inverso ? 'center bottom' : 'center top') : c.inverso ? 'right center' : 'left center')
      a.chave = ''
    }

    function registar(el) {
      const host = document.createElement('div')
      host.setAttribute('data-breeze-progress', '')
      host.setAttribute('aria-hidden', 'true')
      const fill = document.createElement('div')
      host.appendChild(fill)
      hosts.add(host)
      document.body.appendChild(host)
      const a = { host, fill, c: null, chave: '', pct: -1 }
      alvos.set(el, a)
      configurar(el, a)
      if (typeof ResizeObserver !== 'undefined') {
        a.ro = new ResizeObserver(pedir)
        a.ro.observe(ePagina(el) ? document.documentElement : el)
      }
    }

    function remover(el) {
      const a = alvos.get(el)
      if (!a) return
      if (a.ro) a.ro.disconnect()
      a.host.remove()
      alvos.delete(el)
      try {
        el.style.removeProperty('--progress')
      } catch (e) {
        /* ignorar */
      }
    }

    const limita = x => (x < 0 ? 0 : x > 1 ? 1 : x)

    function medir(el, a) {
      const c = a.c
      if (!c) return
      const de = document.documentElement
      const vw = de.clientWidth
      const vh = de.clientHeight
      const vert = c.pos === 'left' || c.pos === 'right'
      let p = 0
      let rect

      if (ePagina(el)) {
        rect = { left: 0, top: 0, right: vw, bottom: vh, width: vw, height: vh }
        const se = document.scrollingElement || de
        const maxV = se.scrollHeight - se.clientHeight
        const maxH = se.scrollWidth - se.clientWidth
        if (maxV > 1) p = (global.scrollY || se.scrollTop) / maxV
        else if (maxH > 1) p = (global.scrollX || se.scrollLeft) / maxH
      } else {
        rect = el.getBoundingClientRect()
        const dentro = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw
        if (!dentro) {
          if (a.chave !== 'oculto') {
            a.host.style.visibility = 'hidden'
            a.chave = 'oculto'
          }
          return
        }
        const cs = getComputedStyle(el)
        const maxV = el.scrollHeight - el.clientHeight
        const maxH = el.scrollWidth - el.clientWidth
        const rolaV = maxV > 1 && /(auto|scroll)/.test(cs.overflowY)
        const rolaH = maxH > 1 && /(auto|scroll)/.test(cs.overflowX)
        const usaScroll = c.modo === 'scroll' || (c.modo === 'auto' && (rolaV || rolaH))
        if (usaScroll) {
          if (maxV > 1 && (rolaV || c.modo === 'scroll')) p = el.scrollTop / maxV
          else if (maxH > 1) p = el.scrollLeft / maxH
        } else {
          // passagem pelo viewport: elemento alto → do topo ao fim; baixo → da entrada à saída
          p = rect.height > vh ? -rect.top / (rect.height - vh) : (vh - rect.top) / (vh + rect.height)
        }
      }
      p = limita(p)

      const x0 = Math.max(rect.left, 0)
      const x1 = Math.min(rect.right, vw)
      const y0 = Math.max(rect.top, 0)
      const y1 = Math.min(rect.bottom, vh)
      let tx = x0
      let ty = y0
      let extra = ''
      let w
      let h
      if (vert) {
        w = c.h
        h = y1 - y0 + 'px'
        if (c.pos === 'right') {
          tx = x1
          extra = ' translateX(-100%)'
        }
      } else {
        w = x1 - x0 + 'px'
        h = c.h
        if (c.pos === 'bottom') {
          ty = y1
          extra = ' translateY(-100%)'
        }
      }
      const chave = [tx, ty, w, h, extra].join('|')
      if (chave !== a.chave) {
        const hs = a.host.style
        hs.visibility = 'visible'
        hs.width = w
        hs.height = h
        hs.transform = 'translate(' + tx + 'px,' + ty + 'px)' + extra
        a.chave = chave
      }
      a.fill.style.transform = vert ? 'scaleY(' + p + ')' : 'scaleX(' + p + ')'

      const pct = Math.round(p * 100)
      if (pct !== a.pct) {
        a.pct = pct
        el.style.setProperty('--progress', String(pct / 100))
        el.dispatchEvent(new CustomEvent('breeze:progress', { detail: { progresso: p, percentagem: pct } }))
      }
    }

    function pedir() {
      if (pendente) return
      pendente = true
      requestAnimationFrame(() => {
        pendente = false
        alvos.forEach((a, el) => medir(el, a))
      })
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      document.querySelectorAll('[class*="progress"]').forEach(el => {
        const a = alvos.get(el)
        const activo = ehAlvo(el)
        if (activo && !a) registar(el)
        else if (activo && a) configurar(el, a)
        else if (!activo && a) remover(el)
      })
      alvos.forEach((_, el) => {
        if (!el.isConnected) remover(el)
      })
      pedir()
    }

    const nosso = n => n.nodeType === 1 && hosts.has(n)
    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar(mutacoes) {
      if (mutacoes && mutacoes.length && mutacoes.every(m => (m.target.nodeType === 1 && m.target.closest('[data-breeze-progress]')) ||
          (m.type === 'childList' && [].every.call(m.addedNodes, nosso) && [].every.call(m.removedNodes, nosso)))) return
      if (agendado) return
      agendado = true
      requestAnimationFrame(() => requestAnimationFrame(varrer))
    }

    global.addEventListener('scroll', pedir, { capture: true, passive: true })
    global.addEventListener('resize', () => agendar(), { passive: true })
    global.addEventListener('load', () => agendar())
    new MutationObserver(agendar).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => agendar())
    else agendar()

    return { varrer }
  }

  // ----------------------------------------------------------------- plugin
  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    let motor = null
    return {
      nome: 'progress',
      versao: VERSAO,
      setup(ctx) {
        const prefixo = (ctx.config && ctx.config.prefix) || ''
        // Se o Breeze já aplicou o prefixo (use() depois do init), aplicamo-lo nós.
        const fixas = (ctx.config && ctx.config.classesFixas) || {}
        const jaPrefixado = prefixo && prefixo + 'block' in fixas
        const nome = n => (jaPrefixado ? prefixo + n : n)

        Object.keys(CLASSES).forEach(n => ctx.addFixedClass(nome(n), CLASSES[n]))
        Object.keys(MAPEAMENTOS).forEach(p => ctx.addMapping(nome(p), MAPEAMENTOS[p]))

        if (typeof document === 'undefined') return
        if (!motor) motor = iniciarMotor(cfg, prefixo)

        // use() depois do init: reprocessa os elementos já existentes
        if (global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      },
      actualizar() {
        if (motor) motor.varrer()
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeProgress = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)


;/* Regista o plugin antes do init do Breeze, preservando a BreezeConfig do utilizador.
   Para desactivar: window.BreezeConfig = { Glass: false } */
/**
 * BreezeCSS v2.2.5 – breeze.bundle.js
 * Bundle sem módulos ES – compatível com <script src="...">
 * Autor: Pedro de Oliveira
 *
 * Novidades v2.2.5:
 *  • "_" vira espaço também dentro de calc(), clamp(), min(), max(), gradientes,
 *    rgb(), etc. (ex: w[calc(100%_-_20px)]). Preservado em url(), var(), env(),
 *    attr() e src(), onde o "_" faz parte do valor.
 *  • Suporte a mask (sempre com -webkit- incluído):
 *      arbitrárias: mask[...], mask-image[...], mask-gradient[to_bottom,#000,transparent],
 *                   mask-size[...], mask-pos[...], mask-repeat[...], mask-mode[...],
 *                   mask-clip[...], mask-origin[...], mask-composite[...], mask-border[...]
 *      fixas:       mask-none, mask-no-repeat, mask-repeat-x/y, mask-contain, mask-cover,
 *                   mask-center, mask-alpha, mask-luminance, mask-add/subtract/intersect/exclude,
 *                   mask-clip-*, mask-origin-*, mask-type-*, mask-fade-t/r/b/l
 *
 * Novidades v2.2.4:
 *  • text-stroke[valor]   – -webkit-text-stroke arbitrário (ex: text-stroke[2px_#000])
 *  • Novas classes fixas: scroll-smooth, scroll-auto, break-word, break-all,
 *    line-clamp-*, sr-only, not-sr-only, backface-hidden, touch-none, touch-auto,
 *    overflow-clip, text-wrap, text-nowrap, text-balance
 *  • scrollSmooth: true (default) – injeta html { scroll-behavior: smooth }
 *    automaticamente; desative com BreezeConfig = { scrollSmooth: false }
 *  • Blend modes completos:
 *      mix-blend-*  (mix-blend-mode)        → mix-blend-multiply, mix-blend-difference, …
 *      bg-blend-*   (background-blend-mode) → bg-blend-overlay, bg-blend-luminosity, …
 *      mix-blend[valor] / bg-blend[valor]   – formas arbitrárias
 *
 * Novidades v2.2.3:
 *  • !important em classes fixas: flex!, hidden!, rounded! (e com variantes: hover:flex!)
 *  • !important em componentes:   btn! aplica !important a todas as propriedades internas
 *  • Aliases flex: grow[n], shrink[n], basis[valor] (mais ergonómicos que flex-g/flex-basis)
 *  • flex-g removido em favor de grow (flex-g mantido por compatibilidade)
 *  • Debounce no MutationObserver via requestAnimationFrame (batching de mutações)
 *  • safelist: classes pré-geradas mesmo antes de aparecerem no DOM
 *  • prefix: evita conflitos com outras frameworks (ex: bz-)
 *  • Minificador melhorado: remove espaços desnecessários dentro das declarações
 *
 * Novidades v2.2.2:
 *  • Suporte a flex-basis
 *  • BreezeCSS.exportar() – exporta todo o CSS gerado como ficheiro .css
 *
 * Novidades v2.2.1:
 *  • Suporte a !important: basta terminar o valor com ! → bg[red!], w[100%!]
 *
 * Novidades v2.2.0:
 *  • border[solid_1px_#fff]     – shorthand completo (style? width? color?)
 *  • border-t/r/b/l[...]        – shorthand por lado (ex: border-t[2px_solid_red])
 *  • font-weight[100] / fw[700] – peso de fonte arbitrário
 *  • text-shadow[...]           – sombra de texto
 *  • transition[prop_dur_ease]  – transição arbitrária
 *  • Fixes: border-color/style já incluíam prefixos; melhor fallback de parse
 */

(function (global) {
  "use strict";

  const cssEscape =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape
      : (s) => s.replace(/([[\]{}()*+?.,\\^$|#\s:])/g, "\\$1");

  // ═══════════════════════════════════════════════════════════════════════
  // LOGGER
  // ═══════════════════════════════════════════════════════════════════════
  const Logger = (() => {
    const NIVEIS = { SILENCIOSO: 0, ERRO: 1, AVISO: 2, INFO: 3, DEBUG: 4 };
    let _nivel = NIVEIS.INFO;
    let _historico = [];
    const _maxHistorico = 200;
    const ESTILOS = {
      prefixo: "color: #00ff88; font-weight: bold;",
      debug: "color: #888;",
      info: "color: #4af;",
      aviso: "color: #fa0; font-weight: bold;",
      erro: "color: #f44; font-weight: bold;",
    };
    function _registar(nivel, nomeNivel, estilo, ...args) {
      if (_nivel < nivel) return;
      const entrada = {
        nivel: nomeNivel,
        mensagem: args.join(" "),
        timestamp: new Date().toISOString(),
      };
      _historico.push(entrada);
      if (_historico.length > _maxHistorico) _historico.shift();
      console.log(
        `%c[BreezeCSS v2]%c [${nomeNivel}]`,
        ESTILOS.prefixo,
        estilo,
        ...args,
      );
    }
    return {
      debug: (...a) => _registar(NIVEIS.DEBUG, "DEBUG", ESTILOS.debug, ...a),
      info: (...a) => _registar(NIVEIS.INFO, "INFO", ESTILOS.info, ...a),
      aviso: (...a) => _registar(NIVEIS.AVISO, "AVISO", ESTILOS.aviso, ...a),
      erro: (...a) => _registar(NIVEIS.ERRO, "ERRO", ESTILOS.erro, ...a),
      configurar({ nivel, silencioso } = {}) {
        if (silencioso) {
          _nivel = NIVEIS.SILENCIOSO;
          return;
        }
        const mapa = { debug: 4, info: 3, aviso: 2, erro: 1, silencioso: 0 };
        if (nivel !== undefined && mapa[nivel] !== undefined)
          _nivel = mapa[nivel];
      },
      obterHistorico: () => [..._historico],
      limpar: () => {
        _historico = [];
      },
      NIVEIS,
    };
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // CACHE
  // ═══════════════════════════════════════════════════════════════════════
  const Cache = (() => {
    const regrasCSS = new Set();
    const classesResolvidas = new Map();
    const transformsPorChave = new Map();
    const componentes = new Map();
    const stats = { hits: 0, misses: 0, total: 0 };

    function temRegra(r) {
      stats.total++;
      if (regrasCSS.has(r)) {
        stats.hits++;
        return true;
      }
      stats.misses++;
      return false;
    }
    function registarRegra(r) {
      regrasCSS.add(r);
    }
    function temClasse(c) {
      return classesResolvidas.has(c);
    }
    function obterClasse(c) {
      return classesResolvidas.get(c) || null;
    }
    function registarClasse(c, r) {
      classesResolvidas.set(c, r);
    }

    function obterTransforms(chave) {
      if (!transformsPorChave.has(chave))
        transformsPorChave.set(chave, new Map());
      return transformsPorChave.get(chave);
    }
    function atualizarTransform(chave, tipo, valor) {
      obterTransforms(chave).set(tipo, valor);
      return obterTransforms(chave);
    }
    function construirTransform(chave) {
      const t = obterTransforms(chave);
      if (t.size === 0) return null;
      const ordem = [
        "translateX",
        "translateY",
        "rotate",
        "scale",
        "scaleX",
        "scaleY",
        "skewX",
        "skewY",
      ];
      const partes = [];
      ordem.forEach((tipo) => {
        if (t.has(tipo)) partes.push(t.get(tipo));
      });
      t.forEach((v, tipo) => {
        if (!ordem.includes(tipo)) partes.push(v);
      });
      return partes.join(" ");
    }

    function registarComponente(n, c) {
      componentes.set(n, c);
    }
    function obterComponente(n) {
      return componentes.get(n) || null;
    }
    function temComponente(n) {
      return componentes.has(n);
    }

    function limpar() {
      regrasCSS.clear();
      classesResolvidas.clear();
      transformsPorChave.clear();
      stats.hits = 0;
      stats.misses = 0;
      stats.total = 0;
    }
    function obterStats() {
      return {
        ...stats,
        taxaAcerto:
          stats.total > 0
            ? ((stats.hits / stats.total) * 100).toFixed(1) + "%"
            : "0%",
        regrasCacheadas: regrasCSS.size,
        classesCacheadas: classesResolvidas.size,
      };
    }
    // Devolve todas as regras CSS registadas no cache (strings originais
    // tal como foram passadas ao insertRule — sempre utilizáveis).
    function obterTodasRegras() {
      return Array.from(regrasCSS);
    }

    return {
      temRegra,
      registarRegra,
      temClasse,
      obterClasse,
      registarClasse,
      obterTransforms,
      atualizarTransform,
      construirTransform,
      registarComponente,
      obterComponente,
      temComponente,
      limpar,
      obterStats,
      obterTodasRegras,
    };
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // RENDERER
  // ═══════════════════════════════════════════════════════════════════════
  const Renderer = (() => {
    let _config = null;
    let _tagEstilo = null;
    let _sheet = null;
    let _modoOffline = false;
    let _regrasOffline = [];

    function inicializar(config) {
      _config = config;
    }
    function ativarModoOffline() {
      _modoOffline = true;
      _regrasOffline = [];
    }
    function desativarModoOffline() {
      _modoOffline = false;
    }
    function obterRegrasOffline() {
      return [..._regrasOffline];
    }

    function _obterSheet() {
      if (_sheet) return _sheet;
      _tagEstilo = document.createElement("style");
      _tagEstilo.id = "breeze-v2-estilos";
      _tagEstilo.setAttribute("data-breeze", "v2");
      document.head.appendChild(_tagEstilo);
      _sheet = _tagEstilo.sheet;
      return _sheet;
    }

    function _inserirRegra(regra) {
      if (Cache.temRegra(regra)) return;
      Cache.registarRegra(regra);
      if (_modoOffline) {
        _regrasOffline.push(regra);
        return;
      }
      const sheet = _obterSheet();
      try {
        sheet.insertRule(regra, sheet.cssRules.length);
        Logger.debug("Regra → " + regra);
      } catch (e) {
        Logger.erro("Falha: " + regra, e);
      }
    }

    function _construirSeletor(classeOriginal, variantes) {
      let seletor = "." + cssEscape(classeOriginal);
      if (!variantes || variantes.length === 0) return seletor;
      for (const v of variantes) {
        const pseudo = _config.variantes[v];
        if (!pseudo) continue;
        if (pseudo.includes("&")) {
          seletor = pseudo.replace(/&/g, seletor);
        } else {
          seletor = seletor + pseudo;
        }
      }
      return seletor;
    }

    function _comMediaQuery(bp, regra) {
      const tam = _config.breakpoints[bp];
      return tam ? `@media (min-width: ${tam}) { ${regra} }` : regra;
    }

    function renderizar(resultados, classeOriginal, elemento) {
      if (!resultados || resultados.length === 0) return;
      resultados.forEach((r) => {
        if (r.eTransform) _renderizarTransform(r, classeOriginal, elemento);
        else _renderizarRegular(r, classeOriginal);
      });
    }

    function _renderizarRegular(r, classeOriginal) {
      const seletor = _construirSeletor(classeOriginal, r.variantes);
      const props = r.propriedade
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean);
      const sufixo = r.importante ? " !important" : "";
      props.forEach((prop) => {
        let regra = `${seletor} { ${prop}: ${r.valor}${sufixo}; }`;
        if (r.breakpoint)
          regra = _comMediaQuery(
            r.breakpoint,
            `${seletor} { ${prop}: ${r.valor}${sufixo}; }`,
          );
        _inserirRegra(regra);
      });
    }

    function _renderizarTransform(r, classeOriginal, elemento) {
      const chaveContexto = `${r.breakpoint || ""}|${(r.variantes || []).join(",")}`;
      let seletorRegra, chaveTransform;

      if (elemento && typeof elemento.getAttribute === "function") {
        const breezeId = elemento.getAttribute("data-breeze-id");
        if (breezeId) {
          chaveTransform = `elem:${breezeId}::${chaveContexto}`;
          seletorRegra = `[data-breeze-id="${breezeId}"]`;
          if (r.variantes && r.variantes.length > 0) {
            const pseudos = r.variantes
              .map((v) => _config.variantes[v])
              .filter((p) => p && !p.includes("&"))
              .join("");
            seletorRegra += pseudos;
          }
        }
      }

      if (!chaveTransform) {
        const seletorClasse = _construirSeletor(classeOriginal, r.variantes);
        chaveTransform = `cls:${seletorClasse}::${chaveContexto}`;
        seletorRegra = seletorClasse;
      }

      Cache.atualizarTransform(chaveTransform, r.tipoTransform, r.valor);
      const transformCombinado = Cache.construirTransform(chaveTransform);
      if (!transformCombinado) return;

      if (!_modoOffline && _sheet) {
        const rules = Array.from(_sheet.cssRules);
        for (let i = rules.length - 1; i >= 0; i--) {
          if (
            rules[i].selectorText === seletorRegra &&
            rules[i].style?.transform
          ) {
            _sheet.deleteRule(i);
            break;
          }
        }
      }

      const sufixo = r.importante ? " !important" : "";
      let regra = `${seletorRegra} { transform: ${transformCombinado}${sufixo}; }`;
      if (r.breakpoint)
        regra = _comMediaQuery(
          r.breakpoint,
          `${seletorRegra} { transform: ${transformCombinado}${sufixo}; }`,
        );

      if (_modoOffline) {
        _regrasOffline.push(regra);
        return;
      }
      const sheet = _obterSheet();
      try {
        sheet.insertRule(regra, sheet.cssRules.length);
        Logger.debug("Transform → " + regra);
      } catch (e) {
        Logger.erro("Falha transform: " + regra, e);
      }
    }

    function inserirRegrasGlobais(regrasGlobais) {
      for (const sel in regrasGlobais) {
        const props = regrasGlobais[sel];
        const decl = Object.entries(props)
          .map(([p, v]) => `${p}: ${v}`)
          .join("; ");
        _inserirRegra(`${sel} { ${decl}; }`);
      }
    }

    function inserirVariaveisCSS(tema) {
      if (!tema) return;
      const vars = [];
      if (tema.cores)
        Object.entries(tema.cores).forEach(([n, v]) =>
          vars.push(`--breeze-${n}: ${v}`),
        );
      if (tema.espacamento)
        Object.entries(tema.espacamento).forEach(([n, v]) =>
          vars.push(`--breeze-spacing-${n}: ${v}`),
        );
      if (tema.fontes)
        Object.entries(tema.fontes).forEach(([n, v]) =>
          vars.push(`--breeze-font-${n}: ${v}`),
        );
      if (vars.length > 0) _inserirRegra(`:root { ${vars.join("; ")}; }`);
      _inserirKeyframes();
    }

    function _inserirKeyframes() {
      const keyframes = [
        `@keyframes breeze-spin { to { transform: rotate(360deg); } }`,
        `@keyframes breeze-ping { 75%, 100% { transform: scale(2); opacity: 0; } }`,
        `@keyframes breeze-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`,
        `@keyframes breeze-bounce { 0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); } 50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); } }`,
        `@keyframes breeze-fade-in { from { opacity: 0; } to { opacity: 1; } }`,
        `@keyframes breeze-slide-in { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`,
      ];
      keyframes.forEach((kf) => {
        if (!Cache.temRegra(kf)) {
          Cache.registarRegra(kf);
          if (!_modoOffline) {
            try {
              _obterSheet().insertRule(kf, _obterSheet().cssRules.length);
            } catch (e) {
              /* ignorar */
            }
          } else {
            _regrasOffline.push(kf);
          }
        }
      });
    }

    function gerarCSSEstatico(minificar = false) {
      return minificar ? _regrasOffline.join("") : _regrasOffline.join("\n");
    }

    // ─────────────────────────────────────────────────────────────────
    // obterRegrasDOMAtual
    // Lê as cssRules da <style> tag ao vivo e reconstrói CSS utilizável.
    // Usa rule.style para extrair declarações (evita bug do browser que
    // serializa cssText com blocos vazios em seletores escapados).
    // ─────────────────────────────────────────────────────────────────
    function obterRegrasDOMAtual() {
      if (!_sheet) return [];
      const linhas = [];
      const rules = Array.from(_sheet.cssRules || []);

      function _serializarEstilo(style) {
        // Lê cada propriedade declarada e reconstrói "prop: valor".
        // getPropertyValue pode devolver "" para "0" em alguns engines —
        // usamos acesso camelCase como fallback.
        const decls = [];
        for (let i = 0; i < style.length; i++) {
          const prop = style[i];
          let val = style.getPropertyValue(prop);
          const prio = style.getPropertyPriority(prop);
          if (val === "" || val === undefined) {
            const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            val = style[camel] != null ? String(style[camel]) : "";
          }
          if (val !== "" && val !== undefined) {
            decls.push(`  ${prop}: ${val}${prio ? " !" + prio : ""};`);
          }
        }
        return decls.join("\n");
      }

      function _serializarRegra(rule, indent) {
        const pad = indent || "";

        // CSSStyleRule (regra normal com seletor)
        if (rule.type === 1 && rule.style) {
          const decls = _serializarEstilo(rule.style);
          // Seletor: preferir selectorText que o browser normaliza
          const sel = rule.selectorText || "";
          if (!decls) return null; // regra vazia — ignorar
          return `${pad}${sel} {\n${decls}\n${pad}}`;
        }

        // CSSMediaRule (@media)
        if (rule.type === 4 && rule.cssRules) {
          const cond = rule.conditionText || rule.media?.mediaText || "";
          const inner = Array.from(rule.cssRules)
            .map((r) => _serializarRegra(r, pad + "  "))
            .filter(Boolean)
            .join("\n");
          if (!inner) return null;
          return `${pad}@media ${cond} {\n${inner}\n${pad}}`;
        }

        // CSSKeyframesRule (@keyframes)
        if (rule.type === 7 && rule.cssRules) {
          const nome = rule.name || "";
          const inner = Array.from(rule.cssRules)
            .map((r) => {
              const decls = _serializarEstilo(r.style);
              return decls
                ? `  ${r.keyText} {\n${decls.replace(/^/gm, "  ")}\n  }`
                : null;
            })
            .filter(Boolean)
            .join("\n");
          if (!inner) return null;
          return `${pad}@keyframes ${nome} {\n${inner}\n${pad}}`;
        }

        // Fallback para outros tipos (@font-face, etc.) — usar cssText
        if (rule.cssText) return pad + rule.cssText;
        return null;
      }

      for (const rule of rules) {
        const linha = _serializarRegra(rule, "");
        if (linha) linhas.push(linha);
      }

      return linhas;
    }

    function limpar() {
      if (_tagEstilo) {
        _tagEstilo.remove();
        _tagEstilo = null;
        _sheet = null;
      }
    }

    return {
      inicializar,
      renderizar,
      inserirRegrasGlobais,
      inserirVariaveisCSS,
      ativarModoOffline,
      desativarModoOffline,
      obterRegrasOffline,
      gerarCSSEstatico,
      obterRegrasDOMAtual,
      limpar,
    };
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // BORDER SHORTHAND PARSER
  // ═══════════════════════════════════════════════════════════════════════
  const ESTILOS_BORDA = new Set([
    "none",
    "hidden",
    "dotted",
    "dashed",
    "solid",
    "double",
    "groove",
    "ridge",
    "inset",
    "outset",
    "initial",
    "inherit",
    "unset",
  ]);

  const REGEX_LARGURA_BORDA =
    /^(\d+(\.\d+)?(px|em|rem|%|vw|vh|pt|cm|mm)|thin|medium|thick)$/i;

  function _parece_cor(v) {
    return (
      /^#[0-9a-fA-F]{3,8}$/.test(v) ||
      /^rgba?\(/.test(v) ||
      /^hsla?\(/.test(v) ||
      /^var\(/.test(v) ||
      /^(transparent|currentColor|black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|inherit|initial|unset)$/i.test(
        v,
      )
    );
  }

  function parsearBorderShorthand(valorBruto, lado = "") {
    const valor = valorBruto.replace(/_/g, " ");
    const partes = _splitRespeitandoParenteses(valor);

    const resultado = [];
    const propStyle = `border${lado}-style`;
    const propWidth = `border${lado}-width`;
    const propColor = `border${lado}-color`;

    let temStyle = false,
      temWidth = false,
      temColor = false;

    for (const parte of partes) {
      if (!temStyle && ESTILOS_BORDA.has(parte.toLowerCase())) {
        resultado.push({ prop: propStyle, val: parte });
        temStyle = true;
      } else if (!temWidth && REGEX_LARGURA_BORDA.test(parte)) {
        resultado.push({ prop: propWidth, val: parte });
        temWidth = true;
      } else if (!temColor && _parece_cor(parte)) {
        resultado.push({ prop: propColor, val: parte });
        temColor = true;
      } else {
        Logger.aviso(
          `border shorthand: parte não reconhecida "${parte}", usando como largura`,
        );
        if (!temWidth) {
          resultado.push({ prop: propWidth, val: parte });
          temWidth = true;
        }
      }
    }

    return resultado;
  }

  function _splitRespeitandoParenteses(str) {
    const partes = [];
    let atual = "",
      profundidade = 0;
    for (const c of str) {
      if (c === "(") {
        profundidade++;
        atual += c;
      } else if (c === ")") {
        profundidade--;
        atual += c;
      } else if (c === " " && profundidade === 0) {
        if (atual) {
          partes.push(atual);
          atual = "";
        }
      } else {
        atual += c;
      }
    }
    if (atual) partes.push(atual);
    return partes;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PARSER
  // ═══════════════════════════════════════════════════════════════════════
  const Parser = (() => {
    let _config = null;
    const REGEX_ARBITRARIO =
      /^(?<prefixo>[a-zA-Z-]+(?:-[a-zA-Z-]+)*)\[(?<valor>[^\]]+)\]$/;

    const BORDER_SHORTHAND_PREFIXOS = new Set([
      "border",
      "border-t",
      "border-r",
      "border-b",
      "border-l",
    ]);

    const BORDER_LADO_MAP = {
      border: "",
      "border-t": "-top",
      "border-r": "-right",
      "border-b": "-bottom",
      "border-l": "-left",
    };

    function inicializar(config) {
      _config = config;
    }

    function interpretarClasse(classeOriginal) {
      if (!_config) return null;
      if (Cache.temClasse(classeOriginal))
        return Cache.obterClasse(classeOriginal);

      // Componente com sufixo ! → btn! expande como btn mas com importante: true
      const classeParaComponente = classeOriginal.endsWith("!")
        ? classeOriginal.slice(0, -1)
        : classeOriginal;
      const importanteComponente =
        classeOriginal.endsWith("!") && classeOriginal !== classeParaComponente;

      if (Cache.temComponente(classeParaComponente)) {
        const cls = Cache.obterComponente(classeParaComponente);
        const res = cls
          .map((c) => interpretarClasse(c))
          .flat()
          .filter(Boolean)
          .map((r) => (importanteComponente ? { ...r, importante: true } : r));
        Cache.registarClasse(classeOriginal, res);
        return res;
      }

      const resultado = _parsearClasse(classeOriginal);
      Cache.registarClasse(classeOriginal, resultado);
      return resultado;
    }

    function _parsearClasse(classe) {
      const partes = _separarQualificadores(classe);
      if (!partes) return null;
      const { breakpoint, variantes, classeBase } = partes;
      return (
        _resolverClasseFixa(classeBase, breakpoint, variantes) ||
        _resolverClasseArbitraria(classeBase, breakpoint, variantes)
      );
    }

    function _separarQualificadores(classe) {
      if (!classe.includes(":") && !classe.includes("[")) {
        return { breakpoint: null, variantes: [], classeBase: classe };
      }
      const segmentos = [];
      let atual = "",
        dentroColchetes = false;
      for (let i = 0; i < classe.length; i++) {
        const c = classe[i];
        if (c === "[") dentroColchetes = true;
        if (c === "]") dentroColchetes = false;
        if (c === ":" && !dentroColchetes) {
          segmentos.push(atual);
          atual = "";
        } else atual += c;
      }
      segmentos.push(atual);
      const classeBase = segmentos.pop();
      let breakpoint = null;
      const variantes = [];
      for (const seg of segmentos) {
        if (_config.breakpoints[seg] !== undefined) breakpoint = seg;
        else if (_config.variantes[seg] !== undefined) variantes.push(seg);
        else {
          Logger.aviso(`Qualificador desconhecido: "${seg}" em "${classe}"`);
          return null;
        }
      }
      return { breakpoint, variantes, classeBase };
    }

    function _resolverClasseFixa(classeBase, breakpoint, variantes) {
      let importante = false;
      if (classeBase.endsWith("!")) {
        importante = true;
        classeBase = classeBase.slice(0, -1);
      }
      const estiloFixo = _config.classesFixas[classeBase];
      if (!estiloFixo) return null;
      return estiloFixo
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
          const idx = d.indexOf(":");
          if (idx === -1) return null;
          return {
            tipo: "fixo",
            classeBase,
            breakpoint,
            variantes: variantes || [],
            propriedade: d.slice(0, idx).trim(),
            valor: d.slice(idx + 1).trim(),
            importante,
            eTransform: false,
          };
        })
        .filter(Boolean);
    }

    function _resolverClasseArbitraria(classeBase, breakpoint, variantes) {
      const match = classeBase.match(REGEX_ARBITRARIO);
      if (!match) return null;
      let { prefixo, valor } = match.groups;

      let importante = false;
      if (valor.endsWith("!")) {
        importante = true;
        valor = valor.slice(0, -1);
      }

      if (BORDER_SHORTHAND_PREFIXOS.has(prefixo)) {
        const valorComEspacos = valor.replace(/_/g, " ");
        const partes = _splitRespeitandoParenteses(valorComEspacos);
        const temEstilo = partes.some((p) =>
          ESTILOS_BORDA.has(p.toLowerCase()),
        );
        const temCor = partes.some((p) => _parece_cor(p));
        if (partes.length > 1 || temEstilo || temCor) {
          const lado = BORDER_LADO_MAP[prefixo];
          const declaracoes = parsearBorderShorthand(valor, lado);
          if (declaracoes.length > 0) {
            return declaracoes.map(({ prop, val }) => ({
              tipo: "arbitrario",
              classeBase,
              breakpoint,
              variantes: variantes || [],
              prefixo,
              propriedade: prop,
              valor: val,
              importante,
              eTransform: false,
              tipoTransform: null,
            }));
          }
        }
      }

      valor = _resolverValorTema(valor);
      valor = _substituirUnderscoreFora(valor);
      const propriedade = _config.mapaPropriedades[prefixo];
      if (!propriedade) {
        Logger.aviso(`Prefixo desconhecido: "${prefixo}"`);
        return null;
      }
      const eTransform = _config.transformPrefixos?.includes(prefixo) ?? false;
      let valorProcessado = valor,
        tipoTransform = null;
      if (eTransform) {
        const r = _processarTransform(prefixo, valor);
        valorProcessado = r.valorCss;
        tipoTransform = r.tipo;
      } else if (_config.processadoresEspeciais[prefixo]) {
        valorProcessado = _config.processadoresEspeciais[prefixo](valor);
      }
      return [
        {
          tipo: "arbitrario",
          classeBase,
          breakpoint,
          variantes: variantes || [],
          prefixo,
          propriedade,
          valor: valorProcessado,
          importante,
          eTransform,
          tipoTransform,
        },
      ];
    }

    // Substitui _ por espaço em todo o valor, EXCEPTO dentro de funções cujo
    // conteúdo é literal (url, var, env, attr, src), onde o _ faz parte do valor
    // real (caminhos, nomes de variáveis). Assim funcionam:
    //   calc(100%_-_20px), clamp(1rem,_4vw_+_1rem,_3rem),
    //   radial-gradient(circle_at_top,#000_60%,transparent), rgb(0_0_0/_50%)
    const FUNCOES_LITERAIS = new Set(["url", "var", "env", "attr", "src"]);

    function _substituirUnderscoreFora(valor) {
      let resultado = "";
      const pilha = []; // true = literal (preservar _), false = converter
      let nomeFn = "";
      for (let i = 0; i < valor.length; i++) {
        const c = valor[i];
        if (c === "(") {
          const literal =
            FUNCOES_LITERAIS.has(nomeFn.toLowerCase()) ||
            (pilha.length > 0 && pilha[pilha.length - 1]);
          pilha.push(literal);
          nomeFn = "";
          resultado += c;
        } else if (c === ")") {
          pilha.pop();
          nomeFn = "";
          resultado += c;
        } else {
          if (/[a-zA-Z-]/.test(c)) nomeFn += c;
          else nomeFn = "";
          const preservar = pilha.length > 0 && pilha[pilha.length - 1];
          resultado += c === "_" && !preservar ? " " : c;
        }
      }
      return resultado;
    }

    function _resolverValorTema(valor) {
      const t = _config.tema;
      if (!t) return valor;
      if (t.cores?.[valor]) return t.cores[valor];
      if (t.espacamento?.[valor]) return t.espacamento[valor];
      if (t.fontes?.[valor]) return t.fontes[valor];
      return valor;
    }

    function _processarTransform(prefixo, valor) {
      const mapa = {
        rotate: { tipo: "rotate", fn: (v) => `rotate(${v})` },
        scale: { tipo: "scale", fn: (v) => `scale(${v})` },
        "scale-x": { tipo: "scaleX", fn: (v) => `scaleX(${v})` },
        "scale-y": { tipo: "scaleY", fn: (v) => `scaleY(${v})` },
        "translate-x": { tipo: "translateX", fn: (v) => `translateX(${v})` },
        "translate-y": { tipo: "translateY", fn: (v) => `translateY(${v})` },
        "skew-x": { tipo: "skewX", fn: (v) => `skewX(${v})` },
        "skew-y": { tipo: "skewY", fn: (v) => `skewY(${v})` },
      };
      const cfg = mapa[prefixo];
      if (!cfg) return { tipo: prefixo, valorCss: valor };
      return { tipo: cfg.tipo, valorCss: cfg.fn(valor) };
    }

    function extrairClassesRelevantes(elemento) {
      return Array.from(elemento.classList).filter((classe) => {
        // Normalizar sufixo ! para lookup em classesFixas e componentes
        const classeNorm = classe.endsWith("!") ? classe.slice(0, -1) : classe;

        if (_config.classesFixas[classeNorm]) return true;
        if (Cache.temComponente(classeNorm)) return true;
        if (!classe.includes(":") && !classe.includes("[")) return false;

        const partes = _separarQualificadoresRapido(classe);
        if (!partes) return false;
        const { classeBase } = partes;

        // classeBase também pode ter sufixo !
        const classeBaseNorm = classeBase.endsWith("!")
          ? classeBase.slice(0, -1)
          : classeBase;

        if (_config.classesFixas[classeBaseNorm]) return true;
        if (Cache.temComponente(classeBaseNorm)) return true;

        const matchArb = classeBaseNorm.match(REGEX_ARBITRARIO);
        if (matchArb) {
          const p = matchArb.groups.prefixo;
          return (
            _config.mapaPropriedades[p] !== undefined ||
            BORDER_SHORTHAND_PREFIXOS.has(p)
          );
        }

        return false;
      });
    }

    function _separarQualificadoresRapido(classe) {
      if (!classe.includes(":")) return { classeBase: classe };
      const segmentos = [];
      let atual = "",
        dentroColchetes = false;
      for (let i = 0; i < classe.length; i++) {
        const c = classe[i];
        if (c === "[") dentroColchetes = true;
        if (c === "]") dentroColchetes = false;
        if (c === ":" && !dentroColchetes) {
          segmentos.push(atual);
          atual = "";
        } else atual += c;
      }
      segmentos.push(atual);
      const classeBase = segmentos.pop();
      for (const seg of segmentos) {
        if (
          _config.breakpoints[seg] === undefined &&
          _config.variantes[seg] === undefined
        )
          return null;
      }
      return { classeBase };
    }

    return { inicializar, interpretarClasse, extrairClassesRelevantes };
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // OBSERVER
  // ═══════════════════════════════════════════════════════════════════════
  const Observer = (() => {
    let _observer = null;
    let _callback = null;

    // ── Debounce via requestAnimationFrame ──────────────────────────────
    // Todas as mutações ocorridas no mesmo frame são agrupadas numa única
    // chamada ao callback, evitando processamento repetido em páginas
    // dinâmicas que inserem muitos elementos de seguida.
    const _fila = new Set();
    let _agendado = false;

    function _agendarProcessamento(elementos) {
      elementos.forEach((el) => _fila.add(el));
      if (_agendado) return;
      _agendado = true;
      requestAnimationFrame(() => {
        _agendado = false;
        const lista = Array.from(_fila);
        _fila.clear();
        Logger.debug(`Observer (rAF): ${lista.length} elemento(s)`);
        _callback(lista);
      });
    }

    function iniciar(callback) {
      if (_observer) {
        Logger.aviso("Observer já activo");
        return;
      }
      _callback = callback;
      _observer = new MutationObserver(_aoMutar);
      _observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
      Logger.debug("MutationObserver iniciado (com debounce rAF)");
    }

    function parar() {
      if (_observer) {
        _observer.disconnect();
        _observer = null;
        Logger.debug("Observer parado");
      }
    }

    function _aoMutar(mutations) {
      const elementos = new Set();
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((no) => {
            if (no.nodeType === Node.ELEMENT_NODE) {
              elementos.add(no);
              no.querySelectorAll("*").forEach((el) => elementos.add(el));
            }
          });
        } else if (
          m.type === "attributes" &&
          m.target.nodeType === Node.ELEMENT_NODE
        ) {
          elementos.add(m.target);
        }
      }
      if (elementos.size > 0) _agendarProcessamento(Array.from(elementos));
    }

    function coletarInicialmente() {
      return Array.from(document.querySelectorAll("*"));
    }

    return { iniciar, parar, coletarInicialmente };
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // BLEND MODES
  // ═══════════════════════════════════════════════════════════════════════
  const MODOS_BLEND = [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity",
    "plus-lighter",
    "plus-darker",
  ];

  // mix-blend-*  → mix-blend-mode
  // bg-blend-*   → background-blend-mode
  const BLEND_FIXAS = {};
  MODOS_BLEND.forEach((m) => {
    BLEND_FIXAS["mix-blend-" + m] = `mix-blend-mode: ${m}`;
    BLEND_FIXAS["bg-blend-" + m] = `background-blend-mode: ${m}`;
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MASK
  // Cada declaração é emitida com e sem prefixo -webkit- (Safari < 15.4 e
  // Chromium < 120 só reconhecem a versão prefixada).
  // ═══════════════════════════════════════════════════════════════════════
  const _mk = (prop, val) => `${prop}: ${val}; -webkit-${prop}: ${val}`;
  const _fade = (dir) =>
    _mk("mask-image", `linear-gradient(to ${dir}, #000 60%, transparent)`);

  const MASK_FIXAS = {
    "mask-none": _mk("mask-image", "none"),

    // repeat
    "mask-repeat": _mk("mask-repeat", "repeat"),
    "mask-no-repeat": _mk("mask-repeat", "no-repeat"),
    "mask-repeat-x": _mk("mask-repeat", "repeat-x"),
    "mask-repeat-y": _mk("mask-repeat", "repeat-y"),
    "mask-repeat-round": _mk("mask-repeat", "round"),
    "mask-repeat-space": _mk("mask-repeat", "space"),

    // size
    "mask-auto": _mk("mask-size", "auto"),
    "mask-contain": _mk("mask-size", "contain"),
    "mask-cover": _mk("mask-size", "cover"),

    // position
    "mask-center": _mk("mask-position", "center"),
    "mask-top": _mk("mask-position", "top"),
    "mask-bottom": _mk("mask-position", "bottom"),
    "mask-left": _mk("mask-position", "left"),
    "mask-right": _mk("mask-position", "right"),

    // mode
    "mask-alpha": _mk("mask-mode", "alpha"),
    "mask-luminance": _mk("mask-mode", "luminance"),
    "mask-match-source": _mk("mask-mode", "match-source"),

    // composite (valores standard ↔ valores -webkit- equivalentes)
    "mask-add": "mask-composite: add; -webkit-mask-composite: source-over",
    "mask-subtract": "mask-composite: subtract; -webkit-mask-composite: source-out",
    "mask-intersect": "mask-composite: intersect; -webkit-mask-composite: source-in",
    "mask-exclude": "mask-composite: exclude; -webkit-mask-composite: xor",

    // clip
    "mask-clip-border": _mk("mask-clip", "border-box"),
    "mask-clip-padding": _mk("mask-clip", "padding-box"),
    "mask-clip-content": _mk("mask-clip", "content-box"),
    "mask-clip-none": _mk("mask-clip", "no-clip"),

    // origin
    "mask-origin-border": _mk("mask-origin", "border-box"),
    "mask-origin-padding": _mk("mask-origin", "padding-box"),
    "mask-origin-content": _mk("mask-origin", "content-box"),

    // type (máscaras SVG)
    "mask-type-alpha": "mask-type: alpha",
    "mask-type-luminance": "mask-type: luminance",

    // presets de fade (esbatimento nas bordas)
    "mask-fade-t": _fade("top"),
    "mask-fade-r": _fade("right"),
    "mask-fade-b": _fade("bottom"),
    "mask-fade-l": _fade("left"),
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ENGINE
  // ═══════════════════════════════════════════════════════════════════════
  const Engine = (() => {
    let _config = null;
    let _iniciado = false;
    let _idCounter = 0;
    const _mapaIdsElemento = new WeakMap();

    // Registo permanente: breezeId → array de classes CSS de transform.
    // Usado na exportação para substituir [data-breeze-id="bN"] por seletores
    // de classe reais, tornando o CSS exportado independente do Breeze.
    const _mapaIdParaClasses = new Map();

    function _obterIdElemento(elemento) {
      if (!_mapaIdsElemento.has(elemento)) {
        const id = `b${++_idCounter}`;
        _mapaIdsElemento.set(elemento, id);
        elemento.setAttribute("data-breeze-id", id);
      }
      return _mapaIdsElemento.get(elemento);
    }

    function processarElementos(elementos) {
      for (const el of elementos) {
        if (!el.classList || el.classList.length === 0) continue;
        const classes = Parser.extrairClassesRelevantes(el);
        const classesTransform = [];
        for (const classe of classes) {
          const resultados = Parser.interpretarClasse(classe);
          if (!resultados || resultados.length === 0) continue;
          if (resultados.some((r) => r.eTransform)) {
            _obterIdElemento(el);
            classesTransform.push(classe);
          }
          Renderer.renderizar(resultados, classe, el);
        }
        // Actualizar o mapa id → classes de transform para este elemento
        if (classesTransform.length > 0) {
          const id = el.getAttribute("data-breeze-id");
          if (id) _mapaIdParaClasses.set(id, classesTransform);
        }
      }
    }

    function init(configUsuario = {}) {
      if (_iniciado) {
        Logger.aviso(
          "BreezeCSS já foi inicializado. Use reiniciar() para reinicializar.",
        );
        return;
      }
      _config = _construirConfig(configUsuario);
      _iniciado = true;
      Logger.configurar({
        nivel: _config.debug
          ? "debug"
          : _config.log === false
            ? "silencioso"
            : "info",
        silencioso: _config.log === false,
      });
      Logger.info("Inicializando BreezeCSS v2.2.5...");
      if (_config.plugins) _config.plugins.forEach((p) => _aplicarPlugin(p));

      // ── prefix ───────────────────────────────────────────────────
      // Se definido, aplica o prefixo a todas as classes fixas e
      // mapeamentos existentes, permitindo uso como bz-flex, bz-bg[red], …
      if (_config.prefix) {
        const pf = _config.prefix;
        const novasFixas = {};
        for (const [k, v] of Object.entries(_config.classesFixas))
          novasFixas[pf + k] = v;
        _config.classesFixas = novasFixas;

        const novosMapa = {};
        for (const [k, v] of Object.entries(_config.mapaPropriedades))
          novosMapa[pf + k] = v;
        _config.mapaPropriedades = novosMapa;
        Logger.info(`Prefix activo: "${pf}"`);
      }

      Parser.inicializar(_config);
      Renderer.inicializar(_config);
      if (_config.reset) Renderer.inserirRegrasGlobais(_config.regrasGlobais);
      Renderer.inserirVariaveisCSS(_config.tema);

      // ── scrollSmooth ─────────────────────────────────────────────
      // Injeta html { scroll-behavior: smooth } automaticamente.
      // Desative com scrollSmooth: false na configuração.
      if (_config.scrollSmooth !== false) {
        Renderer.inserirRegrasGlobais({ html: { "scroll-behavior": "smooth" } });
        Logger.debug("scrollSmooth activo: html { scroll-behavior: smooth }");
      }

      // ── safelist ─────────────────────────────────────────────────
      // Pré-gera as classes indicadas, mesmo que ainda não estejam no DOM.
      if (_config.safelist && _config.safelist.length > 0) {
        Logger.info(`Safelist: ${_config.safelist.length} classe(s)`);
        // Criar um elemento fantasma para forçar o processamento
        const fantasma = document.createElement("div");
        fantasma.className = _config.safelist.join(" ");
        processarElementos([fantasma]);
      }

      const elementosIniciais = Observer.coletarInicialmente();
      processarElementos(elementosIniciais);
      Observer.iniciar(processarElementos);
      Logger.info(`Pronto. ${elementosIniciais.length} elementos processados.`);
    }

    function reiniciar() {
      Observer.parar();
      Renderer.limpar();
      Cache.limpar();
      _mapaIdParaClasses.clear();
      _config = null;
      _iniciado = false;
      _idCounter = 0;
      Logger.debug("BreezeCSS reiniciado.");
    }

    function processar() {
      _garantirIniciado();
      processarElementos(Observer.coletarInicialmente());
    }

    function build(htmlString, opcoes = {}) {
      if (typeof DOMParser === "undefined") {
        Logger.erro("build() requer DOMParser. Em Node.js use jsdom.");
        return "";
      }
      if (!_iniciado) {
        _garantirIniciado();
      }
      Logger.info("Modo build...");
      const doc = new DOMParser().parseFromString(htmlString, "text/html");
      const elementos = Array.from(doc.querySelectorAll("*"));
      Renderer.ativarModoOffline();
      Cache.limpar();
      Parser.inicializar(_config);
      if (_config.reset) Renderer.inserirRegrasGlobais(_config.regrasGlobais);
      Renderer.inserirVariaveisCSS(_config.tema);
      processarElementos(elementos);
      const css = Renderer.gerarCSSEstatico(opcoes.minificar ?? false);
      Renderer.desativarModoOffline();
      Logger.info(`Build: ${css.length} chars`);
      return css;
    }

    // ─────────────────────────────────────────────────────────────────
    // exportar
    //
    // Lê o CSS real presente no <style> do browser (via obterRegrasDOMAtual),
    // substitui seletores [data-breeze-id="bN"] pelos seletores de classe
    // originais (tornando o CSS portável, sem dependência do Breeze),
    // e dispara o download do ficheiro .css.
    //
    // Opções:
    //   nome             {string}  – nome do ficheiro (sem extensão). Default: 'breeze-output'
    //   minificar        {boolean} – output numa linha só.            Default: false
    //   incluirCabecalho {boolean} – adiciona comentário no topo.     Default: true
    //
    // Devolve o conteúdo CSS como string.
    // ─────────────────────────────────────────────────────────────────
    function exportar(opcoes = {}) {
      const {
        nome = "breeze-output",
        minificar = false,
        incluirCabecalho = true,
      } = opcoes;

      // ── 1. Fonte de verdade: CSS real presente no DOM ────────────
      const regras = Renderer.obterRegrasDOMAtual();

      if (regras.length === 0) {
        Logger.aviso(
          "exportar(): nenhuma regra CSS encontrada. O Breeze já foi inicializado?",
        );
        return "";
      }

      // ── 2. Construir tabela de substituição ──────────────────────
      // [data-breeze-id="bN"] → seletor de classe baseado nas classes
      // de transform do elemento (ex: .translate-x\[10px\].rotate\[45deg\])
      //
      // Porquê: os IDs são dinâmicos e deixam de funcionar sem o Breeze.
      // Ao substituir por seletores de classe, o CSS exportado é autónomo.
      const tabelaSubstituicao = new Map(); // "bN" → seletor CSS

      for (const [id, classes] of _mapaIdParaClasses) {
        // Construir seletor combinado a partir das classes do elemento.
        // cssEscape trata os '[', ']' e outros caracteres especiais.
        const seletor = classes.map((c) => "." + cssEscape(c)).join("");
        tabelaSubstituicao.set(id, seletor);
      }

      // ── 3. Aplicar substituições nas regras ──────────────────────
      // Regex que captura [data-breeze-id="bN"] com ou sem pseudoclasse/
      // pseudoelemento a seguir (ex: [data-breeze-id="b1"]:hover).
      const REGEX_ID = /\[data-breeze-id="(b\d+)"\]/g;

      const regrasSubstituidas = regras.map((regra) => {
        return regra.replace(REGEX_ID, (match, id) => {
          return tabelaSubstituicao.has(id)
            ? tabelaSubstituicao.get(id)
            : match; // sem correspondência conhecida: manter original
        });
      });

      // ── 4. Montar conteúdo final ─────────────────────────────────
      let conteudo = "";

      if (incluirCabecalho) {
        const agora = new Date().toISOString().replace("T", " ").slice(0, 19);
        conteudo += [
          `/* =========================================`,
          ` * Gerado por BreezeCSS v${BreezeCSS.versao}`,
          ` * Data: ${agora}`,
          ` * Total de regras: ${regrasSubstituidas.length}`,
          ` * ========================================= */`,
          "",
        ].join("\n");
      }

      if (minificar) {
        conteudo += regrasSubstituidas
          .map((r) =>
            r
              // Colapsar espaços em branco (incluindo newlines)
              .replace(/\s+/g, " ")
              .trim()
              // Remover espaço à volta de { } : ;
              .replace(/\s*\{\s*/g, "{")
              .replace(/\s*\}\s*/g, "}")
              .replace(/\s*;\s*/g, ";")
              // Remover último ; antes de }
              .replace(/;}/g, "}")
              // Remover espaços à volta de : dentro de declarações
              // (mas não em pseudo-seletores como :hover — que ficam dentro de {})
              .replace(
                /\{([^}]+)\}/g,
                (_, decls) => "{" + decls.replace(/\s*:\s*/g, ":") + "}",
              ),
          )
          .join("");
      } else {
        conteudo += regrasSubstituidas.join("\n") + "\n";
      }

      // ── 5. Download ──────────────────────────────────────────────
      if (typeof document !== "undefined" && typeof URL !== "undefined") {
        try {
          const blob = new Blob([conteudo], { type: "text/css;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = nome.endsWith(".css") ? nome : `${nome}.css`;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
          Logger.info(
            `exportar(): "${link.download}" (${regrasSubstituidas.length} regras, ${conteudo.length} chars)`,
          );
        } catch (e) {
          Logger.erro("exportar(): falha ao criar download", e);
        }
      } else {
        Logger.aviso(
          "exportar(): ambiente sem DOM – CSS devolvido como string apenas.",
        );
      }

      return conteudo;
    }

    function use(plugin) {
      if (!plugin || typeof plugin.setup !== "function") {
        Logger.erro("Plugin inválido");
        return;
      }
      Logger.info(`Plugin: "${plugin.nome || "?"}"`);
      if (_iniciado) _aplicarPlugin(plugin);
      else {
        if (!_config) _config = _construirConfig({});
        (_config.plugins = _config.plugins || []).push(plugin);
      }
    }

    function _aplicarPlugin(plugin) {
      plugin.setup({
        addMapping: (p, prop) => {
          _config.mapaPropriedades[p] = prop;
        },
        addFixedClass: (n, e) => {
          _config.classesFixas[n] = e;
        },
        addVariant: (n, ps) => {
          _config.variantes[n] = ps;
        },
        addBreakpoint: (n, t) => {
          _config.breakpoints[n] = t;
        },
        addProcessor: (p, fn) => {
          _config.processadoresEspeciais[p] = fn;
        },
        config: _config,
      });
    }

    function addMapping(p, prop) {
      _garantirIniciado();
      _config.mapaPropriedades[p] = prop;
      _reprocessarDOM();
    }
    function addVariant(n, ps) {
      _garantirIniciado();
      _config.variantes[n] = ps;
      _reprocessarDOM();
    }
    function addBreakpoint(n, t) {
      _garantirIniciado();
      _config.breakpoints[n] = t;
      _reprocessarDOM();
    }
    function addFixedClass(n, e) {
      _garantirIniciado();
      _config.classesFixas[n] = e;
      _reprocessarDOM();
    }
    function addProcessor(p, fn) {
      _garantirIniciado();
      _config.processadoresEspeciais[p] = fn;
      _reprocessarDOM();
    }
    function addComponent(n, cls) {
      _garantirIniciado();
      Cache.registarComponente(n, cls);
      Logger.debug(`Componente: "${n}"`);
      _reprocessarDOM();
    }

    function _reprocessarDOM() {
      if (!_iniciado) return;
      processarElementos(Observer.coletarInicialmente());
    }

    function obterStats() {
      return {
        cache: Cache.obterStats(),
        config: {
          breakpoints: Object.keys(_config?.breakpoints || {}),
          variantes: Object.keys(_config?.variantes || {}),
          classesFixas: Object.keys(_config?.classesFixas || {}).length,
          mapeamentos: Object.keys(_config?.mapaPropriedades || {}).length,
        },
      };
    }

    function _garantirIniciado() {
      if (!_iniciado || !_config) {
        Logger.aviso("A inicializar com config padrão.");
        _config = _construirConfig({});
        Parser.inicializar(_config);
        Renderer.inicializar(_config);
        _iniciado = true;
      }
    }

    function _construirConfig(u) {
      const b = _configPadrao();
      return {
        ...b,
        ...u,
        classesFixas: { ...b.classesFixas, ...(u.classesFixas || {}) },
        mapaPropriedades: {
          ...b.mapaPropriedades,
          ...(u.mapaPropriedades || {}),
        },
        variantes: { ...b.variantes, ...(u.variantes || {}) },
        breakpoints: { ...b.breakpoints, ...(u.breakpoints || {}) },
        regrasGlobais: { ...b.regrasGlobais, ...(u.regrasGlobais || {}) },
        processadoresEspeciais: {
          ...b.processadoresEspeciais,
          ...(u.processadoresEspeciais || {}),
        },
        transformPrefixos: b.transformPrefixos,
        tema: {
          cores: { ...(b.tema.cores || {}), ...(u.tema?.cores || {}) },
          espacamento: {
            ...(b.tema.espacamento || {}),
            ...(u.tema?.espacamento || {}),
          },
          fontes: { ...(b.tema.fontes || {}), ...(u.tema?.fontes || {}) },
        },
        plugins: u.plugins || [],
        safelist: u.safelist || [],
        prefix: u.prefix || "",
        scrollSmooth: u.scrollSmooth !== false, // true por padrão
      };
    }

    function _configPadrao() {
      return {
        log: true,
        debug: false,
        reset: true,
        tema: { cores: {}, espacamento: {}, fontes: {} },

        breakpoints: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
          "2xl": "1536px",
        },

        variantes: {
          hover: ":hover",
          active: ":active",
          focus: ":focus",
          "focus-visible": ":focus-visible",
          visited: ":visited",
          disabled: ":disabled",
          checked: ":checked",
          first: ":first-child",
          last: ":last-child",
          even: ":nth-child(even)",
          odd: ":nth-child(odd)",
          placeholder: "::placeholder",
          before: "::before",
          after: "::after",
          dark: ".dark &",
        },

        regrasGlobais: {
          "*": { margin: "0", padding: "0" },
          html: { "box-sizing": "border-box" },
          "*, *::before, *::after": { "box-sizing": "inherit" },
        },

        transformPrefixos: [
          "rotate",
          "scale",
          "scale-x",
          "scale-y",
          "translate-x",
          "translate-y",
          "skew-x",
          "skew-y",
        ],

        mapaPropriedades: {
          // Espaçamento
          m: "margin",
          mt: "margin-top",
          mr: "margin-right",
          mb: "margin-bottom",
          ml: "margin-left",
          mx: "margin-inline",
          my: "margin-block",
          p: "padding",
          pt: "padding-top",
          pr: "padding-right",
          pb: "padding-bottom",
          pl: "padding-left",
          px: "padding-inline",
          py: "padding-block",
          gap: "gap",
          "gap-x": "column-gap",
          "gap-y": "row-gap",

          // Dimensões
          w: "width",
          h: "height",
          "min-w": "min-width",
          "min-h": "min-height",
          "max-w": "max-width",
          "max-h": "max-height",
          size: "width; height",

          // Cor
          bg: "background-color",
          text: "color",

          // Bordas
          border: "border-width",
          "border-t": "border-top-width",
          "border-r": "border-right-width",
          "border-b": "border-bottom-width",
          "border-l": "border-left-width",

          "border-color": "border-color",
          "border-t-color": "border-top-color",
          "border-r-color": "border-right-color",
          "border-b-color": "border-bottom-color",
          "border-l-color": "border-left-color",

          "border-style": "border-style",
          "border-t-style": "border-top-style",
          "border-r-style": "border-right-style",
          "border-b-style": "border-bottom-style",
          "border-l-style": "border-left-style",

          // Outline
          "outline-color": "outline-color",
          outline: "outline",
          ring: "box-shadow",

          // Radius
          rounded: "border-radius",
          "rounded-t": "border-top-left-radius; border-top-right-radius",
          "rounded-b": "border-bottom-left-radius; border-bottom-right-radius",
          "rounded-l": "border-top-left-radius; border-bottom-left-radius",
          "rounded-r": "border-top-right-radius; border-bottom-right-radius",

          // Tipografia
          "text-size": "font-size",
          "font-size": "font-size",
          leading: "line-height",
          tracking: "letter-spacing",
          "font-family": "font-family",
          fw: "font-weight",
          "font-weight": "font-weight",

          // Sombras
          shadow: "box-shadow",
          "text-shadow": "text-shadow",

          // Posicionamento
          top: "top",
          right: "right",
          bottom: "bottom",
          left: "left",
          z: "z-index",
          inset: "inset",

          // Efeitos visuais
          opacity: "opacity",
          blur: "filter",
          brightness: "filter",
          contrast: "filter",
          grayscale: "filter",
          saturate: "filter",
          "drop-shadow": "filter",
          "backdrop-blur": "backdrop-filter",

          // Background
          "bg-gradient": "background-image",
          "bg-image": "background-image",
          "bg-size": "background-size",
          "bg-pos": "background-position",
          "bg-repeat": "background-repeat",
          "bg-attach": "background-attachment",
          filter: "filter",

          // Flex
          "flex-basis": "flex-basis",
          "flex-g": "flex-grow",
          grow: "flex-grow",
          shrink: "flex-shrink",
          basis: "flex-basis",
          order: "order",

          // Transforms
          rotate: "transform",
          scale: "transform",
          "scale-x": "transform",
          "scale-y": "transform",
          "translate-x": "transform",
          "translate-y": "transform",
          "skew-x": "transform",
          "skew-y": "transform",

          // Grid
          cols: "grid-template-columns",
          rows: "grid-template-rows",
          "col-span": "grid-column",
          "row-span": "grid-row",

          // Text stroke
          "text-stroke": "-webkit-text-stroke",
          "text-stroke-color": "-webkit-text-stroke-color",
          "text-stroke-width": "-webkit-text-stroke-width",

          // Transição
          "transition-prop": "transition",

          // Animação / timing
          duration: "transition-duration",
          delay: "transition-delay",
          ease: "transition-timing-function",
          animate: "animation",
          "animate-delay": "animation-delay",
          "animate-duration": "animation-duration",

          // Outros
          content: "content",
          cursor: "cursor",
          aspect: "aspect-ratio",
          columns: "columns",

          // Blend (arbitrário): mix-blend[difference], bg-blend[overlay]
          "mix-blend": "mix-blend-mode",
          "bg-blend": "background-blend-mode",

          // Mask (arbitrário): mask-image[url(/m.svg)], mask-size[50%], …
          // Cada entrada emite a propriedade standard + a versão -webkit-
          mask: "mask; -webkit-mask",
          "mask-image": "mask-image; -webkit-mask-image",
          "mask-gradient": "mask-image; -webkit-mask-image",
          "mask-size": "mask-size; -webkit-mask-size",
          "mask-pos": "mask-position; -webkit-mask-position",
          "mask-position": "mask-position; -webkit-mask-position",
          "mask-repeat": "mask-repeat; -webkit-mask-repeat",
          "mask-mode": "mask-mode; -webkit-mask-mode",
          "mask-clip": "mask-clip; -webkit-mask-clip",
          "mask-origin": "mask-origin; -webkit-mask-origin",
          "mask-composite": "mask-composite", // valores diferem entre standard e -webkit-: use mask-add/-subtract/-intersect/-exclude para ambos
          "mask-border": "mask-border",
        },

        processadoresEspeciais: {
          blur: (v) => `blur(${v})`,
          brightness: (v) => `brightness(${v})`,
          contrast: (v) => `contrast(${v})`,
          grayscale: (v) => `grayscale(${v})`,
          saturate: (v) => `saturate(${v})`,
          "drop-shadow": (v) => `drop-shadow(${v})`,
          "backdrop-blur": (v) => `blur(${v})`,
          "bg-gradient": (v) =>
            v.startsWith("linear-gradient") ||
            v.startsWith("radial-gradient") ||
            v.startsWith("conic-gradient")
              ? v
              : `linear-gradient(${v})`,
          cols: (v) => (/^\d+$/.test(v) ? `repeat(${v}, 1fr)` : v),
          "col-span": (v) => `span ${v} / span ${v}`,
          "row-span": (v) => `span ${v} / span ${v}`,
          ring: (v) => `0 0 0 ${v} currentColor`,
          aspect: (v) =>
            ({ square: "1/1", video: "16/9", photo: "4/3" })[v] || v,
          fw: (v) => {
            const mapa = {
              thin: "100",
              extralight: "200",
              light: "300",
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
              extrabold: "800",
              black: "900",
            };
            return mapa[v.toLowerCase()] || v;
          },
          "font-weight": (v) => {
            const mapa = {
              thin: "100",
              extralight: "200",
              light: "300",
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
              extrabold: "800",
              black: "900",
            };
            return mapa[v.toLowerCase()] || v;
          },
          "text-stroke": (v) => {
            // text-stroke[2px_#fff] → -webkit-text-stroke: 2px #fff
            // text-stroke[2px] → -webkit-text-stroke-width shorthand
            return v;
          },
          "transition-prop": (v) => v,
          // mask-gradient[to_bottom,#000,transparent] → linear-gradient(...)
          "mask-gradient": (v) =>
            v.startsWith("linear-gradient") ||
            v.startsWith("radial-gradient") ||
            v.startsWith("conic-gradient")
              ? v
              : `linear-gradient(${v})`,
        },

        classesFixas: {
          // Display
          block: "display: block",
          inline: "display: inline",
          "inline-block": "display: inline-block",
          flex: "display: flex",
          "inline-flex": "display: inline-flex",
          grid: "display: grid",
          "inline-grid": "display: inline-grid",
          hidden: "display: none",
          contents: "display: contents",
          table: "display: table",
          "table-cell": "display: table-cell",

          // Background attachment
          "bg-fixed": "background-attachment: fixed",
          "bg-scroll": "background-attachment: scroll",
          "bg-local": "background-attachment: local",

          // Flex
          "flex-row": "flex-direction: row",
          "flex-col": "flex-direction: column",
          "flex-row-reverse": "flex-direction: row-reverse",
          "flex-col-reverse": "flex-direction: column-reverse",
          "flex-wrap": "flex-wrap: wrap",
          "flex-nowrap": "flex-wrap: nowrap",
          "flex-1": "flex: 1 1 0%",
          "flex-auto": "flex: 1 1 auto",
          "flex-none": "flex: none",
          "flex-grow": "flex-grow: 1",
          "flex-shrink": "flex-shrink: 1",
          "flex-shrink-0": "flex-shrink: 0",
          "justify-start": "justify-content: flex-start",
          "justify-end": "justify-content: flex-end",
          "justify-center": "justify-content: center",
          "justify-between": "justify-content: space-between",
          "justify-around": "justify-content: space-around",
          "justify-evenly": "justify-content: space-evenly",
          "items-start": "align-items: flex-start",
          "items-end": "align-items: flex-end",
          "items-center": "align-items: center",
          "items-baseline": "align-items: baseline",
          "items-stretch": "align-items: stretch",
          "self-auto": "align-self: auto",
          "self-start": "align-self: flex-start",
          "self-end": "align-self: flex-end",
          "self-center": "align-self: center",
          "self-stretch": "align-self: stretch",
          "place-center": "place-items: center",
          'content-start':   'align-content: flex-start',
          'content-end':     'align-content: flex-end',
          'content-center':  'align-content: center',
          'content-between': 'align-content: space-between',
          'content-around':  'align-content: space-around',
          'content-evenly':  'align-content: space-evenly',
          'content-stretch': 'align-content: stretch',
          'content-baseline':'align-content: baseline',
          'content-normal':  'align-content: normal',

          // Posição
          relative: "position: relative",
          absolute: "position: absolute",
          fixed: "position: fixed",
          sticky: "position: sticky",
          static: "position: static",

          // Overflow
          "overflow-auto": "overflow: auto",
          "overflow-hidden": "overflow: hidden",
          "overflow-visible": "overflow: visible",
          "overflow-scroll": "overflow: scroll",
          "overflow-x-auto": "overflow-x: auto",
          "overflow-y-auto": "overflow-y: auto",
          "overflow-x-hidden": "overflow-x: hidden",
          "overflow-y-hidden": "overflow-y: hidden",

          // Texto
          "text-left": "text-align: left",
          "text-center": "text-align: center",
          "text-right": "text-align: right",
          "text-justify": "text-align: justify",
          uppercase: "text-transform: uppercase",
          lowercase: "text-transform: lowercase",
          capitalize: "text-transform: capitalize",
          italic: "font-style: italic",
          "not-italic": "font-style: normal",
          underline: "text-decoration: underline",
          "line-through": "text-decoration: line-through",
          "no-underline": "text-decoration: none",
          truncate:
            "overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
          antialiased:
            "-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale",
          "font-thin": "font-weight: 100",
          "font-light": "font-weight: 300",
          "font-normal": "font-weight: 400",
          "font-medium": "font-weight: 500",
          "font-semibold": "font-weight: 600",
          "font-bold": "font-weight: 700",
          "font-extrabold": "font-weight: 800",
          "font-black": "font-weight: 900",

          // Border radius
          "rounded-none": "border-radius: 0",
          "rounded-sm": "border-radius: 0.125rem",
          rounded: "border-radius: 0.25rem",
          "rounded-md": "border-radius: 0.375rem",
          "rounded-lg": "border-radius: 0.5rem",
          "rounded-xl": "border-radius: 0.75rem",
          "rounded-2xl": "border-radius: 1rem",
          "rounded-3xl": "border-radius: 1.5rem",
          "rounded-full": "border-radius: 9999px",

          // Border style fixo
          solid: "border-style: solid",
          dashed: "border-style: dashed",
          dotted: "border-style: dotted",
          double: "border-style: double",
          "border-none": "border: none",

          // Sombras
          "shadow-sm": "box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)",
          shadow:
            "box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          "shadow-md": "box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)",
          "shadow-lg": "box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1)",
          "shadow-xl": "box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1)",
          "shadow-2xl": "box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)",
          "shadow-none": "box-shadow: none",
          "shadow-inner": "box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",

          // Transições
          transition:
            "transition-property: all; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
          "transition-none": "transition-property: none",
          "transition-colors":
            "transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
          "transition-opacity":
            "transition-property: opacity; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
          "transition-transform":
            "transition-property: transform; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
          "transition-shadow":
            "transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",

          // Cursor
          "cursor-pointer": "cursor: pointer",
          "cursor-default": "cursor: default",
          "cursor-not-allowed": "cursor: not-allowed",
          "cursor-wait": "cursor: wait",
          "cursor-text": "cursor: text",
          "cursor-grab": "cursor: grab",
          "cursor-grabbing": "cursor: grabbing",
          "pointer-events-none": "pointer-events: none",
          "pointer-events-auto": "pointer-events: auto",

          // Seleção / user-select
          "select-none": "user-select: none",
          "select-text": "user-select: text",
          "select-all": "user-select: all",

          // Objeto
          "object-contain": "object-fit: contain",
          "object-cover": "object-fit: cover",
          "object-fill": "object-fit: fill",
          "object-none": "object-fit: none",

          // Whitespace
          "whitespace-normal": "white-space: normal",
          "whitespace-nowrap": "white-space: nowrap",
          "whitespace-pre": "white-space: pre",
          "whitespace-pre-wrap": "white-space: pre-wrap",
          "whitespace-pre-line": "white-space: pre-line",

          // Visibilidade
          visible: "visibility: visible",
          invisible: "visibility: hidden",
          isolate: "isolation: isolate",
          "isolation-auto": "isolation: auto",

          // Blend (mix-blend-* e bg-blend-*)
          ...BLEND_FIXAS,

          // Mask (mask-*)
          ...MASK_FIXAS,

          // List
          "list-none": "list-style-type: none",
          "list-disc": "list-style-type: disc",
          "list-decimal": "list-style-type: decimal",

          // Resize
          resize: "resize: both",
          "resize-x": "resize: horizontal",
          "resize-y": "resize: vertical",
          "resize-none": "resize: none",

          // Misc
          "appearance-none": "-webkit-appearance: none; appearance: none",
          "outline-none": "outline: 2px solid transparent; outline-offset: 2px",
          "will-change-transform": "will-change: transform",
          "will-change-opacity": "will-change: opacity",

          // Animações
          "animate-spin": "animation: breeze-spin 1s linear infinite",
          "animate-ping":
            "animation: breeze-ping 1s cubic-bezier(0,0,0.2,1) infinite",
          "animate-pulse":
            "animation: breeze-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
          "animate-bounce": "animation: breeze-bounce 1s infinite",
          "animate-fade-in": "animation: breeze-fade-in 0.3s ease-in-out",
          "animate-slide-in": "animation: breeze-slide-in 0.3s ease-out",

          // Scroll
          "scroll-smooth": "scroll-behavior: smooth",
          "scroll-auto": "scroll-behavior: auto",

          // Text overflow / wrapping
          "break-word": "overflow-wrap: break-word; word-break: break-word",
          "break-all": "word-break: break-all",
          "break-keep": "word-break: keep-all",
          "text-wrap": "text-wrap: wrap",
          "text-nowrap": "text-wrap: nowrap",
          "text-balance": "text-wrap: balance",
          "text-pretty": "text-wrap: pretty",

          // Line clamp
          "line-clamp-1":
            "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1",
          "line-clamp-2":
            "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2",
          "line-clamp-3":
            "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3",
          "line-clamp-4":
            "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4",
          "line-clamp-5":
            "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5",
          "line-clamp-6":
            "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6",
          "line-clamp-none": "-webkit-line-clamp: unset",

          // Overflow extra
          "overflow-clip": "overflow: clip",
          "overflow-x-clip": "overflow-x: clip",
          "overflow-y-clip": "overflow-y: clip",

          // Acessibilidade
          "sr-only":
            "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0",
          "not-sr-only":
            "position: static; width: auto; height: auto; padding: 0; margin: 0; overflow: visible; clip: auto; white-space: normal",

          // Backface / touch
          "backface-hidden": "backface-visibility: hidden",
          "backface-visible": "backface-visibility: visible",
          "touch-none": "touch-action: none",
          "touch-auto": "touch-action: auto",
          "touch-pan-x": "touch-action: pan-x",
          "touch-pan-y": "touch-action: pan-y",
          "touch-pinch-zoom": "touch-action: pinch-zoom",

          // Scroll snap
          "snap-none": "scroll-snap-type: none",
          "snap-x": "scroll-snap-type: x mandatory",
          "snap-y": "scroll-snap-type: y mandatory",
          "snap-both": "scroll-snap-type: both mandatory",
          "snap-start": "scroll-snap-align: start",
          "snap-center": "scroll-snap-align: center",
          "snap-end": "scroll-snap-align: end",

          // Columns layout
          "col-auto": "grid-column: auto",
          "row-auto": "grid-row: auto",
          "col-full": "grid-column: 1 / -1",
          "row-full": "grid-row: 1 / -1",

          // Float / clear
          "float-left": "float: left",
          "float-right": "float: right",
          "float-none": "float: none",
          "clear-left": "clear: left",
          "clear-right": "clear: right",
          "clear-both": "clear: both",
          "clear-none": "clear: none",

          // Miscellaneous úteis
          "box-border": "box-sizing: border-box",
          "box-content": "box-sizing: content-box",
          "overscroll-auto": "overscroll-behavior: auto",
          "overscroll-contain": "overscroll-behavior: contain",
          "overscroll-none": "overscroll-behavior: none",
        },
      };
    }

    return {
      init,
      reiniciar,
      processar,
      build,
      exportar,
      use,
      addMapping,
      addVariant,
      addBreakpoint,
      addComponent,
      addFixedClass,
      addProcessor,
      obterStats,
    };
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // API PÚBLICA
  // ═══════════════════════════════════════════════════════════════════════
  const BreezeCSS = {
    init: (c = {}) => Engine.init(c),
    reiniciar: () => Engine.reiniciar(),
    processar: () => Engine.processar(),
    build: (h, o) => Engine.build(h, o),

    /**
     * exportar(opcoes?)
     *
     * Exporta o CSS real gerado pelo BreezeCSS como ficheiro .css.
     *
     * Lê directamente o <style> injectado no browser (não o cache interno),
     * garantindo que o output reflecte o estado final da página — incluindo
     * transforms combinados e sem regras obsoletas.
     *
     * Seletores dinâmicos [data-breeze-id="bN"] são automaticamente
     * convertidos para seletores de classe CSS (.translate-x\[10px\], etc.),
     * tornando o ficheiro exportado portável e independente do Breeze.
     *
     * @param {object}  opcoes
     * @param {string}  opcoes.nome             – nome do ficheiro (sem .css). Default: 'breeze-output'
     * @param {boolean} opcoes.minificar         – minifica o output.           Default: false
     * @param {boolean} opcoes.incluirCabecalho  – adiciona comentário no topo. Default: true
     * @returns {string} CSS gerado
     *
     * @example
     * BreezeCSS.exportar()
     * BreezeCSS.exportar({ nome: 'meu-site', minificar: true })
     * BreezeCSS.exportar({ nome: 'estilos', incluirCabecalho: false })
     */
    exportar: (o = {}) => Engine.exportar(o),

    use: (p) => Engine.use(p),
    addMapping: (p, pr) => Engine.addMapping(p, pr),
    addVariant: (n, ps) => Engine.addVariant(n, ps),
    addBreakpoint: (n, t) => Engine.addBreakpoint(n, t),
    addComponent: (n, c) => Engine.addComponent(n, c),
    addFixedClass: (n, e) => Engine.addFixedClass(n, e),
    addProcessor: (p, fn) => Engine.addProcessor(p, fn),
    stats: () => Engine.obterStats(),
    versao: "2.2.5",
  };

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      BreezeCSS.init(global.BreezeConfig || {}),
    );
  } else {
    BreezeCSS.init(global.BreezeConfig || {});
  }

  global.BreezeCSS = BreezeCSS;
})(typeof window !== "undefined" ? window : globalThis);
