# BreezeCSS 2.3.0 — BREEZE.DOC.AI.md

> **Referência técnica para agentes de IA, geradores de código e assistentes de programação.**
> **Fonte de verdade consultada:** `vendor/breeze.bundle.js` do pacote BreezeCSS 2.3.0 + BreezeCLI 1.0.3 (ficheiros de distribuição fornecidos pelo projecto). A documentação HTML SPA é material complementar.
> **Plugins no bundle:** BreezeGlass **1.0.0**, BreezeDividers **1.2.0**, BreezeProgress **1.0.0**, BreezeScrollbar **1.0.0**, BreezePreloader **1.6.0**, BreezeBackgrounds **1.5.0**.
> **Regra principal:** não inferir API de Tailwind. Usar os prefixos/classes desta referência ou confirmar directamente no bundle da versão instalada. O bundle actual, não os módulos históricos `core/`, é a referência do motor.

---

## 0. Contrato de geração — ler antes de produzir HTML

1. **Breeze é um motor CSS de valores explícitos**, com duas estratégias: runtime (JIT no browser) ou CSS compilado pelo BreezeCLI. Não é apenas um utilitário para protótipos, nem uma cópia de Tailwind.
2. **Classes arbitrárias:** `p[16px]`, `w[100%]`, `bg[#003]`, `text[#fff]`, `text-size[18px]`. Não gerar `p-4`, `w-full`, `h-screen`, `text-gray-500`, `bg-blue-500` ou outras classes de escala Tailwind.
3. **Unidades:** dimensões precisam de unidade CSS (`p[16px]`, não `p[16]`). Valores sem unidade são válidos quando a propriedade permite: `opacity[0.5]`, `z[10]`, `cols[3]`, `fw[700]`, `scale[1.1]`.
4. **Underscore:** `_` é convertido em espaço dentro de `[...]`, incluindo `calc()`, `rgb()`, gradientes; é preservado em `url()`, `var()`, `env()`, `attr()`, `src()`.
5. **`text[...]` define cor; `text-size[...]` define tamanho.** `text[center]` não alinha; usa `text-center`.
6. **Variantes 2.3.0:** `focus-within`, `group-hover`, `group-focus-within`, `peer-hover/focus/checked/disabled/invalid`, `max-*`, `motion-reduce`, `motion-safe`, `print` são nativas, além de `hover`, `focus`, `dark`, etc. **Não** inventar `peer-placeholder-shown`, `group/foo`, `aria-*` ou `data-*`.
7. **Cascata:** a versão 2.3.0 ordena regras base, `max-*` decrescente, `min-*` crescente, movimento e impressão. A antiga regra «a ordem das classes determina a precedência entre breakpoints» está **obsoleta**. Especificidade CSS e `!important` continuam válidos.
8. **Seis plugins no bundle, mas não activados automaticamente:** registar explicitamente em `BreezeConfig.plugins` ou com `BreezeCSS.use(...)` após init. `glass`, `progress`, `preloader`, `custom-bg[...]` exigem o plugin correspondente.
9. **`transition[...]` não existe no mapa de prefixos:** usar `transition duration[200ms]`, `ease[ease]` ou `transition-prop[all_0.2s_ease]`.
10. **`prefix: 'bz-'` foi corrigido:** prefixa também processadores e transforms; por exemplo `hover:bz-blur[4px]`, `bz-cols[3]`, `bz-rotate[45deg]`. Não prefixar os qualificadores (`hover:`) nem os marcadores relacionais `.group`/`.peer`.
11. **Acessibilidade:** `scrollSmooth` automático só actua sob `prefers-reduced-motion: no-preference`. `motion-reduce:` e `motion-safe:` não requerem JavaScript adicional.
12. **Não assumir CSS novo no runtime compilado:** JSX/Vue/Angular/Svelte podem ser analisados estaticamente pelo CLI, mas classes construídas dinamicamente precisam de safelist ou novo build.

---

## 1. Distribuição e versões

| Recurso | Valor |
|---|---|
| Motor actual | BreezeCSS **2.3.0** |
| Bundle IIFE | `breeze.bundle.js` — ficheiro único para `<script src>` |
| CDN do projecto | `https://cdn.pedrodeoliveira.me/js/breeze.bundle.js` (confirmar publicação da versão 2.3.0 antes de afirmar que a CDN a serve) |
| Repositório | https://github.com/bigptlg/breezecss |
| Documentação | https://bigptlg.github.io/breezecss/ |
| CLI | `breezecss-cli` **1.0.3** · Node.js ≥18 · zero dependências npm de runtime |
| Motor do CLI | `vendor/breeze.bundle.js` e `breeze_bundle.js` no pacote de distribuição |
| Licença | MIT |

**Não misturar versões:** BreezeCSS 2.3.0 é a versão do motor; BreezeCLI 1.0.3 é a versão do compilador. Os seis plugins têm versões próprias.

A documentação HTML `index.html` e `cli.html` é apresentada como duas SPAs independentes, com navegação por secções sem recarregamento, URLs com `#fragmento` e histórico. **Isto é uma característica da documentação, não uma dependência de execução do BreezeCSS.**

## 2. Instalação, init e plugins

### 2.1 Runtime mínimo

```html
<script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
<div class="p[24px] bg[#0f172a] text[#fff] rounded-xl">Olá BreezeCSS</div>
```

O bundle define `window.BreezeCSS`, os seis objectos globais de plugin e agenda o auto-init em `DOMContentLoaded` se o documento ainda estiver a carregar. Se já estiver pronto, inicializa imediatamente. Em produção, recomenda-se verificar a versão efectivamente publicada na CDN.

### 2.2 Activação recomendada de plugins

```html
<!-- No <head>, carregamento síncrono, antes do DOMContentLoaded: -->
<script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
<script>
  window.BreezeConfig = {
    log: false,
    plugins: [
      BreezeGlass, BreezeDividers, BreezeProgress,
      BreezeScrollbar, BreezePreloader, BreezeBackgrounds
    ]
  };
</script>
```

Regista apenas os plugins usados. `BreezeConfig.plugins` deve existir **antes do auto-init**. Se o documento já inicializou, usa `BreezeCSS.use(BreezeGlass)` etc. Evita `BreezeCSS.add*` antes do init: o motor pode fazer uma inicialização implícita com config padrão. Não é necessário carregar scripts individuais dos plugins quando se usa o bundle completo.

Para pré-carregamento de página, `BreezePreloader.iniciar()` pode ser chamado antes do init para evitar flash, depois de o bundle definir o global. A inicialização antecipada do overlay é opcional.

### 2.3 Configuração (chaves verificadas)

| Chave | Padrão | Efeito |
|---|---|---|
| `log` | `true` | Mensagens no console (`false` silencia) |
| `debug` | `false` | Log detalhado |
| `reset` | `true` | Reset global de margin/padding e box-sizing |
| `scrollSmooth` | `true` | `scroll-behavior: smooth` apenas com `no-preference` |
| `tema` | vazio | `{ cores, espacamento, fontes }` |
| `breakpoints` | sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 px | Extensível |
| `variantes` | ver secção 6 | Selectores CSS personalizados |
| `classesFixas` | internas | Classes adicionais `{nome: 'prop: valor'}` |
| `mapaPropriedades` | interno | Prefixos arbitrários `{prefixo: 'propriedade'}` |
| `processadoresEspeciais` | internos | Processadores `(valor) => valorCSS` |
| `regrasGlobais` | reset interno | Regras globais adicionais |
| `plugins` | `[]` | Lista de objectos plugin |
| `safelist` | `[]` | Pré-gerar classes |
| `prefix` | `''` | Prefixar classes fixas, mapeamentos, processadores e transforms |

```html
<script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
<script>
  window.BreezeConfig = {
    tema: {
      cores: { primario: '#00ee99', fundo: '#0b1220' },
      espacamento: { secao: '24px' },
      fontes: { corpo: 'Inter, sans-serif' }
    },
    breakpoints: { tablet: '900px' },
    safelist: ['hidden', 'tablet:p[32px]'],
    plugins: [BreezeBackgrounds]
  };
</script>
```

**Importante:** a opção `reset: false` remove o reset; não desliga o resto do motor. `regrasGlobais` são aplicadas na inicialização quando `reset` está activo. Os valores de tema são substituídos quando o valor completo coincide com a chave (`bg[primario]`, não `border[1px_solid_primario]`).

## 3. Modelo mental e parsing

```text
[breakpoint:][max-breakpoint:][motion-...:][print:][variante:]*utilitario[!]

md:max-xl:group-hover:p[20px]
└─ mínimo 768px  └─ máximo abaixo de xl  └─ antepassado .group:hover  └─ padding
```

- Uma classe pode ser **fixa** (`flex`, `rounded-xl`), **arbitrária** (`p[20px]`) ou **componente** (`card` definido por `addComponent`).
- `!important`: `p[20px!]`, `hidden!`, `md:flex!`, `card!`.
- O parser separa qualificadores por `:` **fora** de colchetes. Qualificadores desconhecidos não são aplicados.
- A `class` de elementos inseridos depois do arranque é observada por `MutationObserver` com agrupamento por `requestAnimationFrame`.
- A cache evita recompilar classes e regras já conhecidas; os transforms de um elemento podem receber `data-breeze-id` para combinar transformações.
- Os marcadores `group` e `peer` não são classes de estilo: são âncoras usadas nos selectores CSS relacionais.

---

## 4. Prefixos arbitrários (`prefixo[valor]`)

Formato da coluna "Propriedade CSS". `✱` = o valor é transformado por processador.

### 4.1 Espaçamento e dimensões
| Prefixo | Propriedade | Exemplo |
|---|---|---|
| `m` `mt` `mr` `mb` `ml` | margin (+ lados) | `mt[24px]` |
| `mx` / `my` | `margin-inline` / `margin-block` | `mx[auto]` |
| `p` `pt` `pr` `pb` `pl` | padding (+ lados) | `p[16px]` |
| `px` / `py` | `padding-inline` / `padding-block` | `px[1rem]` |
| `gap` `gap-x` `gap-y` | `gap` / `column-gap` / `row-gap` | `gap[12px]` |
| `w` `h` | width / height | `w[100%]` `h[100vh]` |
| `min-w` `min-h` `max-w` `max-h` | min/max | `max-w[72rem]` |
| `size` | `width` **e** `height` | `size[40px]` |

### 4.2 Cor, borda, sombra, outline
| Prefixo | Propriedade | Notas |
|---|---|---|
| `bg` | `background-color` | `bg[#0f172a]`, `bg[var(--x)]`. **Não aceita gradiente** (use `bg-gradient`). |
| `text` | `color` | **cor**, não tamanho. |
| `border` | shorthand (ver abaixo) ou `border-width` | |
| `border-t` `-r` `-b` `-l` | shorthand por lado ou `border-<lado>-width` | |
| `border-color` `border-t-color` `-r-` `-b-` `-l-` | cores | |
| `border-style` `border-t-style` … | estilos | |
| `outline` | `outline` (shorthand completo) | `outline[2px_solid_#00f]` |
| `outline-color` | `outline-color` | |
| `ring` ✱ | `box-shadow: 0 0 0 <valor> currentColor` | `ring[2px]` (cor = `currentColor`/`text`). |
| `shadow` | `box-shadow` | `shadow[0_8px_24px_rgba(0,0,0,.2)]` |
| `text-shadow` | `text-shadow` | |
| `rounded` `rounded-t` `-b` `-l` `-r` | `border-radius` (lados = 2 cantos) | `rounded[12px]` |

**Shorthand de borda:** `border[1px_solid_#ccc]`, `border-b[2px_solid_red]`. O parser identifica estilo/largura/cor por tipo e emite `border-style`, `border-width`, `border-color`. **`border[1px]` sozinho só define a largura** (sem estilo a borda **não aparece**): use o shorthand completo ou combine com `solid`/`dashed`/`dotted`/`double`.

### 4.3 Tipografia
| Prefixo | Propriedade | Exemplo |
|---|---|---|
| `text-size` / `font-size` | `font-size` | `text-size[1.25rem]` |
| `leading` | `line-height` | `leading[1.6]` |
| `tracking` | `letter-spacing` | `tracking[0.05em]` |
| `font-family` | `font-family` | `font-family[Inter,sans-serif]` |
| `fw` / `font-weight` ✱ | `font-weight` | `fw[700]` ou nomes: `thin extralight light normal medium semibold bold extrabold black` → 100…900 |
| `text-stroke` | `-webkit-text-stroke` | `text-stroke[2px_#000]` |
| `text-stroke-color` / `-width` | | |

### 4.4 Posição, camadas, visual
| Prefixo | Propriedade | Exemplo |
|---|---|---|
| `top` `right` `bottom` `left` `inset` | posição | `inset[0]` |
| `z` | `z-index` | `z[50]` |
| `opacity` | `opacity` | `opacity[0.5]` |
| `aspect` ✱ | `aspect-ratio` | `aspect[video]` (=16/9), `aspect[square]` (=1/1), `aspect[photo]` (=4/3), ou `aspect[3/2]` |
| `cursor` `content` `columns` `order` | idem | `content['']` |
| `mix-blend` / `bg-blend` | `mix-blend-mode` / `background-blend-mode` | `mix-blend[difference]` |

### 4.5 Filtros (todos escrevem `filter` — ver secção 7)
| Prefixo | Resultado |
|---|---|
| `blur[4px]` ✱ | `filter: blur(4px)` |
| `brightness[1.1]` ✱ · `contrast[1.2]` ✱ · `grayscale[1]` ✱ · `saturate[1.5]` ✱ | `filter: <fn>(valor)` |
| `drop-shadow[0_2px_4px_#0004]` ✱ | `filter: drop-shadow(...)` |
| `backdrop-blur[12px]` ✱ | `backdrop-filter: blur(12px)` (sem `-webkit-`) |
| `filter[...]` | `filter` cru: `filter[blur(4px)_brightness(1.1)]` |

### 4.6 Background
| Prefixo | Propriedade |
|---|---|
| `bg-gradient` ✱ | `background-image`; se o valor não começar com `linear-/radial-/conic-gradient`, é embrulhado em `linear-gradient(...)`: `bg-gradient[to_right,#f00,#00f]` |
| `bg-image` | `background-image`: `bg-image[url(/img/a.jpg)]` |
| `bg-size` · `bg-pos` · `bg-repeat` · `bg-attach` | `background-size/position/repeat/attachment`: `bg-size[cover]` `bg-pos[center]` `bg-repeat[no-repeat]` |

### 4.7 Flex e Grid
| Prefixo | Propriedade |
|---|---|
| `grow[1]` / `flex-g` | `flex-grow` |
| `shrink[0]` | `flex-shrink` |
| `basis[200px]` / `flex-basis[...]` | `flex-basis` |
| `order[2]` | `order` |
| `cols[3]` ✱ | `grid-template-columns`: dígitos → `repeat(N, 1fr)`; senão cru: `cols[200px_1fr]` / `cols[repeat(auto-fit,minmax(240px,1fr))]` |
| `rows[...]` | `grid-template-rows` (cru) |
| `col-span[2]` ✱ | `grid-column: span 2 / span 2` |
| `row-span[2]` ✱ | `grid-row: span 2 / span 2` |

### 4.8 Transforms (combinam entre si — secção 7)
`rotate[45deg]` · `scale[1.1]` · `scale-x[...]` · `scale-y[...]` · `translate-x[10px]` · `translate-y[-4px]` · `skew-x[10deg]` · `skew-y[10deg]`. A propriedade CSS individual `translate[10px_20px]` é independente e **não** entra na composição `transform`.

### 4.9 Transição e animação
| Prefixo | Propriedade | Exemplo |
|---|---|---|
| `transition-prop` | `transition` (shorthand) | `transition-prop[opacity_.3s_ease]` |
| `duration` | `transition-duration` | `duration[300ms]` |
| `delay` | `transition-delay` | `delay[100ms]` |
| `ease` | `transition-timing-function` | `ease[cubic-bezier(.4,0,.2,1)]` |
| `animate` | `animation` | `animate[meu-kf_2s_ease_infinite]` |
| `animate-delay` / `animate-duration` | `animation-delay/duration` | |

> **Não existe `transition[...]` arbitrário** no mapa actual do motor. Usa a classe fixa `transition` com `duration[..]`/`ease[..]`, ou `transition-prop[...]` para o shorthand.

### 4.10 Mask (sempre emitido com e sem `-webkit-`)
`mask[...]` · `mask-image[...]` · `mask-gradient[to_bottom,#000,transparent]` ✱ (embrulha em `linear-gradient`) · `mask-size[...]` · `mask-pos[...]`/`mask-position[...]` · `mask-repeat[...]` · `mask-mode[...]` · `mask-clip[...]` · `mask-origin[...]` · `mask-composite[...]` · `mask-border[...]`.

---

## 5. Classes fixas (sem colchetes)

**Display:** `block inline inline-block flex inline-flex grid inline-grid hidden contents table table-cell`
**Flex:** `flex-row flex-col flex-row-reverse flex-col-reverse flex-wrap flex-nowrap flex-1 flex-auto flex-none flex-grow flex-shrink flex-shrink-0`
**Alinhamento:** `justify-{start|end|center|between|around|evenly}` · `items-{start|end|center|baseline|stretch}` · `self-{auto|start|end|center|stretch}` · `place-center` · `content-{start|end|center|between|around|evenly|stretch|baseline|normal}`
**Posição:** `relative absolute fixed sticky static`
**Overflow:** `overflow-{auto|hidden|visible|scroll|clip}` · `overflow-x-{auto|hidden|clip}` · `overflow-y-{auto|hidden|clip}`
**Texto:** `text-left text-center text-right text-justify` · `uppercase lowercase capitalize` · `italic not-italic` · `underline line-through no-underline` · `truncate antialiased` · `font-{thin|light|normal|medium|semibold|bold|extrabold|black}` (note: **não existe** `font-extralight`) · `whitespace-{normal|nowrap|pre|pre-wrap|pre-line}` · `break-word break-all break-keep` · `text-wrap text-nowrap text-balance text-pretty` · `line-clamp-{1..6|none}`
**Radius:** `rounded-none rounded-sm rounded rounded-md rounded-lg rounded-xl rounded-2xl rounded-3xl rounded-full` (0 · .125rem · .25rem · .375rem · .5rem · .75rem · 1rem · 1.5rem · 9999px)
**Borda:** `solid dashed dotted double border-none`
**Sombra:** `shadow-sm shadow shadow-md shadow-lg shadow-xl shadow-2xl shadow-none shadow-inner`
**Transição:** `transition` (all, 150ms) · `transition-none transition-colors transition-opacity transition-transform transition-shadow`
**Cursor/interação:** `cursor-{pointer|default|not-allowed|wait|text|grab|grabbing}` · `pointer-events-{none|auto}` · `select-{none|text|all}` · `touch-{none|auto|pan-x|pan-y|pinch-zoom}`
**Objeto:** `object-{contain|cover|fill|none}`
**Visibilidade:** `visible invisible isolate isolation-auto`
**Blend:** `mix-blend-<modo>` e `bg-blend-<modo>`, modos: `normal multiply screen overlay darken lighten color-dodge color-burn hard-light soft-light difference exclusion hue saturation color luminosity plus-lighter plus-darker`
**Mask fixas:** `mask-none mask-{repeat|no-repeat|repeat-x|repeat-y|repeat-round|repeat-space} mask-{auto|contain|cover} mask-{center|top|bottom|left|right} mask-{alpha|luminance|match-source} mask-{add|subtract|intersect|exclude} mask-clip-{border|padding|content|none} mask-origin-{border|padding|content} mask-type-{alpha|luminance} mask-fade-{t|r|b|l}`
**Lista/resize:** `list-none list-disc list-decimal` · `resize resize-x resize-y resize-none`
**Misc:** `appearance-none outline-none will-change-transform will-change-opacity box-border box-content overscroll-{auto|contain|none} backface-{hidden|visible}`
**Animações prontas:** `animate-spin animate-ping animate-pulse animate-bounce animate-fade-in animate-slide-in`
**Scroll:** `scroll-smooth scroll-auto` · `snap-{none|x|y|both}` · `snap-{start|center|end}`
**Grid:** `col-auto row-auto col-full row-full`
**Float:** `float-{left|right|none}` · `clear-{left|right|both|none}`
**Background attach:** `bg-fixed bg-scroll bg-local`
**Acessibilidade:** `sr-only not-sr-only`

> Todas aceitam variantes/breakpoints e `!`: `md:flex`, `hover:shadow-lg`, `hidden!`.

---

## 6. Variantes, breakpoints, contextos e cascata (2.3.0)

### 6.1 Estados do próprio elemento

`hover`, `active`, `focus`, `focus-visible`, `focus-within`, `visited`, `disabled`, `checked`, `first` (`:first-child`), `last` (`:last-child`), `even`, `odd`, `placeholder` (`::placeholder`), `before`, `after`, `dark` (`.dark &`).

### 6.2 Variantes relacionais

| Variante | Selector simplificado | Condição |
|---|---|---|
| `group-hover:` | `.group:hover .ALVO` | Hover num antepassado `.group` |
| `group-focus-within:` | `.group:focus-within .ALVO` | Foco dentro de `.group` |
| `peer-hover:` | `.peer:hover ~ .ALVO` | Irmão anterior com hover |
| `peer-focus:` | `.peer:focus ~ .ALVO` | Irmão anterior focado |
| `peer-checked:` | `.peer:checked ~ .ALVO` | Irmão anterior seleccionado |
| `peer-disabled:` | `.peer:disabled ~ .ALVO` | Irmão anterior desactivado |
| `peer-invalid:` | `.peer:invalid ~ .ALVO` | Irmão anterior inválido |
| `focus-within:` | `.ALVO:focus-within` | Foco no próprio ou num descendente |

`group` é **antepassado**, `peer` é **irmão anterior**. O combinador `~` não encontra irmãos anteriores nem descendentes. Não existem variantes `peer-placeholder-shown:`, `group/name:`, `aria-*`, `data-*` ou `has-*` predefinidas.

```html
<div class="group">
  <h3 class="text[gray] group-hover:text[green]">Título</h3>
</div>
<input id="ok" type="checkbox" class="peer">
<label for="ok">Aceito</label>
<p class="hidden peer-checked:block">Confirmado</p>
```

### 6.3 Breakpoints e media

| Família | Exemplos | Semântica |
|---|---|---|
| Min-width | `sm:`, `md:`, `lg:`, `xl:`, `2xl:` | Largura >= limite |
| Max-width | `max-sm:`, `max-md:`, `max-lg:`, `max-xl:`, `max-2xl:` | Abaixo do limite, exclusivo |
| Movimento | `motion-reduce:`, `motion-safe:` | `prefers-reduced-motion: reduce/no-preference` |
| Impressão | `print:` | `@media print` |

Os breakpoints padrão são `640`, `768`, `1024`, `1280`, `1536` px. `max-md` gera `max-width: 767.98px`; com unidades `rem`/`em`, usa `calc(limite - 0.02px)`. Breakpoints personalizados também geram `max-*` correspondente.

```html
<section class="p[12px] md:p[24px] max-md:bg[#eef] print:p[0]">
  <div class="md:max-xl:group-hover:p[20px]">…</div>
</section>
```

### 6.4 Cascata: comportamento novo

O BreezeCSS **2.3.0 ordena as regras**, independentemente da ordem de descoberta: **base → `max-*` (larguras maiores antes das menores) → `min-*` (menores antes das maiores) → movimento → impressão**. A ordenação vale no browser e na compilação. Dentro do mesmo nível de rank, a inserção é estável.

**Não repetir a recomendação antiga de que `md:w[50%]` precisa vir depois de `w[100%]` para funcionar.** O motor corrigiu essa precedência. Porém, `hover`, `dark`, `group-*`, `peer-*` e `focus-*` mudam a **especificidade**; `!important` continua a vencer declarações normais. Não existem `@layer` automáticas.

### 6.5 Floating label (equivalente a `input:focus ~ label`)

```html
<div class="relative">
  <input id="email" type="email" class="peer w[100%] h[64px] p[22px_12px_8px]" placeholder=" ">
  <label for="email" class="absolute left[12px] top[50%] translate-y[-50%] pointer-events-none transition duration[200ms] peer-focus:top[8px] peer-focus:translate-y[0] peer-focus:text-size[12px]">Email</label>
</div>
```

Este exemplo move o label **durante o foco**. Para persistir o estado quando o input tem conteúdo e perde foco, é preciso JS ou CSS nativo adicional: `peer-placeholder-shown:` não é uma variante do Breeze 2.3.0.

---

## 7. Transforms, filtros e inserção eficiente

- `rotate`, `scale`, `scale-x/y`, `translate-x/y`, `skew-x/y` são combinados em `transform` por **elemento e contexto** (breakpoint, media e variantes). A ordem de composição é fixa: translateX → translateY → rotate → scale → scaleX → scaleY → skewX → skewY.
- O motor pode atribuir `data-breeze-id` ao elemento para identificar o transform combinado. Não remover esse atributo manualmente.
- Transforms de contextos diferentes (base e `hover`, por exemplo) são regras separadas: a regra de hover pode substituir o transform base; repete no hover os efeitos que precisas manter.
- Os selectores relacionais e de `dark` são aplicados aos transforms pelo mesmo mecanismo de variantes; o problema antigo que ignorava `&` em transforms foi corrigido.
- A inserção live usa **rank em cache**, **pesquisa binária** para posicionamento e `Map` para localizar regras anteriores de transform. Não varre a folha lendo `cssText` a cada classe. Ainda existe custo de inserção e deslocação de entradas no CSSOM/array: não prometer complexidade total O(log n).
- O modo offline ordena regras antes da exportação. A compilação CLI trata contextos e especificidade para preservar o resultado do runtime.
- `translate[10px_20px]` escreve a propriedade CSS individual `translate` e não se combina com `transform`.
- Filtros (`blur`, `brightness`, `contrast`, etc.) escrevem todos `filter`: para combinar, usar `filter[blur(4px)_brightness(1.1)]`.
- `ring` e `shadow` escrevem `box-shadow`: para combinar, usar uma declaração `shadow[...]` com múltiplas sombras.

---

## 8. Temas, componentes, API e modo compilado

### 8.1 Temas

```js
window.BreezeConfig = {
  tema: {
    cores: { primario: '#00ee99', superficie: '#0f172a' },
    espacamento: { secao: '24px' },
    fontes: { corpo: 'Inter, sans-serif' }
  }
};
```

O motor gera variáveis CSS `--breeze-*` e resolve valores inteiros de tema em `bg[primario]`, `p[secao]`, `font-family[corpo]`. Em `border[1px_solid_primario]` o nome não é resolvido por ser parte de um shorthand: usar `border[1px_solid] border-color[primario]` ou valor literal.

### 8.2 Componentes

```js
// Após o init:
BreezeCSS.addComponent('card', [
  'p[24px]', 'rounded-xl', 'bg[#17243b]',
  'hover:shadow-lg', 'md:p[32px]'
]);
```

`<article class="card">` expande a lista; `card!` marca as declarações com `!important`. O prefixo de utilitários não deve ser confundido com o nome do componente. O CLI detecta componentes declarados em código quando estaticamente analisáveis.

### 8.3 API pública

| Método | Função |
|---|---|
| `init(config?)` | Inicialização; o bundle já faz auto-init |
| `reiniciar()` | Pára observer, limpa cache e folha CSS |
| `processar()` | Reprocessa o DOM |
| `use(plugin)` | Regista plugin |
| `addMapping(prefixo, prop)` | Prefixo arbitrário novo |
| `addProcessor(prefixo, fn)` | Processador de valores |
| `addFixedClass(nome, regras)` | Classe fixa nova |
| `addVariant(nome, selector)` | Contexto novo; aceita `&` |
| `addBreakpoint(nome, tamanho)` | Breakpoint novo |
| `addComponent(nome, lista)` | Componente por composição |
| `build(html, {minificar})` | CSS estático em ambiente com `DOMParser` |
| `exportar(opcoes)` | Exporta CSS gerado na página |
| `exportarPlugins(opcoes)` | Exporta CSS de cada plugin |
| `stats()` | Estatísticas |
| `versao` | `2.3.0` |

### 8.4 Runtime versus BreezeCLI

**Runtime:** o bundle é carregado no browser, cria o `<style id="breeze-v2-estilos">`, observa classes e aplica plugins registados. Adequado a HTML que muda dinamicamente. A inicialização gera estilos depois do JS; pode existir FOUC.

**Compilado:** `breezecss-cli` v1.0.3 executa o motor real numa VM Node para produzir CSS estático. Pode dividir por HTML (`--split`), injectar links/scripts (`--inject`), detectar plugins (`--plugins auto`), compilar classes de templates (`--tpl`) e criar um runtime JS **dos plugins necessários**, sem levar o motor JIT inteiro para o browser.

```bash
npm install -D breezecss-cli
npx breezecss-cli --split --plugins auto --inject
npx breezecss-cli --watch --split --plugins auto --inject
```

Outras opções: `--safelist`, `--tema`, `--prefix`, `--config`, `--engine`, `--web-root`, `--no-runtime`, `--runtime`, `--minify`, `--no-reset`, `--no-smooth`, `--clean`. `--clean` usa manifesto e hashes para não apagar ficheiros do utilizador e recusa limpar a raiz de trabalho, antepassados ou caminhos fora do projecto. Não atribuir CSS automático a classes geradas dinamicamente depois do build.

### 8.5 Limites de geração

**Não inventar:** `p-4`, `w-full`, `h-screen`, `container`, `bg-blue-500`, `transition[...]`, `peer-placeholder-shown:`, `group/foo:`, `aria-*`, `data-*`, `has-*` e variantes arbitrárias não suportadas. Para requisitos não cobertos, usar CSS nativo ou `addMapping`, `addFixedClass`, `addVariant`.

---

## 9. Plugins incluídos no bundle (registo explícito)

Todos estão disponíveis como globais, mas só funcionam depois de registados com `BreezeConfig.plugins` antes do init ou `BreezeCSS.use(...)` depois. Objectos de plugin usam `setup(ctx)`; muitos oferecem `.criar(opcoes)` para instância configurada. **Não presumir que plugins individuais precisam de scripts adicionais quando o bundle completo está carregado.**

### 9.1 BreezeGlass — vidro (glassmorphism)
**Camada 1 (todos os navegadores):** `backdrop-filter` + tint + brilho especular + rebordo. **Camada 2 (só Chromium, não iOS):** refração real via SVG `feDisplacementMap`; nos outros degrada para a camada 1. Precisa de **conteúdo/fundo atrás** do elemento para o efeito aparecer.

| Classe | Efeito |
|---|---|
| `glass` | **Base obrigatória.** |
| `glass-sm` · `glass-md` · `glass-lg` · `glass-xl` | blur 8 / 16 / 28 / 40 px (lg/xl também saturam mais). Padrão 16px. |
| `glass-light` · `glass-dark` | tom (dark: rgb 12 16 24, tint .3). |
| `glass-pill` · `glass-circle` | `border-radius: 9999px` (circle também `aspect-ratio: 1/1`). |
| `glass-refract` · `glass-refract[24]` | refração (padrão 16px de deslocamento; Chromium). Respeita o `border-radius` do elemento — combine com `rounded-*`. |
| `glass-blur[20px]` `glass-saturate[2]` `glass-brightness[1.1]` `glass-tint[0.3]` `glass-shadow[0.4]` `glass-rgb[12_16_24]` `glass-bezel[0.4]` | ajustes finos (variáveis CSS `--glass-*`). |

```html
<div class="glass glass-lg glass-dark glass-refract rounded-2xl p[24px] text[#fff]">…</div>
```
Acessibilidade embutida: sem `backdrop-filter` → fundo mais opaco; `prefers-reduced-transparency`/`prefers-contrast: more` removem o blur; `prefers-reduced-motion` remove transições.
Opções: `BreezeGlass.criar({ refracao: "auto" | true | false, bisel: 0.3, resolucaoMax: 200 })` (a chave `intensidade` existe nos padrões mas não é lida; controle a força com `glass-refract[N]`). Registre **a instância criada** no lugar da padrão. `BreezeGlass.actualizar()` força re-varredura.

### 9.2 BreezeDividers — divisores de seção (máscara SVG)
Transforma **qualquer elemento** num divisor: a **forma** vem da máscara; a **cor** vem do `bg`; o **tamanho** de `w`/`h`. Sempre defina largura, altura e cor.
```html
<div class="w[100%] h[80px] bg[#000033] divider-wave"></div>
<div class="w[100%] h[120px] bg-gradient[to_right,#6366f1,#ec4899] divider-clouds-flip[7]"></div>
```
**Formatos** (padrão de repetições entre colchetes quando aplicável):

| Classe | Forma | Repetições (padrão) |
|---|---|---|
| `divider-wave` | onda (cor em cima) | 4 |
| `divider-zigzag` | dentes | 10 |
| `divider-waves` | 3 ondas translúcidas | 3 |
| `divider-steps` | degraus a subir | 5 |
| `divider-peaks` | montanhas | 5 |
| `divider-scallop` | leques | 8 |
| `divider-arches` | arcos (aqueduto) | 6 |
| `divider-columns` | colunas arredondadas | 8 |
| `divider-castle` | ameias | 8 |
| `divider-clouds` | nuvens/montes | 5 |
| `divider-fins` | barbatanas curvas | 5 |
| `divider-skyline` | silhueta urbana | 9 |
| `divider-diagonal` · `divider-curve` · `divider-triangle` · `divider-notch` · `divider-bump` · `divider-layers` · `divider-dunes` | formas **fixas** | — (não aceitam `[n]`) |

- **Modificadores (sufixos):** `-flip` (vertical), `-mirror` (horizontal), `-flip-mirror` (ambos): `divider-wave-flip`, `divider-layers-flip-mirror`.
- **Repetições:** `divider-wave[6]`, `divider-zigzag-flip[17]` (inteiro 1–60; só nos formatos repetíveis; valor inválido → padrão).
- `layers`, `waves` e `dunes` usam o `bg` como tinta com camadas de opacidade diferentes.
- Orientação natural: "cor em cima" (wave, curve, triangle, zigzag, arches) ou "cor em baixo" (os demais). Use `-flip` para inverter e posicione o divisor na emenda entre seções (`mt[-1px]` evita linha de subpixel).

### 9.3 BreezeProgress — barra de progresso
Adicione a classe `progress`; o plugin cria sozinho a barra (fixa, `aria-hidden`, fora do fluxo do elemento).
- `<body class="progress">` → progresso de scroll da página, barra no topo.
- Elemento com scroll interno (`overflow-auto/scroll`) → progresso do scroll dele.
- Elemento normal → progresso da passagem do elemento pela viewport (visível só enquanto ele está na tela; limitada à largura/altura dele).

| Classe | Efeito |
|---|---|
| `progress` | **ativa (obrigatória).** |
| `progress-top` · `progress-bottom` · `progress-left` · `progress-right` | posição (padrão top; left/right = barra vertical). |
| `progress-sm` · `-md` · `-lg` · `-xl` · `progress-h[6px]` | espessura 2/4/6/10px ou arbitrária (padrão 4px). |
| `progress-color[#e11d48]` | cor (aceita gradiente: `progress-color[linear-gradient(90deg,#f0f,#0ff)]`). Padrão `#3b82f6`. |
| `progress-track[rgb(0_0_0/_.1)]` | cor do trilho (transparente por padrão). |
| `progress-radius[9999px]` · `progress-rounded` | arredondamento. |
| `progress-z[50]` | z-index (padrão 9990). |
| `progress-dur[200ms]` · `progress-smooth` (200ms) · `progress-instant` (0) | duração da animação (padrão 80ms; 0 com reduced-motion). |
| `progress-reverse` | enche ao contrário. |
| `progress-scroll` · `progress-view` · `progress-auto` | modo de medição (auto = scroll se houver scroll interno, senão view). |

Extras: o elemento recebe `--progress` (0–1) em `style`; evento `breeze:progress` no elemento com `detail = { progresso: 0..1, percentagem: 0..100 }`.
Opções: `BreezeProgress.criar({ altura: 4, cor: "#3b82f6", z: 9990 })`.
Limitação: se um ancestral tiver `transform`/`filter`, a barra fixa pode desalinhar → use `progress-scroll/view` num elemento fora dele.

### 9.4 BreezeScrollbar — barra de rolagem customizada
Classe na página (`<html>` ou `<body>`) ou em qualquer elemento rolável.
```html
<body class="scrollbar scrollbar-thumb[#6366f1] scrollbar-track[#0f172a]">
<div class="h[300px] overflow-auto scrollbar scrollbar-thin scrollbar-radius[4px]">…</div>
<div class="overflow-auto scrollbar-none">…</div>   <!-- esconde a barra, mantém o scroll -->
```
| Classe | Efeito |
|---|---|
| `scrollbar` | **ativa (obrigatória**, exceto com `scrollbar-none`). |
| `scrollbar-thin` · `-md` · `-lg` · `-xl` · `scrollbar-size[12px]` | espessura 6/10/14/18px (padrão 8px). |
| `scrollbar-thumb[cor]` · `scrollbar-thumb-hover[cor]` | polegar / hover (aceita gradiente em Chromium/Safari). |
| `scrollbar-track[cor]` · `scrollbar-corner[cor]` | trilho / canto. |
| `scrollbar-radius[4px]` · `scrollbar-square` | raio (padrão 9999px) / 0. |
| `scrollbar-gap[2px]` | folga polegar–trilho. |
| `scrollbar-none` | esconde a barra. |
| `scrollbar-stable` | `scrollbar-gutter: stable`. |

Firefox: só cores, `scrollbar-none` e fino (padrão)/normal (`-lg`, `-xl`); raio, folga e hover não existem lá. Se a classe estiver no `<body>`, o plugin espelha as variáveis para o `<html>`.
Opções: `BreezeScrollbar.criar({ tamanho: 8, thumb: "rgb(128 128 128 / .5)", thumbHover: "rgb(128 128 128 / .8)" })`.

### 9.5 BreezePreloader — 1.6.0

Preloader de **página** (`body`/`html` ou `preloader-target[page]`) e de **elemento** (`preloader` num elemento normal). O plugin cria o overlay, define `aria-busy` e pode ocultá-lo automaticamente no `load` da página ou manualmente via API. Um preloader local não desaparece apenas por a página terminar de carregar.

| Classe/família | Efeito |
|---|---|
| `preloader` | Activa (obrigatória) |
| `preloader-ring`, `-dots`, `-bars`, `-pulse`, `-bar`, `-orbit`, `-speeder`, `-words` | Tipo de animação |
| `preloader-words[Carregar,Preparar,Concluir]` | Palavras alternadas |
| `preloader-words-speed[750ms]` | Intervalo de troca |
| `preloader-sm`, `-md`, `-lg`, `-xl`, `preloader-size[64px]` | Tamanho |
| `preloader-color[#fff]`, `preloader-bg[#003]` | Cores do overlay |
| `preloader-min[800ms]`, `preloader-max[10000ms]` | Duração mínima e máxima |
| `preloader-duration[400ms]`, `preloader-instant` | Duração da saída |
| `preloader-fade`, `-curtain`, `-curtain-down`, `-slide-left`, `-slide-right`, `-zoom`, `-blur`, `-iris`, `-wipe`, `-corner`, `-cinematic` | Efeito de saída |
| `preloader-target[page]`, `preloader-target[local]` | Força o alvo |
| `preloader-manual`, `preloader-z[99999]` | Controlo manual e camada |

```html
<body class="preloader preloader-target[page] preloader-speeder preloader-min[800ms] preloader-bg[#003]">
<div class="preloader preloader-target[local] preloader-words[Carregar,Preparar] preloader-words-speed[700ms]">…</div>
```

API: `BreezePreloader.iniciar()`, `mostrar(el)`, `ocultar(el, imediato?)`, `alternar(el, activo?)`, `estado(el)`, `remover(el)`, `criar({ cor, fundo, tamanho, z, minimo, fade, maximo })`. Evento `breeze:preloader` com `detail.estado`. Em página, `iniciar()` antecipado pode reduzir flash. Para `preloader-words[...]` o motor lê o token directamente do atributo `class`; não trocar por `preloader-words[palavra palavra]`.

### 9.6 BreezeBackgrounds — 1.5.0

Fundos SVG procedurais aplicados via pseudo-elemento (normalmente `::before`) atrás do conteúdo. Não exige imagens externas. O plugin regenera o SVG quando o elemento muda de tamanho; animações SVG/SMIL são opcionais e respeitam `prefers-reduced-motion`, além de pausar fora da viewport.

**Estilos:** `topo`, `waves`, `flow`, `ripples`, `ridges`, `picos`, `espiral`, `grelha`, `interferencia`, `marmore`, `colmeia`, `celulas`, `agata`, `dunas`, `raios`, `pontos`, `mosaico`, `aurora`, `cubo`, `estrelas`.

| Classe | Função |
|---|---|
| `custom-bg` / `custom-bg[topo]` | Activa fundo (topo por omissão) |
| `custom-bg[estrelas]`, `[cubo]`, `[mosaico]`, `[aurora]` | Estilos específicos |
| `custom-bg-color[#003]` | Cor base |
| `custom-bg-glow[#0053cf]` | Brilho opcional (`none` desactiva) |
| `custom-bg-line[#087cff]`, `custom-bg-line-soft[#0753bd]` | Cores de linhas |
| `custom-bg-levels[18]`, `custom-bg-scale[1.4]` | Densidade e escala |
| `custom-bg-seed[42]`, `custom-bg-width[1.2]` | Semente e espessura |
| `custom-bg-opacity[0.8]`, `custom-bg-center[50%_53%]`, `custom-bg-angle[30]` | Aparência |
| `custom-bg-animate` | Activa movimento por omissão |
| `custom-bg-anim[drift_pulse]` | Tipos: `drift`, `rotate`, `breathe`, `pulse`, `none` |
| `custom-bg-anim-speed[0.7]`, `custom-bg-anim-amount[1.2]` | Velocidade e amplitude |

```html
<section class="custom-bg[estrelas] custom-bg-color[#090a0f] custom-bg-line[#ffffff] custom-bg-animate">…</section>
<section class="custom-bg[aurora] custom-bg-anim[drift_pulse] custom-bg-anim-speed[0.6]">…</section>
```

API: `BreezeBackgrounds.criar({ presets: {...}, pseudo: 'before'|'after' })`, `BreezeBackgrounds.registar(nome, preset)`, `BreezeBackgrounds.gerar(...)`. Se o elemento já usar `::before` para outro efeito, considerar `pseudo: 'after'`. O brilho **não** está activo por omissão. `custom-bg-clear` e presets `topo-emerald` etc. foram removidos em versões anteriores: **não gerar**.

### 9.7 Plugin próprio

```js
const MeuPlugin = {
  nome: 'meu-plugin', versao: '1.0.0',
  setup(ctx) {
    ctx.addFixedClass('card-pro', 'background-color: #fff; border-radius: 12px');
    ctx.addMapping('accent', '--accent');
    ctx.addVariant('group-active', '.group:active &');
    ctx.addBreakpoint('wide', '1600px');
  }
};
// Em BreezeConfig.plugins antes do init, ou BreezeCSS.use(MeuPlugin) depois.
```

Os mapeamentos e regras de plugins podem conter declarações separadas por `;`; evita `;` dentro de valores de CSS que o motor separa ingenuamente. Não confundir um plugin JS dinâmico com uma classe CSS fixa.

---

## 10. Diagnóstico: problemas actuais e limitações

| Sintoma | Causa provável | Correcção |
|---|---|---|
| Nenhum estilo | Bundle ausente ou init falhou | Confirmar `BreezeCSS.versao` e `<style id="breeze-v2-estilos">` |
| Plugin sem efeito | Não registado | `BreezeConfig.plugins` antes do init ou `BreezeCSS.use` depois |
| Configuração ignorada | `add*` antes do init, ou configuração tardia | Declarar `BreezeConfig` antes do auto-init |
| `p[16]` inválido | Unidade em falta | `p[16px]` |
| `text[18px]` não altera tamanho | `text` é cor | `text-size[18px]` |
| Borda invisível | `border[1px]` só largura | `border[1px_solid_#ccc]` |
| `peer-focus:` não actua | `.peer` não é irmão anterior | Colocar input `.peer` antes do alvo, no mesmo pai |
| `group-hover:` não actua | `.group` não é antepassado | Colocar `.group` no contentor pai |
| Floating label desce após blur | Só `peer-focus` está activo | JS/CSS nativo para estado preenchido; `peer-placeholder-shown` não existe |
| `max-md:` inesperado | Limite exclusivo | `max-md` acaba antes de `md` (767.98px por omissão) |
| Regras com estados competem | Especificidade CSS | Inspeccionar selector e `!important`, não atribuir à ordem do DOM |
| Dois filtros ou sombras se anulam | Mesma propriedade CSS | Usar um `filter[...]` / `shadow[...]` combinado |
| `transition[...]` não funciona | Prefixo não registado | `transition duration[...]` ou `transition-prop[...]` |
| Fundo animado não aparece | Plugin não registado ou sem altura visível | Registar BreezeBackgrounds, verificar tamanho do elemento e reduced-motion |
| Preloader local não desaparece | Modo local é manual | `BreezePreloader.ocultar(el)` ou remover classe |
| FOUC | CSS é gerado no browser | Pré-compilar com BreezeCLI ou exportar CSS |
| Classe dinâmica não aparece no compilado | Não foi detectada no build | `--safelist`, `--tpl` ou novo build |
| `--clean` recusa directório | Protecção de paths | Usar saída dedicada dentro do projecto, nunca a raiz |

**Não repetir bugs históricos como se ainda existissem:** `bz-blur`/`bz-rotate` quebrados, ordenação base/min-width dependente da descoberta, transform `dark:` sem condição. Foram alvo de correcções na linha 2.2.5→2.3.0; para regressões, confirmar no código e testar.

**Debug rápido:**

```js
BreezeCSS.versao;
BreezeCSS.stats();
document.getElementById('breeze-v2-estilos')?.sheet?.cssRules?.length;
// Em desenvolvimento, após init:
BreezeCSS.reiniciar();
BreezeCSS.init({ debug: true });
```

---

## 11. Receitas

### 11.1 Página base
```html
<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
  <script>
    (function () {
      var plugins = [BreezeGlass, BreezeDividers, BreezeProgress, BreezeScrollbar];
      if (document.readyState === "loading") window.BreezeConfig = { plugins: plugins, tema: { cores: { primary: "#6366f1" } } };
      else plugins.forEach(function (p) { BreezeCSS.use(p); });
    })();
  </script>
</head>
<body class="progress progress-color[#6366f1] scrollbar scrollbar-thin scrollbar-thumb[#6366f1] bg[#0b1020] text[#e5e7eb] font-family[Inter,sans-serif]">
  <main class="max-w[72rem] mx[auto] p[24px]">
    <h1 class="text-size[2rem] fw[700] mb[16px]">Título</h1>
  </main>
</body>
</html>
```

### 11.2 Grid responsivo de cards (mobile-first)
```html
<section class="grid cols[1] gap[16px] sm:cols[2] lg:cols[3]">
  <article class="p[20px] rounded-xl bg[#fff] shadow-md transition hover:shadow-xl hover:translate-y[-4px]">…</article>
</section>
```
> O motor ordena as media queries; a ordem textual das classes já não determina a precedência entre base e breakpoints. Alternativa sem breakpoints: `cols[repeat(auto-fit,minmax(240px,1fr))]`.

### 11.3 Navbar vidro fixa
```html
<nav class="fixed top[16px] left[50%] translate-x[-50%] z[50] glass glass-lg glass-dark glass-pill glass-refract px[24px] py[12px] flex items-center gap[24px] text[#fff]">…</nav>
```

### 11.4 Hero com divisor
```html
<section class="relative bg-gradient[to_bottom,#0f172a,#1e293b] text[#fff] py[96px] text-center">…</section>
<div class="w[100%] h[90px] bg[#1e293b] divider-wave-flip[5] mt[-1px]"></div>
```

### 11.5 Botões e componente
```js
BreezeCSS.addComponent("btn", ["inline-flex", "items-center", "justify-center", "gap[8px]", "px[18px]", "py[10px]", "rounded-lg", "fw[600]", "cursor-pointer", "transition", "bg[#6366f1]", "text[#fff]", "hover:bg[#4f46e5]", "active:scale[0.98]", "focus-visible:ring[3px]"]);
```
```html
<button class="btn">Salvar</button>
<button class="btn! bg[#e11d48]">Perigo</button>
```

### 11.6 Texto só com contorno (text-stroke) e overlay com máscara
```html
<h2 class="text-size[4rem] fw[800] text[transparent] text-stroke[2px_#fff] uppercase">Contorno</h2>
<div class="absolute inset[0] mask-fade-b bg-image[url(/hero.jpg)] bg-size[cover] bg-pos[center]"></div>
```

### 11.7 Painel com scroll próprio e progresso
```html
<div class="h[320px] overflow-auto scrollbar scrollbar-thin progress progress-scroll progress-top progress-color[#22c55e]">…conteúdo longo…</div>
```

### 11.8 Reagir ao progresso
```js
document.querySelector("article").addEventListener("breeze:progress", e => console.log(e.detail.percentagem));
// ou via CSS: opacity: var(--progress)  (no elemento com a classe progress)
```

---

## 12. Referência de equivalências (não é compatibilidade Tailwind)

| Tailwind | Breeze |
|---|---|
| `p-4` / `px-6` / `mt-2` | `p[1rem]` / `px[1.5rem]` / `mt[0.5rem]` |
| `w-full` / `h-screen` / `min-h-screen` | `w[100%]` / `h[100vh]` / `min-h[100vh]` |
| `max-w-xl` / `mx-auto` | `max-w[36rem]` / `mx[auto]` |
| `gap-4` / `grid-cols-3` / `col-span-2` | `gap[1rem]` / `grid cols[3]` / `col-span[2]` |
| `text-lg` / `text-gray-500` / `font-semibold` | `text-size[1.125rem]` / `text[#6b7280]` / `font-semibold` (ou `fw[600]`) |
| `leading-relaxed` / `tracking-wide` | `leading[1.625]` / `tracking[0.025em]` |
| `bg-blue-500` / `hover:bg-blue-600` | `bg[#3b82f6]` / `hover:bg[#2563eb]` |
| `border border-gray-300` | `border[1px_solid_#d1d5db]` |
| `rounded-lg` / `rounded-full` / `shadow-md` | idênticos |
| `inset-0` / `z-10` / `top-4` | `inset[0]` / `z[10]` / `top[1rem]` |
| `opacity-50` / `aspect-video` | `opacity[0.5]` / `aspect[video]` |
| `translate-x-4` / `rotate-45` / `scale-110` | `translate-x[1rem]` / `rotate[45deg]` / `scale[1.1]` |
| `blur-sm` / `backdrop-blur-md` | `blur[4px]` / `backdrop-blur[12px]` |
| `ring-2` | `ring[2px]` |
| `transition duration-300 ease-in-out` | `transition duration[300ms] ease[ease-in-out]` |
| `bg-cover bg-center bg-no-repeat` | `bg-size[cover] bg-pos[center] bg-repeat[no-repeat]` |
| `space-x-4` | pai com `flex gap[1rem]` |
| `flex items-center justify-between` | idêntico |
| `hidden md:flex` | idêntico (`hidden md:flex`) |

---

## 13. Checklist de entrega para agentes

- [ ] O bundle usado é 2.3.0 e a CDN foi confirmada/publicada; CLI 1.0.3 documentado separadamente.
- [ ] O HTML não contém classes inventadas de Tailwind (`p-4`, `w-full`, `bg-blue-500`).
- [ ] Prefixos arbitrários pertencem ao mapa real; unidades CSS estão correctas.
- [ ] `text[...]` para cor, `text-size[...]` para font-size; `_` nos espaços dos valores.
- [ ] Plugins necessários registados no momento certo; seis plugins disponíveis.
- [ ] `group-*` tem antepassado `.group`; `peer-*` tem irmão anterior `.peer`.
- [ ] Não usei `peer-placeholder-shown:`, `transition[...]` ou variantes inexistentes.
- [ ] `max-*`, `motion-*` e `print:` usados com condições e limites correctos.
- [ ] Não imponho ordem textual base→breakpoint como requisito de funcionamento: cascata 2.3.0 é ordenada.
- [ ] `border[...]` inclui estilo e largura; filtros e sombras concorrentes são combinados.
- [ ] Transforms por contexto incluem todas as transformações que devem persistir naquele estado.
- [ ] `scrollSmooth` automático respeita movimento reduzido; animações opcionais quando necessário.
- [ ] CSS compilado inclui classes de templates e safelist necessárias; não assumo JIT no cliente.
- [ ] Preloader de página vs local foi escolhido correctamente; fundos têm altura e plugin activo.
- [ ] Documentação de SPA (`index.html`, `cli.html`, `spa.js`) não foi confundida com API do motor.
- [ ] Em caso de divergência, inspeccionei o bundle actual e testei, sem inferir pelo Tailwind ou por documentação 2.2.x.

---

## 14. Referência rápida de fontes

- Motor: `breeze.bundle.js` (bundle IIFE BreezeCSS **2.3.0**).
- Compilador: `breezecss-cli` **1.0.3**, especialmente `bin/breeze.js`, `lib/cssgen.js`, `lib/runtime.js`, `vendor/breeze.bundle.js`.
- Documentação visual: `index.html` e `cli.html` (SPAs independentes), sem alterar o contrato de classes do motor.
- Projecto: https://github.com/bigptlg/breezecss

**Âmbito:** esta referência descreve a versão indicada, não garante comportamento de versões anteriores, CDN ainda não publicada ou alterações posteriores.
