<div align="center">

# BreezeCSS

**CSS directo. Contextos reais. Liberdade para construir.**

**v2.3.0** · Motor em runtime · Compilação opcional · Ecossistema de plugins

[Documentação](https://bigptlg.github.io/breezecss/) · [Código-fonte](https://github.com/bigptlg/breezecss) · [BreezeCLI no npm](https://www.npmjs.com/package/breezecss-cli)

</div>

---

## O que é o BreezeCSS?

O **BreezeCSS** é um motor de estilos utilitários que transforma classes HTML em CSS. A sua proposta não é reproduzir o Tailwind nem impor uma escala de design: **o valor que escreves é o valor que pretendes aplicar**.

```html
<section class="grid cols[1] md:cols[3] gap[20px] p[24px] bg[#0b1220]">
  <article class="rounded[18px] p[20px] bg[#182235] text[#f8fafc]">
    <h2 class="text-size[1.5rem] fw[700]">Sem escala obrigatória</h2>
    <p class="mt[8px] opacity[0.8]">Usa valores CSS à tua medida.</p>
  </article>
</section>
```

O Breeze cresceu para além de um conjunto de classes de prototipagem. Hoje integra **um motor de estilos em tempo de execução, variantes contextuais, composição de transforms, temas, componentes, seis plugins visuais e um compilador CLI**. Podes usar o mesmo vocabulário de classes em duas estratégias:

| Runtime (bundle) | Compilado (BreezeCLI) |
|---|---|
| Gera regras no browser conforme encontra classes | Gera CSS estático a partir dos ficheiros do projecto |
| Observa novos elementos e alterações de `class` | Não precisa do motor JIT no cliente |
| Ideal para experimentação e conteúdo dinâmico | Ideal para entrega controlada, CSS por página e menor JS de estilo |
| Plugins activados no browser | Plugins CSS exportados; JS de efeitos gerado quando necessário |

O modo compilado **não cria CSS para classes inventadas apenas depois do build**. Usa `--safelist`, análise de templates ou recompila quando adicionares classes dinâmicas.

## Começar em segundos

### 1. Runtime — um único script

```html
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
</head>
<body class="bg[#0b1220] text[#f8fafc] min-h[100vh] grid place-items[center]">
  <main class="p[32px] rounded[20px] bg[#17243b] text-center">
    <h1 class="text-size[clamp(2rem,5vw,4rem)] fw[800]">Olá, Breeze.</h1>
    <p class="mt[12px] text[#a9bfd8]">Sem ficheiro CSS obrigatório.</p>
  </main>
</body>
</html>
```

O bundle auto-inicializa em `DOMContentLoaded` (ou imediatamente se o documento já tiver carregado). Para desenvolvimento offline, substitui o URL por uma cópia local do **bundle 2.3.0**. A CDN só servirá a versão 2.3.0 depois de a publicares.

### 2. Activar plugins

Os seis plugins estão **incluídos no bundle**, mas é necessário registá-los. Quando o script é carregado sincronamente no `<head>`, define a configuração **depois do bundle e antes de `DOMContentLoaded`**:

```html
<script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
<script>
  window.BreezeConfig = {
    log: false,
    plugins: [BreezeGlass, BreezeBackgrounds, BreezePreloader],
    tema: { cores: { primario: '#00ee99', superficie: '#10192a' } }
  };
</script>
```

Inclui só os plugins utilizados. Se o Breeze já estiver inicializado, regista um plugin com `BreezeCSS.use(BreezeGlass)`. Evita chamar `BreezeCSS.add*` antes da inicialização: isso pode antecipar o init com configurações padrão.

### 3. Compilar para produção (BreezeCLI 1.0.3)

O CLI é uma ferramenta **separada do motor**; as versões não têm de coincidir. Requer Node.js 18 ou superior e não possui dependências npm de runtime.

```bash
npm install -D breezecss-cli
npx breezecss-cli --split --plugins auto --inject
```

Também podes executar o CLI local com `node bin/breeze.js` a partir do pacote. Com `--split`, cria um CSS por HTML; `--plugins auto` detecta os plugins necessários; `--inject` insere ou actualiza as referências nos HTML. Para desenvolvimento contínuo:

```bash
npx breezecss-cli --watch --split --plugins auto --inject
```

O CLI oferece ainda `--tpl` (classes em JSX/TSX/Vue/Angular/Svelte), `--safelist`, `--tema`, `--prefix`, `--web-root`, `--minify`, `--no-reset` e `--clean`. A limpeza usa manifesto e protege ficheiros que não foram gerados pelo CLI. Consulta `npx breezecss-cli --help` e a [documentação do CLI](https://bigptlg.github.io/breezecss/cli.html) para os detalhes.

## Uma sintaxe aberta

O padrão central é `prefixo[valor]`. Os valores arbitrários não dependem de uma escala de espaçamentos ou de uma paleta predefinida.

| Pretendes | Escreve |
|---|---|
| Padding de 22 px | `p[22px]` |
| Fundo exacto | `bg[#003]` |
| Cor e tamanho do texto | `text[#fff] text-size[18px]` |
| Grelha de três colunas | `grid cols[3]` |
| Borda completa | `border[1px_solid_#334155]` |
| Gradiente | `bg-gradient[135deg,#003,#00ee99]` |
| Desfoque | `blur[4px]` |
| Proporção | `aspect[16/9]` |
| Transição | `transition duration[200ms]` |
| Transformações | `translate-y[-4px] rotate[5deg] scale[1.05]` |
| Importância | `bg[red!]` ou `hidden!` |

**Regras de leitura:** os `_` dentro de `[...]` representam espaços CSS, excepto em funções como `url()` e `var()` em que são preservados. Usa unidades (`px`, `rem`, `%`, `vh`) onde a propriedade as exige. `text[...]` é **cor**; `text-size[...]` é **font-size**. As classes fixas, como `flex`, `grid`, `hidden`, `items-center`, `rounded-xl`, `transition`, continuam disponíveis.

### Variantes contextuais (2.3.0)

As variantes descrevem **quando** aplicar uma classe, sem introduzir JS para estados que o CSS já conhece.

| Contexto | Variantes | Quando usar |
|---|---|---|
| Interacção | `hover:`, `focus:`, `focus-visible:`, `active:`, `disabled:` | Estados do próprio elemento |
| Foco dentro | `focus-within:` | Campos e formulários compostos |
| Antepassado | `group-hover:`, `group-focus-within:` | Cartões e componentes com filhos reactivos |
| Irmão anterior | `peer-hover:`, `peer-focus:`, `peer-checked:`, `peer-disabled:`, `peer-invalid:` | Formulários sem JS de apresentação |
| Largura mínima | `sm:`, `md:`, `lg:`, `xl:`, `2xl:` | Layout mobile-first |
| Largura máxima | `max-sm:`, `max-md:`, `max-lg:`, `max-xl:`, `max-2xl:` | Limitar estilos abaixo de um breakpoint |
| Preferências | `motion-reduce:`, `motion-safe:` | Acessibilidade e animação |
| Meio de saída | `print:` | Impressão |

```html
<!-- O filho reage ao hover no cartão inteiro. -->
<article class="group p[24px] rounded-xl bg[#17243b]">
  <h2 class="text[white] group-hover:text[#00ee99]">Título</h2>
</article>

<!-- O aviso reage ao checkbox anterior. -->
<input id="aceitar" type="checkbox" class="peer">
<label for="aceitar">Aceito</label>
<p class="hidden peer-checked:block">Confirmado!</p>

<!-- Composição de contextos. -->
<div class="p[12px] md:p[24px] max-md:bg[#eef] print:p[0]">
  Conteúdo adaptável
</div>
```

`group` deve estar num **antepassado**. `peer` deve estar num **irmão anterior** ao elemento afectado (usa o combinador CSS `~`). Não existem grupos nomeados nem uma família ilimitada de `peer-*`.

#### Floating label com `peer-focus:`

```html
<div class="relative">
  <input id="email" type="email" class="peer w[100%] h[64px] p[22px_12px_8px]" placeholder=" ">
  <label for="email" class="absolute left[12px] top[50%] translate-y[-50%] pointer-events-none transition duration[200ms] peer-focus:top[8px] peer-focus:translate-y[0] peer-focus:text-size[12px]">
    Email
  </label>
</div>
```

O rótulo sobe **durante o foco**. Para o manter elevado depois de o campo perder o foco e continuar preenchido, acrescenta lógica própria; `peer-placeholder-shown:` **não existe** nesta versão.

### Breakpoints e cascata previsível

Os breakpoints padrão são `sm=640px`, `md=768px`, `lg=1024px`, `xl=1280px` e `2xl=1536px`. Podes adicionar outros com `breakpoints` ou `BreezeCSS.addBreakpoint()`.

O motor 2.3.0 ordena regras de classe por contexto: **base → `max-*` (limites decrescentes) → `min-*` (crescentes) → movimento → impressão**. Assim, a ordem em que as classes aparecem no DOM deixa de determinar a precedência entre breakpoints. A especificidade do CSS e `!important` continuam a contar; não são criadas `@layer` automáticas.

```html
<div class="lg:p[60px] p[20px] md:p[40px] sm:p[30px]">…</div>
<div class="md:max-xl:group-hover:p[20px]">…</div>
```

O segundo exemplo só reage ao hover de um antepassado `.group` entre `md` e `xl`. O `max-*` termina imediatamente antes do limite correspondente (`max-md` termina em `767.98px`).

## Seis plugins, um ecossistema

Os plugins são opcionais e disponibilizados como objectos globais no bundle:

| Plugin | Versão | Para quê? | Exemplo |
|---|---|---|---|
| **BreezeGlass** | 1.0.0 | Glassmorphism e refração visual | `glass glass-lg glass-refract` |
| **BreezeDividers** | 1.2.0 | Divisores SVG com formas configuráveis | `divider-wave-flip[5]` |
| **BreezeProgress** | 1.0.0 | Progresso de scroll ou visibilidade | `progress progress-color[#00ee99]` |
| **BreezeScrollbar** | 1.0.0 | Scrollbars personalizadas | `scrollbar scrollbar-thumb[#00ee99]` |
| **BreezePreloader** | 1.6.0 | Carregamento de página ou elemento | `preloader preloader-speeder preloader-min[800ms]` |
| **BreezeBackgrounds** | 1.5.0 | Fundos procedurais SVG, estáticos ou animados | `custom-bg[estrelas] custom-bg-animate` |

```html
<!-- Preloader de página; no elemento usa o modo local por omissão. -->
<body class="preloader preloader-target[page] preloader-iris preloader-bg[#003]">

<!-- Palavras personalizadas e tempo entre trocas. -->
<div class="preloader preloader-words[Carregar,Preparar,Concluir] preloader-words-speed[750ms]">
  Conteúdo em carregamento
</div>

<!-- Fundo animado que respeita movimento reduzido. -->
<section class="custom-bg[aurora] custom-bg-anim[drift_pulse] custom-bg-anim-speed[0.7]">
  …
</section>
```

Os fundos incluem `topo`, `waves`, `flow`, `ripples`, `ridges`, `picos`, `espiral`, `grelha`, `interferencia`, `marmore`, `colmeia`, `celulas`, `agata`, `dunas`, `raios`, `pontos`, `mosaico`, `aurora`, `cubo` e `estrelas`. Personaliza-os com `custom-bg-color[...]`, `custom-bg-line[...]`, `custom-bg-levels[...]`, `custom-bg-glow[...]`, `custom-bg-anim[...]`, `custom-bg-anim-speed[...]` e outros parâmetros.

Os preloaders incluem `ring`, `dots`, `bars`, `pulse`, `bar`, `orbit`, `speeder` e `words`, com saídas como `fade`, `curtain`, `zoom`, `iris`, `wipe` e `cinematic`. Para uma página inteira, `preloader-target[page]` força o alvo de página mesmo quando a classe está num elemento interior. Para um preloader local, a ocultação é manual ou por remoção da classe.

## Temas, componentes e extensibilidade

```html
<script src="https://cdn.pedrodeoliveira.me/js/breeze.bundle.js"></script>
<script>
  window.BreezeConfig = {
    tema: {
      cores: { primario: '#00ee99', fundo: '#0b1220' },
      espacamento: { secao: '32px' },
      fontes: { corpo: 'Inter, sans-serif' }
    },
    breakpoints: { tablet: '900px' },
    prefix: '',
    safelist: ['hidden', 'tablet:p[32px]'],
    reset: true,
    scrollSmooth: true
  };
</script>
```

```html
<section class="bg[fundo] p[secao] font-family[corpo] tablet:p[48px]">
  <h2 class="text[primario]">Tema personalizado</h2>
</section>
```

Depois da inicialização, podes registar componentes e extensões:

```js
BreezeCSS.addComponent('card', [
  'p[24px]', 'rounded-xl', 'bg[#17243b]',
  'hover:scale[1.02]', 'transition'
]);
BreezeCSS.addVariant('open', '[open] &');
BreezeCSS.addBreakpoint('wide', '1600px');
```

Com `prefix: 'bz-'`, os utilitários passam a ser `bz-flex`, `bz-bg[#003]`, `hover:bz-blur[4px]`, etc. Os marcadores relacionais continuam a ser `.group` e `.peer`.

### API principal

| Método | Utilização |
|---|---|
| `BreezeCSS.init(config)` | Inicializar manualmente (se ainda não inicializado) |
| `BreezeCSS.processar()` | Reprocessar elementos |
| `BreezeCSS.reiniciar()` | Limpar estilos, cache e observer |
| `BreezeCSS.use(plugin)` | Registar plugin |
| `BreezeCSS.addMapping(...)`, `addProcessor(...)`, `addFixedClass(...)` | Estender o motor |
| `BreezeCSS.addVariant(...)`, `addBreakpoint(...)`, `addComponent(...)` | Criar contextos, breakpoints e componentes |
| `BreezeCSS.build(html, opções)` | Gerar CSS estático em ambiente com `DOMParser` |
| `BreezeCSS.exportar(opções)` | Exportar CSS gerado na página |
| `BreezeCSS.exportarPlugins(opções)` | Exportar CSS por plugin |
| `BreezeCSS.stats()` | Inspeccionar estatísticas |

Para SPAs, o motor observa alterações de `class` e novos elementos com `MutationObserver` e agrupa mutações por frame. **Não precisas de reinicializar a cada mudança de rota**. No modo compilado, os estilos têm de estar presentes no CSS gerado; os efeitos JS dos plugins podem continuar a funcionar através do runtime específico.

## Desempenho e acessibilidade

O motor usa cache de classes/regras, `MutationObserver` com agrupamento por `requestAnimationFrame` e **inserção ordenada de regras com ranks em cache e pesquisa binária**, evitando reler a folha CSS a cada classe. A actualização de transforms utiliza um índice por contexto. Isto não significa que a inserção no CSSOM tenha custo constante: mede sempre no teu projecto.

O scroll suave automático (`scrollSmooth: true`) só é aplicado com `prefers-reduced-motion: no-preference`; as classes explícitas `scroll-smooth` e `scroll-auto` mantêm o seu significado. Os fundos animados e alguns efeitos dos plugins também respeitam as preferências de movimento reduzido.

## Limites e escolhas conscientes

- O Breeze **não é um catálogo de escalas**: `p-4`, `w-full`, `bg-blue-500` e outras classes específicas do Tailwind não são parte da API.
- Os valores arbitrários precisam de sintaxe válida e unidades quando exigidas pelo CSS. `transition[all_0.2s]` não é um prefixo arbitrário do motor; usa `transition duration[200ms]` ou `transition-prop[all_0.2s_ease]`.
- `blur[...]` e `brightness[...]` escrevem ambos em `filter` e podem sobrescrever-se. Usa `filter[blur(4px)_brightness(1.1)]` para combinar.
- `ring[...]` e `shadow[...]` escrevem ambos em `box-shadow`; combina-os numa única declaração quando necessário.
- As variantes relacionais respeitam a estrutura HTML: `group-*` procura um antepassado `.group`; `peer-*` só alcança irmãos seguintes de `.peer`.
- A versão de runtime requer JavaScript para gerar estilos. Para evitar FOUC e reduzir trabalho no cliente, usa o BreezeCLI e CSS pré-compilado.
- O CLI não interpreta arbitrariamente valores que só surgem em execução; prepara `--safelist` ou recompila.

## Estrutura e documentação

O **bundle IIFE** é o ponto de entrada recomendado para o runtime actual. O CLI contém uma cópia do motor em `vendor/breeze.bundle.js` e usa-o para compilar, além de gerar runtime dos plugins quando necessário. **Não assumas que os módulos históricos `core/` representam o motor mais recente**: o bundle continuou a evoluir.

- [Documentação BreezeCSS](https://bigptlg.github.io/breezecss/) — sintaxe, variantes, plugins, API e exemplos.
- [Documentação BreezeCLI](https://bigptlg.github.io/breezecss/cli.html) — build, inject, temas, plugins e produção.
- [`BREEZE.DOC.AI.md`](./BREEZE.DOC.AI.md) — referência técnica para agentes de IA e geração de código sem inventar classes.

## Licença e autoria

**MIT** · Criado e mantido por **Pedro de Oliveira**.

[GitHub](https://github.com/bigptlg/breezecss) · [LinkedIn](https://www.linkedin.com/in/pedro-oliveira-po) · [Portefólio](https://pedrodeoliveira.me)
