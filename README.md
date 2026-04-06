# BreezeCSS v2.0

**Runtime CSS Engine — Utilitários dinâmicos no HTML, zero build step.**

---

## Instalação

```html
<!-- Bundle (recomendado — sem módulos ES) -->
<script src="breeze.bundle.js"></script>

<!-- Módulos ES -->
<script type="module" src="breeze.js"></script>
```

Auto-inicializa ao carregar. Configuração opcional via `window.BreezeConfig`:

```html
<script>
window.BreezeConfig = {
  debug: false,
  tema: {
    cores: { primario: '#00ff88', escuro: '#0a0a0f' }
  }
}
</script>
<script src="breeze.bundle.js"></script>
```

---

## Sintaxe

### Classes arbitrárias

```html
<div class="p[20px] bg[#1a1a2e] text[white] rounded-xl">
```

### Classes fixas

```html
<div class="flex items-center justify-between gap[16px]">
```

### Variantes (hover, focus, etc.)

```html
<button class="bg[blue] hover:bg[darkblue] focus:outline-none transition">
```

### Breakpoints

```html
<div class="flex-col md:flex-row lg:gap[32px]">
```

### Breakpoints + Variantes compostos

```html
<div class="md:hover:bg[primario] lg:focus:text-size[18px]">
```

### Tema

```html
<!-- bg[primario] resolve para a cor do tema -->
<div class="bg[primario] text[escuro]">
```

---

## API

```js
// Inicialização com config
BreezeCSS.init({
  debug: false,
  reset: true,
  tema: {
    cores: { primario: '#00ff88' },
    espacamento: { sm: '8px', md: '16px' }
  },
  breakpoints: { tablet: '900px' },
})

// Processar manualmente (após HTML dinâmico)
BreezeCSS.processar()

// Modo build — gera CSS estático
const css = BreezeCSS.build(htmlString, { minificar: true })

// Plugin
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

// Componentes
BreezeCSS.addComponent('btn', [
  'px[16px]', 'py[8px]',
  'rounded-md', 'font-medium', 'transition'
])
// <button class="btn">

// Extensão directa
BreezeCSS.addMapping('prefixo', 'propriedade-css')
BreezeCSS.addVariant('disabled', ':disabled')
BreezeCSS.addBreakpoint('xxl', '1800px')
BreezeCSS.addFixedClass('glass', 'backdrop-filter: blur(10px)')

// Stats de cache
BreezeCSS.stats()
```

---

## Arquitectura

```
breezecss-v2/
├── breeze.bundle.js      ← Bundle IIFE (para <script src="">)
├── breeze.js             ← Entry point (módulos ES)
├── core/
│   ├── engine.js         ← Motor principal
│   ├── parser.js         ← Interpretação de classes
│   ├── renderer.js       ← Injecção de CSS no DOM
│   ├── cache.js          ← Cache inteligente
│   ├── observer.js       ← MutationObserver
│   └── logger.js         ← Sistema de logging
├── tests/
│   └── breeze.test.js    ← 55 testes (node tests/breeze.test.js)
└── index.html            ← Playground de demonstração
```

---

## Melhorias v2 vs v1

| Feature | v1 | v2 |
|---|---|---|
| Performance | `querySelectorAll('*')` a cada mudança | MutationObserver — só o que muda |
| Transforms | rotate sobrescreve scale ❌ | Combinados automaticamente ✅ |
| Variantes compostas | Apenas 1 | `md:hover:focus:classe` ✅ |
| Sistema de temas | ❌ | `bg[primario]` → cor do tema ✅ |
| Plugins | ❌ | `BreezeCSS.use(plugin)` ✅ |
| Componentes | ❌ | `addComponent('btn', [...])` ✅ |
| Modo build | ❌ | `BreezeCSS.build(html)` → CSS ✅ |
| Logging | `console.log` simples | Níveis + histórico ✅ |
| Arquitectura | 1 ficheiro monolítico | 6 módulos separados ✅ |
| Testes | ❌ | 55 testes ✅ |

---

## Classes de animação

```html
<div class="animate-spin">    <!-- rotação contínua -->
<div class="animate-pulse">   <!-- fade loop -->
<div class="animate-bounce">  <!-- salto loop -->
<div class="animate-ping">    <!-- expansão loop -->
<div class="animate-fade-in"> <!-- fade de entrada -->
<div class="animate-slide-in"><!-- slide de entrada -->
```

---

## Testes

```bash
node tests/breeze.test.js
# 55/55 passados ✅
```

---

## Licença

MIT
