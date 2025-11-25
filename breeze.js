// BreezeCSS v1.1 — Biblioteca de classes dinâmicas em português
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
        'inline-grid': 'display: inline-grid',
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
        
        // Border
        'border': 'border',
        'border-t': 'border-top',
        'border-r': 'border-right',
        'border-b': 'border-bottom',
        'border-l': 'border-left',
        'rounded': 'border-radius',
        
        // Background
        'bg': 'background-color',
        
        // Text
        'text': 'color',
        'text-size': 'font-size',
        
        // Posicionamento
        'top': 'top',
        'right': 'right',
        'bottom': 'bottom',
        'left': 'left',
        'z': 'z-index',
        
        // Opacidade
        'opacity': 'opacity',
        
        // Shadow
        'shadow': 'box-shadow',
    },
    
    variantes: {
        'hover': ':hover',
        'active': ':active',
        'focus': ':focus',
        'visited': ':visited'
    },
    
    breakpoints: {
        'sm': '640px',   // Smartphones
        'md': '768px',   // Tablets
        'lg': '1024px',  // Laptops
        'xl': '1280px',  // Desktops
        '2xl': '1536px'  // Large screens
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
            // Verificar breakpoint e variante
            let breakpoint = null;
            let variante = null;
            let classeBase = classe;
            
            // Processar breakpoints (ex: md:flex ou md:hover:flex)
            for (const bp of Object.keys(estado.config.breakpoints)) {
                if (classe.startsWith(bp + ':')) {
                    breakpoint = bp;
                    classeBase = classe.replace(bp + ':', '');
                    break;
                }
            }
            
            // Processar variantes (ex: hover:flex ou md:hover:flex)
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
                
                // Aplicar variante se existir
                const seletorComVariante = variante ? `${seletorBase}${estado.config.variantes[variante]}` : seletorBase;
                
                // Aplicar breakpoint se existir
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

            // Processar breakpoints
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

            let seletorBase = '.' + CSS.escape(classeOriginal);
            const seletorComVariante = variante ? `${seletorBase}${estado.config.variantes[variante]}` : seletorBase;

            // Aplicar breakpoint se existir
            if (breakpoint) {
                const mediaQuery = `@media (min-width: ${estado.config.breakpoints[breakpoint]})`;
                inserirRegraComMedia(mediaQuery, seletorComVariante, propriedade, valor);
            } else {
                inserirRegra(seletorComVariante, propriedade, valor);
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
    }
};

document.addEventListener('DOMContentLoaded', () => BreezeCSS.init());
