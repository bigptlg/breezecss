/*! Breeze bundle — BreezeCSS 2.2.5 + BreezeGlass 1.0.0 + BreezeDividers 1.2.0 + BreezeProgress 1.0.0 + BreezeScrollbar 1.0.0 + BreezePreloader 1.6.0 + BreezeBackgrounds 1.5.0 (ficheiro único) */
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

;/*!
 * BreezeScrollbar v1.0.0 — plugin "scrollbar" para o BreezeCSS (>= 2.2)
 *
 * Personaliza a barra de scroll de qualquer elemento — ou da página inteira
 * (classe no <html> ou no <body>). Chromium/Safari usam ::-webkit-scrollbar
 * (tamanho, raio, folga e hover totalmente controláveis); o Firefox usa
 * scrollbar-color / scrollbar-width (cores e fino/normal).
 *
 * Uso (junto dos outros plugins, antes do DOMContentLoaded):
 *   <script>window.BreezeConfig = { plugins: [BreezeGlass, BreezeDividers, BreezeProgress, BreezeScrollbar] }</script>
 *
 *   <body class="scrollbar scrollbar-thumb[#6366f1] scrollbar-track[#0f172a]">
 *   <div class="h[300px] overflow-auto scrollbar scrollbar-thin scrollbar-rounded">…</div>
 *   <div class="overflow-auto scrollbar-none">…</div>      (esconde a barra, mantém o scroll)
 *
 * Classes
 *   scrollbar                       activa a personalização (obrigatória, excepto com scrollbar-none)
 *   scrollbar-thin|md|lg|xl         espessura (6 / 10 / 14 / 18 px) — por omissão 8px
 *   scrollbar-size[12px]            espessura arbitrária
 *   scrollbar-thumb[#6366f1]        cor do "polegar" (aceita gradientes no Chromium/Safari)
 *   scrollbar-thumb-hover[#818cf8]  cor do polegar ao passar o rato
 *   scrollbar-track[rgb(0_0_0/_.1)] cor do trilho (transparente por omissão)
 *   scrollbar-corner[#000]          cor do canto (quando há scroll nos dois eixos)
 *   scrollbar-radius[4px]           arredondamento — ou a classe fixa scrollbar-square (0)
 *   scrollbar-gap[2px]              folga entre polegar e trilho
 *   scrollbar-none                  esconde a barra (o elemento continua a fazer scroll)
 *   scrollbar-stable                reserva o espaço da barra (scrollbar-gutter: stable)
 *   Variantes do Breeze funcionam: md:scrollbar-lg, dark:scrollbar-thumb[#fff], hover:scrollbar-thumb[red]…
 *
 * Nota: no Firefox só as cores, scrollbar-none e a escolha fino (por omissão) / normal
 * (scrollbar-lg e scrollbar-xl) têm efeito; raio, folga e hover do polegar não existem lá.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.0.0'
  const PADROES = { tamanho: 8, thumb: 'rgb(128 128 128 / 0.5)', thumbHover: 'rgb(128 128 128 / 0.8)' }
  const VARS = [
    '--scrollbar-size', '--scrollbar-thumb', '--scrollbar-thumb-hover', '--scrollbar-track',
    '--scrollbar-corner', '--scrollbar-radius', '--scrollbar-gap', '--scrollbar-ff'
  ]

  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const CLASSES = {
    scrollbar: '--scrollbar-on: 1',
    'scrollbar-thin': '--scrollbar-size: 6px',
    'scrollbar-md': '--scrollbar-size: 10px',
    'scrollbar-lg': '--scrollbar-size: 14px; --scrollbar-ff: auto',
    'scrollbar-xl': '--scrollbar-size: 18px; --scrollbar-ff: auto',
    'scrollbar-square': '--scrollbar-radius: 0px',
    'scrollbar-none': '--scrollbar-on: 1; --scrollbar-hide: 1',
    'scrollbar-stable': 'scrollbar-gutter: stable'
  }

  // Valores arbitrários: scrollbar-thumb[#f00] → --scrollbar-thumb: #f00
  const MAPEAMENTOS = {
    'scrollbar-size': '--scrollbar-size',
    'scrollbar-thumb': '--scrollbar-thumb',
    'scrollbar-thumb-hover': '--scrollbar-thumb-hover',
    'scrollbar-track': '--scrollbar-track',
    'scrollbar-corner': '--scrollbar-corner',
    'scrollbar-radius': '--scrollbar-radius',
    'scrollbar-gap': '--scrollbar-gap'
  }

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function injectarEstilos(cfg) {
    if (document.getElementById('breeze-scrollbar-estilos')) return
    const t = 'var(--scrollbar-size, ' + cfg.tamanho + 'px)'
    const thumb = 'var(--scrollbar-thumb, ' + cfg.thumb + ')'
    const css = `
[data-breeze-scrollbar]::-webkit-scrollbar { width: ${t}; height: ${t}; background: transparent; }
[data-breeze-scrollbar]::-webkit-scrollbar-track { background: var(--scrollbar-track, transparent); border-radius: var(--scrollbar-radius, 9999px); }
[data-breeze-scrollbar]::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: var(--scrollbar-radius, 9999px); border: var(--scrollbar-gap, 0px) solid transparent; background-clip: padding-box; }
[data-breeze-scrollbar]::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, var(--scrollbar-thumb, ${cfg.thumbHover})); background-clip: padding-box; }
[data-breeze-scrollbar]::-webkit-scrollbar-corner { background: var(--scrollbar-corner, transparent); }
[data-breeze-scrollbar]::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
@supports not selector(::-webkit-scrollbar) {
  [data-breeze-scrollbar] { scrollbar-width: var(--scrollbar-ff, thin); scrollbar-color: ${thumb} var(--scrollbar-track, transparent); }
}
[data-breeze-scrollbar="none"] { scrollbar-width: none; -ms-overflow-style: none; }
[data-breeze-scrollbar="none"]::-webkit-scrollbar { display: none; width: 0; height: 0; }`
    const el = document.createElement('style')
    el.id = 'breeze-scrollbar-estilos'
    el.setAttribute('data-breeze', 'scrollbar')
    el.textContent = css
    document.head.appendChild(el)
  }

  function iniciarMotor(cfg, prefixo) {
    const reToken = new RegExp('(^|:)' + esc(prefixo + 'scrollbar') + '(-none)?!?$')
    const copiadas = new Set() // propriedades copiadas do <body> para o <html>
    let agendado = false

    // --scrollbar-on não herda: senão todos os filhos de um <body class="scrollbar">
    // seriam tratados como alvos.
    let registada = false
    try {
      if (global.CSS && typeof global.CSS.registerProperty === 'function') {
        global.CSS.registerProperty({ name: '--scrollbar-on', syntax: '<number>', inherits: false, initialValue: '0' })
        registada = true
      }
    } catch (e) {
      registada = !!(e && e.name === 'InvalidModificationError') // já registada
    }

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
      return parseFloat(getComputedStyle(el).getPropertyValue('--scrollbar-on')) > 0
    }

    const escondida = el => getComputedStyle(el).getPropertyValue('--scrollbar-hide').trim() === '1'

    // A barra da página é controlada pelo <html>: se a classe estiver no <body>,
    // copiamos as variáveis e o atributo para o elemento raiz.
    function espelhar(body, valor) {
      const raiz = document.documentElement
      const cs = getComputedStyle(body)
      raiz.setAttribute('data-breeze-scrollbar', valor)
      VARS.forEach(v => {
        const x = cs.getPropertyValue(v).trim()
        if (x) {
          raiz.style.setProperty(v, x)
          copiadas.add(v)
        } else if (copiadas.has(v)) {
          raiz.style.removeProperty(v)
          copiadas.delete(v)
        }
      })
    }

    function limparRaiz() {
      const raiz = document.documentElement
      if (!raiz.hasAttribute('data-breeze-scrollbar') || ehAlvo(raiz)) return
      raiz.removeAttribute('data-breeze-scrollbar')
      copiadas.forEach(v => raiz.style.removeProperty(v))
      copiadas.clear()
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      const vistos = new Set()
      document.querySelectorAll('[class*="scrollbar"]').forEach(el => {
        if (ehAlvo(el)) {
          el.setAttribute('data-breeze-scrollbar', escondida(el) ? 'none' : '')
          vistos.add(el)
          if (el === document.body) espelhar(el, escondida(el) ? 'none' : '')
        }
      })
      document.querySelectorAll('[data-breeze-scrollbar]').forEach(el => {
        if (!vistos.has(el) && el !== document.documentElement) el.removeAttribute('data-breeze-scrollbar')
      })
      if (!vistos.has(document.body) || !ehAlvo(document.body)) limparRaiz()
    }

    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar() {
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
    global.addEventListener('resize', agendar, { passive: true }) // variantes md:/lg: …
    global.addEventListener('load', agendar)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agendar)
    else agendar()

    return { varrer }
  }

  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    let motor = null
    return {
      nome: 'scrollbar',
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
        injectarEstilos(cfg)
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
  global.BreezeScrollbar = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)


;/*!
 * BreezePreloader v1.6.0 — plugin "preloader" para o BreezeCSS (>= 2.2)
 *
 * Mostra um ecrã de carregamento enquanto a página (ou um elemento) não está pronto.
 *   • no <body> / <html> → cobre a página inteira e desaparece sozinho quando a
 *     página termina de carregar (evento load), respeitando um tempo mínimo.
 *   • num elemento normal → cobre só esse elemento (fica dentro dele, em absolute)
 *     e desaparece quando a classe "preloader" for removida ou via API.
 *
 * O plugin cria o overlay sozinho — não é preciso HTML extra. Enquanto está visível
 * bloqueia o scroll da página.
 *
 * Uso (o plugin tem de ser registado antes do DOMContentLoaded, que é quando o
 * BreezeCSS arranca e lê window.BreezeConfig):
 *   <script src="breeze_bundle.js"></script>
 *   <script>
 *     BreezePreloader.iniciar()   // opcional mas recomendado: cria o overlay logo que o
 *                                 // <body> existe, antes do primeiro desenho (sem flash).
 *                                 // Sem isto o overlay só aparece quando o Breeze arranca.
 *                                 // Com prefixo no Breeze: BreezePreloader.iniciar('bz-')
 *     window.BreezeConfig = { plugins: [BreezePreloader] }
 *   </script>
 *
 *   <body class="preloader">                                  anel, desaparece no load
 *   <body class="preloader preloader-dots preloader-lg">
 *   <body class="preloader preloader-bg[#0f172a] preloader-color[#fff] preloader-min[800ms]">
 *   <div class="preloader preloader-bar">…</div>               só neste elemento (manual)
 *
 * Classes
 *   preloader                       activa o preloader (obrigatória)
 *   preloader-ring|dots|bars|pulse|bar|orbit   animação (por omissão: ring)
 *   preloader-sm|md|lg|xl           tamanho (24 / 40 / 56 / 80 px) — ou preloader-size[64px]
 *   preloader-color[#3b82f6]        cor da animação
 *   preloader-bg[#fff]              cor de fundo do overlay (aceita gradientes)
 *   preloader-min[400ms]            tempo mínimo visível (evita piscar em páginas rápidas)
 *   preloader-max[10000ms]          tempo máximo de segurança (0 = sem limite)
 *   preloader-words-speed[750ms]    intervalo de troca das palavras (padrão: 1250ms)
 *   preloader-duration[400ms]       duração da saída — ou preloader-instant (0)
 *   transição de saída (por omissão: preloader-fade):
 *     preloader-fade|blur|zoom|cinematic          desvanecem (com blur / zoom / zoom+blur)
 *     preloader-curtain|curtain-down              sobem / descem como cortina
 *     preloader-slide-left|slide-right            deslizam para o lado
 *     preloader-iris|wipe|corner                  recortam (círculo que fecha / varrimento / canto)
 *     (em elementos, curtain* e slide-* usam fade)
 *   preloader-z[99999]              z-index
 *   preloader-manual                não desaparece sozinho no load (só por API / remover a classe)
 *   Variantes do Breeze funcionam: md:preloader-lg, dark:preloader-bg[#000]…
 *   Nota: o fundo/cor personalizados só se aplicam depois de o Breeze processar as
 *   classes (1–2 frames); até lá o overlay usa as cores por omissão (claro/escuro
 *   conforme o sistema). Para evitar qualquer diferença, defina as cores por omissão
 *   com BreezePreloader.criar({ fundo, cor }).
 *
 * Extras para o programador
 *   • API (el = elemento ou seletor CSS; sem argumento = <body>):
 *       mostrar(el)  ocultar(el, imediato?)  alternar(el, ativo?)  estado(el)  remover(el)
 *     'ocultar' (alias: esconder) com imediato=true salta a animação de saída;
 *     'estado' devolve { visivel, pagina, tipo } ou null; 'remover' liberta o overlay.
 *   • evento 'breeze:preloader' no elemento: e.detail = { estado: 'visivel' | 'oculto' }
 *   • atributos: o elemento recebe aria-busy="true" enquanto carrega e
 *     data-preloader="done" quando termina; o overlay tem role="status".
 *   • BreezePreloader.criar({ cor, fundo, tamanho, z, minimo, fade, maximo })
 *     altera os valores por omissão
 *   • prefers-reduced-motion: sem desvanecimento e animações mais lentas.
 *
 * Nota: um preloader em elemento (não página) pode pôr "position: relative" no
 * elemento se ele for static (é revertido no fim).
 */
(function (global) {
  'use strict'

  const VERSAO = '1.6.0'
  const PADROES = { cor: '#3b82f6', fundo: '', tamanho: 40, z: 99999, minimo: 400, fade: 400, maximo: 10000 }
  const TIPOS = ['ring', 'dots', 'bars', 'pulse', 'bar', 'orbit', 'speeder', 'words']
  const SAIDAS = ['fade', 'curtain', 'curtain-down', 'slide-left', 'slide-right', 'zoom', 'blur', 'iris', 'wipe', 'corner', 'cinematic']

  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const CLASSES = {
    preloader: '--preloader-on: 1',
    'preloader-ring': '--preloader-type: ring',
    'preloader-dots': '--preloader-type: dots',
    'preloader-bars': '--preloader-type: bars',
    'preloader-pulse': '--preloader-type: pulse',
    'preloader-bar': '--preloader-type: bar',
    'preloader-sm': '--preloader-size: 24px',
    'preloader-md': '--preloader-size: 40px',
    'preloader-lg': '--preloader-size: 56px',
    'preloader-xl': '--preloader-size: 80px',
    'preloader-manual': '--preloader-manual: 1',
    'preloader-target[page]': '--preloader-target: page',
    'preloader-target[local]': '--preloader-target: local',
    'preloader-instant': '--preloader-fade: 0ms',
    'preloader-orbit': '--preloader-type: orbit',
    'preloader-speeder': '--preloader-type: speeder',
    'preloader-words': '--preloader-type: words',
    'preloader-fade': '--preloader-exit: fade',
    'preloader-curtain': '--preloader-exit: curtain',
    'preloader-cinematic': '--preloader-exit: cinematic',
    'preloader-curtain-down': '--preloader-exit: curtain-down',
    'preloader-slide-left': '--preloader-exit: slide-left',
    'preloader-slide-right': '--preloader-exit: slide-right',
    'preloader-zoom': '--preloader-exit: zoom',
    'preloader-blur': '--preloader-exit: blur',
    'preloader-iris': '--preloader-exit: iris',
    'preloader-wipe': '--preloader-exit: wipe',
    'preloader-corner': '--preloader-exit: corner'
  }

  // Valores arbitrários: preloader-color[#f00] → --preloader-color: #f00
  const MAPEAMENTOS = {
    'preloader-color': '--preloader-color',
    'preloader-bg': '--preloader-bg',
    'preloader-size': '--preloader-size',
    'preloader-min': '--preloader-min',
    'preloader-max': '--preloader-max',
    'preloader-duration': '--preloader-fade',
    'preloader-words-speed': '--preloader-words-speed',
    'preloader-z': '--preloader-z'
  }

  // Efeitos de saída: tr = transição (t = duração), de = estado inicial (opcional), para = estado final.
  // As que deslocam o overlay para fora (curtain*, slide-*) caem para fade em preloaders de elemento.
  const SUAVE = 'cubic-bezier(.76,0,.24,1)'
  const FX = {
    fade: { tr: t => 'opacity ' + t + ' ease', para: { opacity: '0' } },
    curtain: { tr: t => 'transform ' + t + ' ' + SUAVE, para: { transform: 'translateY(-101%)' } },
    'curtain-down': { tr: t => 'transform ' + t + ' ' + SUAVE, para: { transform: 'translateY(101%)' } },
    'slide-left': { tr: t => 'transform ' + t + ' ' + SUAVE, para: { transform: 'translateX(-101%)' } },
    'slide-right': { tr: t => 'transform ' + t + ' ' + SUAVE, para: { transform: 'translateX(101%)' } },
    zoom: { tr: t => 'opacity ' + t + ' ease,transform ' + t + ' ease', para: { opacity: '0', transform: 'scale(1.6)' } },
    blur: { tr: t => 'opacity ' + t + ' ease,filter ' + t + ' ease', para: { opacity: '0', filter: 'blur(24px)' } },
    cinematic: { tr: t => 'opacity ' + t + ' ease,transform ' + t + ' ease,filter ' + t + ' ease', para: { opacity: '0', transform: 'scale(1.06)', filter: 'blur(12px)' } },
    iris: { tr: t => 'clip-path ' + t + ' ' + SUAVE, de: { 'clip-path': 'circle(150% at 50% 50%)' }, para: { 'clip-path': 'circle(0% at 50% 50%)' } },
    wipe: { tr: t => 'clip-path ' + t + ' ' + SUAVE, de: { 'clip-path': 'inset(0 0 0 0)' }, para: { 'clip-path': 'inset(0 0 0 100%)' } },
    corner: { tr: t => 'clip-path ' + t + ' ' + SUAVE, de: { 'clip-path': 'polygon(0 0,100% 0,100% 100%,0 100%)' }, para: { 'clip-path': 'polygon(100% 0,100% 0,100% 0,100% 0)' } }
  }
  const DESLOCA = /^(curtain|curtain-down|slide-left|slide-right)$/

  // Marcação interna de cada animação (constantes — sem conteúdo do utilizador)
  const HTML = {
    ring: '<i class="bpl bpl-ring"></i>',
    dots: '<i class="bpl bpl-dots"><i></i><i></i><i></i></i>',
    bars: '<i class="bpl bpl-bars"><i></i><i></i><i></i><i></i><i></i></i>',
    pulse: '<i class="bpl bpl-pulse"><i></i></i>',
    bar: '<i class="bpl bpl-bar"><i></i></i>',
    orbit: '<i class="bpl bpl-orbit"><i></i></i>',
    // Adaptado de Uiverse.io por anand_4957 — https://uiverse.io/anand_4957
    speeder: '<span class="bpl bpl-speeder"><span class="bpl-runner"><span class="bpl-tail"><i></i><i></i><i></i><i></i></span><span class="bpl-base"><i></i><span class="bpl-face"></span></span></span><span class="bpl-fazers"><i></i><i></i><i></i><i></i></span></span>',
    // Adaptado de Uiverse.io por kennyotsu — https://uiverse.io/kennyotsu
    words: '<span class="bpl bpl-words"><span class="bpl-word-label">loading</span><span class="bpl-word-viewport"></span></span>'
  }

  const ESTILO =
    '[data-breeze-preloader] .bpl{position:relative;display:flex;align-items:center;justify-content:center;font-style:normal;color:var(--pl-c);width:var(--pl-s);height:var(--pl-s)}' +
    '[data-breeze-preloader] .bpl>i{display:block;font-style:normal}' +
    '.bpl-ring{box-sizing:border-box;border:calc(var(--pl-s)*.1) solid transparent;border-top-color:currentColor;border-right-color:currentColor;border-radius:50%;animation:bpl-rot .8s linear infinite}' +
    '.bpl-dots{gap:calc(var(--pl-s)*.12)}' +
    '.bpl-dots>i{width:calc(var(--pl-s)*.22);height:calc(var(--pl-s)*.22);border-radius:50%;background:currentColor;animation:bpl-dot 1.2s ease-in-out infinite both}' +
    '.bpl-dots>i:nth-child(1){animation-delay:-.32s}.bpl-dots>i:nth-child(2){animation-delay:-.16s}' +
    '.bpl-bars{display:flex!important;flex-direction:row;gap:calc(var(--pl-s)*.08);align-items:center;justify-content:center;min-height:var(--pl-s)}' +
    '.bpl-bars>i{display:block;flex:none;width:calc(var(--pl-s)*.12);height:85%;min-height:8px;background:currentColor;border-radius:9999px;transform-origin:center;animation:bpl-bar 1s ease-in-out infinite}' +
    '.bpl-bars>i:nth-child(1){animation-delay:-1s}.bpl-bars>i:nth-child(2){animation-delay:-.9s}.bpl-bars>i:nth-child(3){animation-delay:-.8s}' +
    '.bpl-bars>i:nth-child(4){animation-delay:-.7s}.bpl-bars>i:nth-child(5){animation-delay:-.6s}' +
    '.bpl-pulse>i{position:absolute;inset:0;border-radius:50%;background:currentColor;animation:bpl-pulse 1.2s ease-out infinite}' +
    '[data-breeze-preloader] .bpl-bar{width:calc(var(--pl-s)*4);height:max(3px,calc(var(--pl-s)*.1));border-radius:9999px;overflow:hidden}' +
    '.bpl-bar::before{content:"";position:absolute;inset:0;background:currentColor;opacity:.2}' +
    '.bpl-bar>i{position:absolute;top:0;bottom:0;left:0;width:40%;border-radius:inherit;background:currentColor;animation:bpl-slide 1.2s ease-in-out infinite}' +
    '.bpl-orbit::before,.bpl-orbit>i{content:"";position:absolute;inset:0;box-sizing:border-box;border-radius:50%;border:calc(var(--pl-s)*.07) solid transparent;border-top-color:currentColor;border-left-color:currentColor;animation:bpl-rot 1s linear infinite}' +
    '[data-breeze-preloader] .bpl-orbit>i{inset:23%;opacity:.65;animation-duration:.75s;animation-direction:reverse}' +
    /* Uiverse.io by anand_4957 — adaptação isolada para o BreezePreloader */
    '.bpl-speeder{width:220px!important;height:130px!important;max-width:90vw;overflow:hidden;position:relative;flex:none}' +
    '.bpl-runner{position:absolute;left:50%;top:48%;width:110px;height:20px;transform:translate(-50%,-50%);animation:bpl-speeder .4s linear infinite}' +
    '.bpl-tail{position:absolute;left:60px;top:-19px;width:35px;height:5px;border-radius:2px 10px 1px 0;background:currentColor}' +
    '.bpl-tail>i{position:absolute;left:0;top:0;width:30px;height:1px;background:currentColor;animation:bpl-fazer .4s linear infinite}' +
    '.bpl-tail>i:nth-child(2){top:3px;animation-duration:.3s;animation-delay:-.1s}.bpl-tail>i:nth-child(3){top:1px;animation-duration:.5s;animation-delay:-.2s}.bpl-tail>i:nth-child(4){top:4px;animation-duration:.7s;animation-delay:-.3s}' +
    '.bpl-base>i{position:absolute;left:0;top:0;width:0;height:0;border-top:6px solid transparent;border-right:100px solid currentColor;border-bottom:6px solid transparent}' +
    '.bpl-base>i::before{content:"";position:absolute;right:-110px;top:-16px;width:22px;height:22px;border-radius:50%;background:currentColor}' +
    '.bpl-base>i::after{content:"";position:absolute;right:-98px;top:-16px;border-right:55px solid currentColor;border-bottom:16px solid transparent}' +
    '.bpl-face{position:absolute;right:-25px;top:-15px;width:20px;height:12px;background:currentColor;border-radius:20px 20px 0 0;transform:rotate(-40deg)}' +
    '.bpl-face::after{content:"";position:absolute;right:4px;top:7px;width:12px;height:12px;background:currentColor;transform:rotate(40deg);border-radius:0 0 0 2px}' +
    '.bpl-fazers{position:absolute;inset:0;overflow:hidden;pointer-events:none}.bpl-fazers>i{position:absolute;left:100%;width:20%;height:2px;background:currentColor;animation:bpl-fazer-long .7s linear infinite}' +
    '.bpl-fazers>i:nth-child(1){top:20%;animation-delay:-.5s}.bpl-fazers>i:nth-child(2){top:40%;animation-duration:.8s;animation-delay:-.2s}.bpl-fazers>i:nth-child(3){top:60%;animation-duration:.6s}.bpl-fazers>i:nth-child(4){top:80%;animation-duration:.5s;animation-delay:-.3s}' +
    '@keyframes bpl-speeder{0%,100%{transform:translate(-50%,-50%) rotate(0)}25%{transform:translate(calc(-50% - 2px),calc(-50% + 2px)) rotate(1deg)}75%{transform:translate(calc(-50% + 2px),calc(-50% - 2px)) rotate(-1deg)}}' +
    '@keyframes bpl-fazer{to{transform:translateX(-100px);opacity:0}}@keyframes bpl-fazer-long{to{left:-30%;opacity:0}}' +
    /* Uiverse.io by kennyotsu — adaptação isolada para o BreezePreloader */
    '.bpl-words{width:auto!important;min-width:220px;height:60px!important;display:flex;gap:6px;align-items:center;justify-content:center;font:500 24px/40px system-ui,sans-serif;white-space:nowrap}' +
    '.bpl-word-label{color:var(--pl-c);opacity:.6}.bpl-word-viewport{position:relative;display:block;height:40px;overflow:hidden;min-width:112px}' +
    '.bpl-word-viewport::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,var(--pl-bg) 0%,transparent 28%,transparent 72%,var(--pl-bg) 100%)}' +
    '.bpl-word{display:block;height:40px;line-height:40px;color:var(--pl-c)}' +
    '.bpl-word-column{display:block;position:relative;will-change:transform}' +
    
    '@keyframes bpl-rot{to{transform:rotate(360deg)}}' +
    '@keyframes bpl-dot{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}' +
    '@keyframes bpl-bar{0%,40%,100%{transform:scaleY(.3)}20%{transform:scaleY(1)}}' +
    '@keyframes bpl-pulse{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}' +
    '@keyframes bpl-slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}' +
    '@media (prefers-reduced-motion:reduce){[data-breeze-preloader] .bpl,[data-breeze-preloader] .bpl *{animation-duration:2.4s!important}}'

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // "400ms" | "0.4s" | "400" → milissegundos (ou omissão se vazio/inválido)
  function parseTempo(s, omissao) {
    const m = /^(\d*\.?\d+)\s*(ms|s)?$/.exec(String(s || '').trim())
    if (!m) return omissao
    return Math.round(parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1))
  }

  // ---------------------------------------------------------------- motor
  function iniciarMotor(cfg, prefixo) {
    const nomeBase = esc(prefixo + 'preloader')
    const reToken = new RegExp('(^|:)' + nomeBase + '!?$') // aceita variantes (md:preloader)
    const reSimples = new RegExp('^' + nomeBase + '!?$') // só a classe pura (criação precoce)
    const alvos = new Map() // elemento → estado
    const feitos = new WeakSet() // elementos já concluídos (a classe continua lá)
    const hosts = new WeakSet()
    let agendado = false
    let bloqueios = 0
    let overflowAnterior = ''

    // --preloader-on não herda: senão todos os filhos de um <body class="preloader">
    // seriam tratados como alvos.
    let registada = false
    try {
      if (global.CSS && typeof global.CSS.registerProperty === 'function') {
        global.CSS.registerProperty({ name: '--preloader-on', syntax: '<number>', inherits: false, initialValue: '0' })
        registada = true
      }
    } catch (e) {
      registada = !!(e && e.name === 'InvalidModificationError') // já registada
    }

    const estilo = document.createElement('style')
    estilo.setAttribute('data-breeze-preloader-css', '')
    estilo.textContent = ESTILO
    ;(document.head || document.documentElement).appendChild(estilo)

    const reduzMovimento = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches
    const escuro = () => global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches
    const ePagina = el => {
      // Suporte imediato, mesmo antes de o motor CSS processar as classes.
      // O alvo explícito tem precedência sobre a localização no DOM.
      if (el.classList.contains(prefixo + 'preloader-target[page]')) return true
      if (el.classList.contains(prefixo + 'preloader-target[local]')) return false
      const alvo = getComputedStyle(el).getPropertyValue('--preloader-target').trim()
      if (alvo === 'page') return true
      if (alvo === 'local') return false
      return el === document.body || el === document.documentElement
    }
    const carregada = () => document.readyState === 'complete'

    function temToken(el, re) {
      for (const c of el.classList) if (re.test(c)) return true
      return false
    }

    function ehAlvo(el) {
      if (!temToken(el, reToken)) return false
      if (!registada) return true
      return parseFloat(getComputedStyle(el).getPropertyValue('--preloader-on')) > 0
    }

    // preloader-words[uma,duas,tres] é interpretado directamente pelo motor.
    // Não passa pelo parser CSS: vírgulas e palavras são dados, não declarações CSS.
    function lerPalavras(el) {
      const inicio = prefixo + 'preloader-words['
      for (const token of el.classList) {
        const base = token.split(':').pop()
        if (!base.startsWith(inicio) || !base.endsWith(']')) continue
        const palavras = base.slice(inicio.length, -1).split(',')
          .map(p => p.trim().replace(/_/g, ' ')).filter(Boolean).slice(0, 20)
        if (palavras.length) return palavras.map(p => p.slice(0, 80))
      }
      return ['buttons', 'forms', 'switches', 'cards']
    }

    // Uiverse.io by kennyotsu — https://uiverse.io/kennyotsu
    // Adaptação: palavras e velocidade dinâmicas; temporizador por passo,
    // em vez de keyframes fixos que falham com listas de comprimento variável.
    function lerVelocidade(el, valorCss) {
      // Lê directamente a classe para funcionar também antes de o Breeze
      // gerar a regra CSS (por exemplo, na demo ao alterar a velocidade).
      const inicio = prefixo + 'preloader-words-speed['
      let valor = valorCss
      for (const token of el.classList) {
        const base = token.split(':').pop()
        if (base.startsWith(inicio) && base.endsWith(']')) {
          valor = base.slice(inicio.length, -1)
          break
        }
      }
      return Math.max(150, Math.min(30000, parseTempo(valor, 1250)))
    }

    function configurarPalavras(el, a, palavras, velocidade) {
      if (a.animacaoPalavras) { a.animacaoPalavras.cancel(); a.animacaoPalavras = null }
      const viewport = a.host.querySelector('.bpl-word-viewport')
      if (!viewport) return
      viewport.replaceChildren()
      const lista = palavras.concat(palavras[0])
      const coluna = document.createElement('span')
      coluna.className = 'bpl-word-column'
      lista.forEach(p => {
        const span = document.createElement('span')
        span.className = 'bpl-word'
        span.textContent = p
        coluna.appendChild(span)
      })
      viewport.appendChild(coluna)
      const largura = Math.max(112, ...palavras.map(p => p.length * 14 + 14))
      viewport.style.width = Math.min(largura, 800) + 'px'
      if (palavras.length < 2 || reduzMovimento()) return

      const passo = 40
      const transicao = Math.min(380, Math.max(90, velocidade * 0.28))
      let indice = 0
      let timer = null
      let reset = null
      let parado = false
      function avancar() {
        if (parado || !coluna.isConnected) return
        indice++
        coluna.style.transition = 'transform ' + transicao + 'ms cubic-bezier(.22,.75,.25,1)'
        coluna.style.transform = 'translateY(-' + (indice * passo) + 'px)'
        if (indice === palavras.length) {
          reset = setTimeout(() => {
            if (parado) return
            coluna.style.transition = 'none'
            coluna.style.transform = 'translateY(0px)'
            indice = 0
            // Forçar o estilo inicial para que a próxima transição anime.
            void coluna.offsetHeight
          }, transicao + 20)
        }
        timer = setTimeout(avancar, velocidade)
      }
      timer = setTimeout(avancar, velocidade)
      a.animacaoPalavras = { cancel() {
        parado = true
        clearTimeout(timer)
        clearTimeout(reset)
      } }
    }

    function lerConfig(el, local) {
      const cs = getComputedStyle(el)
      const v = n => cs.getPropertyValue(n).trim()
      const tipo = v('--preloader-type')
      return {
        tipo: TIPOS.indexOf(tipo) >= 0 ? tipo : (Array.from(el.classList).some(c => c.includes('preloader-words[')) ? 'words' : 'ring'),
        palavras: lerPalavras(el),
        velocidadePalavras: lerVelocidade(el, v('--preloader-words-speed')),
        tamanho: v('--preloader-size') || cfg.tamanho + 'px',
        cor: v('--preloader-color') || cfg.cor,
        fundo: v('--preloader-bg') || cfg.fundo || (escuro() ? '#0b0f19' : '#ffffff'),
        z: v('--preloader-z') || (local ? '10' : String(cfg.z)),
        minimo: parseTempo(v('--preloader-min'), cfg.minimo),
        maximo: parseTempo(v('--preloader-max'), cfg.maximo),
        fade: reduzMovimento() ? 0 : parseTempo(v('--preloader-fade'), cfg.fade),
        saida: SAIDAS.indexOf(v('--preloader-exit')) >= 0 ? v('--preloader-exit') : 'fade',
        manual: v('--preloader-manual') === '1'
      }
    }

    function configurar(el, a) {
      if (a.saindo) return
      const c = lerConfig(el, a.local)
      const prev = a.c
      a.c = c
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) return
      a.host.style.cssText =
        'position:' + (a.local ? 'absolute' : 'fixed') + ';left:0;top:0;right:0;bottom:0;display:flex;align-items:center;' +
        'justify-content:center;margin:0;padding:0;box-sizing:border-box;opacity:1;' +
        (a.local ? 'border-radius:inherit;' : '') +
        'background:' + c.fundo + ';z-index:' + c.z + ';--pl-s:' + c.tamanho + ';--pl-c:' + c.cor + ';--pl-bg:' + c.fundo
      if (a.tipo !== c.tipo) {
        a.tipo = c.tipo
        a.host.innerHTML = HTML[c.tipo] // marcação constante, sem dados do utilizador
      }
      if (c.tipo === 'words') configurarPalavras(el, a, c.palavras, c.velocidadePalavras)
      armarMax(el, a)
    }

    function armarMax(el, a) {
      clearTimeout(a.maxTimer)
      if (a.local || a.forcado || a.c.manual || a.c.maximo <= 0 || a.saindo) return
      const resta = Math.max(a.c.maximo - (Date.now() - a.inicio), 0)
      a.maxTimer = setTimeout(() => esconder(el, a, true), resta)
    }

    function bloquear() {
      const de = document.documentElement
      if (bloqueios++ === 0) {
        overflowAnterior = de.style.overflow
        de.style.overflow = 'hidden'
      }
    }

    function desbloquear() {
      if (bloqueios > 0 && --bloqueios === 0) document.documentElement.style.overflow = overflowAnterior
    }

    function emitir(el, estado) {
      el.dispatchEvent(new CustomEvent('breeze:preloader', { detail: { estado } }))
    }

    function registar(el, forcado) {
      const local = !ePagina(el)
      const host = document.createElement('div')
      host.setAttribute('data-breeze-preloader', '')
      host.setAttribute('role', 'status')
      host.setAttribute('aria-live', 'polite')
      host.setAttribute('aria-label', 'A carregar')
      hosts.add(host)
      const a = {
        host, local, forcado: !!forcado, c: null, tipo: '', inicio: Date.now(),
        pronto: !!forcado, saindo: false, concluido: false,
        posRestaurar: false, posInline: '', minTimer: 0, maxTimer: 0, fimTimer: 0
      }
      if (local) {
        if (getComputedStyle(el).position === 'static') {
          a.posRestaurar = true
          a.posInline = el.style.position
          el.style.position = 'relative'
        }
      } else {
        bloquear()
      }
      alvos.set(el, a)
      configurar(el, a)
      if (local) el.appendChild(host)
      else (document.body || document.documentElement).appendChild(host)
      el.setAttribute('aria-busy', 'true')
      emitir(el, 'visivel')
      return a
    }

    function destruir(el, a) {
      clearTimeout(a.minTimer)
      clearTimeout(a.maxTimer)
      clearTimeout(a.fimTimer)
      if (a.animacaoPalavras) a.animacaoPalavras.cancel()
      a.host.remove()
      alvos.delete(el)
      if (a.local) {
        if (a.posRestaurar) el.style.position = a.posInline
      } else {
        desbloquear()
      }
      el.removeAttribute('aria-busy')
      if (a.concluido) {
        feitos.add(el)
        el.setAttribute('data-preloader', 'done')
      } else {
        el.removeAttribute('data-preloader')
      }
      emitir(el, 'oculto')
    }

    function esconder(el, a, concluido, instantaneo) {
      if (a.saindo) return
      a.saindo = true
      a.concluido = !!concluido
      clearTimeout(a.minTimer)
      clearTimeout(a.maxTimer)
      const fade = instantaneo ? 0 : a.c ? a.c.fade : cfg.fade
      const hs = a.host.style
      hs.pointerEvents = 'none'
      if (fade <= 0) {
        destruir(el, a)
        return
      }
      const pedida = a.c ? a.c.saida : 'fade'
      const fx = FX[a.local && DESLOCA.test(pedida) ? 'fade' : pedida] || FX.fade
      const aplicar = o => Object.keys(o).forEach(k => {
        hs.setProperty(k, o[k])
        if (k === 'clip-path') hs.setProperty('-webkit-clip-path', o[k])
      })
      if (fx.de) {
        aplicar(fx.de)
        void a.host.offsetWidth // fixa o estado inicial antes de animar
      }
      hs.transition = fx.tr(fade + 'ms')
      requestAnimationFrame(() => aplicar(fx.para))
      a.fimTimer = setTimeout(() => destruir(el, a), fade + 60)
    }

    // Esconde um preloader de página assim que a página carregou e o mínimo passou
    function tentarEsconder(el, a) {
      if (a.saindo || !a.pronto || a.local || a.forcado || a.c.manual || !carregada()) return
      const resta = a.c.minimo - (Date.now() - a.inicio)
      if (resta > 0) {
        clearTimeout(a.minTimer)
        a.minTimer = setTimeout(() => tentarEsconder(el, a), resta)
        return
      }
      esconder(el, a, true)
    }

    // Criação precoce (síncrona): inclui divs com target[page], sem esperar pelo Breeze
    function rapido() {
      if (!document.body) return
      ;[document.documentElement, document.body, ...document.querySelectorAll('[class*="preloader-target"]')].forEach(el => {
        if (!alvos.has(el) && !feitos.has(el) && temToken(el, reSimples) && ePagina(el)) registar(el, false)
      })
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      document.querySelectorAll('[class*="preloader"]').forEach(el => {
        const a = alvos.get(el)
        const activo = ehAlvo(el)
        if (activo && !a && !feitos.has(el)) {
          const nova = registar(el, false)
          nova.pronto = true
        } else if (activo && a) {
          if (!a.saindo) {
            if (a.local === ePagina(el)) {
              destruir(el, a)
              const nova = registar(el, false)
              nova.pronto = true
              tentarEsconder(el, nova)
              return
            }
            configurar(el, a)
            a.pronto = true
          }
        } else if (!activo) {
          feitos.delete(el)
          if (!a) el.removeAttribute('data-preloader')
          else if (!a.forcado) esconder(el, a, false)
        }
      })
      alvos.forEach((a, el) => {
        if (!el.isConnected) destruir(el, a)
        else tentarEsconder(el, a)
      })
    }

    const nosso = n => n.nodeType === 1 && hosts.has(n)
    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar(mutacoes) {
      if (mutacoes && mutacoes.length) {
        rapido()
        if (mutacoes.every(m => (m.target.nodeType === 1 && m.target.closest('[data-breeze-preloader]')) ||
            (m.type === 'childList' && [].every.call(m.addedNodes, nosso) && [].every.call(m.removedNodes, nosso)))) return
      }
      if (agendado) return
      agendado = true
      requestAnimationFrame(() => requestAnimationFrame(varrer))
    }

    global.addEventListener('load', () => {
      varrer()
    })
    new MutationObserver(agendar).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    rapido()
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => agendar())
    else agendar()

    // ---- API pública
    function mostrar(el) {
      el = el || document.body
      if (!el) return
      const a = alvos.get(el)
      if (a && !a.saindo) return
      if (a) destruir(el, a)
      feitos.delete(el)
      registar(el, true) // forcado = manual: só desaparece por esconder()
    }

    function esconderApi(el, instantaneo) {
      const a = el && alvos.get(el)
      if (!a) return false
      esconder(el, a, true, instantaneo)
      return true
    }

    function estado(el) {
      const a = el && alvos.get(el)
      if (a) return { visivel: !a.saindo, pagina: !a.local, tipo: a.tipo }
      // já ocultado mas ainda marcado (a classe continua no elemento)
      return el && feitos.has(el) ? { visivel: false, pagina: ePagina(el), tipo: '' } : null
    }

    function alternar(el, ativo) {
      const a = el && alvos.get(el)
      if (ativo === undefined) ativo = !(a && !a.saindo)
      if (ativo) mostrar(el)
      else esconderApi(el)
      return ativo
    }

    function remover(el) {
      const a = el && alvos.get(el)
      if (!a) return
      a.concluido = false
      feitos.add(el) // a classe pode continuar no elemento: não recriar
      destruir(el, a)
    }

    return { varrer, mostrar, esconder: esconderApi, estado, alternar, remover }
  }

  // ----------------------------------------------------------------- plugin
  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    let motor = null
    // elemento ou seletor CSS; sem argumento = <body>
    const resolver = t => (typeof document === 'undefined' ? null : !t ? document.body : typeof t === 'string' ? document.querySelector(t) : t)
    return {
      nome: 'preloader',
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
      },
      iniciar(prefixo) {
        if (typeof document === 'undefined' || motor) return
        motor = iniciarMotor(cfg, prefixo || '')
      },
      mostrar(t) {
        if (motor) motor.mostrar(resolver(t))
      },
      esconder(t, imediato) {
        return motor ? motor.esconder(resolver(t), imediato) : false
      },
      ocultar(t, imediato) {
        return motor ? motor.esconder(resolver(t), imediato) : false
      },
      alternar(t, ativo) {
        return motor ? motor.alternar(resolver(t), ativo) : false
      },
      estado(t) {
        return motor ? motor.estado(resolver(t)) : null
      },
      remover(t) {
        if (motor) motor.remover(resolver(t))
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezePreloader = plugin
  if (typeof module !== 'undefined' && module.exports) module.exports = plugin
})(typeof window !== 'undefined' ? window : globalThis)



;/*!
 * BreezeBackgrounds v1.4.0 — integrado no bundle BreezeCSS
 * O plugin fica disponível como window.BreezeBackgrounds.
 * Para o activar, inclui BreezeBackgrounds em BreezeConfig.plugins.
 */
/*!
 * BreezeBackgrounds v1.5.0 — plugin "backgrounds" para o BreezeCSS (>= 2.2)
 *
 * v1.5.0 — dois novos estilos:
 *   • cubo      cubos isométricos animados sobre riscas diagonais (o clássico "cube
 *               background"). O mosaico é um <pattern> que se repete para sempre, por
 *               isso o deslize (SMIL no patternTransform) nunca descobre margens nem
 *               precisa de área extra. escala = tamanho do cubo (1 = cubos de 60px,
 *               como no original); angulo roda as riscas; opacidade = transparência
 *               dos cubos (0.7, como no original).
 *   • estrelas  campo de estrelas em 3 camadas (1/2/3px) que sobem continuamente, cada
 *               uma à sua velocidade (50s/100s/150s por ciclo — parallax, como no
 *               original). O céu é o gradiente radial vindo de baixo:
 *               custom-bg-glow[#321b35] sobre custom-bg-color[#090a0f];
 *               custom-bg-line = cor das estrelas; levels = densidade (80 ≈ o campo
 *               original, 1000 estrelas por 2000×2000px);
 *               custom-bg-anim[pulse] faz as estrelas cintilarem.
 *
 * v1.4.0 — fundos animados (opt-in: sem estas classes os fundos ficam exactamente como antes):
 *   • Qualquer estilo / preset pode ser animado. A animação é SVG/SMIL embutido na própria
 *     imagem de fundo: sem JavaScript por frame, sem canvas, sem elementos extra no HTML.
 *     A animação parte do mesmo desenho do fundo estático (mesma semente, mesmas formas).
 *   • custom-bg-animate           liga a animação, com o movimento que melhor assenta ao estilo
 *   • custom-bg-anim[tipos]       escolhe o(s) movimento(s); combinam-se com "_" (= espaço):
 *       drift     desloca o desenho numa trajectória suave e orgânica
 *                 (aurora: cada mancha de cor flutua à sua maneira)
 *       rotate    balanço angular lento em torno do centro (custom-bg-center)
 *       breathe   zoom lento (aproxima / afasta) em torno do centro
 *       pulse     linhas alternadas “respiram” em opacidade; pontos e quadrados cintilam;
 *                 as manchas da aurora pulsam
 *       none      desliga (útil em variantes, p.ex. md:custom-bg-anim[none])
 *   • custom-bg-anim-speed[1]     multiplicador de velocidade  (0.1–5)
 *   • custom-bg-anim-amount[1]    multiplicador de amplitude   (0–2.5)
 *     Ex.:  <section class="custom-bg[topo] custom-bg-animate">
 *           <section class="custom-bg[espiral] custom-bg-anim[rotate_pulse] custom-bg-anim-speed[0.6]">
 *   • Respeita prefers-reduced-motion (mostra o fundo estático) e, para poupar CPU/GPU, volta
 *     à versão estática enquanto o elemento está fora do ecrã.
 *     Desactivar o primeiro: BreezeBackgrounds.criar({ respeitarMovimentoReduzido: false })
 *   • Presets próprios: novas chaves  animacao ('drift pulse'), animar (true), velocidade, amplitude.
 *   • API: BreezeBackgrounds.gerar(bruto, w, h, { animar: false }) devolve sempre a versão estática.
 *   • Custo: a imagem é redesenhada a cada frame pelo browser. Estilos com muito traço
 *     (marmore, colmeia, raios, grelha) pesam mais — nesses convém baixar levels ou usar pulse
 *     (que não obriga a gerar área extra) em vez de drift/rotate.
 *
 * v1.3.0 — fundos mais variados:
 * v1.3.0 — fundos mais variados:
 *   • Novos estilos de linhas: colmeia, celulas, agata, dunas, raios.
 *   • Novos modos que não são linhas:
 *       pontos   meio-tom (halftone) — pontos que crescem e encolhem com o ruído
 *       mosaico  grelha de quadrados com tons variáveis (mapa de calor / pixel-art)
 *       aurora   manchas de cor difusas em gradiente, sem linhas
 *   • Os parâmetros existentes aplicam-se: levels = nº de células do longo lado
 *     (pontos, mosaico), width = tamanho dos pontos/quadrados, line = cor principal
 *     (em aurora define a família de cores), angle = direcção (pontos) ou
 *     rotação de matiz em graus (aurora).
 *
 * v1.2.0:
 *   • Zona limpa central removida — as linhas cobrem agora todo o fundo,
 *     sem máscara nem “buraco” ao centro.
 *   • Preset ilhas removido (ficou igual ao topo sem a zona limpa).
 *   • custom-bg-clear removido; custom-bg-center mantém-se apenas para
 *     posicionar os estilos radiais (ripples, espiral) e o brilho opt-in.
 *
 * v1.1.0:
 *   • O brilho central (círculo luminoso) deixou de ser aplicado por omissão —
 *     passa a ser opt-in via custom-bg-glow[cor].
 *   • Presets topo-emerald / topo-violet / topo-crimson / topo-mono / topo-light
 *     removidos (todos eram variações do mesmo estilo; ficou o "topo").
 *   • Novos estilos: picos, espiral, grelha, interferencia, marmore.
 *   • Linhas mais presentes (opacidade das traces reforçada).
 *
 * Gera fundos de linhas de contorno (estilo mapa topográfico) de forma
 * procedural, a partir de classes. Sem imagens, sem elementos extra no HTML:
 * o plugin desenha um SVG do tamanho exacto do elemento (regenerado quando ele
 * muda de tamanho) e aplica-o num ::before atrás do conteúdo.
 *
 * Uso (recomendado — antes do BreezeCSS):
 *   <script src="breeze--backgrounds.js"></script>
 *   <script>window.BreezeConfig = { plugins: [BreezeBackgrounds] }</script>
 *   <script src="breeze.min.js"></script>
 *
 * Uso (depois do BreezeCSS já inicializado):
 *   BreezeCSS.use(BreezeBackgrounds)
 *
 *   <div class="custom-bg[topo]">…</div>
 *   <section class="min-h[100vh] custom-bg[waves] custom-bg-color[#003] custom-bg-levels[24]">…</section>
 *
 * Estilos / presets  — custom-bg[nome]
 *   topo            contornos de relevo                  ← por omissão
 *   waves           ondas horizontais
 *   flow            ondas deformadas, em diagonal
 *   ripples         anéis concêntricos a partir do centro
 *   ridges          cristas / veios (contornos de |ruído|)
 *   picos           anéis em torno de vários picos
 *   espiral         redemoinho que roda em torno do centro
 *   grelha          malha orgânica de células arredondadas
 *   interferencia   interferência de duas fontes de ondas
 *   marmore         veios finos e caóticos
 *   colmeia         rede hexagonal deformada
 *   celulas         células tipo Voronoi, com anéis em cada uma
 *   agata           anéis irregulares encaixados, tipo ágata
 *   dunas           cristas paralelas e assimétricas (preset claro)
 *   raios           feixes que irradiam do centro
 *   pontos          meio-tom: pontos de tamanho variável
 *   mosaico         quadrados de tons variáveis
 *   aurora          manchas de cor difusas (gradientes, sem linhas)
 *   cubo            cubos isométricos sobre riscas diagonais
 *   estrelas        campo de estrelas em 3 camadas, com parallax
 *   A classe simples  custom-bg  equivale a  custom-bg[topo].
 *
 * Parâmetros (todos opcionais)
 *   custom-bg-color[#003]        cor base (a escura das bordas). As restantes cores
 *                                são derivadas dela, a menos que as indiques.
 *   custom-bg-glow[#0053cf]      brilho central OPCIONAL — desactivado por omissão;
 *                                custom-bg-glow[none] também força sem brilho
 *   custom-bg-line[#087cff]      cor das linhas principais
 *   custom-bg-line-soft[#0753bd] cor das linhas alternadas (mais discretas)
 *   custom-bg-levels[18]         nº de níveis de contorno (densidade das linhas)
 *   custom-bg-scale[1.4]         tamanho das formas (>1 = formas maiores)
 *   custom-bg-seed[42]           semente: muda a forma, mantém o estilo
 *   custom-bg-width[1.2]         espessura das linhas em px
 *   custom-bg-opacity[0.8]       multiplicador da opacidade das linhas (0–1)
 *   custom-bg-center[50%_53%]    centro dos estilos radiais (ripples, espiral)
 *                                e do brilho, se activo
 *   custom-bg-angle[30]          ângulo em graus (waves / flow / marmore)
 *   Variantes do Breeze funcionam: md:custom-bg[waves], hover:custom-bg-color[#012], …
 *
 * Presets próprios
 *   BreezeBackgrounds.criar({ presets: {
 *     marca: { estilo: 'topo', cor: '#1a0033', niveis: 22, seed: 5 }
 *   } })
 *   // ou, depois de criado:  BreezeBackgrounds.registar('marca', { … })
 *   // chaves do preset: estilo, cor, glow, linha, linhaSuave, niveis, escala, seed,
 *   //                   largura, opacidade, centro ('50% 50%'), angulo
 *
 * Opções gerais:  BreezeBackgrounds.criar({ pseudo: 'before' | 'after' })
 *   (o fundo usa um pseudo-elemento; se já usas ::before no elemento, escolhe 'after')
 *
 * API extra
 *   BreezeBackgrounds.gerar({ name:'topo', color:'#003', … }, largura, altura)
 *     → { svg, css }   (SVG das linhas + declarações CSS completas; funciona em Node)
 *
 * Notas
 *   • O elemento passa a ter position:relative e isolation:isolate (com especificidade 0:
 *     as tuas classes ganham) e o conteúdo fica por cima do fundo.
 *   • Respeita o border-radius do elemento.
 */
(function (global) {
  'use strict'

  const VERSAO = '1.5.0'
  const PADROES = { pseudo: 'before', presets: {}, respeitarMovimentoReduzido: true }

  // Valores por omissão de todos os parâmetros (podem ser alterados por estilo / preset / classe)
  const BASE = {
    estilo: 'topo', cor: '#000824', glow: null, linha: null, linhaSuave: null,
    niveis: 18, escala: 1, seed: 7, largura: 1, opacidade: 1,
    centro: [0.5, 0.53], angulo: 0,
    animacao: null, animar: false, velocidade: 1, amplitude: 1
  }

  // ------------------------------------------------------------ classes CSS
  // Nota: o Breeze separa as declarações por ";" — não usar ";" dentro de valores.
  const CLASSES = { 'custom-bg': '--cbg-on: 1', 'custom-bg-animate': '--cbg-animate: 1' }

  // Valores arbitrários: custom-bg-color[#003] → --cbg-color: #003
  const MAPEAMENTOS = {
    'custom-bg': '--cbg-name',
    'custom-bg-color': '--cbg-color',
    'custom-bg-glow': '--cbg-glow',
    'custom-bg-line': '--cbg-line',
    'custom-bg-line-soft': '--cbg-line-soft',
    'custom-bg-levels': '--cbg-levels',
    'custom-bg-scale': '--cbg-scale',
    'custom-bg-seed': '--cbg-seed',
    'custom-bg-width': '--cbg-width',
    'custom-bg-opacity': '--cbg-opacity',
    'custom-bg-center': '--cbg-center',
    'custom-bg-angle': '--cbg-angle',
    'custom-bg-anim': '--cbg-anim',
    'custom-bg-anim-speed': '--cbg-anim-speed',
    'custom-bg-anim-amount': '--cbg-anim-amount'
  }
  const VARS = ['on', 'name', 'color', 'glow', 'line', 'line-soft', 'levels', 'scale', 'seed', 'width', 'opacity', 'center', 'angle', 'animate', 'anim', 'anim-speed', 'anim-amount']

  // ------------------------------------------------------------------ utilitários
  const limita = (x, a, b) => (x < a ? a : x > b ? b : x)
  const lin = (a, b, n) => {
    const r = []
    for (let i = 0; i < n; i++) r.push(n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1))
    return r
  }
  const r1 = v => Math.round(v * 10) / 10
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // ------------------------------------------------------------------ cores
  function rgb2hsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    const l = (mx + mn) / 2
    let h = 0, s = 0
    if (mx !== mn) {
      const d = mx - mn
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
      h *= 60
    }
    return { h, s, l }
  }

  function hsl2rgb(h, s, l, a) {
    h = (((h % 360) + 360) % 360) / 360
    const f = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a: a == null ? 1 : a }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return { r: f(p, q, h + 1 / 3) * 255, g: f(p, q, h) * 255, b: f(p, q, h - 1 / 3) * 255, a: a == null ? 1 : a }
  }

  const mistura = (a, b, t) => ({
    r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: 1
  })
  const escala = (c, k) => ({ r: limita(c.r * k, 0, 255), g: limita(c.g * k, 0, 255), b: limita(c.b * k, 0, 255), a: 1 })
  const rgba = (c, a) => 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + (a == null ? 1 : +a.toFixed(3)) + ')'
  const rgbStr = c => 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'
  const BRANCO = { r: 255, g: 255, b: 255 }

  const cacheCor = new Map()
  let sonda = null
  let tela = null

  // Resolve qualquer cor CSS (nomes, var(--x), oklch(), …) para {r,g,b,a} — só no browser.
  function corViaDom(txt) {
    if (typeof document === 'undefined') return null
    try {
      if (!sonda) {
        sonda = document.createElement('span')
        sonda.style.cssText = 'display:none'
        sonda.setAttribute('data-breeze', 'backgrounds-sonda')
        document.documentElement.appendChild(sonda)
      }
      sonda.style.color = ''
      sonda.style.color = txt
      if (!sonda.style.color) return null
      const resolvida = getComputedStyle(sonda).color
      if (!tela) {
        tela = document.createElement('canvas')
        tela.width = tela.height = 1
      }
      const ctx = tela.getContext('2d', { willReadFrequently: true })
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = resolvida
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
    } catch (e) {
      return null
    }
  }

  function parseCor(txt) {
    if (txt && typeof txt === 'object') return txt
    const s = String(txt == null ? '' : txt).trim().toLowerCase()
    if (!s) return null
    if (cacheCor.has(s)) return cacheCor.get(s)
    let c = null
    let m
    if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
      let h = m[1]
      if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('')
      if (h.length === 6 || h.length === 8) {
        c = {
          r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
          a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        }
      }
    } else if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean)
      const v = i => (/%$/.test(p[i]) ? (parseFloat(p[i]) / 100) * 255 : parseFloat(p[i]))
      if (p.length >= 3 && [0, 1, 2].every(i => isFinite(v(i)))) {
        c = { r: v(0), g: v(1), b: v(2), a: p[3] != null ? (/%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1 }
      }
    } else if ((m = s.match(/^hsla?\(([^)]+)\)$/))) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean)
      const h = parseFloat(p[0]), sa = parseFloat(p[1]) / 100, li = parseFloat(p[2]) / 100
      if ([h, sa, li].every(isFinite)) {
        c = hsl2rgb(h, sa, li, p[3] != null ? (/%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1)
      }
    }
    if (!c) c = corViaDom(s)
    if (c) cacheCor.set(s, c)
    return c
  }

  // Deriva a paleta completa a partir da cor base (e das cores dadas explicitamente).
  // O brilho central é opt-in: só existe se P.glow indicar uma cor.
  function paleta(P) {
    const base = parseCor(P.cor) || parseCor(BASE.cor)
    const hsl = rgb2hsl(base)
    const escuro = hsl.l < 0.5
    let glow = null, linha, suave
    if (escuro) {
      const lLinha = limita(hsl.l + 0.4, 0.52, 0.78)
      linha = hsl2rgb(hsl.h, hsl.s, lLinha)
      suave = hsl2rgb(hsl.h, hsl.s, lLinha - 0.14)
    } else {
      linha = hsl2rgb(hsl.h, hsl.s, Math.max(0.25, hsl.l - 0.42))
      suave = hsl2rgb(hsl.h, hsl.s, Math.max(0.3, hsl.l - 0.28))
    }
    if (P.glow && P.glow !== 'none') {
      glow = parseCor(P.glow) ||
        (escuro ? hsl2rgb(hsl.h, hsl.s, Math.max(0.4, hsl.l + 0.3)) : hsl2rgb(hsl.h, hsl.s * 0.6, 0.995))
    }
    if (P.linha) linha = parseCor(P.linha) || linha
    // se só indicaram a linha principal, a suave deriva dela
    if (P.linhaSuave) suave = parseCor(P.linhaSuave) || suave
    else if (P.linha) suave = mistura(linha, base, 0.35)
    return { base, glow, linha, suave, escuro }
  }

  // ------------------------------------------------------------------ ruído
  function mulberry32(a) {
    return function () {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function criarRuido(seed) {
    const rnd = mulberry32((seed | 0) * 2654435761 + 1013904223)
    const p = []
    for (let i = 0; i < 256; i++) p.push(i)
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      const t = p[i]
      p[i] = p[j]
      p[j] = t
    }
    const P = new Uint8Array(512)
    for (let i = 0; i < 512; i++) P[i] = p[i & 255]
    const GX = new Float32Array(256)
    const GY = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      const a = rnd() * Math.PI * 2
      GX[i] = Math.cos(a)
      GY[i] = Math.sin(a)
    }
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10)
    function perlin(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y)
      const xf = x - xi, yf = y - yi
      const X = xi & 255, Y = yi & 255
      const g = (ix, iy, dx, dy) => {
        const h = P[P[ix & 255] + (iy & 255)]
        return GX[h] * dx + GY[h] * dy
      }
      const u = fade(xf), v = fade(yf)
      const a = g(X, Y, xf, yf), b = g(X + 1, Y, xf - 1, yf)
      const c = g(X, Y + 1, xf, yf - 1), d = g(X + 1, Y + 1, xf - 1, yf - 1)
      const l1 = a + (b - a) * u, l2 = c + (d - c) * u
      return l1 + (l2 - l1) * v
    }
    function fbm(x, y, oct) {
      let s = 0, a = 1, f = 1, n = 0
      for (let o = 0; o < oct; o++) {
        s += a * perlin(x * f + o * 17.3, y * f + o * 9.1)
        n += a
        a *= 0.5
        f *= 2
      }
      return s / n
    }
    return { perlin, fbm }
  }

  // ------------------------------------------------- marching squares + traçado
  // F[j*nx+i] = valor no vértice (i,j), de coordenadas (ox+i*passo, oy+j*passo).
  // Devolve polilinhas {pts:[x0,y0,x1,y1,…], fechada}.
  function contornos(F, nx, ny, ox, oy, passo, nivel) {
    const viz = new Map() // id da aresta → vizinhos (≤ 2)
    const idH = (i, j) => 2 * (j * nx + i) // aresta (i,j)–(i+1,j)
    const idV = (i, j) => 2 * (j * nx + i) + 1 // aresta (i,j)–(i,j+1)

    const lig = (a, b) => {
      let va = viz.get(a)
      if (!va) viz.set(a, (va = []))
      let vb = viz.get(b)
      if (!vb) viz.set(b, (vb = []))
      va.push(b)
      vb.push(a)
    }

    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = F[j * nx + i], b = F[j * nx + i + 1]
        const c = F[(j + 1) * nx + i + 1], d = F[(j + 1) * nx + i]
        const idx = (a >= nivel ? 8 : 0) | (b >= nivel ? 4 : 0) | (c >= nivel ? 2 : 0) | (d >= nivel ? 1 : 0)
        if (idx === 0 || idx === 15) continue
        const T = idH(i, j), B = idH(i, j + 1), L = idV(i, j), R = idV(i + 1, j)
        switch (idx) {
          case 1: case 14: lig(L, B); break
          case 2: case 13: lig(B, R); break
          case 3: case 12: lig(L, R); break
          case 4: case 11: lig(T, R); break
          case 6: case 9: lig(T, B); break
          case 7: case 8: lig(L, T); break
          case 5:
            if ((a + b + c + d) / 4 >= nivel) { lig(L, T); lig(B, R) } else { lig(T, R); lig(L, B) }
            break
          case 10:
            if ((a + b + c + d) / 4 >= nivel) { lig(T, R); lig(L, B) } else { lig(L, T); lig(B, R) }
            break
        }
      }
    }

    const ponto = id => {
      const e = id >> 1
      const j = Math.floor(e / nx), i = e - j * nx
      if ((id & 1) === 0) {
        const v0 = F[j * nx + i], v1 = F[j * nx + i + 1]
        return [ox + (i + (nivel - v0) / (v1 - v0)) * passo, oy + j * passo]
      }
      const v0 = F[j * nx + i], v1 = F[(j + 1) * nx + i]
      return [ox + i * passo, oy + (j + (nivel - v0) / (v1 - v0)) * passo]
    }

    const visto = new Set()
    const saida = []

    function seguir(inicio) {
      const pts = []
      let ant = -1
      let cur = inicio
      for (;;) {
        visto.add(cur)
        const p = ponto(cur)
        pts.push(p[0], p[1])
        let prox = -1
        const v = viz.get(cur)
        for (let k = 0; k < v.length; k++) {
          if (v[k] !== ant && !visto.has(v[k])) { prox = v[k]; break }
        }
        if (prox < 0) {
          const fechada = pts.length >= 6 && v.indexOf(inicio) >= 0 && cur !== inicio
          saida.push({ pts, fechada })
          return
        }
        ant = cur
        cur = prox
      }
    }

    // primeiro as linhas abertas (começam nos extremos), depois os anéis fechados
    viz.forEach((v, id) => { if (v.length === 1 && !visto.has(id)) seguir(id) })
    viz.forEach((v, id) => { if (!visto.has(id)) seguir(id) })
    return saida
  }

  // Polilinha → curva suave (Catmull-Rom → Bézier cúbica), com decimação.
  function caminho(pts, fechada, minD) {
    const P = []
    let lx = pts[0], ly = pts[1]
    P.push([lx, ly])
    for (let i = 2; i < pts.length; i += 2) {
      const x = pts[i], y = pts[i + 1]
      const ultimo = i >= pts.length - 2
      if (ultimo || Math.hypot(x - lx, y - ly) >= minD) {
        P.push([x, y])
        lx = x
        ly = y
      }
    }
    if (fechada && P.length > 3 && Math.hypot(P[0][0] - lx, P[0][1] - ly) < minD * 0.6) P.pop()
    const n = P.length
    if (n < 2) return ''
    if (n === 2) return 'M' + r1(P[0][0]) + ' ' + r1(P[0][1]) + 'L' + r1(P[1][0]) + ' ' + r1(P[1][1])
    const at = i => (fechada ? P[((i % n) + n) % n] : P[limita(i, 0, n - 1)])
    let d = 'M' + r1(P[0][0]) + ' ' + r1(P[0][1])
    const segs = fechada ? n : n - 1
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
      d += 'C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        r1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' +
        r1(p2[0]) + ' ' + r1(p2[1])
    }
    return fechada ? d + 'Z' : d
  }

  // ------------------------------------------------------------------ estilos
  // c = { W, H (em unidades), cx, cy, d2 (dist.² máx ao centro), r (ruído), escala, angulo }
  // campo(c) devolve f(x, y); niveis(c, n) devolve os valores de contorno.
  const rad = g => (g * Math.PI) / 180
  function extensaoRodada(c, ang) {
    const co = Math.cos(ang), si = Math.sin(ang)
    let mn = Infinity, mx = -Infinity
    ;[[0, 0], [c.W, 0], [0, c.H], [c.W, c.H]].forEach(p => {
      const v = -p[0] * si + p[1] * co
      if (v < mn) mn = v
      if (v > mx) mx = v
    })
    return [mn, mx]
  }

  const ESTILOS = {
    topo: {
      padroes: {},
      campo(c) {
        const f = 2.2 / c.escala
        return (x, y) => c.r.fbm(x * f, y * f, 3)
      },
      niveis: (c, n) => lin(-0.4, 0.6, n)
    },
    waves: {
      padroes: { niveis: 20, angulo: 0 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 1.4 / c.escala
        return (x, y) => {
          const u = x * co + y * si, v = -x * si + y * co
          return v + 0.24 * c.escala * c.r.fbm(u * f, v * f * 0.6, 2)
        }
      },
      niveis(c, n) {
        const e = extensaoRodada(c, rad(c.angulo))
        return lin(e[0], e[1], n + 2).slice(1, -1)
      }
    },
    flow: {
      padroes: { niveis: 22, angulo: 28 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 1.1 / c.escala
        return (x, y) => {
          const wx = x + 0.34 * c.escala * c.r.fbm(x * f, y * f, 2)
          const wy = y + 0.34 * c.escala * c.r.fbm(x * f + 5.2, y * f + 1.3, 2)
          const u = wx * co + wy * si, v = -wx * si + wy * co
          return v + 0.05 * c.r.fbm(u * 3 * f, v * 3 * f, 2)
        }
      },
      niveis(c, n) {
        const e = extensaoRodada(c, rad(c.angulo))
        return lin(e[0], e[1], n + 2).slice(1, -1)
      }
    },
    ripples: {
      padroes: { niveis: 24 },
      campo(c) {
        const f = 2.5 / c.escala
        return (x, y) => Math.hypot(x - c.cx, y - c.cy) + 0.07 * c.escala * c.r.fbm(x * f, y * f, 2)
      },
      niveis: (c, n) => lin(0.05, Math.sqrt(c.d2), n)
    },
    ridges: {
      padroes: { niveis: 14 },
      campo(c) {
        const f = 1.8 / c.escala
        return (x, y) => Math.abs(c.r.fbm(x * f, y * f, 3))
      },
      niveis: (c, n) => lin(0.012, 0.24, n)
    },
    picos: {
      padroes: { niveis: 20, escala: 1.3 },
      campo(c) {
        const f = 2.2 / c.escala
        const picos = []
        for (let k = 0; k < 6; k++) {
          const px = limita(0.5 + c.r.perlin(k * 12.9 + 1.7, 4.3) * 0.62, 0.08, 0.92)
          const py = limita(0.5 + c.r.perlin(k * 5.1 + 8.9, 2.6) * 0.62, 0.08, 0.92)
          const r0 = (0.13 + 0.07 * (c.r.perlin(k * 3.3 + 0.9, k * 7.7 + 2.4) + 1) / 2) * c.escala
          picos.push([px * c.W, py * c.H, r0 * r0])
        }
        return (x, y) => {
          let v = 0
          for (let k = 0; k < picos.length; k++) {
            const dx = x - picos[k][0], dy = y - picos[k][1]
            const e = Math.exp(-(dx * dx + dy * dy) / picos[k][2])
            if (e > v) v = e
          }
          return v + 0.06 * c.r.fbm(x * f, y * f, 2)
        }
      },
      niveis: (c, n) => lin(0.04, 0.85, n)
    },
    espiral: {
      padroes: { niveis: 24, escala: 1.2 },
      campo(c) {
        const f = 2.4 / c.escala
        const torsao = 9 * c.escala
        return (x, y) => {
          const dx = x - c.cx, dy = y - c.cy
          const d = Math.hypot(dx, dy)
          const a = d * torsao
          const co = Math.cos(a), si = Math.sin(a)
          return dx * co - dy * si + 0.14 * c.escala * c.r.fbm(x * f, y * f, 2)
        }
      },
      niveis(c, n) {
        const dmax = Math.sqrt(c.d2)
        return lin(-dmax, dmax, n + 2).slice(1, -1)
      }
    },
    grelha: {
      padroes: { niveis: 16, escala: 1.2 },
      campo(c) {
        const k = Math.PI * 2 * 4 / c.escala
        const f = 3 / c.escala
        const w = 0.16 * c.escala
        return (x, y) => {
          const wx = x + w * c.r.fbm(x * f + 11.3, y * f, 2)
          const wy = y + w * c.r.fbm(x * f, y * f + 7.7, 2)
          return Math.sin(wx * k) * Math.sin(wy * k)
        }
      },
      niveis: (c, n) => lin(-0.92, 0.92, n)
    },
    interferencia: {
      padroes: { niveis: 24, escala: 1.2 },
      campo(c) {
        const k = 12 / c.escala
        const f = 2 / c.escala
        const s = [
          limita(0.5 + c.r.perlin(2.3, 8.1) * 0.7, 0.12, 0.88) * c.W,
          limita(0.5 + c.r.perlin(5.9, 1.7) * 0.7, 0.12, 0.88) * c.H,
          limita(0.5 + c.r.perlin(9.2, 3.3) * 0.7, 0.12, 0.88) * c.W,
          limita(0.5 + c.r.perlin(7.4, 6.6) * 0.7, 0.12, 0.88) * c.H
        ]
        return (x, y) => {
          const d1 = Math.hypot(x - s[0], y - s[1])
          const d2 = Math.hypot(x - s[2], y - s[3])
          return 0.5 * Math.sin(d1 * k) + 0.5 * Math.sin(d2 * k) + 0.05 * c.r.fbm(x * f, y * f, 2)
        }
      },
      niveis: (c, n) => lin(-0.95, 0.95, n)
    },
    marmore: {
      padroes: { niveis: 26, escala: 1.5, angulo: 18 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a)
        const fv = 2.6 / c.escala
        const k = 34 / c.escala
        return (x, y) => {
          const q = c.r.fbm(x * fv, y * fv, 3)
          return Math.sin((x * co + y * si) * k + 4.8 * q)
        }
      },
      niveis: (c, n) => lin(-0.9, 0.9, n)
    },
    colmeia: {
      padroes: { niveis: 10, escala: 1, angulo: 15 },
      campo(c) {
        const f = 2 / c.escala
        const kk = (4 * Math.PI) / (Math.sqrt(3) * 0.12 * c.escala)
        const dirs = [0, 60, 120].map(g => [Math.cos(rad(c.angulo + g)), Math.sin(rad(c.angulo + g))])
        return (x, y) => {
          const wx = x + 0.012 * c.escala * c.r.fbm(x * f, y * f, 2)
          const wy = y + 0.012 * c.escala * c.r.fbm(x * f + 5.2, y * f + 1.3, 2)
          let t = 0
          for (let k = 0; k < 3; k++) t += Math.cos(kk * (wx * dirs[k][0] + wy * dirs[k][1]))
          return t / 3
        }
      },
      niveis: (c, n) => lin(-0.3, 0.45, n)
    },
    celulas: {
      padroes: { niveis: 14, escala: 1.1 },
      campo(c) {
        const s = 0.16 * c.escala, f = 2.4 / c.escala
        const cache = new Map()
        const pt = (i, j) => {
          const k = i * 100003 + j
          let p = cache.get(k)
          if (!p) {
            p = [
              (i + limita(0.5 + c.r.perlin(i * 1.713 + 0.37, j * 2.291 + 0.81) * 0.9, 0.08, 0.92)) * s,
              (j + limita(0.5 + c.r.perlin(i * 2.137 + 5.53, j * 1.419 + 3.27) * 0.9, 0.08, 0.92)) * s
            ]
            cache.set(k, p)
          }
          return p
        }
        return (x, y) => {
          const wx = x + 0.02 * c.escala * c.r.fbm(x * f, y * f, 2)
          const wy = y + 0.02 * c.escala * c.r.fbm(x * f + 5.2, y * f + 1.3, 2)
          const ci = Math.floor(wx / s), cj = Math.floor(wy / s)
          let m = Infinity
          for (let dj = -1; dj <= 1; dj++) {
            for (let di = -1; di <= 1; di++) {
              const p = pt(ci + di, cj + dj)
              const d = Math.hypot(wx - p[0], wy - p[1])
              if (d < m) m = d
            }
          }
          return m
        }
      },
      niveis: (c, n) => lin(0.015, 0.72 * 0.16 * c.escala, n)
    },
    agata: {
      padroes: { niveis: 28, escala: 1.2, centro: [0.42, 0.5] },
      campo(c) {
        const f = 1.5 / c.escala
        return (x, y) => Math.hypot(x - c.cx, (y - c.cy) * 1.6) + 0.22 * c.escala * c.r.fbm(x * f, y * f, 4)
      },
      niveis: (c, n) => lin(0.05, Math.sqrt(c.d2) * 1.5, n)
    },
    dunas: {
      padroes: { niveis: 24, escala: 1, angulo: 20 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 0.9 / c.escala
        return (x, y) => {
          const u = x * co + y * si, v = -x * si + y * co
          const q = c.r.fbm(u * f, v * f, 3)
          return v + 0.1 * c.escala * Math.sin(u * 5 / c.escala + 5 * q) + 0.12 * c.escala * q
        }
      },
      niveis(c, n) {
        const e = extensaoRodada(c, rad(c.angulo))
        return lin(e[0], e[1], n + 2).slice(1, -1)
      }
    },
    raios: {
      padroes: { niveis: 20, escala: 1 },
      campo(c) {
        const f = 2 / c.escala
        const N = limita(Math.round(8 / c.escala), 3, 24)
        return (x, y) => {
          const dx = x - c.cx, dy = y - c.cy
          return Math.sin(N * Math.atan2(dy, dx) + 1.6 * Math.hypot(dx, dy) + 1.8 * c.r.fbm(x * f, y * f, 2))
        }
      },
      niveis: (c, n) => lin(-0.92, 0.92, n)
    },
    pontos: {
      modo: 'grade',
      forma: 'ponto',
      padroes: { niveis: 38, escala: 1, angulo: 35 },
      campo(c) {
        const a = rad(c.angulo), co = Math.cos(a), si = Math.sin(a), f = 2.2 / c.escala
        return (x, y) => 0.9 * (x * co + y * si) + 0.55 * c.r.fbm(x * f, y * f, 3)
      }
    },
    mosaico: {
      modo: 'grade',
      forma: 'quadrado',
      padroes: { niveis: 30, escala: 1 },
      campo(c) {
        const f = 2.4 / c.escala
        return (x, y) => c.r.fbm(x * f, y * f, 3) + 0.25 * c.r.fbm(x * f * 3 + 9.1, y * f * 3 + 2.7, 2)
      }
    },
    aurora: {
      modo: 'malha',
      padroes: { escala: 1 },
      campo: () => () => 0
    },
    cubo: {
      modo: 'cubo',
      padroes: { niveis: 18, escala: 1, opacidade: 0.7, angulo: 0 },
      campo: () => () => 0
    },
    estrelas: {
      modo: 'estrelas',
      padroes: { niveis: 80, escala: 1, opacidade: 1, centro: [0.5, 1] },
      campo: () => () => 0
    }
  }

  const BASE_DARK = { cor: '#000824' }
  const PRESETS_BUILTIN = {
    topo: { estilo: 'topo', cor: '#000824' },
    waves: { estilo: 'waves', cor: '#02131f' },
    flow: { estilo: 'flow', cor: '#0b0a1e' },
    ripples: { estilo: 'ripples', cor: '#01121c' },
    ridges: { estilo: 'ridges', cor: '#160716' },
    picos: { estilo: 'picos', cor: '#1d1002' },
    espiral: { estilo: 'espiral', cor: '#150326' },
    grelha: { estilo: 'grelha', cor: '#0b0c10' },
    interferencia: { estilo: 'interferencia', cor: '#031a2e' },
    marmore: { estilo: 'marmore', cor: '#101418' },
    colmeia: { estilo: 'colmeia', cor: '#071608' },
    celulas: { estilo: 'celulas', cor: '#1a0610' },
    agata: { estilo: 'agata', cor: '#04181a' },
    dunas: { estilo: 'dunas', cor: '#efe6d4' },
    raios: { estilo: 'raios', cor: '#1a1405' },
    pontos: { estilo: 'pontos', cor: '#140512', linha: '#f472b6' },
    mosaico: { estilo: 'mosaico', cor: '#0a0f24', linha: '#818cf8' },
    aurora: { estilo: 'aurora', cor: '#050b1a', linha: '#22d3a6' },
    cubo: { estilo: 'cubo', cor: '#181c21' },
    estrelas: { estilo: 'estrelas', cor: '#090a0f', glow: '#321b35', linha: '#ffffff' }
  }

  // ----------------------------------------------------------- animação (SVG / SMIL)
  // Movimento que melhor assenta a cada estilo quando só se escreve custom-bg-animate.
  const ANIM_PADRAO = {
    topo: 'drift', waves: 'drift', flow: 'drift', ripples: 'breathe', ridges: 'drift',
    picos: 'breathe', espiral: 'rotate', grelha: 'drift', interferencia: 'breathe',
    marmore: 'drift', colmeia: 'drift', celulas: 'drift', agata: 'rotate', dunas: 'drift',
    raios: 'rotate', pontos: 'pulse', mosaico: 'pulse', aurora: 'drift',
    cubo: 'drift breathe rotate', estrelas: 'drift'
  }
  // Estilos cujos níveis de contorno dependem do tamanho do elemento (extensão rodada ou
  // distância ao canto): ao gerar área extra para o movimento, estendem-se os níveis.
  const ESTENDE = ['waves', 'flow', 'ripples', 'espiral', 'agata', 'dunas']
  Object.keys(ESTILOS).forEach(k => {
    ESTILOS[k].animPadrao = ANIM_PADRAO[k] || 'drift'
    ESTILOS[k].estende = ESTENDE.indexOf(k) >= 0
  })

  const ANIMS = ['drift', 'rotate', 'breathe', 'pulse']
  const ALIAS_ANIM = { deriva: 'drift', rodar: 'rotate', respirar: 'breathe', pulsar: 'pulse' }
  const n3 = v => +v.toFixed(3)

  // Curvas: 0 → +a → 0 → −a → 0 com easing de seno (SPL_SENO); ida-e-volta suave (SPL_SUAVE).
  const SPL_SENO = '0.61 1 0.88 1;0.12 0 0.39 0;0.61 1 0.88 1;0.12 0 0.39 0'
  const SPL_SUAVE = '0.37 0 0.63 1;0.37 0 0.63 1'
  const KT5 = '0;0.25;0.5;0.75;1'
  const KT3 = '0;0.5;1'
  const osc = (a, mk) => [mk(0), mk(a), mk(0), mk(-a), mk(0)]

  function animTransf(tipo, vals, dur, oscila) {
    return "<animateTransform attributeName='transform' type='" + tipo + "' values='" + vals.join(';') +
      "' keyTimes='" + (oscila ? KT5 : KT3) + "' calcMode='spline' keySplines='" + (oscila ? SPL_SENO : SPL_SUAVE) +
      "' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
  }

  // fase > 0 → begin negativo: a animação começa já “a meio”, desfasada das outras
  function animAttr(attr, vals, dur, fase) {
    return "<animate attributeName='" + attr + "' values='" + vals.join(';') + "' keyTimes='" + KT3 +
      "' calcMode='spline' keySplines='" + SPL_SUAVE + "' dur='" + r1(dur) + "s'" +
      (fase > 0 ? " begin='-" + r1(fase) + "s'" : '') + " repeatCount='indefinite'/>"
  }

  // Envolve o desenho em grupos animados (de fora para dentro: drift → rotate → breathe).
  function envolver(corpo, mov) {
    let s = corpo
    if (mov.breathe) {
      const b = mov.breathe
      s = "<g transform='translate(" + r1(b.cx) + ' ' + r1(b.cy) + ")'><g>" +
        animTransf('scale', [1, n3(1 + b.s), 1], b.t, false) +
        "<g transform='translate(" + r1(-b.cx) + ' ' + r1(-b.cy) + ")'>" + s + '</g></g></g>'
    }
    if (mov.rotate) {
      const r = mov.rotate
      s = '<g>' + animTransf('rotate', osc(r.ang, v => r1(v) + ' ' + r1(r.cx) + ' ' + r1(r.cy)), r.t, true) + s + '</g>'
    }
    if (mov.drift) {
      const d = mov.drift
      s = '<g>' + animTransf('translate', osc(d.ax, v => r1(v) + ' 0'), d.tx, true) +
        '<g>' + animTransf('translate', osc(d.ay, v => '0 ' + r1(v)), d.ty, true) + s + '</g></g>'
    }
    return s
  }

  // "drift_pulse" → ['drift','pulse'] · 'none' → [] · ausente → null
  function lerAnim(v, silencioso) {
    if (v == null || v === '') return null
    const lista = (Array.isArray(v) ? v : String(v).toLowerCase().split(/[\s,+]+/))
      .map(x => String(x).trim()).map(x => ALIAS_ANIM[x] || x).filter(Boolean)
    if (lista.some(x => /^(none|off|false|0|nenhuma)$/.test(x))) return []
    const ok = []
    lista.forEach(x => {
      if (ANIMS.indexOf(x) >= 0) {
        if (ok.indexOf(x) < 0) ok.push(x)
      } else if (!silencioso && typeof console !== 'undefined') {
        console.warn('[BreezeBackgrounds] animação desconhecida: "' + x + '" — usa: ' + ANIMS.join(', '))
      }
    })
    return ok
  }
  const ligado = v => v != null && v !== '' && !/^(0|false|no|none|off)$/i.test(String(v).trim())

  // ------------------------------------------------- normalização dos parâmetros
  const num = (v, d, a, b) => {
    const n = parseFloat(v)
    return isFinite(n) ? (a != null ? limita(n, a, b) : n) : d
  }

  function lerCentro(v, d) {
    if (Array.isArray(v) && v.length === 2) return v
    if (typeof v !== 'string') return d
    const p = v.trim().split(/[\s,]+/).map(x => (/%$/.test(x) ? parseFloat(x) / 100 : parseFloat(x)))
    if (p.length === 1 && isFinite(p[0])) return [p[0], p[0]]
    return p.length >= 2 && isFinite(p[0]) && isFinite(p[1]) ? [p[0], p[1]] : d
  }

  // bruto: { name, color, glow, line, 'line-soft', levels, … } (strings das variáveis CSS)
  // e/ou chaves de preset em português (estilo, cor, niveis, …). Devolve parâmetros tipados.
  function resolver(bruto, presets, silencioso) {
    const b = bruto || {}
    const nome = String(b.name || b.nome || b.estilo || BASE.estilo).trim()
    const preset = presets[nome] || PRESETS_BUILTIN[nome]
    const estiloNome = (preset && preset.estilo) || (ESTILOS[nome] ? nome : null)
    if (!preset && !estiloNome && !silencioso && typeof console !== 'undefined') {
      console.warn('[BreezeBackgrounds] estilo desconhecido: "' + nome + '" — a usar "topo"')
    }
    const estilo = ESTILOS[estiloNome] ? estiloNome : 'topo'
    const m = Object.assign({}, BASE, ESTILOS[estilo].padroes, preset || {})
    const pick = (en, pt) => (b[en] != null && b[en] !== '' ? b[en] : b[pt] != null && b[pt] !== '' ? b[pt] : null)

    const P = { estilo }
    const cor = pick('color', 'cor'), glow = pick('glow', 'glow'), linha = pick('line', 'linha'), suave = pick('line-soft', 'linhaSuave')
    P.cor = cor != null ? cor : m.cor
    P.glow = glow != null ? glow : m.glow
    P.linha = linha != null ? linha : m.linha
    P.linhaSuave = suave != null ? suave : m.linhaSuave
    P.niveis = Math.round(num(pick('levels', 'niveis'), m.niveis, 2, 80))
    P.escala = num(pick('scale', 'escala'), m.escala, 0.2, 5)
    P.seed = Math.round(num(pick('seed', 'seed'), m.seed))
    P.largura = num(pick('width', 'largura'), m.largura, 0.2, 10)
    P.opacidade = num(pick('opacity', 'opacidade'), m.opacidade, 0, 1)
    P.centro = lerCentro(pick('center', 'centro'), Array.isArray(m.centro) ? m.centro : lerCentro(m.centro, BASE.centro))
    P.angulo = num(pick('angle', 'angulo'), m.angulo)

    // animação: custom-bg-anim[...] manda; senão a do preset; senão custom-bg-animate / animar
    let anim = lerAnim(pick('anim', 'animacao'), silencioso)
    if (anim === null) anim = lerAnim(m.animacao, silencioso)
    if (anim === null) {
      const f = pick('animate', 'animar')
      anim = ligado(f != null ? f : m.animar) ? lerAnim(ESTILOS[estilo].animPadrao, true) : []
    }
    P.anim = anim
    P.animVel = num(pick('anim-speed', 'velocidade'), m.velocidade, 0.1, 5)
    P.animQtd = num(pick('anim-amount', 'amplitude'), m.amplitude, 0, 2.5)
    return P
  }

  // Modo "grade": pontos / quadrados cujo tamanho ou tom segue o campo (normalizado).
  // extra (px) > 0: estende a grelha para lá do elemento (área para o movimento);
  // a normalização usa só as células visíveis, por isso o instante 0 não muda.
  // A = { mov, pulso } quando animado.
  function gradeSvg(est, P, c, W, H, U, pal, extra, A) {
    const g = Math.max(W, H) / limita(P.niveis, 8, 80)
    const ncx = Math.ceil(W / g), ncy = Math.ceil(H / g)
    const e = extra > 0 ? Math.ceil(extra / g) : 0
    const nvx = ncx + 2 * e, nvy = ncy + 2 * e
    const campo = est.campo(c)
    const V = new Float32Array(nvx * nvy)
    let mn = Infinity, mx = -Infinity
    for (let j = 0; j < nvy; j++) {
      for (let i = 0; i < nvx; i++) {
        const v = campo(((i - e + 0.5) * g) / U, ((j - e + 0.5) * g) / U)
        V[j * nvx + i] = v
        if (i >= e && i < e + ncx && j >= e && j < e + ncy) {
          if (v < mn) mn = v
          if (v > mx) mx = v
        }
      }
    }
    const B = 6
    const grupos = []
    for (let k = 0; k < B; k++) grupos.push([])
    for (let j = 0; j < nvy; j++) {
      for (let i = 0; i < nvx; i++) {
        const t = limita((V[j * nvx + i] - mn) / (mx - mn || 1), 0, 1)
        grupos[limita(Math.floor(t * B), 0, B - 1)].push(i - e, j - e)
      }
    }
    const op = P.opacidade
    const pulso = A && A.pulso
    // cada faixa de tom cintila desfasada das outras
    const fecha = (o, k) => (pulso
      ? '>' + animAttr('fill-opacity', [n3(o), n3(o * (1 - pulso.k)), n3(o)], pulso.t, (k / B) * pulso.t) + '</path>'
      : '/>')
    let corpo = ''
    grupos.forEach((pts, k) => {
      if (!pts.length) return
      const t = k / (B - 1)
      let d = ''
      if (est.forma === 'ponto') {
        if (k === 0) return
        const r = r1(g * 0.5 * (0.12 + 0.82 * t) * P.largura)
        for (let n = 0; n < pts.length; n += 2) {
          const cx = r1((pts[n] + 0.5) * g), cy = r1((pts[n + 1] + 0.5) * g)
          d += 'M' + r1(cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + r1(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + r1(-2 * r) + ' 0'
        }
        const o = +(op * (0.4 + 0.55 * t)).toFixed(3)
        corpo += "<path d='" + d + "' fill='" + rgbStr(pal.linha) + "' fill-opacity='" + o + "'" + fecha(o, k)
      } else {
        const lado = r1(Math.max(1, g - Math.max(1, P.largura * 1.5)))
        const fol = (g - lado) / 2
        for (let n = 0; n < pts.length; n += 2) {
          d += 'M' + r1(pts[n] * g + fol) + ' ' + r1(pts[n + 1] * g + fol) + 'h' + lado + 'v' + lado + 'h' + -lado + 'z'
        }
        const o = +(op * (0.07 + 0.55 * t)).toFixed(3)
        corpo += "<path d='" + d + "' fill='" + rgbStr(mistura(pal.suave, pal.linha, t)) + "' fill-opacity='" + o + "'" + fecha(o, k)
      }
    })
    if (A) corpo = envolver(corpo, A.mov)
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'>" + corpo + '</svg>'
  }

  // Modo "malha": manchas de cor difusas (gradientes radiais), sem linhas.
  function blobsAurora(P, c, pal) {
    const hsl = rgb2hsl(pal.linha)
    const s = limita(Math.max(hsl.s, 0.6), 0, 1)
    const l = pal.escuro ? limita(hsl.l, 0.42, 0.6) : 0.7
    const offs = [0, 42, -48, 95, 150]
    const a0 = (pal.escuro ? 0.5 : 0.42) * P.opacidade
    return offs.map((o, k) => {
      const px = r1(limita(0.5 + c.r.perlin(k * 3.7 + 0.6, 1.9) * 0.9, 0.05, 0.95) * 100)
      const py = r1(limita(0.5 + c.r.perlin(k * 2.9 + 4.1, 7.3) * 0.9, 0.05, 0.95) * 100)
      const rx = r1(limita((32 + 22 * (c.r.perlin(k * 1.9 + 2.2, 5.5) + 0.7)) * c.escala, 15, 95))
      const ry = r1(limita(rx * (0.8 + 0.5 * (c.r.perlin(k * 4.3 + 1.1, 3.1) + 0.7)), 15, 95))
      const col = hsl2rgb(hsl.h + o + P.angulo, s, l)
      return { k, px, py, rx, ry, col, a0 }
    })
  }

  function camadasAurora(P, c, pal) {
    return blobsAurora(P, c, pal).map(b =>
      'radial-gradient(ellipse ' + b.rx + '% ' + b.ry + '% at ' + b.px + '% ' + b.py + '%, ' +
        rgba(b.col, b.a0) + ' 0%, ' + rgba(b.col, b.a0 * 0.45) + ' 38%, transparent 72%)')
  }

  // Versão animada: as mesmas manchas, em SVG. Cada uma deriva (trajectória própria) e/ou pulsa;
  // rotate / breathe actuam sobre o conjunto. No instante 0 coincide com a versão CSS.
  function svgAurora(P, c, pal, W, H, A) {
    const q = P.animQtd, vel = P.animVel
    const TX = [26, 33, 40, 47, 54], TY = [37, 29, 43, 33, 41], TP = [14, 19, 16, 22, 17]
    let defs = ''
    let corpo = ''
    blobsAurora(P, c, pal).forEach(b => {
      const id = 'a' + b.k
      const cor = rgbStr(b.col)
      defs += "<radialGradient id='" + id + "'>" +
        "<stop offset='0' stop-color='" + cor + "' stop-opacity='" + n3(b.a0) + "'/>" +
        "<stop offset='0.38' stop-color='" + cor + "' stop-opacity='" + n3(b.a0 * 0.45) + "'/>" +
        "<stop offset='0.72' stop-color='" + cor + "' stop-opacity='0'/></radialGradient>"
      let el = "<ellipse rx='" + r1((b.rx / 100) * W) + "' ry='" + r1((b.ry / 100) * H) + "' fill='url(#" + id + ")'"
      el += A.pulso
        ? '>' + animAttr('opacity', [1, n3(1 - A.pulso.k), 1], TP[b.k] / vel, b.k * 3.1) + '</ellipse>'
        : '/>'
      if (A.drift) {
        const ax = (0.07 + 0.015 * b.k) * W * q, ay = (0.08 + 0.012 * b.k) * H * q
        el = '<g>' + animTransf('translate', osc(ax, v => r1(v) + ' 0'), TX[b.k] / vel, true) +
          '<g>' + animTransf('translate', osc(ay, v => '0 ' + r1(v)), TY[b.k] / vel, true) + el + '</g></g>'
      }
      corpo += "<g transform='translate(" + r1((b.px / 100) * W) + ' ' + r1((b.py / 100) * H) + ")'>" + el + '</g>'
    })
    corpo = envolver(corpo, A.mov)
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'><defs>" +
      defs + '</defs>' + corpo + '</svg>'
  }

  // Modo "cubo": cubos isométricos sobre riscas diagonais. O mosaico é um <pattern> que
  // se repete para sempre, por isso a animação (SMIL no patternTransform) nunca descobre
  // margens — nem precisa de área extra. Geometria e cores fiéis ao componente original.
  function cubosSvg(P, W, H, A) {
    const s = 30 * P.escala // meia-largura do cubo (original: 30px)
    const k = s / 30
    const defs =
      "<linearGradient id='bz-cb-d' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#232526'/><stop offset='1' stop-color='#414345'/></linearGradient>" +
      "<linearGradient id='bz-cb-m' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#4b6cb7'/><stop offset='1' stop-color='#182848'/></linearGradient>" +
      "<linearGradient id='bz-cb-l' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='#a8edea'/><stop offset='1' stop-color='#fed6e3'/></linearGradient>"
    const cubo = (x, y) =>
      "<g transform='translate(" + r1(x) + ' ' + r1(y) + ")'>" +
      "<path d='M" + r1(-s) + ' 0L0 ' + r1(s / 2) + 'L0 ' + r1(s * 37 / 30) + 'L' + r1(-s) + ' ' + r1(s * 22 / 30) + "Z' fill='url(#bz-cb-d)'/>" +
      "<path d='M0 " + r1(s / 2) + 'L' + r1(s) + ' 0L' + r1(s) + ' ' + r1(s * 22 / 30) + 'L0 ' + r1(s * 37 / 30) + "Z' fill='url(#bz-cb-m)'/>" +
      "<path d='M0 " + r1(-s / 2) + 'L' + r1(s) + ' 0L0 ' + r1(s / 2) + 'L' + r1(-s) + " 0Z' fill='url(#bz-cb-l)'/></g>"
    // deslize para cima e volta (original: translateY(-20%) scale(1.02) rotate(1deg), 18s linear alternate)
    const dur = 18 / P.animVel, q = P.animQtd
    let anim = ''
    if (A && A.drift) {
      anim += "<animateTransform attributeName='patternTransform' type='translate' additive='sum' values='0 0;0 " + r1(-0.4 * H * q) + ";0 0' keyTimes='0;0.5;1' calcMode='linear' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
    }
    if (A && A.breathe) {
      anim += "<animateTransform attributeName='patternTransform' type='scale' additive='sum' values='1;" + n3(1 + 0.02 * q) + ";1' keyTimes='0;0.5;1' calcMode='linear' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
    }
    if (A && A.rotate) {
      anim += "<animateTransform attributeName='patternTransform' type='rotate' additive='sum' values='0;" + r1(q) + ";0' keyTimes='0;0.5;1' calcMode='linear' dur='" + r1(dur) + "s' repeatCount='indefinite'/>"
    }
    const mosaico =
      "<pattern id='bz-cb-p' patternUnits='userSpaceOnUse' width='" + r1(2 * s) + "' height='" + r1(52 * k) + "'>" +
      anim + cubo(0, 15 * k) + cubo(2 * s, 15 * k) + '</pattern>'
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "' opacity='" + n3(P.opacidade) + "'>" +
      '<defs>' + defs + '</defs>' + mosaico +
      "<rect width='" + W + "' height='" + H + "' fill='url(#bz-cb-p)'/>" +
      '</svg>'
  }

  // Modo "estrelas": campo de estrelas em 3 camadas (1/2/3px) que sobem continuamente,
  // cada uma à sua velocidade (50s/100s/150s por ciclo — parallax, como no original).
  // Cada camada é desenhada duas vezes e desliza exactamente um ciclo: o loop é perfeito.
  // pulse faz as estrelas cintilarem em grupos desfasados.
  function estrelasSvg(P, pal, W, H, A) {
    const dens = ((W * H) / 4e6) * (P.niveis / 80) // 1 = campo original (1000 estrelas / 2000×2000)
    const CAMADAS = [
      { r: 0.5, dur: 50, peso: 700 },
      { r: 1, dur: 100, peso: 200 },
      { r: 1.5, dur: 150, peso: 100 }
    ]
    const cor = rgbStr(pal.linha)
    let semente = (Math.abs(Math.round(P.seed)) || 1) % 233280
    const rnd = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280 }
    const B = A && A.pulso ? 4 : 1
    const o = +limita(P.opacidade, 0, 1).toFixed(3)
    let corpo = ''
    CAMADAS.forEach(L => {
      const n = Math.max(6, Math.round(dens * L.peso))
      const rr = r1(L.r * P.largura * P.escala)
      const buckets = []
      for (let k = 0; k < B; k++) buckets.push('')
      for (let i = 0; i < n; i++) {
        const x = r1(rnd() * W), y = r1(rnd() * H)
        buckets[i % B] += 'M' + r1(x - rr) + ' ' + y + 'a' + rr + ' ' + rr + ' 0 1 0 ' + r1(2 * rr) + ' 0a' + rr + ' ' + rr + ' 0 1 0 ' + r1(-2 * rr) + ' 0'
      }
      let dentro = ''
      buckets.forEach((d, k) => {
        if (!d) return
        const tw = A && A.pulso
          ? '>' + animAttr('fill-opacity', [o, n3(o * (1 - A.pulso.k)), o], A.pulso.t, (k / B) * A.pulso.t) + '</path>'
          : '/>'
        dentro += "<path d='" + d + "' fill='" + cor + "' fill-opacity='" + o + "'" + tw +
          "<path d='" + d + "' fill='" + cor + "' fill-opacity='" + o + "' transform='translate(0 " + r1(H) + ")'" + tw
      })
      corpo += A && A.drift
        ? '<g>' + "<animateTransform attributeName='transform' type='translate' values='0 0;0 " + r1(-H) + "' keyTimes='0;1' calcMode='linear' dur='" + r1(L.dur / P.animVel) + "s' repeatCount='indefinite'/>" + dentro + '</g>'
        : '<g>' + dentro + '</g>'
    })
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'>" + corpo + '</svg>'
  }

  // ---------------------------------------------------------------- gerador
  // opts.animar === false força a versão estática (o motor usa-o p.ex. com prefers-reduced-motion).
  function gerar(P, W, H, opts) {
    const est = ESTILOS[P.estilo]
    const U = Math.max(360, Math.max(W, H))
    const passo = limita(Math.max(W, H) / 100, 9, 20)
    const modo = est.modo || 'linhas'

    const cxp = P.centro[0] * W, cyp = P.centro[1] * H
    const q = P.animQtd
    const anim = !opts || opts.animar !== false ? (q > 0 ? P.anim || [] : []) : []
    const animado = anim.length > 0
    const tem = t => anim.indexOf(t) >= 0

    // movimento: amplitudes em px, períodos em s (divididos pela velocidade)
    const mov = {}
    let extra = 0 // área extra gerada em volta, para o movimento nunca “descobrir” margens
    if (animado) {
      const mx = Math.max(W, H)
      if (tem('drift') && modo !== 'malha') {
        mov.drift = { ax: 0.06 * mx * q, ay: 0.05 * mx * q, tx: 46 / P.animVel, ty: 61 / P.animVel }
        extra += Math.max(mov.drift.ax, mov.drift.ay)
      }
      if (tem('rotate')) {
        const R = Math.max(Math.hypot(cxp, cyp), Math.hypot(W - cxp, cyp), Math.hypot(cxp, H - cyp), Math.hypot(W - cxp, H - cyp))
        mov.rotate = { ang: 5 * q, t: 64 / P.animVel, cx: cxp, cy: cyp }
        if (modo !== 'malha') extra += R * rad(5 * q)
      }
      if (tem('breathe')) mov.breathe = { s: 0.07 * q, t: 28 / P.animVel, cx: cxp, cy: cyp }
      // múltiplo do passo da malha: os vértices coincidem com os da versão estática
      extra = Math.ceil(Math.min(extra, 0.45 * mx) / passo) * passo
    }
    const pulso = animado && tem('pulse') ? { k: limita(0.6 * q, 0, 0.92), t: (modo === 'grade' ? 6 : 9) / P.animVel } : null
    const A = animado ? { mov, pulso, drift: tem('drift'), rotate: tem('rotate'), breathe: tem('breathe') } : null

    const m = passo * 2 + extra
    const ox = -m, oy = -m
    const nx = Math.ceil((W + 2 * m) / passo) + 1
    const ny = Math.ceil((H + 2 * m) / passo) + 1

    const c = {
      W: W / U, H: H / U, cx: cxp / U, cy: cyp / U,
      r: criarRuido(P.seed), escala: P.escala, angulo: P.angulo, d2: 1
    }
    c.d2 = Math.max(
      Math.pow(c.cx, 2) + Math.pow(c.cy, 2),
      Math.pow(c.W - c.cx, 2) + Math.pow(c.cy, 2),
      Math.pow(c.cx, 2) + Math.pow(c.H - c.cy, 2),
      Math.pow(c.W - c.cx, 2) + Math.pow(c.H - c.cy, 2)
    ) || 1

    const pal = paleta(P)
    const op = P.opacidade
    let svg = ''
    let svgAnimado = false

    if (modo === 'grade') {
      svg = gradeSvg(est, P, c, W, H, U, pal, extra, A)
    } else if (modo === 'malha') {
      if (animado) {
        svg = svgAurora(P, c, pal, W, H, A)
        svgAnimado = true
      }
    } else if (modo === 'cubo') {
      svg = cubosSvg(P, W, H, A)
      svgAnimado = animado
    } else if (modo === 'estrelas') {
      svg = estrelasSvg(P, pal, W, H, A)
      svgAnimado = animado
    } else if (modo === 'linhas') {
      const campo = est.campo(c)
      const F = new Float32Array(nx * ny)
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) F[j * nx + i] = campo((ox + i * passo) / U, (oy + j * passo) / U)
      }

      let niveis = est.niveis(c, P.niveis)
      // área extra: continua a série de níveis (em número par à frente, para manter a alternância
      // principal / suave) nos estilos em que os níveis dependem do tamanho do elemento
      if (extra > 0 && est.estende && niveis.length >= 2) {
        const delta = niveis[1] - niveis[0]
        if (delta > 0) {
          let k = Math.ceil((extra * 1.5) / U / delta)
          k = Math.min(k + (k % 2), 60)
          const ini = niveis[0], fim = niveis[niveis.length - 1]
          const antes = [], depois = []
          for (let i = k; i >= 1; i--) antes.push(ini - i * delta)
          for (let i = 1; i <= k; i++) depois.push(fim + i * delta)
          niveis = antes.concat(niveis, depois)
        }
      }
      const minD = passo * 1.5
      const principais = []
      const suaves = []
      niveis.forEach((nv, k) => {
        const alvo = k % 2 === 0 ? principais : suaves
        contornos(F, nx, ny, ox, oy, passo, nv).forEach(ct => {
          if (ct.pts.length < 6) return
          const d = caminho(ct.pts, ct.fechada, minD)
          if (d) alvo.push(d)
        })
      })

      // pv: valores de opacidade animados (pulse) — alternados: as principais esbatem quando as suaves reforçam
      const traco = (ds, cor, o, w, pv) =>
        ds.length
          ? "<path d='" + ds.join('') + "' fill='none' stroke='" + rgbStr(cor) + "' stroke-opacity='" + +o.toFixed(3) +
            "' stroke-width='" + +w.toFixed(2) + "' stroke-linecap='round' stroke-linejoin='round'" +
            (pv ? '>' + animAttr('stroke-opacity', pv, pulso.t) + '</path>' : '/>')
          : ''
      const o1 = 0.74 * op, o2 = 0.52 * op
      const pv1 = pulso ? [n3(o1), n3(o1 * (1 - pulso.k)), n3(o1)] : null
      const pv2 = pulso ? [n3(o2), n3(Math.min(1, o2 * (1 + 1.1 * pulso.k))), n3(o2)] : null
      let corpo = traco(suaves, pal.suave, o2, 0.9 * P.largura, pv2) + traco(principais, pal.linha, o1, P.largura, pv1)
      if (A) corpo = envolver(corpo, mov)
      svg =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + W + ' ' + H + "' width='" + W + "' height='" + H + "'>" +
        corpo +
        '</svg>'
    }

    // fundo em camadas (por cima → por baixo): linhas, brilho difuso, gradiente radial, linear
    const pc = r1(P.centro[0] * 100) + '% ' + r1(P.centro[1] * 100) + '%'
    const b = pal.base
    const camadas = []
    if (svg) {
      const uri = 'data:image/svg+xml,' + svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')
      camadas.push('url("' + uri + '")')
    }
    if (modo === 'malha' && !svgAnimado) Array.prototype.push.apply(camadas, camadasAurora(P, c, pal))
    if (modo === 'cubo') {
      // riscas diagonais do palco (o original: repeating-linear-gradient 135deg)
      const kk = P.escala
      const faixa = r1(60 * kk)
      const aC = mistura(b, BRANCO, 0.05)
      const cC = mistura(b, BRANCO, 0.18)
      camadas.push('repeating-linear-gradient(' + r1(135 + P.angulo) + 'deg, ' + rgba(aC) + ' 0px, ' + rgba(aC) + ' ' + faixa + 'px, ' + rgba(aC, 0.6) + ' ' + r1(faixa + 10 * kk) + 'px, ' + rgba(cC) + ' ' + r1(faixa + 70 * kk) + 'px)')
    } else if (modo === 'estrelas') {
      // aqui o brilho é o gradiente radial vindo de baixo (o “glow” do céu)
      if (pal.glow) camadas.push('radial-gradient(ellipse at ' + pc + ', ' + rgba(pal.glow) + ' 0%, ' + rgba(b) + ' 100%)')
    } else if (pal.glow) {
      const g = pal.glow
      camadas.push(
        'radial-gradient(ellipse 72% 82% at ' + pc + ', ' + rgba(escala(g, 1.25), 0.3) + ' 0%, ' + rgba(escala(g, 0.85), 0.13) + ' 32%, transparent 65%)',
        'radial-gradient(ellipse 48% 65% at ' + pc + ', ' + rgba(g, 0.92) + ' 0%, ' + rgba(mistura(b, g, 0.65), 0.78) + ' 34%, ' +
          rgba(mistura(b, g, 0.3), 0.52) + ' 66%, ' + rgba(b, 0.96) + ' 100%)'
      )
      camadas.push('linear-gradient(115deg, ' + rgba(b) + ' 0%, ' + rgba(mistura(b, g, 0.15)) + ' 48%, ' + rgba(b) + ' 100%)')
    } else {
      camadas.push('linear-gradient(115deg, ' + rgba(b) + ' 0%, ' + rgba(mistura(b, pal.linha, 0.1)) + ' 48%, ' + rgba(b) + ' 100%)')
    }
    const css =
      'background-image:' + camadas.join(',') + ';background-size:100% 100%;background-repeat:no-repeat;background-color:' + rgba(b)
    return { svg, css, paleta: pal, parametros: P, animado }
  }

  // ---------------------------------------------------------------- motor (DOM)
  function iniciarMotor(cfg, prefixo, presets) {
    const reToken = new RegExp('(^|:)' + esc(prefixo + 'custom-bg') + '(-[a-z-]+)?(\\[|!?$)')
    const alvos = new Map() // elemento → { id, tag, ro, t, w, h, chave, pronto }
    const nossos = new WeakSet()
    const cache = new Map() // chave → css
    const MARGEM = 200 // px: o fundo volta a animar um pouco antes de entrar no ecrã
    let contador = 0
    let agendado = false

    // as variáveis não herdam: senão todos os filhos de um custom-bg seriam alvos
    let registada = false
    try {
      if (global.CSS && typeof global.CSS.registerProperty === 'function') {
        VARS.forEach(v => {
          try {
            global.CSS.registerProperty({ name: '--cbg-' + v, syntax: '*', inherits: false })
          } catch (e) {
            if (!(e && e.name === 'InvalidModificationError')) throw e
          }
        })
        registada = true
      }
    } catch (e) {
      registada = false
    }

    function lerVars(el) {
      const cs = getComputedStyle(el)
      const o = {}
      let algum = false
      VARS.forEach(v => {
        const x = cs.getPropertyValue('--cbg-' + v).trim()
        if (x) {
          o[v] = x
          algum = true
        }
      })
      return algum ? o : null
    }

    function ehAlvo(el) {
      let ok = false
      for (const c of el.classList) {
        if (reToken.test(c)) {
          ok = true
          break
        }
      }
      return ok && !!lerVars(el)
    }

    const sel = a => '[data-cbg="' + a.id + '"]'

    // prefers-reduced-motion: fundo estático (a menos que respeitarMovimentoReduzido: false)
    const mqReduz = typeof global.matchMedia === 'function' ? global.matchMedia('(prefers-reduced-motion: reduce)') : null
    const reduzido = () => cfg.respeitarMovimentoReduzido !== false && !!(mqReduz && mqReduz.matches)
    const aoMudarReduzido = () => {
      alvos.forEach(a => { a.chave = '' })
      agendar()
    }
    if (mqReduz) {
      if (mqReduz.addEventListener) mqReduz.addEventListener('change', aoMudarReduzido)
      else if (mqReduz.addListener) mqReduz.addListener(aoMudarReduzido)
    }

    function noEcra(el) {
      const r = el.getBoundingClientRect()
      const vh = global.innerHeight || document.documentElement.clientHeight
      const vw = global.innerWidth || document.documentElement.clientWidth
      return r.bottom > -MARGEM && r.top < vh + MARGEM && r.right > -MARGEM && r.left < vw + MARGEM
    }

    function actualizar(el, a) {
      const w = Math.round(el.offsetWidth / 8) * 8
      const h = Math.round(el.offsetHeight / 8) * 8
      if (!w || !h) return
      const vars = lerVars(el)
      if (!vars) return
      const P0 = resolver(vars, presets, true)
      const animar = P0.anim.length > 0 && P0.animQtd > 0 && !reduzido() && a.visivel !== false
      const chave = JSON.stringify(vars) + '|' + w + 'x' + h + (animar ? '|anim' : '')
      if (chave === a.chave) return
      a.chave = chave
      let css = cache.get(chave)
      if (!css) {
        css = gerar(resolver(vars, presets), w, h, { animar }).css
        cache.set(chave, css)
        if (cache.size > 32) cache.delete(cache.keys().next().value)
      }
      const pseudo = cfg.pseudo === 'after' ? '::after' : '::before'
      a.tag.textContent =
        ':where(' + sel(a) + '){position:relative;isolation:isolate}' +
        sel(a) + pseudo + '{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;' + css + '}'
    }

    function registar(el) {
      const a = { id: ++contador, tag: document.createElement('style'), ro: null, io: null, t: 0, chave: '', pronto: false, visivel: true }
      a.tag.setAttribute('data-breeze', 'backgrounds')
      nossos.add(a.tag)
      el.setAttribute('data-cbg', String(a.id))
      document.head.appendChild(a.tag)
      alvos.set(el, a)
      // só anima enquanto está (quase) visível; o estado inicial é lido já, para não gerar duas vezes
      if (typeof IntersectionObserver !== 'undefined') {
        a.visivel = noEcra(el)
        a.io = new IntersectionObserver(es => {
          const v = es[es.length - 1].isIntersecting
          if (v === a.visivel) return
          a.visivel = v
          actualizar(el, a)
        }, { rootMargin: MARGEM + 'px' })
        a.io.observe(el)
      }
      if (typeof ResizeObserver !== 'undefined') {
        a.ro = new ResizeObserver(() => {
          if (!a.pronto) {
            a.pronto = true
            actualizar(el, a)
            return
          }
          clearTimeout(a.t)
          a.t = setTimeout(() => actualizar(el, a), 90)
        })
        a.ro.observe(el)
      } else {
        actualizar(el, a)
      }
    }

    function remover(el) {
      const a = alvos.get(el)
      if (!a) return
      if (a.ro) a.ro.disconnect()
      if (a.io) a.io.disconnect()
      clearTimeout(a.t)
      a.tag.remove()
      alvos.delete(el)
      if (el.isConnected) el.removeAttribute('data-cbg')
    }

    function varrer() {
      agendado = false
      if (!document.body) return
      document.querySelectorAll('[class*="custom-bg"]').forEach(el => {
        const a = alvos.get(el)
        const activo = ehAlvo(el)
        if (activo && !a) registar(el)
        else if (activo && a) actualizar(el, a)
        else if (!activo && a) remover(el)
      })
      alvos.forEach((_, el) => {
        if (!el.isConnected) remover(el)
      })
    }

    const nosso = n => (n.nodeType === 1 && nossos.has(n)) || n.nodeType === 3
    // rAF duplo: dá tempo ao Breeze de inserir as regras das classes novas
    function agendar(mutacoes) {
      if (mutacoes && mutacoes.length && mutacoes.every(m =>
        (m.target.nodeType === 1 && nossos.has(m.target)) ||
        (m.type === 'childList' && [].every.call(m.addedNodes, nosso) && [].every.call(m.removedNodes, nosso)))) return
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
    global.addEventListener('resize', () => agendar(), { passive: true }) // variantes md:/lg: …
    global.addEventListener('load', () => agendar())
    // variantes de estado (hover:custom-bg-color[…], focus:…)
    ;['mouseover', 'mouseout', 'focusin', 'focusout'].forEach(ev =>
      document.addEventListener(ev, e => {
        if (e.target && e.target.closest && e.target.closest('[class*=":custom-bg"]')) agendar()
      }, true))
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => agendar())
    else agendar()

    return { varrer }
  }

  // ----------------------------------------------------------------- plugin
  function criar(opcoes) {
    const cfg = Object.assign({}, PADROES, opcoes)
    const presets = Object.assign({}, cfg.presets)
    let motor = null
    return {
      nome: 'backgrounds',
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
        if (!motor) motor = iniciarMotor(cfg, prefixo, presets)

        // use() depois do init: reprocessa os elementos já existentes
        if (global.BreezeCSS && typeof global.BreezeCSS.processar === 'function') {
          Promise.resolve().then(() => global.BreezeCSS.processar())
        }
      },
      actualizar() {
        if (motor) motor.varrer()
      },
      registar(nome, preset) {
        presets[nome] = preset
        if (motor) motor.varrer()
      },
      gerar(bruto, w, h, opts) {
        return gerar(resolver(bruto, presets), Math.max(1, Math.round(w || 1280)), Math.max(1, Math.round(h || 720)), opts)
      },
      estilos() {
        return Object.keys(Object.assign({}, PRESETS_BUILTIN, presets))
      }
    }
  }

  const plugin = Object.assign(criar(), { criar, versao: VERSAO })
  global.BreezeBackgrounds = plugin
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
        plugins = true,
        apenasPlugin = null,
        descarregar = true,
      } = opcoes;

      // ── 1. Fonte de verdade: CSS real presente no DOM ────────────
      const regras = Renderer.obterRegrasDOMAtual();

      if (regras.length === 0 && !plugins) {
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

      // ── 4. Recolher CSS autónomo injectado pelos plugins ─────────
      // Inclui @keyframes, @media, @supports e estilos por elemento
      // (por exemplo, backgrounds). Nunca recolhe scripts ou lógica JS.
      const normalizar = s => String(s || '').trim().toLowerCase();
      const aliases = {
        preloader: 'preloader', glass: 'glass', dividers: 'dividers',
        progress: 'progress', scrollbar: 'scrollbar', backgrounds: 'backgrounds'
      };
      const descobrirPlugin = tag => {
        const data = normalizar(tag.getAttribute('data-breeze'));
        if (data && data !== 'v2') return aliases[data] || data;
        if (tag.hasAttribute('data-breeze-preloader-css')) return 'preloader';
        const id = normalizar(tag.id);
        for (const chave of Object.keys(aliases)) {
          if (id.includes('breeze-' + chave)) return chave;
        }
        return null;
      };
      const escolhidos = plugins === true ? null :
        Array.isArray(plugins) ? new Set(plugins.map(normalizar)) :
        typeof plugins === 'string' ? new Set([normalizar(plugins)]) :
        plugins ? null : new Set();
      const alvo = apenasPlugin ? normalizar(apenasPlugin) : null;
      const folhasPlugins = [];
      if (typeof document !== 'undefined' && plugins !== false) {
        for (const tag of document.querySelectorAll('style')) {
          const plugin = descobrirPlugin(tag);
          if (!plugin || (alvo && plugin !== alvo) ||
              (escolhidos && !escolhidos.has(plugin))) continue;
          const css = tag.textContent ||
            (tag.sheet ? Array.from(tag.sheet.cssRules || [], r => r.cssText).join('\n') : '');
          if (css.trim()) folhasPlugins.push({ plugin, css });
        }
      }
      const regrasFinais = alvo ? [] : regrasSubstituidas;

      // ── 5. Montar conteúdo final ─────────────────────────────────
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
        conteudo += regrasFinais
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
        conteudo += regrasFinais.join("\n") + "\n";
      }

      for (const folha of folhasPlugins) {
        if (!minificar) conteudo += `\n/* Plugin: ${folha.plugin} */\n`;
        // Não minificar CSS arbitrário dos plugins com regex: pode quebrar
        // strings, data URIs, gradients e @keyframes.
        conteudo += folha.css + '\n';
      }

      // ── 6. Download ──────────────────────────────────────────────
      if (descarregar && typeof document !== "undefined" && typeof URL !== "undefined") {
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

          // Propriedade CSS individual `translate` (independente de `transform`).
          // Uso: translate[10px_20px]  ->  translate: 10px 20px
          // Propositadamente FORA de transformPrefixos: não é combinada no
          // `transform`, logo coexiste com rotate/scale/translate-x/translate-y.
          translate: "translate",

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
          "transition-translate":
            "transition-property: translate; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
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
    exportarPlugin: (nome, o = {}) => Engine.exportar({ ...o, apenasPlugin: nome, plugins: [nome] }),
    exportarPlugins: (o = {}) => {
      const nomes = ['glass', 'dividers', 'progress', 'scrollbar', 'backgrounds', 'preloader'];
      return Object.fromEntries(nomes.map(nome => [nome, Engine.exportar({ ...o, apenasPlugin: nome, plugins: [nome], nome: (o.nome || 'breeze') + '-' + nome })]));
    },

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