# breeze — BreezeCLI 1.0.0

Gera o **CSS estático** do BreezeCSS **e o runtime JavaScript dos plugins** a
partir de todos os HTML do projecto — sem o `breeze.bundle.js` no cliente.
O CLI executa o **motor real** (`breeze.bundle.js`) numa VM Node — o CSS
produzido é byte-a-byte fiel ao que o runtime geraria no browser, incluindo
valores arbitrários, variantes (`hover:`, `focus:`, `dark:`), breakpoints
(`sm:` … `2xl:`), resets, keyframes e plugins.

```bash
npx breeze                                  # css/breeze.css
npx breeze --split                          # css/index.css, css/settings.css …
npx breeze --file index.html                # só uma página
npx breeze --watch --inject                 # rebuild automático + <link>/<script>
npx breeze --split --plugins auto --inject  # CSS + runtime por página, tudo injetado
```

Zero dependências npm — apenas módulos do Node (≥ 18).

A experiência típica:

```text
$ node bin/breeze.js --split --plugins auto --inject
BreezeCLI 1.0.0

✓ index.html
  CSS: dist/css/index.css
  JS:  dist/js/index.runtime.js
  Plugins: glass, progress

✓ dashboard.html
  CSS: dist/css/dashboard.css
  JS:  dist/js/dashboard.runtime.js
  Plugins: scrollbar, backgrounds

✓ CSS e JavaScript injetados
✓ Nenhuma referência duplicada
✓ 2 páginas · 148 regras · 12,4 KB CSS · 38,1 KB runtime · 46 ms
✓ Zero dependências npm externas
```

---

## Instalação

```bash
# num projecto qualquer (recomendado):
npm install ./breeze          # pasta deste pacote
npx breeze                    # pronto a usar

# ou, para usar em qualquer sitio:
cd breeze && npm link

# ou, sem instalar nada:
node ./breeze/bin/breeze.js
```

## Modos de geração

| Comando | Resultado |
| --- | --- |
| `npx breeze` | **Um único ficheiro** `css/breeze.css` com as classes de todas as páginas |
| `npx breeze --split` | **Um CSS por página**, com o nome do ficheiro: `index.html` → `css/index.css`, `settings.html` → `css/settings.css`, `pages/blog/post.html` → `css/pages_blog_post.css` |
| `npx breeze --file settings.html` | Processa **apenas esse HTML** (repetível; aceita caminhos directos: `npx breeze index.html`) |
| `npx breeze --split --file a.html --file b.html` | Só as páginas indicadas, cada uma com o seu CSS |

Cada ficheiro gerado é **autossuficiente**: reset, variáveis de tema,
keyframes e classes do plugin usadas nessa página.

## Opções

### Saída
| Flag | Descrição |
| --- | --- |
| `-o, --out <pasta>` | Pasta de saída — por omissão `css/` |
| `-n, --name <nome>` | Nome do CSS único (por omissão `breeze` → `css/breeze.css`) |
| `--split` | Um CSS por página (ver tabela acima) |
| `-f, --file <ficheiro>` | Processa apenas este(s) HTML (repetível) |
| `--clean` | Apaga a pasta de saída antes de gerar |
| `--inject` | Insere/actualiza o `<link>` do CSS **e** o `<script>` do runtime nos HTML — idempotente (marcadores `<!-- breeze:css -->` e `<!-- breeze:runtime -->`), actualiza caminhos, funciona com subpastas e substitui o `breeze.bundle.js` original (ver “Inject de CSS + JS”) |

### Filtros
| Flag | Descrição |
| --- | --- |
| `--include <glob>` | Padrões a incluir (repetível; omissão: `**/*.html`, `**/*.htm`) |
| `--exclude <glob>` | Padrões a excluir (repetível; omissão: `node_modules`, `.git`, pasta de saída) |
| `-p, --prefix <pfx>` | Prefixo das classes (ex.: `bz-`) — igual a `BreezeConfig.prefix` |
| `--safelist <classe>` | Gerar classes mesmo sem uso no HTML (repetível ou separadas por vírgulas) |

### CSS
| Flag | Descrição |
| --- | --- |
| `--minify` | CSS numa linha só (preserva strings, data-URIs e `calc()`) |
| `--no-reset` | Não incluir o reset CSS (`* { margin:0; padding:0 } …`) |
| `--no-smooth` | Não incluir `html { scroll-behavior: smooth }` |
| `--plugins all` | Todos os plugins (comportamento clássico) |
| `--plugins auto` | **Só o que o projecto usa**: analisa classes dos HTML, componentes (`addComponent`), templates JSX/TSX/Vue/Angular/Svelte e o `BreezeCSS.init` — e regista/exporta apenas esses |
| `--plugins glass,progress` | Lista explícita de plugins |
| `--no-plugins` | Não registar nenhum plugin |
| `--all-plugin-css` | Inclui o CSS completo de **todos** os plugins registados (glass, scrollbar, preloader), mesmo sem as classes serem usadas |
| `--tema <tema>` | Tema igual ao `BreezeCSS.init`: JSON completo (`--tema '{"cores":{"primaria":"#003"}}'`) ou pares pontuados repetíveis (`--tema cores.primaria=#003`) |
| `--engine <ficheiro>` | Caminho do `breeze.bundle.js` (ver “Motor”) |

### Configuração
| Flag | Descrição |
| --- | --- |
| `--config <ficheiro>` | Lê um ficheiro de config (por omissão procura `breeze.config.js` na pasta actual) |
| `--init <ficheiro>` | Força a leitura de um init específico (normalmente desnecessário) |
| `--no-init` | Não procurar o init do projecto |

O `breeze.config.js` aceita **o mesmo objecto que passas ao `BreezeCSS.init`** no browser
— `tema`, `componentes`, `plugins`, `prefix`, `safelist`, `log` (ignorado) — mais omissões
de saída do CLI (`out`, `name`, `split`, `minify`, `allPluginCss`, `include`, `exclude`,
`inject`, `reset`, `smooth`, `engine`).

**Descoberta automática do init:** sem `--config`, sem `--tema` e sem
`breeze.config.js`, o CLI procura `BreezeCSS.init({…})` e `window.BreezeConfig = {…}`
nos `.js`/`.mjs`/`.cjs` e nos `<script>` inline dos `.html` do projecto — e o tema,
os plugins, o prefix e o safelist desse init passam ao CSS exportado. Se os plugins
estiverem escritos com os identificadores do bundle (`BreezeGlass`, `BreezeDividers`…),
são convertidos para os nomes certos. A descoberta dá prioridade aos HTML
selecionados por `--file`; sem `--file`, prefere HTML na raiz do projecto,
antes dos JS e HTML aninhados. Se o pacote do CLI estiver dentro do projecto,
os seus exemplos, testes e código são excluídos automaticamente do varrimento.
Se existirem várias páginas com temas diferentes, usa compilações separadas ou
uma configuração comum (`breeze.config.js`): o build usa um tema global.

Precedência: omissões < init descoberto < `breeze.config.js` < flags CLI.

```js
// breeze.config.js — o mesmo objecto do BreezeCSS.init no browser
module.exports = {
  log: false,
  plugins: 'all',
  allPluginCss: true,
  tema: {
    cores: { primaria: '#003', secundaria: '#005', tercearia: '#fff' },
  },
}
```

Com isto, `bg[primaria]` gera `background: #003` e o CSS traz
`:root { --breeze-primaria: #003; … }` — exactamente como o init em runtime.

Se não criares nenhum config, o CLI procura o próprio `BreezeCSS.init(…)` nos JS e
HTML do projecto e usa o tema dele. E se mesmo assim houver classes com nomes de
cor sem tema aplicado (ex.: `bg[primaria]`), o relatório avisa e sugere a solução.

Nota: valores do tema funcionam nas classes de valor simples (`bg[primaria]`,
`text[secundaria]`, `border-color[secundaria]`, `p[nome]` com `espacamento`,
`font-family[nome]` com `fontes`). O shorthand multi-parte
`border[solid_2px_secundaria]` não resolve nomes do tema — limitação do motor;
usa `border[solid_2px] border-color[secundaria]` ou a cor literal. O mesmo vale
para a concatenação nome+alfa (`bg[terceariafff00]` não resolve — usa `bg[#ffffff00]`).

## Runtime Builder — JavaScript dos plugins sem o bundle

O CLI 1.0.0 extrai do `breeze.bundle.js` **apenas os IIFEs dos seis plugins**
(código 1:1, nenhum comportamento reescrito) e gera um ficheiro
`js/<página>.runtime.js` autónomo:

| Plugin | CSS | JavaScript no runtime |
| --- | --- | --- |
| **BreezeGlass** | base, blur, tint, a11y (`prefers-reduced-*`) | só com `glass-refract` — refração SVG `feDisplacementMap` + Canvas + `ResizeObserver` |
| **BreezeDividers** | máscaras SVG (18 formatos × orientações) | **nunca** — é 100% CSS |
| **BreezeProgress** | classes e variáveis | sempre que usado — cria a barra, escuta scroll, `MutationObserver` |
| **BreezeScrollbar** | CSS estático (WebKit + Firefox, hover, folga, ocultar) | aplica `[data-breeze-scrollbar]` e espelha body→html |
| **BreezePreloader** | animações e transições de saída | cria o overlay, `aria-busy`, remove no load |
| **BreezeBackgrounds** | presets | gera fundos (SVG/SMIL), `IntersectionObserver` |

À volta dos plugins, o runtime inclui um **núcleo mínimo**:

- `window.BreezeCSS` compatível: `init()`, `use()`, `addComponent()`,
  `processar()`, `reiniciar()` — páginas com `BreezeCSS.init(…)` do tempo do
  bundle **continuam a funcionar**, sem erros e sem setup duplicado dos
  plugins; `build()`/`exportar()` devolvem um aviso claro (o CSS é estático);
- **ponte de componentes**: os scans dos plugins
  (`document.querySelectorAll('[class*="…"]')`) passam a ver elementos que
  usam COMPONENTES cujos membros têm classes do plugin — um `.card` com
  membro `glass-refract` recebe a refração, sem mutação de DOM;
- protecção contra carga dupla (`__breezeRuntime` já existente → ignora);
- `window.__breezeRuntime.destruir()` para limpeza explícita.

### Modo compilado — limitações (importantes)

- **O motor de geração CSS NÃO vai para o cliente.** Classes que só aparecem
  em runtime (React/Vue/Angular criam elementos com classes novas) **não têm
  CSS**: regenera com o CLI, lista-as em `--safelist`, ou usa `--tpl`/`auto`
  para que o CLI as descubra nos templates e scripts (sempre que sejam
  identificáveis estaticamente).
- `tema` e `prefix` vindos de um `BreezeCSS.init()` em runtime são
  **ignorados com um aviso** — já estão no CSS compilado.
- Efeitos dinâmicos **dentro de componentes**: `glass-refract` funciona pela
  ponte de componentes; `progress`/`scrollbar`/`preloader` exigem a classe do
  plugin no próprio elemento (limitação herdada do runtime original — os
  motores desses plugins verificam a `classList`, que não pode ser mutada
  sem conflito com frameworks). A solução: aplicar a classe ao elemento ou
  a um wrapper.

### Compatibilidade SPA (React / Vue / Angular)

Os `MutationObserver` dos plugins originais ficam intactos, portanto:

- React a alterar `className`, Vue com classes reactivas e Angular a
  inserir/remover elementos continuam a activar/desactivar efeitos;
- elementos criados depois do arranque ganham os efeitos automaticamente;
- os plugins **limpam** observadores, listeners, hosts e elementos auxiliares
  quando os alvos saem do DOM (comportamento original, verificado em testes);
- os `ResizeObserver`/`IntersectionObserver`/Canvas/SVG reais do browser
  funcionam — verificado nos testes de navegador (Chromium/playwright).

Exemplos de integração em [`exemplo/spa/`](exemplo/spa/README.md).

## Inject de CSS + JS

`--inject` insere **os dois recursos** e mantém as páginas consistentes:

```html
<link rel="stylesheet" href="./css/index.css" data-breeze-cli="css">
<!-- breeze:css -->
<script src="./js/index.runtime.js" defer data-breeze-cli="runtime"></script>
<!-- breeze:runtime -->
```

- **Idempotente**: executar 2× não duplica nada (verificado por testes).
- **Caminhos**: sempre relativos à página (`../css/…` em subpastas) e
  actualizados quando a pasta de saída muda (`-o dist/css`).
- **Bundle original**: se a página carrega `breeze.bundle.js`,
  `breeze.min.js` ou `breeze--<plugin>.js`, a **primeira** referência é
  substituída no lugar pelo runtime (semântica sync preservada — os
  `BreezeCSS.init()` inline continuam a funcionar) e as restantes ficam
  comentadas. O CLI protege chamadas independentes a `BreezeCSS.init()`,
  `BreezeCSS.addComponent()` e outros métodos BreezeCSS nos scripts inline
  com `if (typeof BreezeCSS !== 'undefined')`, para que a falta do runtime
  não interrompa o JavaScript de outras bibliotecas (Emerge, Elyra, etc.).
  O restante código permanece intacto; referências não reconhecidas
  produzem um aviso em vez de alterações.
- **Sem bundle**: o runtime é injetado no fim do `</head>` com `defer` —
  excepto se existirem scripts inline que referenciem
  `BreezeCSS`/`BreezeConfig`/`Breeze*`, caso em que é inserido **antes
  deles e sem defer** para nunca haver `BreezeCSS is not defined`.
- **Guards idempotentes**: os blocos protegidos são identificados por comentários
  `breeze:cli-guard` e não são envolvidos novamente na compilação seguinte.
  A configuração original continua visível para a extração estática do tema
  e dos componentes. Apenas chamadas BreezeCSS independentes em scripts inline
  são protegidas; chamadas embutidas em expressões e ficheiros JS externos
  não são alterados.
- **Watch**: cada rebuild reinjeta/atualiza os dois recursos.

## Deteção de plugins em componentes

Um componente com membros de plugin leva o CSS **e o JS** do plugin para o
output, mesmo que o HTML só use o nome do componente:

```js
BreezeCSS.addComponent('card', ['glass', 'glass-dark', 'rounded[16px]', 'p[20px]'])
BreezeCSS.addComponent('card-refract', ['card', 'glass-refract[28]'])
```

```html
<div class="card">…</div>          <!-- leva o CSS do Glass -->
<div class="card-refract">…</div>  <!-- leva também o JS da refração -->
```

A expansão é **recursiva** (componente dentro de componente) e tem
**protecção contra referências circulares** — o CLI também achata as listas
de membros antes de as registar no motor, para o build nunca estourar a
pilha com ciclos.

## Scrollbar — CSS estático (funciona sem JS)

Além do CSS de suporte do plugin (`[data-breeze-scrollbar]::-webkit-scrollbar`,
Firefox com `scrollbar-color`/`scrollbar-width`, hover, espessura, folga,
canto, `scrollbar-none`), o CLI emite as **mesmas regras keyadas nas classes**
`.scrollbar` e `.scrollbar-none` — a personalização funciona directamente por
CSS, sem JavaScript, incluindo a variante `body.scrollbar` para a barra da
página. O runtime continua a aplicar os atributos e o espelho body→html
(necessário para variantes `md:`/`dark:` e para o espelhamento).

## Componentes (BreezeCSS.addComponent)

Os componentes registados no browser com `BreezeCSS.addComponent("btn", […])` são
**descobertos automaticamente** — nos `<script>` inline dos HTML processados e nos
ficheiros `.js` do projecto (nada é executado; a extração é textual). O CSS exportado
inclui as regras `.btn { … }`, as variantes `.btn:hover { transform: … }`, e as `@media`
dos membros com breakpoints (`md:p[64px]` → `@media (min-width: 768px) { .btn { … } }`).

```html
<script>
  BreezeCSS.addComponent("btn", [
    "no-underline", "text[tercearia]", "p[15px]", "inline-block",
    "rounded[10px]", "hover:translate-x[3px]", "hover:translate-y[-3px]",
    "rounded-full",
  ]);
</script>
```

Também podem ficar no `breeze.config.js` (chave `componentes` ou `components`):

```js
module.exports = {
  componentes: {
    btn: ['no-underline', 'p[15px]', 'hover:translate-x[3px]'],
    card: ['glass', 'glass-md', 'rounded[20px]', 'md:p[64px]'],
  },
}
```

Notas:
- em `--split`, o CSS de cada página só traz os componentes **usados nessa página**;
- os nomes dos componentes deixam de aparecer na lista “classes não geradas”;
- com `--prefix`, os membros são prefixados automaticamente (`p[15px]` → `bz-p[15px]`)
  e o componente também responde ao nome com prefixo (`bz-btn`).

### Extras
| Flag | Descrição |
| --- | --- |
| `-w, --watch` | Vigia os HTML, o `breeze.config.js` e o motor; reconstrói ao guardar |
| `--verbose` | Lista classes não geradas, avisos do motor, motor e plugins activos |
| `-v, --version` / `-h, --help` | Versão / ajuda |

## Motor (breeze.bundle.js)

O CLI procura o motor pela ordem:

1. `--engine <caminho>`
2. `breeze.bundle.js` (ou `breeze.min.js`) na pasta actual e **nas pastas acima**
3. A cópia incluída no pacote (`vendor/breeze.bundle.js`, v2.2.5)

Assim podes actualizar o bundle do projecto sem tocar no CLI.

## Como funciona

1. O CLI carrega o teu `breeze.bundle.js` numa VM Node com um DOM mínimo
   (`document.body = null` mantém os motores dos plugins inertes — só o
   gerador de CSS trabalha).
2. Por cada página chama `BreezeCSS.build(html)` (modo offline do próprio
   motor) e recebe as regras CSS.
3. Pós-processamento:
   - as regras dinâmicas `[data-breeze-id="bN"]` dos transforms são removidas
     e **regeneradas com seletores de classe**, incluindo a combinação
     rotate/scale/translate… no mesmo elemento
     (`.rotate\[45deg\].scale\[1.2\] { transform: rotate(45deg) scale(1.2) }`);
   - corrige o caso `prefix + transform` do motor (que emitiria `transform: 45deg`);
   - os componentes registados no browser (`addComponent`) são extraídos dos
     scripts, registados no motor e as suas regras de variante/transform são
     geradas com o seletor do componente (`.btn:hover { … }`);
   - o CSS de suporte dos plugins (glass, scrollbar, preloader…) só entra se
     as classes desse plugin forem usadas na página — com `--all-plugin-css`
     entra sempre, completo.

## Plugins — cobertura estática

| Plugin | No CSS estático | Precisa do JS em runtime |
| --- | --- | --- |
| `dividers` | 100 % (máscaras SVG) | não |
| `glass` | classes + fallbacks a11y | só para refracção (`glass-refract`) |
| `scrollbar` | classes + regras `::-webkit-scrollbar` | o atributo `[data-breeze-scrollbar]` é posto pelo JS |
| `progress` | classes (variáveis CSS) | sim (a barra é criada por JS) |
| `preloader` | classes | sim |
| `backgrounds` | classes (variáveis CSS) | sim (os fundos são gerados por JS) |

Páginas 100 % estáticas (sem JS): usa `--plugins glass,dividers`.

Sobre `progress` e `backgrounds`: as **variáveis e classes** exportadas são as
mesmas que o browser aplica (`--progress-color`, `--cbg-name`, …), mas a barra
de progresso em si e os fundos `custom-bg[...]` são **elementos/estilos criados
pelo JS** (presets → SVG inline). Para manteres esses visuais, mantém o
`breeze.bundle.js` + `BreezeCSS.init` na página (o CSS estático passa a ser
complemento), ou remove esses plugins das páginas 100 % estáticas.

## Notas

- A variante `dark:` pressupõe `class="dark"` num antepassado (`<html class="dark">`).
- Classes não-Breeze no HTML (ex.: `prose`, `cartao`) são ignoradas — o `--verbose`
  lista-as para confirmares que não é um erro de sintaxe.
- O CSS gerado tem cabeçalho com data/regras; regenera com `npx breeze` (ou deixa
  o `--watch` a fazê-lo).
- Sintaxe: `text[...]` é **cor**; para tamanho usa `font-size[...]` / `text-size[...]`.
  Hífenes finais fazem parte do prefixo (`text-[...]` não existe no Breeze).

## Testes

```bash
npm test          # node --test test/*.test.js
```

50 testes, incluindo **testes de navegador** (Chromium via playwright):
Canvas/SVG da refração do Glass, ResizeObserver/IntersectionObserver,
scroll real do Progress, overlay do Preloader do load à remoção, fundos do
Backgrounds, montagem/desmontagem dinâmica estilo-SPA e idempotência do
inject. O playwright é **opcional** (não é dependência do pacote): sem ele,
os testes de navegador são ignorados com um aviso claro sobre o que fica
pendente de verificação em browser real.

## Estrutura do pacote

```
breeze/
├─ bin/breeze.js          CLI
├─ lib/glob.js            descoberta de ficheiros (globs zero-deps)
├─ lib/htmlscan.js        parser HTML + injeção de <link>
├─ lib/engine.js          hospedeiro VM do motor real
├─ lib/cssgen.js          transforms, componentes, minificador, montagem
├─ lib/escape.js          CSS.escape compatível com browsers
├─ lib/initscan.js        descoberta do BreezeCSS.init(…) do projecto
├─ lib/config.js          breeze.config.js (tema, componentes, omissões)
├─ lib/components.js      descoberta dos addComponent(…)
├─ vendor/breeze.bundle.js  motor BreezeCSS 2.2.5 + plugins
└─ exemplo/               index.html + settings.html + doc.html (demonstração;
                          doc.html é a documentação viva do CLI, já com css/ gerado)
```
