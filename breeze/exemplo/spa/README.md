# Exemplos de integração — React, Vue e Angular

O runtime gerado pelo BreezeCLI mantém os `MutationObserver` dos plugins
originais, por isso funciona sem alterações quando:

- **React** altera `className` (re-render, hooks, lazy loading);
- **Vue** altera classes reactivas (`:class`, `<transition>`);
- **Angular** adiciona/remove elementos (`*ngIf`, router);
- a SPA navega entre páginas sem recarregar (o motor de CSS **não** é
  recriado em runtime — as classes novas exigem regenerar o CSS ou
  `--safelist`, ver "Limitações" no README principal).

## React / JSX (Cartao.jsx)

```jsx
export default function Cartao() {
  return (
    <div className="card">           {/* componente: glass + p[20px] */}
      <div className="progress progress-lg">…</div>
      <div className="scrollbar h[200px] overflow-auto">…</div>
    </div>
  )
}
```

Compilar: `npx breeze --split --plugins auto --inject`
(o modo `auto` lê `className="…"` dos .jsx/.tsx e dos `<script>` inline)

## Vue (Lista.vue)

```vue
<template>
  <div :class="aberto ? 'glass glass-lg' : 'glass-dark'">…</div>
</template>
```

## Angular (app.component.html)

```html
<section *ngIf="activo" class="custom-bg[topo]">…</section>
<!-- templates .component.html são varridos como .html -->
```

## Demonstração genérica (spa.html)

A página `test/fixtures/spa.html` monta/desmonta um `<section class="progress">`
com JavaScript puro — o mesmo fluxo de um framework. O teste
`test/browser.test.js` ("navegador: SPA — elementos montados/desmontados
dinamicamente") verifica que a barra aparece no mount e é limpa no unmount,
num Chromium real.
