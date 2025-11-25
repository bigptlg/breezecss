# BreezeCSS

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/bigptlg/breeze-css/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Author](https://img.shields.io/badge/author-Pedro%20de%20Oliveira-orange.svg)](https://github.com/bigptlg)

# 🌬️ BreezeCSS — Biblioteca de Classes Dinâmicas em Português

BreezeCSS é uma biblioteca leve e dinâmica que permite criar estilos usando classes utilitárias diretamente em HTML. Inspirado em Tailwind, mas simples, rápido e totalmente em português, com suporte para variantes, breakpoints e classes dinâmicas.

---

## 📦 Instalação

### 🔌 1. Usar via CDN (mais simples)

Adiciona o script no teu HTML:

```html
<script src="https://cdn.jsdelivr.net/gh/bigptlg/breezecss@latest/breeze.js"></script>
```

O BreezeCSS será carregado automaticamente com a configuração padrão.

### 💾 2. Instalação Local (Download)

**Passo 1 — Transferir o ficheiro**

Descarrega o ficheiro `breeze.js` do repositório e coloca-o no teu projeto, por exemplo:

```
/assets/js/breeze.js
```

**Passo 2 — Importar no HTML**

```html
<script src="/assets/js/breeze.js"></script>
```

O BreezeCSS estará pronto a usar.

---

## ⚙️ Configuração Manual (Opcional)

```html
<script>
document.addEventListener('DOMContentLoaded', () => {
    const minhaConfig = {
        log: false,

        // 1. Classes fixas personalizadas
        classesFixas: {
            'sombra-suave': 'box-shadow: 0 2px 15px rgba(0,0,0,0.1);',
            'texto-grande': 'font-size: 2.5rem; font-weight: bold;'
        },

        // 2. Novos mapeamentos dinâmicos
        mapaPropriedades: {
            'sombra': 'box-shadow',
            'transicao': 'transition'
        },

        // 3. Breakpoint personalizado
        breakpoints: {
            'desktop': '1440px'
        },

        // 4. Regras globais
        regrasGlobais: {
            'body': {
                'font-family': 'Arial, sans-serif',
                'background-color': '#f4f4f9'
            }
        }
    };

    // Inicializar BreezeCSS
    BreezeCSS.init(minhaConfig);
});
</script>
```

---

## 🧱 Classes Fixas

Exemplo:

```html
<div class="flex items-center justify-between"></div>
```

Algumas classes incluídas:

| Classe | Propriedade |
|--------|-------------|
| flex | display: flex |
| items-center | align-items: center |
| justify-between | justify-content: space-between |
| hidden | display: none |
| grid | display: grid |

---

## 🔧 Classes Dinâmicas

Exemplo:

```html
<div class="m[20px] bg[#222] rounded[10px]"></div>
```

Suporta todas as propriedades definidas no mapa de propriedades, como `m`, `p`, `bg`, `text`, `w`, `h`, `shadow`, entre outras.

---

## 🎯 Variantes

```html
<button class="hover:bg[#000] hover:text[#fff]"></button>
```

Variantes suportadas: `hover`, `active`, `focus`, `visited`.

---

## 📱 Breakpoints

Exemplo:

```html
md:flex
md:m[40px]
lg:hover:bg[#222]
```

Breakpoints padrão: `sm`, `md`, `lg`, `xl`, `2xl`. Pode-se adicionar personalizados.

---

## 🛠️ API JavaScript

```js
BreezeCSS.addMapping("espaco", "gap");
BreezeCSS.addFixedClass("cartao", "padding: 20px; background: #fff;");
BreezeCSS.addBreakpoint("tv", "1800px");
```

---

## 📌 Exemplo Completo

```html
<div class="flex md:flex-row flex-col p[20px] bg[#fff] hover:bg[#f0f0f0] rounded[12px]">
    <h1 class="text-size[2rem] font-bold">Olá BreezeCSS</h1>
</div>
```

---

## 🤔 Porquê usar BreezeCSS

- Acelera a prototipagem com classes utilitárias prontas a usar.
- Facilita a manutenção de estilos consistentes.
- Permite personalização completa sem tocar diretamente em CSS.
- Totalmente em português, tornando mais intuitivo para desenvolvedores lusófonos.

---

## 🕒 Quando usar

- Projetos pequenos a médios que precisam de rapidez na implementação.
- Prototipagem rápida de interfaces responsivas.
- Equipas que valorizam consistência de classes e nomenclatura intuitiva.

---

## 🚫 Quando não usar

- Projetos grandes e complexos onde um framework CSS estruturado (como Bootstrap ou Tailwind) já está implementado.
- Quando a performance do carregamento de JavaScript é crítica e não se quer adicionar scripts adicionais.
- Cenários onde o controlo absoluto do CSS puro é necessário sem abstrações.

---

## 🧑‍💻 Autor

Pedro de Oliveira

