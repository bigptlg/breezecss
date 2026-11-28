# breeze — BreezeCLI 1.1.2

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
BreezeCLI 1.1.0

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
✓ 2 páginas · 148 regras · 12,4 KB CSS · 38,1 KB runtime · 46 ms · motor 2.3.2
✓ cache: 2 hits / 0 misses (.breeze-cache/)
✓ Zero dependências npm externas
⚠ diagnóstico: 1 erro(s), 0 aviso(s) em 1 ficheiro(s)
  dashboard.html
    dashboard.html:12:30 [erro] variante-desconhecida: aria-expanded:flex — …
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
| `--ignore <regex>` | Ignora classes que casem a RegExp nos diagnósticos (repetível; também no `breeze.config.js`, chave `ignore`) |

### Diagnóstico e cache
| Flag | Descrição |
| --- | --- |
| `--strict` | Código de saída **1** quando houver ERROS de diagnóstico (para CI) |
| `--report text\|json` | Relatório em texto (agrupado por ficheiro, com `ficheiro:linha:coluna`) ou JSON no stdout para CI (avisos continuam no stderr). Por omissão: `text` |
| `--cache-dir <pasta>` | Pasta da cache incremental (por omissão `.breeze-cache/` — excluída do varrimento) |
| `--no-cache` | Ignora a cache: build completo, o manifest não é lido nem escrito |
| `--clean-cache` | Apaga a pasta da cache antes de gerar |

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
| `--force-engine` | Aceita um motor abaixo da versão mínima suportada (ver “Política de versões”) |

### Configuração
| Flag | Descrição |
| --- | --- |
| `--config <ficheiro>` | Lê um ficheiro de config (por omissão procura `breeze.config.js` na pasta actual) |
| `--init <ficheiro>` | Força a leitura de um init específico (normalmente desnecessário) |
| `--no-init` | Não procurar o init do projecto |

O `breeze.config.js` aceita **o mesmo objecto que passas ao `BreezeCSS.init`** no browser
— `tema`, `componentes`, `plugins`, `prefix`, `safelist`, `log` (ignorado) — mais omissões
de saída do CLI (`out`, `name`, `split`, `minify`, `allPluginCss`, `include`, `exclude`,
`inject`, `reset`, `smooth`, `engine`) e as novas chaves de diagnóstico/cache:
`strict` (boolean), `report` (`'text'`/`'json'`), `ignore` (lista de regexes),
`cacheDir` (string), `cache` (boolean; `false` equivale a `--no-cache`) e
`forceEngine` (boolean).

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

O CLI extrai do `breeze.bundle.js` **apenas os IIFEs dos seis plugins**
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

#### Folha de estilos em SPAs de longa duração (runtime)

- **Limpeza automática:** em SPAs que geram valores únicos (`w[${px}px]`) a
  folha crescia sem limite, porque cada classe nova deixava uma regra. Agora,
  quando passam `gcLimiar` regras novas desde a última limpeza (por omissão
  **2000**), numa pausa do browser removem-se as regras das classes que já não
  existem em nenhum elemento do documento. A safelist, as regras globais e as
  dos plugins nunca são removidas, e uma classe removida que reapareça volta a
  ser inserida pelo fluxo normal (no frame seguinte, como qualquer nó novo).
  `BreezeConfig = { gcLimiar: 0 }` desactiva; `BreezeCSS.coletar()` força-a e
  devolve quantas regras removeu; `BreezeCSS.stats().regrasActivas` mostra o
  tamanho actual. Para valores **contínuos** (largura de um slider, posição
  de um arrasto) continua a ser melhor `style=""` ou uma variável CSS: cada
  valor novo é uma regra nova até à próxima limpeza.
- **Shadow DOM:** o `<style>` do Breeze vive no `document.head`, por isso
  elementos dentro de um `shadowRoot` **não recebem estilo**. Em web
  components usa o modo compilado e inclui o CSS gerado no shadow root.

Exemplos de integração em [`exemplo/spa/`](exemplo/spa/README.md).

## Diagnóstico — fim das falhas silenciosas

O motor descarta classes inválidas **sem dizer nada**. O CLI 1.1 analisa cada
token do projecto (markup, scripts inline, templates JSX/Vue/Angular/Svelte)
contra a configuração interna do motor e produz diagnósticos com posição:

| Código | Severidade | Exemplo | O que significa |
| --- | --- | --- | --- |
| `prefixo-desconhecido` | erro | `marge[10px]` | O prefixo não existe no motor — a classe é descartada |
| `variante-desconhecida` | erro | `aria-expanded:flex` | A variante/breakpoint não existe neste motor (ex.: `has-[…]:`) |
| `sintaxe-invalida` | erro | `p[10px` · `p[]` · `p[1]0]` | Colchetes/parênteses por fechar, valor vazio, `]` dentro do valor |
| `estilo-tailwind` | aviso | `p-4` · `bg-blue-500` · `w-full` | Classe ao estilo Tailwind — sugere o equivalente Breeze (`p[1rem]`, `bg[#3b82f6]`, `w[100%]`) quando conhecido |
| `modificador-opacidade-nao-suportado` | erro | `bg[#000]/50` | O Breeze não tem `/50` — sugere o alfa no valor (`bg[#00000080]`) |
| `valor-perigoso` | erro | `p[1px</style>…]` · `bg[red/*]` · `m[1px}body{…]` · `w[1px;color:red]` | Valor arbitrário rejeitado pelo motor por segurança (fecha `<style>`, comentário sem fecho, `{` `}` ou `;` fora de parênteses). A mensagem diz o motivo |
| `classe-dinamica-suspeita` | aviso | `` `p[${n}px]` `` | Template literal — o valor só existe em runtime; sugere `--safelist` |
| `aviso-motor` | aviso | — | Avisos emitidos pelo próprio motor durante o build |
| `nao-breeze` | nota | `prose`, `cartao` | Classe própria do utilizador — **só aparece com `--verbose`** |

- **Ruído controlado**: só classes com forma de Breeze (têm `[` ou um
  qualificador `x:`) dão erro/aviso; palavras simples que não são do Breeze
  ficam no nível nota (visíveis só com `--verbose`).
- **Sugestões "querias dizer…?"** por distância de Levenshtein sobre os
  prefixos, variantes e breakpoints do motor (`hove:bg[red]` → `hover:bg[red]`).
- **Posições**: `ficheiro:linha:coluna` por classe, agrupadas por ficheiro no
  relatório de texto.
- **`--ignore <regex>`** (repetível, também no config) silencia falsos
  positivos; `--strict` devolve exit 1 se houver erros; `--report json`
  emite o relatório completo em JSON para CI.
- **`--watch`**: em cada rebuild só aparecem os diagnósticos **novos ou
  alterados** — os já conhecidos não são repetidos.

## Cache incremental

Sem cache, o `construir()` lia e compilava tudo em cada execução (500 páginas:
≈ 6 s em CSS único, ≈ 10 s em `--split`). O CLI 1.1 mantém uma cache em
`.breeze-cache/` (configurável com `--cache-dir`) que torna os builds
incrementais **sem alterar o resultado**:

- **Manifest JSON** com número de esquema. Um manifest ausente, corrompido ou
  de esquema antigo é ignorado e reconstruído — **nunca faz o build falhar**.
  Escritas atómicas (ficheiro temporário + rename).
- **Impressão digital global** = sha256 de: versão do CLI, hash do motor,
  prefix, reset, smooth, minify, split, plugins resolvidos, tema, safelist
  efectiva, mapa de componentes e ficheiro de config. Se mudar, **invalida
  tudo**.
- **Modo `--split`**: chave por página =
  `sha256(conteúdo normalizado + fantasma de safelist + digital)`. Se a chave
  coincide e o CSS de saída existe com o hash registado, o `motor.build()` e a
  escrita são saltados. O mesmo para os ficheiros de runtime JS (agrupados por
  assinatura de plugins).
- **Modo CSS único**: guarda a assinatura de classes de cada página; o CSS só
  é reconstruído quando a união/assinatura de classes ou a digital muda. Uma
  página que muda **sem classes novas** (só texto) não reescreve nada.
- **Normalização para o `--inject`**: o hash de cada página ignora tudo o que
  o próprio inject acrescenta — o `<link>` e o `<script>` geridos (com
  marcadores), os blocos `js-guard` (desembrulhados: a instrução original
  fica) e os comentários "bundle substituído". Os `<script src>` externos não
  têm classes e saem do hash. Sem isto, a segunda execução falharia sempre.
- **`--inject` continua a correr sempre** (depende dos caminhos, não do
  conteúdo do CSS) mas só escreve o HTML quando há alteração real.
- **Páginas apagadas**: as entradas do manifest são removidas e os outputs
  órfãos (CSS/JS de páginas que já não existem) são apagados.
- **`--watch`** usa a mesma cache e não entra em loop com as escritas do
  inject (rebuild sem alterações → 100% hits → zero ficheiros escritos).

O relatório mostra `cache: N hits / M misses` e a lista de órfãos apagados.
Adiciona `.breeze-cache/` ao `.gitignore` do projecto:

```gitignore
.breeze-cache/
```

**Números** (500 páginas sintéticas × 200 elementos, `scripts/bench.js`):

| Cenário | --split | CSS único |
| --- | --- | --- |
| Build a frio | 5,7 s | 5,7 s |
| Quente, sem alterações | 0,33 s (100% hits) | 0,28 s (100% hits) |
| Quente, 1 página alterada | **0,45 s — 7,9% do frio** ✓ | 3,7 s (65%) |

No modo `--split` o objectivo (< 10% do tempo a frio) fica cumprido: só a
página alterada é recompilada (o motor arranca uma vez, ≈ 15 ms, e o resto do
tempo é I/O). No **CSS único** o caso "1 página alterada" não chega a 10%
**por definição do modo**: a união de classes mudou, o ficheiro inteiro é um
só artefacto e o motor tem de o regenerar a partir de todas as páginas — o
ganho fica no caso "sem alterações" (4,9%), em que nada é reescrito. O que a
cache elimina em ambos os modos é o trabalho redundante: leituras,
normalizações, detecção de deps, diagnósticos e escritas das páginas
inalteradas.

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
3. A cópia incluída no pacote (`vendor/breeze.bundle.js`, motor 2.3.2)

Assim podes actualizar o bundle do projecto sem tocar no CLI.

### Política de versões

- O motor mínimo suportado está na constante `MOTOR_VERSAO_MINIMA`
  (`lib/engine.js`, actualmente **2.3.0** — é a versão que introduz
  `group-hover:`/`peer-*:` e os breakpoints máximos `max-md:`; com motores
  anteriores essas classes eram descartadas em silêncio).
- Um motor abaixo do mínimo faz o build **falhar com erro**; `--force-engine`
  contorna a verificação (por tua conta e risco).
- O relatório mostra sempre `motor X.Y.Z` e, com `--inject`, avisa por página
  quando o HTML refere um `breeze.bundle.js` cuja versão difere da usada na
  compilação.
- **Fonte única da versão do CLI**: `breeze/package.json`. O cabeçalho do CSS,
  o `--help`/`--version` e os README leem dela. O script
  `node scripts/sync-engine.js` copia o bundle da raiz do repositório para
  `vendor/`, **falha se as versões dos cabeçalhos (`BreezeCSS x.y.z`)
  divergirem** e sincroniza a versão do CLI nos README — corre-o depois de
  actualizar o motor ou a versão do pacote.

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
- Classes não-Breeze no HTML (ex.: `prose`, `cartao`) são ignoradas — o nível
  `nao-breeze` dos diagnósticos só aparece com `--verbose`; classes com forma
  de Breeze que o motor não reconhece (prefixo/variante/sintaxe) dão erro ou
  aviso no relatório (ver “Diagnóstico”).
- O CSS gerado tem cabeçalho com data/regras; regenera com `npx breeze` (ou deixa
  o `--watch` a fazê-lo).
- Sintaxe: `text[...]` é **cor**; para tamanho usa `font-size[...]` / `text-size[...]`.
  Hífenes finais fazem parte do prefixo (`text-[...]` não existe no Breeze).

## Testes

```bash
npm test          # node --test test/*.test.js
```

93 testes, incluindo **testes de navegador** (Chromium via playwright):
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
├─ lib/htmlscan.js        parser HTML (com posições por classe) + injeção de <link>
├─ lib/engine.js          hospedeiro VM do motor real + política de versões
├─ lib/cssgen.js          transforms, componentes, minificador, montagem
├─ lib/diagnostico.js     fim das falhas silenciosas (códigos, posições, Levenshtein)
├─ lib/cache.js           cache incremental (manifest, impressão digital, chaves)
├─ lib/escape.js          CSS.escape compatível com browsers
├─ lib/initscan.js        descoberta do BreezeCSS.init(…) do projecto
├─ lib/config.js          breeze.config.js (tema, componentes, omissões)
├─ lib/components.js      descoberta dos addComponent(…)
├─ scripts/sync-engine.js copia o motor da raiz para vendor/ e valida versões
├─ scripts/bench.js       benchmark da cache (500 páginas × 200 elementos)
├─ vendor/breeze.bundle.js  motor BreezeCSS 2.3.2 + plugins
└─ exemplo/               index.html + settings.html + doc.html (demonstração;
                          doc.html é a documentação viva do CLI, já com css/ gerado)
```

## Decisões de implementação (1.1)

Escolhas conservadoras tomadas onde a especificação deixava margem:

- **Versão do CLI 1.1.0** — o pacote dizia 1.0.0, o README da raiz 1.0.3 e o
  cabeçalho do CSS 1.0.0. Como esta versão acrescenta flags novas sem mudar
  nenhuma existente, fixou-se `1.1.0` em `package.json` (fonte única) e o
  `scripts/sync-engine.js` propaga-a aos README.
- **Severidades dos diagnósticos** — são **erro** os códigos que significam
  "a classe nunca gera CSS": `sintaxe-invalida`, `variante-desconhecida`,
  `prefixo-desconhecido`, `valor-perigoso` e `modificador-opacidade-nao-suportado`; são
  **aviso** os que significam "provavelmente não é o que queres":
  `estilo-tailwind`, `classe-dinamica-suspeita` e `aviso-motor`; `nao-breeze`
  é nota (só com `--verbose`). O `--strict` conta só os erros.
- **Cache e correcto com byte-a-byte** — quando uma página está em hit, nada
  é recompilado nem reescrito; quando está em miss, o caminho é exactamente o
  de sempre. O cabeçalho do CSS leva data/hora (comportamento existente),
  por isso os testes comparam os ficheiros sem o cabeçalho e os mtimes
  provam que os hits não reescrevem.
- **Análises guardadas por página** (deps, componentes, diagnósticos,
  desconhecidas) são reutilizadas apenas quando o conteúdo normalizado E a
  impressão digital coincidem — em caso de dúvida, o CLI recalcula.
- **`scripts/sync-engine.js`** copia sempre a raiz → `vendor/` e falha se, ao
  fim da cópia, as versões dos cabeçalhos divergirem; `vendor/` é sempre uma
  cópia da raiz, nunca o contrário.
- **Modo CSS único com 1 página alterada** não atinge < 10% do frio por
  definição do modo (a união de classes mudou → o ficheiro único é
  regenerado a partir de todas as páginas); ver “Cache incremental”.

## Validação semântica (2.3.1 / CLI 1.1.1)

O bundle usa `CSS.supports(propriedade, valor)` após resolver o tema e processadores especiais. Valores inválidos são descartados com diagnóstico. A cache de validação é limitada a 4096 entradas. O CLI inclui verificações conservadoras para espaçamento, cores nomeadas e transforms comuns, sem dependências obrigatórias. Opcionalmente, instala `css-tree` no ambiente do CLI para ampliar a cobertura gramatical (integração opcional não testada nesta entrega). `--strict` devolve 1 perante diagnósticos de valor inválido. A validação não garante valores calculados de variáveis CSS nem cobertura integral no CLI.

### API directa de compilação (Node)

`criarHospedeiro()` em `lib/engine.js` expõe `buildClasses(grupos)`. Cada grupo representa as classes de um elemento; mantenha os transforms do mesmo elemento no mesmo grupo. Retorna `{ regras, elementos }` tal como `build(html)`, mas não analisa HTML. A compilação CLI normal mantém a leitura do HTML para diagnósticos e plugins. Valores como `w[calc(100px+20px)]` recebem espaços em torno dos operadores binários reconhecidos; underscores continuam suportados. A cache incremental foi actualizada para preservar ordem e agrupamento de classes.
