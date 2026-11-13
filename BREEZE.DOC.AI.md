# Breeze (BreezeCSS) — DOC.AI.md

> **Público-alvo: modelos de IA / agentes de código.** Substitui a leitura do código-fonte (~3,4 mil linhas).
> Versões documentadas: **BreezeCSS 2.2.5** · BreezeGlass 1.0.0 · BreezeDividers 1.2.0 · BreezeProgress 1.0.0 · BreezeScrollbar 1.0.0.
> Tudo aqui foi extraído do código do bundle. Se algo contradisser seu palpite (especialmente seu conhecimento de Tailwind), **este documento vence**. Não invente classes: use apenas as listadas ou a sintaxe `prefixo[valor]` com os prefixos da seção 4.

---

## 0. TL;DR — as regras que mais quebram código gerado por IA

1. **Breeze é um motor CSS utilitário em runtime (JIT no navegador).** Ele lê o atributo `class` de todos os elementos, gera as regras CSS e as insere num `<style id="breeze-v2-estilos">`. Não há arquivo `.css` para linkar.
2. **NÃO é Tailwind.** Não existe escala (`p-4`, `text-lg`, `w-full`, `h-screen`, `text-gray-500`, `container`). Quase tudo é **valor arbitrário com colchetes e unidade explícita**: `p[16px]`, `w[100%]`, `h[100vh]`, `text[#6b7280]`, `text-size[1.125rem]`.
3. **Unidade sempre explícita.** `p[16]` gera `padding: 16` (inválido). Use `p[16px]` / `p[1rem]`. Exceções sem unidade: `z[10]`, `opacity[0.5]`, `grow[1]`, `order[2]`, `cols[3]`, `col-span[2]`, `fw[700]`, `leading[1.5]`, `scale[1.1]`.
4. **`_` vira espaço dentro dos colchetes:** `border[1px_solid_#ccc]`, `shadow[0_4px_12px_rgba(0,0,0,.2)]`, `w[calc(100%_-_20px)]`. Exceto dentro de `url()`, `var()`, `env()`, `attr()`, `src()` (aí `_` é literal).
5. **Cor de texto é `text[...]`; tamanho de fonte é `text-size[...]`.** `text[center]` está errado (use `text-center`).
6. **Ordem das classes importa** (não há ordenação do CSS gerado; vence a regra inserida por último): escreva **sempre a classe base ANTES das variantes/breakpoints** — `w[100%] md:w[50%]`, nunca o contrário. Veja seção 6.3.
7. **Plugins (Glass, Dividers, Progress, Scrollbar) estão embutidos no bundle mas NÃO são registrados automaticamente neste bundle.** Você deve registrá-los (seção 2.2). Sem registro, `glass`, `divider-wave`, `progress`, `scrollbar` etc. não fazem nada (sem erro).
8. **Nunca chame `BreezeCSS.addComponent/addMapping/addVariant/addFixedClass/...` antes do `init`.** Chamar antes força um init padrão e **ignora o `BreezeConfig`** (seção 2.3).
9. **Reset global vem ligado:** `* { margin:0; padding:0 }` + `box-sizing` herdado. Desligue com `reset: false`.
10. **FOUC:** o CSS só existe depois do JS rodar. Para produção sem flash, gere CSS estático (seção 8.4).

---

## 1. Arquivos e globais

| Item | URL | Observação |
|---|---|---|
| Bundle (CDN oficial) | `https://cdn.pedrodeoliveira.me/js/breeze.bundle.js` | BreezeCSS + 4 plugins num arquivo. **Único arquivo necessário.** Não há CSS separado. |
| GitHub | `bigptlg/breezecss` (`https://github.com/bigptlg/breezecss`) | Código-fonte. |

**Use sempre a CDN oficial** (`cdn.pedrodeoliveira.me`): as versões novas são publicadas lá primeiro.

**Alternativa: jsDelivr** (direto do repositório `bigptlg/breezecss`, sem fork):
```
https://cdn.jsdelivr.net/gh/bigptlg/breezecss@latest/js/breeze.bundle.js
```
O jsDelivr guarda cache e pode demorar a refletir uma versão nova. Para fixar uma versão, ela vai **depois do repositório** (`gh/bigptlg/breezecss@<versão>/js/breeze.bundle.js`, exige a tag correspondente no GitHub), nunca no fim do nome do arquivo. Em produção prefira a CDN oficial ou uma versão fixada em vez de `@latest`.

Globais criadas pelo bundle: `BreezeCSS` (motor), `BreezeGlass`, `BreezeDividers`, `BreezeProgress`, `BreezeScrollbar` (plugins). Auto-init: o bundle chama `BreezeCSS.init(window.BreezeConfig || {})` sozinho (em `DOMContentLoaded` se o documento ainda estiver carregando; imediatamente se não).

---

## 2. Instalação

### 2.1 Mínimo (só o motor, sem plugins)
```html
<script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>   <!-- síncrono; sem defer/async/type=module -->
<!-- pronto: classes já funcionam em todo o documento e em elementos inseridos depois -->
<div class="flex items-center gap[16px] p[24px] bg[#0f172a] text[#fff] rounded-lg">Olá</div>
```

### 2.2 Com plugins (padrão recomendado)
Registre os plugins **depois do bundle e antes do `DOMContentLoaded`**, via `window.BreezeConfig`. Snippet universal (funciona mesmo se o documento já terminou de carregar):

```html
<script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
<script>
  (function () {
    var plugins = [BreezeGlass, BreezeDividers, BreezeProgress, BreezeScrollbar]; // só os que usar
    if (document.readyState === "loading") {
      // init ainda não rodou: o bundle lerá BreezeConfig no DOMContentLoaded
      window.BreezeConfig = Object.assign(window.BreezeConfig || {}, { plugins: plugins });
    } else {
      // init já rodou: aplique direto
      plugins.forEach(function (p) { BreezeCSS.use(p); });
    }
  })();
</script>
```
Regras:
- O `<script>` do bundle deve ser **síncrono** (sem `defer`/`async`/`type="module"`), para o registro rodar antes do init. Se precisar carregar de outra forma, use o ramo `else` (`BreezeCSS.use`).
- **Nunca** chame `BreezeCSS.use(...)` enquanto `document.readyState === "loading"`: o init posterior recria a config e **descarta** o plugin.
- Registrar o mesmo plugin duas vezes é inofensivo; registrar a instância padrão **e** uma criada com `.criar()` do mesmo plugin cria dois motores (evite).
- O comentário final do arquivo do bundle fala em "registar o plugin antes do init", mas **não há código de registro** nele. Se a sua versão publicada na CDN já registrar sozinha, o snippet acima continua seguro.

### 2.3 Configuração e ordem de chamadas (`BreezeConfig`)
Defina `window.BreezeConfig = {...}` **antes do init** (veja 2.2: depois do bundle, antes de `DOMContentLoaded`). Chaves aceitas (todas opcionais):

| Chave | Padrão | Função |
|---|---|---|
| `log` | `true` | `false` silencia o console. |
| `debug` | `false` | `true` loga cada regra gerada. |
| `reset` | `true` | Injeta `* {margin:0;padding:0}`, `html{box-sizing:border-box}`, `*,*::before,*::after{box-sizing:inherit}`. |
| `scrollSmooth` | `true` | Injeta `html { scroll-behavior: smooth }`. |
| `tema` | `{}` | `{ cores, espacamento, fontes }` — veja 8.1. |
| `breakpoints` | sm 640px · md 768px · lg 1024px · xl 1280px · 2xl 1536px | Mesclado com o padrão. |
| `variantes` | veja 6.1 | Mesclado. Valor com `&` = seletor completo (`".dark &"`); sem `&` = sufixo (`":hover"`). |
| `classesFixas` | — | `{ "minha-classe": "prop: valor; prop2: valor2" }`. |
| `mapaPropriedades` | — | `{ "meu-prefixo": "css-property" }` (habilita `meu-prefixo[valor]`). Várias props separadas por `;`. |
| `processadoresEspeciais` | — | `{ "meu-prefixo": v => "valor-css" }`. |
| `regrasGlobais` | — | `{ "seletor": { prop: valor } }` injetadas se `reset` ligado. |
| `plugins` | `[]` | Lista de plugins (seção 9). |
| `safelist` | `[]` | Classes pré-geradas mesmo sem estar no DOM. |
| `prefix` | `""` | Prefixo (ex.: `"bz-"`). **Veja o aviso na seção 10 — tem limitações.** |

**Funções `BreezeCSS.add*` / `.use` só DEPOIS do init.** Padrão seguro:
```js
function aoBreezePronto(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); // registrado depois do bundle → roda depois do init
  else fn();
}
aoBreezePronto(function () {
  BreezeCSS.addComponent("btn", ["inline-flex", "items-center", "px[16px]", "py[8px]", "rounded-lg", "bg[#3b82f6]", "text[#fff]", "hover:bg[#2563eb]"]);
});
```
Se `add*` for chamado antes do init, o motor inicializa com config padrão, marca-se como iniciado e o `init` real vira no-op ("já foi inicializado") → **BreezeConfig ignorado e observer nunca inicia**.

### 2.4 Requisitos
Navegadores modernos (usa `MutationObserver`, `insertRule`, `CSS.escape`). Plugins: Glass (refração) só Chromium não-iOS (`ResizeObserver`, SVG `feDisplacementMap`); Progress/Scrollbar usam `CSS.registerProperty` quando disponível; Scrollbar usa `::-webkit-scrollbar` (Chromium/Safari) e `scrollbar-color/width` (Firefox).

---

## 3. Modelo mental: como uma classe vira CSS

Cada token de `class` é tentado nesta ordem:
1. **Componente** registrado (`btn`, `btn!`).
2. **Classe fixa** (`flex`, `items-center`, `rounded-lg`, `glass`…) → declarações prontas.
3. **Classe arbitrária** `prefixo[valor]` → `propriedade: valor`, com o `prefixo` procurado em `mapaPropriedades`.

Anatomia completa: `[breakpoint:][variante:]*classeBase[!]`

```
md:hover:bg[#2563eb!]
│  │     │   │       └─ ! no fim do valor = !important
│  │     │   └─ valor (sem ], com _ no lugar de espaços)
│  │     └─ prefixo (letras e hífens apenas; sem dígitos)
│  └─ variante(s)
└─ breakpoint (@media min-width)
```

- Prefixo: só letras/hífens (`[a-zA-Z-]`). Valor: **não pode conter `]`**.
- Classe fixa com importante: `flex!`, `hover:flex!`. Arbitrária: `bg[red!]`. Componente: `btn!` (marca todas as props do componente como `!important`).
- Qualificador desconhecido (`foo:flex`) → aviso no console e classe ignorada.
- Prefixo desconhecido (`xyz[1]`) → aviso "Prefixo desconhecido" e ignorada.
- **Tema:** se o valor inteiro coincide com uma chave de `tema.cores/espacamento/fontes`, é substituído (`bg[primary]` → cor definida). Só vale para o valor **inteiro**, não para trechos.
- **Processadores especiais** transformam o valor (ex.: `blur[4px]` → `blur(4px)`; `cols[3]` → `repeat(3, 1fr)`). Listados na seção 4.
- Cada classe gera uma regra de **mesma especificidade** (`.classe { }`); variantes pseudo adicionam especificidade natural (`:hover`, `.dark .x`).
- Elementos novos e mudanças de `class` são detectados por `MutationObserver` (agrupados por `requestAnimationFrame`). Classes montadas dinamicamente em JS funcionam — não há "purge".

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

### 4.5 Filtros (todos escrevem `filter` — veja a armadilha 9.3)
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

### 4.8 Transforms (combinam entre si — seção 7)
`rotate[45deg]` · `scale[1.1]` · `scale-x[...]` · `scale-y[...]` · `translate-x[10px]` · `translate-y[-4px]` · `skew-x[10deg]` · `skew-y[10deg]`.

### 4.9 Transição e animação
| Prefixo | Propriedade | Exemplo |
|---|---|---|
| `transition-prop` | `transition` (shorthand) | `transition-prop[opacity_.3s_ease]` |
| `duration` | `transition-duration` | `duration[300ms]` |
| `delay` | `transition-delay` | `delay[100ms]` |
| `ease` | `transition-timing-function` | `ease[cubic-bezier(.4,0,.2,1)]` |
| `animate` | `animation` | `animate[meu-kf_2s_ease_infinite]` |
| `animate-delay` / `animate-duration` | `animation-delay/duration` | |

> **Não existe `transition[...]` arbitrário** (apesar de comentários de versão antiga). Use a fixa `transition` + `duration[..]`/`ease[..]`, ou `transition-prop[...]`.

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

## 6. Variantes, breakpoints e cascata

### 6.1 Variantes disponíveis
`hover` `active` `focus` `focus-visible` `visited` `disabled` `checked` `first` (`:first-child`) `last` (`:last-child`) `even` `odd` `placeholder` (`::placeholder`) `before` (`::before`) `after` (`::after`) `dark` (`.dark &` → exige a classe `dark` num **ancestral** do elemento, ex.: `<html class="dark">`).

**Não existem:** `group-hover`, `peer-*`, `focus-within`, `aria-*`, `data-*`, `print`, `motion-safe/reduce`, `max-*`, `first-of-type`… Para criar: `variantes: { "group-hover": ".group:hover &" }` na config (ou `BreezeCSS.addVariant(...)` pós-init).

### 6.2 Breakpoints
Mobile-first, `@media (min-width: …)`: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536. Combine: `md:hover:bg[#000]`.
- Variantes empilham na ordem escrita: `hover:before:` → `.x:hover::before` ✔. **Pseudo-elemento por último** (`before:hover:` gera seletor estranho).
- `before:`/`after:` precisam de `content['']` (aspas simples dentro do colchete).

### 6.3 ⚠️ Ordem das classes (cascata)
O Breeze insere regras com `insertRule` **na ordem em que descobre as classes** (ordem do `class` de cada elemento, na ordem do DOM). Não há ordenação por breakpoint. Todas têm a mesma especificidade (media queries não aumentam). Consequência: **a regra inserida por último vence**.

```html
<!-- ❌ md:w[50%] é inserida ANTES de w[100%] → w[100%] vence em todas as larguras -->
<div class="md:w[50%] w[100%]"></div>

<!-- ✔ base primeiro, depois sm → md → lg → xl, depois hover/focus/dark -->
<div class="w[100%] md:w[50%] lg:w[33%]"></div>
```
Regras práticas:
- **Escreva sempre `base`, depois breakpoints crescentes** em cada elemento.
- Cuidado entre elementos: se um elemento **anterior no DOM** usa só `md:w[50%]` e um posterior usa `w[100%] md:w[50%]`, a regra `md:` já foi inserida antes da base `w[100%]`. Para a mesma propriedade, mantenha a base presente em todos os elementos que usam a variante, ou pré-gere na ordem certa com `safelist: ["w[100%]", "md:w[50%]"]` (a safelist é processada em ordem, antes do DOM).
- `hover:`/`focus:`/`dark:` têm especificidade maior que a base (pseudo-classe/ancestral), então **não** sofrem esse problema.
- Evite dois utilitários da mesma propriedade no mesmo elemento sem breakpoint (`p[8px] p[16px]`): vence o último inserido, não o último escrito.

---

## 7. Transforms e filtros (combinação)

**Transforms** (`rotate scale scale-x scale-y translate-x translate-y skew-x skew-y`) são **combinados num único `transform`** por elemento e contexto (breakpoint+variantes), sempre na ordem fixa: `translateX → translateY → rotate → scale → scaleX → scaleY → skewX → skewY`, independente da ordem das classes. Para isso o Breeze adiciona `data-breeze-id="bN"` ao elemento (não remova).
```html
<div class="translate-x[10px] rotate[45deg] hover:scale[1.1] transition"></div>
```
- Cada contexto (base, `hover:`, `md:`…) gera sua própria regra `transform` (o `hover:` **substitui**, não soma com o base).
- ⚠️ `dark:rotate[...]` (e qualquer variante com `&`) **ignora a condição** nos transforms e se aplica sempre. Evite `dark:` com transforms.

**Filtros:** `blur`, `brightness`, `contrast`, `grayscale`, `saturate`, `drop-shadow`, `filter` escrevem a **mesma propriedade `filter`** — usar duas classes seguidas faz **uma sobrescrever a outra**. Combine num único `filter[blur(4px)_brightness(1.1)]`.
O mesmo vale para `shadow`/`ring` (ambos `box-shadow`): `ring[2px]` anula `shadow-md` e vice-versa; combine com `shadow[0_0_0_2px_#00f,0_8px_24px_#0003]`.

---

## 8. Tema, componentes, build estático, API

### 8.1 Tema
```js
window.BreezeConfig = {
  tema: {
    cores:       { primary: "#6366f1", surface: "#0f172a" },
    espacamento: { gutter: "24px" },
    fontes:      { body: "Inter, sans-serif" }
  }
};
```
- Gera `:root { --breeze-primary: #6366f1; --breeze-spacing-gutter: 24px; --breeze-font-body: … }`.
- Uso: `bg[primary]`, `p[gutter]`, `font-family[body]` (substituição do valor inteiro). Para trechos use a variável: `border[1px_solid_var(--breeze-primary)]`.

### 8.2 Componentes
```js
// somente após o init (seção 2.3)
BreezeCSS.addComponent("card", ["p[24px]", "rounded-xl", "bg[#fff]", "shadow-md", "hover:shadow-lg", "md:p[32px]"]);
```
- `<div class="card">` aplica tudo (variantes e breakpoints incluídos). `card!` aplica tudo como `!important`.
- Respeite a regra de ordem da seção 6.3 dentro da lista (base antes das variantes).
- Componentes não recebem o `prefix`.

### 8.3 API pública (`BreezeCSS`)
| Método | Função |
|---|---|
| `init(config?)` | Inicializa. Chamado automaticamente; segunda chamada só avisa. |
| `reiniciar()` | Para observer, limpa estilos e cache (permite novo `init`). |
| `processar()` | Reprocessa todo o DOM (use após mudanças fora do observer). |
| `use(plugin)` | Registra plugin (**só após init**). |
| `addMapping(prefixo, prop)` · `addVariant(nome, seletor)` · `addBreakpoint(nome, tam)` · `addFixedClass(nome, "p: v; p2: v2")` · `addProcessor(prefixo, fn)` · `addComponent(nome, [classes])` | Extensões em runtime (**só após init**); cada uma reprocessa o DOM. |
| `build(html, {minificar})` | Gera CSS estático (string) para um HTML, sem DOM vivo. |
| `exportar({nome, minificar, incluirCabecalho})` | Baixa o CSS **realmente gerado** na página como `.css` e devolve a string. |
| `stats()` | Cache (hits/misses) e contagem de config. |
| `versao` | `"2.2.5"`. |

### 8.4 Evitar FOUC / produção estática
1. Abra a página, deixe renderizar e rode `BreezeCSS.exportar({ nome: "site", minificar: true })` → baixa `site.css` portável (seletores `data-breeze-id` são convertidos em seletores de classe).
2. Linke esse CSS e remova o bundle (perde as classes dinâmicas e os **plugins com JS**: Glass/Progress/Scrollbar precisam do JS em runtime; Dividers e as classes CSS puras exportam bem).
3. Ou use `BreezeCSS.build(htmlString)` em Node com `jsdom`.
Para atenuar o flash sem exportar: carregue o bundle síncrono no `<head>` e, se necessário, esconda `body` até pronto (`body{visibility:hidden}` + mostrar após `DOMContentLoaded`/`requestAnimationFrame`).

### 8.5 O que NÃO existe (não gere)
`w-full`, `h-screen`, `container`, escala numérica (`p-4`), paleta (`bg-blue-500`), `space-x/y-*`, `divide-*`, `bg-clip-text`/`bg-clip`, `fill-*`/`stroke-*`, `overflow[...]`/`display[...]` arbitrários (só fixas), `transition[...]`, `group-hover`, `peer`. Para o que falta, use CSS próprio ou adicione com `addFixedClass`/`addMapping`.

---

## 9. Plugins

Todos seguem o mesmo contrato: objeto `{ nome, versao, setup(ctx), actualizar() }`, com `.criar(opcoes)` para uma instância configurada. `ctx` expõe `addMapping`, `addFixedClass`, `addVariant`, `addBreakpoint`, `addProcessor`, `config`. Variantes/breakpoints funcionam com as classes de plugin (`md:glass-lg`, `hover:divider-curve`). Todos respeitam `prefix` (aplicado também às classes do plugin).

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

### 9.5 Criando um plugin próprio
```js
const MeuPlugin = {
  nome: "meu-plugin", versao: "1.0.0",
  setup(ctx) {
    ctx.addFixedClass("card-pro", "background-color: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.1)");
    ctx.addMapping("accent", "--accent");                       // accent[#f0f] → --accent: #f0f
    ctx.addProcessor("accent", v => v);                          // opcional
    ctx.addVariant("group-hover", ".group:hover &");
    ctx.addBreakpoint("3xl", "1920px");
    // se precisar reprocessar elementos existentes após use():
    if (window.BreezeCSS) Promise.resolve().then(() => BreezeCSS.processar());
  }
};
// registrar: BreezeConfig.plugins = [MeuPlugin]  (antes do init)  ou  BreezeCSS.use(MeuPlugin)  (depois)
```
Regra importante: o Breeze **separa declarações por `;`** e o nome da propriedade pelo **primeiro `:`**. Nunca use `;` dentro de um valor (use `encodeURIComponent`, como o Dividers faz em data-URIs).

---

## 10. Armadilhas e diagnóstico

| Sintoma | Causa | Correção |
|---|---|---|
| Nada estilizado | Bundle não carregou, ou erro antes do init | Console: `BreezeCSS.stats()`; confirme `<style id="breeze-v2-estilos">` no `<head>`. |
| `glass`/`divider-*`/`progress`/`scrollbar` não fazem nada | Plugins não registrados | Snippet da seção 2.2. |
| Plugin registrado e continua sem efeito | `BreezeCSS.use()` chamado cedo demais (perdido) | Use `BreezeConfig.plugins` (cedo) ou `use` (após init). |
| `BreezeConfig` ignorado | `add*`/`use`/`addComponent` chamados antes do init | Só depois do init (2.3). |
| `p[16]` / `w[100]` não aplicam | Sem unidade | `p[16px]`, `w[100%]`. |
| `text[18px]` não muda o tamanho | `text` é cor | `text-size[18px]`. |
| Borda não aparece | `border[1px]` sem estilo | `border[1px_solid_#ccc]`. |
| `md:` não vence a base | Ordem das classes/inserção (6.3) | Base antes das variantes; considere `safelist`. |
| Dois filtros/dois shadows se anulam | Mesma propriedade (`filter`/`box-shadow`) | Um único `filter[...]` / `shadow[...]`. |
| `hover:` de transform substitui o base | Contextos independentes | Repita no `hover:` os transforms desejados (ex.: `hover:translate-x[10px] hover:scale[1.1]`). |
| `dark:rotate[...]` sempre ativo | Variantes com `&` ignoradas em transforms | Evite; use outra propriedade. |
| `before:`/`after:` sem conteúdo | Falta `content` | `before:content['']`. |
| Margens/paddings "sumiram" em `h1`, `p`, `ul` | Reset global ligado | Defina `m[..]`/`p[..]` ou `reset: false`. |
| `transition[...]` ignorado ("Prefixo desconhecido") | Não existe | `transition` + `duration[..]`, ou `transition-prop[...]`. |
| Classe com `]` no valor falha | Regex não aceita `]` | Use `var()` ou CSS próprio. |
| Warnings "Prefixo desconhecido"/"Qualificador desconhecido" | Classe inventada/estilo Tailwind | Consulte seções 4–6; silencie com `log: false` só depois de corrigir. |
| `prefix: "bz-"` quebra `blur`, `rotate`, `cols`, `ring`, `aspect`, `fw`, `bg-gradient`, `divider-*[n]`… | **O prefixo é aplicado só a `classesFixas` e `mapaPropriedades`; processadores e lista de transforms ficam sem prefixo.** | Evite `prefix` quando usar esses utilitários. |
| Flash de conteúdo sem estilo | CSS gerado em runtime | Seção 8.4. |
| `exportar()` não baixa | Ambiente sem DOM, ou regras vazias | Rode no navegador após o init. |

**Depuração rápida:**
```js
BreezeCSS.stats();            // cache e config
BreezeCSS.reiniciar(); BreezeCSS.init({ debug: true });   // loga cada regra gerada
document.getElementById("breeze-v2-estilos").sheet.cssRules.length;
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
> `cols[1]` precisa vir antes de `sm:`/`lg:` (6.3). Alternativa sem breakpoints: `cols[repeat(auto-fit,minmax(240px,1fr))]`.

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

## 12. Tradução rápida Tailwind → Breeze

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

## 13. Checklist antes de entregar código ao usuário

1. [ ] Bundle carregado de forma **síncrona**; URL oficial da CDN (seção 1).
2. [ ] Se usei algum plugin (`glass`, `divider-*`, `progress`, `scrollbar`): snippet de registro da seção 2.2 presente.
3. [ ] Nenhum `BreezeCSS.add*`/`use` executando antes do init.
4. [ ] Todas as medidas têm **unidade** (`px`, `rem`, `%`, `vh`…); `text[...]` só para **cor**, `text-size[...]` para tamanho.
5. [ ] Espaços dentro de colchetes escritos como `_`; nenhum `]` dentro de valor.
6. [ ] Em cada elemento: **base → sm → md → lg → xl → hover/focus/dark**.
7. [ ] `border[...]` com estilo (`1px_solid_cor`) ou classe `solid`.
8. [ ] Sem classes inexistentes (`w-full`, `h-screen`, `container`, `bg-blue-500`, `transition[...]`, `group-hover`).
9. [ ] Filtros em um único `filter[...]`; `shadow` e `ring` não combinados em classes separadas.
10. [ ] Divisores com `w`, `h` e `bg`; Glass com algo visível atrás; Progress/Scrollbar na classe do elemento certo.
11. [ ] Considerei o reset global (margens/paddings zerados) e o FOUC (seção 8.4).
12. [ ] Não usei `prefix` junto com utilitários processados.
