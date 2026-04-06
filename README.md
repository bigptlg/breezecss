# 🌬️ BreezeCSS v2 — Runtime CSS Engine

BreezeCSS é um motor de CSS em runtime que permite criar estilos usando classes utilitárias diretamente em HTML — sem build step, sem configuração obrigatória. Inspirado em Tailwind, mas simples, rápido e totalmente em português, com suporte para temas, plugins, componentes, variantes compostas e modo build.

---

## 📦 Instalação

### 🔌 1. Via Bundle (recomendado — sem módulos ES)

```html
<script src="breeze.bundle.js"></script>
```

### 🧩 2. Via Módulos ES

```html
<script type="module" src="breeze.js"></script>
```

A biblioteca auto-inicializa ao carregar. Para desativar o auto-init, adiciona o atributo `data-no-auto-init` à tag `<script>`.

### 🌐 3. Via CDN — Bundle (IIFE)

```html
<script src="https://cdn.jsdelivr.net/gh/bigptlg/breezecss@latest/breeze.bundle.js"></script>
```

### 🌐 4. Via CDN — Módulos ES

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/bigptlg/breezecss@latest/breeze.js"></script>
```

> **Nota:** O `type="module"` é obrigatório — sem ele o browser não reconhece os `import` internos. A pasta `core/` tem de estar acessível no mesmo repositório para os imports relativos funcionarem corretamente.

---

## ⚙️ Configuração (Opcional)

A configuração é passada via `window.BreezeConfig` **antes** de carregar o script:

```html
<script>
window.BreezeConfig = {
  debug: false,
  reset: true,

  // Sistema de temas
  tema: {
    cores: {
      primario: '#00ff88',
      escuro: '#0a0a0f'
    },
    espacamento: {
      sm: '8px',
      md: '16px',
      lg: '32px'
    }
  },

  // Breakpoints personalizados
  breakpoints: {
    tablet: '900px',
    desktop: '1440px'
  },

  // Regras globais
  regrasGlobais: {
    'body': {
      'font-family': 'Arial, sans-serif',
      'background-color': '#f4f4f9'
    }
  }
}
</script>
<script src="breeze.bundle.js"></script>
```

Ou via `BreezeCSS.init()` manualmente:

```js
BreezeCSS.init({
  debug: false,
  reset: true,
  tema: {
    cores: { primario: '#00ff88' },
    espacamento: { sm: '8px', md: '16px' }
  },
  breakpoints: { tablet: '900px' }
})
```

---

## 🧱 Sintaxe

### Classes arbitrárias

```html
<div class="p[20px] bg[#1a1a2e] text[white] rounded-xl"></div>
```

### Classes fixas

```html
<div class="flex items-center justify-between gap[16px]"></div>
```

### Variantes (hover, focus, active, visited)

```html
<button class="bg[blue] hover:bg[darkblue] focus:outline-none transition"></button>
```

### Breakpoints

```html
<div class="flex-col md:flex-row lg:gap[32px]"></div>
```

### Breakpoints + Variantes compostos

```html
<div class="md:hover:bg[primario] lg:focus:text-size[18px]"></div>
```

### Sistema de Temas

```html
<!-- bg[primario] resolve para a cor definida no tema -->
<div class="bg[primario] text[escuro]"></div>
```

Breakpoints padrão: `sm`, `md`, `lg`, `xl`, `2xl`. Podem ser adicionados personalizados via config ou API.

---

## 🎞️ Classes de Animação

```html
<div class="animate-spin">     <!-- rotação contínua -->
<div class="animate-pulse">    <!-- fade loop -->
<div class="animate-bounce">   <!-- salto loop -->
<div class="animate-ping">     <!-- expansão loop -->
<div class="animate-fade-in">  <!-- fade de entrada -->
<div class="animate-slide-in"> <!-- slide de entrada -->
```

---

## 🛠️ API JavaScript

### Inicialização e controlo

```js
// Inicializar com config
BreezeCSS.init({ debug: false, tema: { cores: { primario: '#00ff88' } } })

// Reiniciar completamente (limpa cache, observer e styles) — útil em SPAs e testes
BreezeCSS.reiniciar()

// Processar manualmente o DOM (após injeção dinâmica de HTML)
BreezeCSS.processar()

// Modo build — gera CSS estático a partir de HTML
const css = BreezeCSS.build(htmlString, { minificar: true })

// Estatísticas de cache e configuração
BreezeCSS.stats()
```

### Extensão em runtime

```js
BreezeCSS.addMapping('blur', 'filter')               // prefixo → propriedade CSS
BreezeCSS.addVariant('disabled', ':disabled')         // variante pseudo-classe
BreezeCSS.addBreakpoint('xxl', '1800px')             // breakpoint personalizado
BreezeCSS.addFixedClass('glass', 'backdrop-filter: blur(10px)') // classe fixa
BreezeCSS.addProcessor('blur', v => `blur(${v})`)    // processador de valores
BreezeCSS.addComponent('btn', ['px[16px]', 'py[8px]', 'rounded-md', 'font-medium', 'transition']) // componente
```

### Plugins

```js
BreezeCSS.use({
  nome: 'meu-plugin',
  setup(ctx) {
    ctx.addMapping('blur', 'filter')
    ctx.addVariant('group-hover', '.group:hover &')
    ctx.addBreakpoint('xxl', '1800px')
    ctx.addProcessor('blur', v => `blur(${v})`)
    ctx.addFixedClass('glass', 'backdrop-filter: blur(10px)')
  }
})
```

### Componentes

```js
// Registar um componente (atalho para múltiplas classes)
BreezeCSS.addComponent('btn', [
  'px[16px]', 'py[8px]',
  'rounded-md', 'font-medium', 'transition'
])
```

```html
<!-- Usar o componente diretamente no HTML -->
<button class="btn"></button>
```

---

## 📌 Exemplo Completo

```html
<div class="flex md:flex-row flex-col p[20px] bg[primario] hover:bg[escuro] rounded[12px]">
  <h1 class="text-size[2rem] font-bold animate-fade-in">Olá BreezeCSS v2</h1>
</div>
```

---

## 🏗️ Arquitetura

```
breezecss-main/
├── breeze.bundle.js      ← Bundle IIFE (para <script src="">)
├── breeze.js             ← Entry point (módulos ES)
├── core/
│   ├── engine.js         ← Motor principal
│   ├── parser.js         ← Interpretação de classes
│   ├── renderer.js       ← Injeção de CSS no DOM
│   ├── cache.js          ← Cache inteligente
│   ├── observer.js       ← MutationObserver
│   └── logger.js         ← Sistema de logging com níveis
├── tests/
│   └── breeze.test.js    ← 55 testes (node tests/breeze.test.js)
└── index.html            ← Playground de demonstração
```

---

## 🆚 Melhorias v2 vs v1

| Feature | v1 | v2 |
|---|---|---|
| Performance | `querySelectorAll('*')` a cada mudança | MutationObserver — só o que muda ✅ |
| Transforms | `rotate` sobrescreve `scale` ❌ | Combinados automaticamente ✅ |
| Variantes compostas | Apenas 1 nível | `md:hover:focus:classe` ✅ |
| Sistema de temas | ❌ | `bg[primario]` → cor do tema ✅ |
| Plugins | ❌ | `BreezeCSS.use(plugin)` ✅ |
| Componentes | ❌ | `addComponent('btn', [...])` ✅ |
| Modo build | ❌ | `BreezeCSS.build(html)` → CSS ✅ |
| Logging | `console.log` simples | Níveis + histórico ✅ |
| Arquitetura | 1 ficheiro monolítico | 6 módulos separados ✅ |
| Testes | ❌ | 55 testes ✅ |

---

## 🧪 Testes

```bash
node tests/breeze.test.js
# 55/55 passados ✅
```

---

## 🤔 Porquê usar BreezeCSS

- Acelera a prototipagem com classes utilitárias prontas a usar.
- Zero build step — cola o script e funciona.
- Sistema de temas e componentes reutilizáveis sem CSS externo.
- Arquitetura modular extensível via plugins.
- Totalmente em português, tornando mais intuitivo para desenvolvedores lusófonos.

---

## 🕒 Quando usar

- Projetos pequenos a médios que precisam de rapidez na implementação.
- Prototipagem rápida de interfaces responsivas.
- Equipas que valorizam consistência de classes e nomenclatura intuitiva.
- SPAs com HTML dinâmico (o MutationObserver lida automaticamente com as mudanças).

---

## 🚫 Quando não usar

- Projetos grandes e complexos onde um framework CSS estruturado (como Bootstrap ou Tailwind) já está implementado.
- Quando a performance de carregamento de JavaScript é crítica e não se quer adicionar scripts adicionais.
- Cenários onde o controlo absoluto do CSS puro é necessário sem abstrações.

---

## 📄 Licença

MIT

---

## 🧑‍💻 Autor

**Pedro de Oliveira**

- 🐙 GitHub — [bigptlg/breezecss](https://github.com/bigptlg/breezecss)
- 💼 LinkedIn — [pedro-oliveira-po](https://www.linkedin.com/in/pedro-oliveira-po)
- 📷 Instagram — [@pedro_oliveira.po](https://www.instagram.com/pedro_oliveira.po)
- 📘 Facebook — [pedrodeoliveirapo](https://www.facebook.com/pedrodeoliveirapo)
