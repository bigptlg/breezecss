// BreezeCSS v1.2 — Biblioteca de classes dinâmicas em português
// Autor: Pedro de Oliveira

const configPadrao = {
    classesFixas: {
        // Display
        'block': 'display: block',
        'inline': 'display: inline',
        'inline-block': 'display: inline-block',
        'flex': 'display: flex',
        'inline-flex': 'display: inline-flex',
        'grid': 'display: grid',
        'inline-grid': 'display: grid',
        'hidden': 'display: none',
        
        // Flex Direction
        'flex-row': 'flex-direction: row',
        'flex-col': 'flex-direction: column',
        'flex-row-reverse': 'flex-direction: row-reverse',
        'flex-col-reverse': 'flex-direction: column-reverse',
        
        // Flex Wrap
        'flex-wrap': 'flex-wrap: wrap',
        'flex-nowrap': 'flex-wrap: nowrap',
        
        // Justify Content
        'justify-start': 'justify-content: flex-start',
        'justify-end': 'justify-content: flex-end',
        'justify-center': 'justify-content: center',
        'justify-between': 'justify-content: space-between',
        'justify-around': 'justify-content: space-around',
        'justify-evenly': 'justify-content: space-evenly',
        
        // Align Items
        'items-start': 'align-items: flex-start',
        'items-end': 'align-items: flex-end',
        'items-center': 'align-items: center',
        'items-baseline': 'align-items: baseline',
        'items-stretch': 'align-items: stretch',
        
        // Position
        'relative': 'position: relative',
        'absolute': 'position: absolute',
        'fixed': 'position: fixed',
        'sticky': 'position: sticky',
        
        // Text Align
        'text-left': 'text-align: left',
        'text-center': 'text-align: center',
        'text-right': 'text-align: right',
        'text-justify': 'text-align: justify',
        
        // Font Weight
        'font-thin': 'font-weight: 100',
        'font-light': 'font-weight: 300',
        'font-normal': 'font-weight: 400',
        'font-medium': 'font-weight: 500',
        'font-semibold': 'font-weight: 600',
        'font-bold': 'font-weight: 700',
        'font-black': 'font-weight: 900',
        
        // Overflow
        'overflow-auto': 'overflow: auto',
        'overflow-hidden': 'overflow: hidden',
        'overflow-visible': 'overflow: visible',
        'overflow-scroll': 'overflow: scroll',
        
        // Cursor
        'cursor-pointer': 'cursor: pointer',
        'cursor-default': 'cursor: default',
        'cursor-not-allowed': 'cursor: not-allowed',
        
        // Border Style
        'border-solid': 'border-style: solid',
        'border-dashed': 'border-style: dashed',
        'border-dotted': 'border-style: dotted',
        'border-double': 'border-style: double',
        'border-none': 'border-style: none',
        
        // Border Radius Presets
        'rounded-none': 'border-radius: 0',
        'rounded-sm': 'border-radius: 0.125rem',
        'rounded': 'border-radius: 0.25rem',
        'rounded-md': 'border-radius: 0.375rem',
        'rounded-lg': 'border-radius: 0.5rem',
        'rounded-xl': 'border-radius: 0.75rem',
        'rounded-2xl': 'border-radius: 1rem',
        'rounded-3xl': 'border-radius: 1.5rem',
        'rounded-full': 'border-radius: 9999px',
        
        // Shadow Presets
        'shadow-sm': 'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'shadow': 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'shadow-md': 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'shadow-lg': 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'shadow-xl': 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'shadow-2xl': 'box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'shadow-none': 'box-shadow: none',
        
        // Transitions
        'transition': 'transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms',
        'transition-none': 'transition-property: none',
        'transition-colors': 'transition-property: color, background-color, border-color; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms',
        'transition-opacity': 'transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms',
        'transition-transform': 'transition-property: transform; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms',
        
        // Transform
        'transform': 'transform: translateX(var(--tw-translate-x)) translateY(var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))',
        
        // Object Fit
        'object-contain': 'object-fit: contain',
        'object-cover': 'object-fit: cover',
        'object-fill': 'object-fit: fill',
        'object-none': 'object-fit: none',
        
        // Pointer Events
        'pointer-events-none': 'pointer-events: none',
        'pointer-events-auto': 'pointer-events: auto',
        
        // User Select
        'select-none': 'user-select: none',
        'select-text': 'user-select: text',
        'select-all': 'user-select: all',
        
        // Whitespace
        'whitespace-normal': 'white-space: normal',
        'whitespace-nowrap': 'white-space: nowrap',
        'whitespace-pre': 'white-space: pre',
        'whitespace-pre-wrap': 'white-space: pre-wrap',
    },
    
    mapaPropriedades: {
        // Margin
        'm': 'margin',
        'mt': 'margin-top',
        'mr': 'margin-right',
        'mb': 'margin-bottom',
        'ml': 'margin-left',
        'mx': 'margin-inline',
        'my': 'margin-block',
        
        // Padding
        'p': 'padding',
        'pt': 'padding-top',
        'pr': 'padding-right',
        'pb': 'padding-bottom',
        'pl': 'padding-left',
        'px': 'padding-inline',
        'py': 'padding-block',
        
        // Dimensões
        'w': 'width',
        'h': 'height',
        'min-w': 'min-width',
        'min-h': 'min-height',
        'max-w': 'max-width',
        'max-h': 'max-height',
        
        // Gap
        'gap': 'gap',
        'gap-x': 'column-gap',
        'gap-y': 'row-gap',
        
        // Border Width
        'border': 'border-width',
        'border-t': 'border-top-width',
        'border-r': 'border-right-width',
        'border-b': 'border-bottom-width',
        'border-l': 'border-left-width',
        
        // Border Color
        'border-color': 'border-color',
        
        // Border Radius
        'rounded': 'border-radius',
        'rounded-t': 'border-top-left-radius; border-top-right-radius',
        'rounded-r': 'border-top-right-radius; border-bottom-right-radius',
        'rounded-b': 'border-bottom-left-radius; border-bottom-right-radius',
        'rounded-l': 'border-top-left-radius; border-bottom-left-radius',
        'rounded-tl': 'border-top-left-radius',
        'rounded-tr': 'border-top-right-radius',
        'rounded-br': 'border-bottom-right-radius',
        'rounded-bl': 'border-bottom-left-radius',
        
        // Background
        'bg': 'background-color',
        'bg-gradient': 'background-image',
        
        // Text
        'text': 'color',
        'text-size': 'font-size',
        
        // Posicionamento
        'top': 'top',
        'right': 'right',
        'bottom': 'bottom',
        'left': 'left',
        'z': 'z-index',
        'inset': 'inset',
        
        // Opacidade
        'opacity': 'opacity',
        
        // Shadow
        'shadow': 'box-shadow',
        
        // Transform
        'rotate': 'transform',
        'scale': 'transform',
        'translate-x': 'transform',
        'translate-y': 'transform',
        
        // Filters
        'blur': 'filter',
        'brightness': 'filter',
        'contrast': 'filter',
        'grayscale': 'filter',
        'saturate': 'filter',
    },
    
    processadoresEspeciais: {
        'rotate': (valor) => `rotate(${valor})`,
        'scale': (valor) => `scale(${valor})`,
        'translate-x': (valor) => `translateX(${valor})`,
        'translate-y': (valor) => `translateY(${valor})`,
        'blur': (valor) => `blur(${valor})`,
        'brightness': (valor) => `brightness(${valor})`,
        'contrast': (valor) => `contrast(${valor})`,
        'grayscale': (valor) => `grayscale(${valor})`,
        'saturate': (valor) => `saturate(${valor})`,
        'bg-gradient': (valor) => {
            if (!valor.startsWith('linear-gradient') && !valor.startsWith('radial-gradient')) {
                const parts = valor.split(',');
                if (parts[0].includes('_')) {
                    parts[0] = parts[0].replace(/_/g, ' ');
                }
                return `linear-gradient(${parts.join(', ')})`;
            }
            return valor.replace(/_/g, ' ');
        }
    },
    
    variantes: {
        'hover': ':hover',
        'active': ':active',
        'focus': ':focus',
        'visited': ':visited',
        'disabled': ':disabled',
        'checked': ':checked',
        'first': ':first-child',
        'last': ':last-child',
        'even': ':nth-child(even)',
        'odd': ':nth-child(odd)',
    },
    
    breakpoints: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px'
    },
    
    regrasGlobais: {
        '*': {
            'margin': '0',
            'padding': '0',
            'box-sizing': 'border-box',
        }
    },
    
    log: true,
};

let estado = {
    config: {},
    regrasCache: new Set(),
    tagEstilo: null,
};

function inserirRegra(seletor, propriedade, valor) {
    const regra = `${seletor} { ${propriedade}: ${valor}; }`;
    if (estado.regrasCache.has(regra)) return;
    
    estado.regrasCache.add(regra);
    
    if (!estado.tagEstilo) {
        estado.tagEstilo = document.createElement('style');
        estado.tagEstilo.id = 'breeze-estilos';
        document.head.appendChild(estado.tagEstilo);
    }
    
    try {
        estado.tagEstilo.sheet.insertRule(regra, estado.tagEstilo.sheet.cssRules.length);
        if (estado.config.log) {
            console.log(`[BreezeCSS] Regra adicionada → ${regra}`);
        }
    } catch (e) {
        console.error(`[BreezeCSS] Erro ao inserir a regra: ${regra}`, e);
    }
}

function inserirRegraComMedia(mediaQuery, seletor, propriedade, valor) {
    const regra = `${mediaQuery} { ${seletor} { ${propriedade}: ${valor}; } }`;
    if (estado.regrasCache.has(regra)) return;
    
    estado.regrasCache.add(regra);
    
    if (!estado.tagEstilo) {
        estado.tagEstilo = document.createElement('style');
        estado.tagEstilo.id = 'breeze-estilos';
        document.head.appendChild(estado.tagEstilo);
    }
    
    try {
        estado.tagEstilo.sheet.insertRule(regra, estado.tagEstilo.sheet.cssRules.length);
        if (estado.config.log) {
            console.log(`[BreezeCSS] Media query adicionada → ${regra}`);
        }
    } catch (e) {
        console.error(`[BreezeCSS] Erro ao inserir a media query: ${regra}`, e);
    }
}

function inserirRegrasGlobais() {
    for (const seletor in estado.config.regrasGlobais) {
        const propriedades = estado.config.regrasGlobais[seletor];
        for (const propriedade in propriedades) {
            inserirRegra(seletor, propriedade, propriedades[propriedade]);
        }
    }
}

function processarClassesFixas() {
    const elementos = document.querySelectorAll('*');
    
    elementos.forEach(el => {
        el.classList.forEach(classe => {
            let breakpoint = null;
            let variante = null;
            let classeBase = classe;
            
            for (const bp of Object.keys(estado.config.breakpoints)) {
                if (classe.startsWith(bp + ':')) {
                    breakpoint = bp;
                    classeBase = classe.replace(bp + ':', '');
                    break;
                }
            }
            
            for (const v of Object.keys(estado.config.variantes)) {
                if (classeBase.startsWith(v + ':')) {
                    variante = v;
                    classeBase = classeBase.replace(v + ':', '');
                    break;
                }
            }
            
            const estiloFixo = estado.config.classesFixas[classeBase];
            if (estiloFixo) {
                const [propriedade, valor] = estiloFixo.split(': ');
                let seletorBase = '.' + CSS.escape(classe);
                
                const seletorComVariante = variante ? `${seletorBase}${estado.config.variantes[variante]}` : seletorBase;
                
                if (breakpoint) {
                    const mediaQuery = `@media (min-width: ${estado.config.breakpoints[breakpoint]})`;
                    inserirRegraComMedia(mediaQuery, seletorComVariante, propriedade, valor);
                } else {
                    inserirRegra(seletorComVariante, propriedade, valor);
                }
            }
        });
    });
}

function processarElementos() {
    const elementos = document.querySelectorAll('[class*="["]');
    
    elementos.forEach(el => {
        const classesBreeze = Array.from(el.classList).filter(classe => classe.includes('['));
        
        classesBreeze.forEach(classeOriginal => {
            let breakpoint = null;
            let variante = null;
            let classe = classeOriginal;
            
            for (const bp of Object.keys(estado.config.breakpoints)) {
                if (classeOriginal.startsWith(bp + ':')) {
                    breakpoint = bp;
                    classe = classeOriginal.replace(bp + ':', '');
                    break;
                }
            }
            
            // Processar variantes
            for (const v of Object.keys(estado.config.variantes)) {
                if (classe.startsWith(v + ':')) {
                    variante = v;
                    classe = classe.replace(v + ':', '');
                    break;
                }
            }
            
            const match = classe.match(/^(?<prefixo>[a-z-]+)\[(?<valor>.+)\]$/);
            if (!match) return;
            
            const { prefixo, valor } = match.groups;
            const propriedade = estado.config.mapaPropriedades[prefixo];
            if (!propriedade) return;
            
            let valorProcessado = valor;
            if (estado.config.processadoresEspeciais[prefixo]) {
                valorProcessado = estado.config.processadoresEspeciais[prefixo](valor);
            }
            
            let seletorBase = '.' + CSS.escape(classeOriginal);
            const seletorComVariante = variante ? `${seletorBase}${estado.config.variantes[variante]}` : seletorBase;
            
            if (breakpoint) {
                const mediaQuery = `@media (min-width: ${estado.config.breakpoints[breakpoint]})`;
                inserirRegraComMedia(mediaQuery, seletorComVariante, propriedade, valorProcessado);
            } else {
                inserirRegra(seletorComVariante, propriedade, valorProcessado);
            }
        });
    });
}

function processar() {
    inserirRegrasGlobais();
    processarClassesFixas();
    processarElementos();
}

window.BreezeCSS = {
    init: function(configUsuario = {}) {
        estado.config = { ...configPadrao, ...configUsuario };
        estado.config.classesFixas = { ...configPadrao.classesFixas, ...configUsuario.classesFixas };
        estado.config.mapaPropriedades = { ...configPadrao.mapaPropriedades, ...configUsuario.mapaPropriedades };
        estado.config.variantes = { ...configPadrao.variantes, ...configUsuario.variantes };
        estado.config.breakpoints = { ...configPadrao.breakpoints, ...configUsuario.breakpoints };
        estado.config.regrasGlobais = { ...configPadrao.regrasGlobais, ...configUsuario.regrasGlobais };
        estado.config.processadoresEspeciais = { ...configPadrao.processadoresEspeciais, ...configUsuario.processadoresEspeciais };
        
        processar();
    },
    processar: processar,
    addMapping: function(prefixo, propriedade) {
        estado.config.mapaPropriedades[prefixo] = propriedade;
    },
    addFixedClass: function(nome, estilo) {
        estado.config.classesFixas[nome] = estilo;
    },
    addBreakpoint: function(nome, tamanho) {
        estado.config.breakpoints[nome] = tamanho;
    },
    addVariant: function(nome, pseudo) {
        estado.config.variantes[nome] = pseudo;
    },
    addProcessor: function(prefixo, funcao) {
        estado.config.processadoresEspeciais[prefixo] = funcao;
    }
};

document.addEventListener('DOMContentLoaded', () => BreezeCSS.init());
