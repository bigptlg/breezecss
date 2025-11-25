// BreezeCSS v1.0 — Biblioteca de classes dinâmicas em português
// Autor: Pedro de Oliveira
const configPadrao = {
    mapaPropriedades: {
        'm': 'margin',
        'mt': 'margin-top',
        'mr': 'margin-right',
        'mb': 'margin-bottom',
        'ml': 'margin-left',
        'p': 'padding',
        'pt': 'padding-top',
        'pr': 'padding-right',
        'pb': 'padding-bottom',
        'pl': 'padding-left',
        'w': 'width',
        'h': 'height',
        'bg': 'background',
        'text': 'color',
        'text-w': 'font-size',
        'd': 'display',
    },
    variantes: {
        'hover': ':hover',
        'active': ':active',
        'focus': ':focus',
        'visited': ':visited'
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

function inserirRegrasGlobais() {
    for (const seletor in estado.config.regrasGlobais) {
        const propriedades = estado.config.regrasGlobais[seletor];
        for (const propriedade in propriedades) {
            inserirRegra(seletor, propriedade, propriedades[propriedade]);
        }
    }
}

function processarElementos() {
    const elementos = document.querySelectorAll('[class*="["]');

    elementos.forEach(el => {
        const classesBreeze = Array.from(el.classList).filter(classe => classe.includes('['));

        classesBreeze.forEach(classeOriginal => {
            let variante = null;
            let classe = classeOriginal;

            for (const v of Object.keys(estado.config.variantes)) {
                if (classeOriginal.startsWith(v + ':')) {
                    variante = v;
                    classe = classeOriginal.replace(v + ':', '');
                    break;
                }
            }

            const match = classe.match(/^(?<prefixo>[a-z-]+)\[(?<valor>.+)\]$/);
           	if (!match) return;

            const { prefixo, valor } = match.groups;
            const propriedade = estado.config.mapaPropriedades[prefixo];
            if (!propriedade) return;

            let seletorBase = '.' + CSS.escape(classeOriginal);
            const seletorFinal = variante ? `${seletorBase}${estado.config.variantes[variante]}` : seletorBase;

            inserirRegra(seletorFinal, propriedade, valor);
        });
    });
}

function processar() {
    inserirRegrasGlobais();
    processarElementos();
}

window.BreezeCSS = {
    init: function(configUsuario = {}) {
        estado.config = { ...configPadrao, ...configUsuario };
        estado.config.mapaPropriedades = { ...configPadrao.mapaPropriedades, ...configUsuario.mapaPropriedades };
        estado.config.variantes = { ...configPadrao.variantes, ...configUsuario.variantes };
        estado.config.regrasGlobais = { ...configPadrao.regrasGlobais, ...configUsuario.regrasGlobais };
        
        processar();
    },
    processar: processar,
    addMapping: function(prefixo, propriedade) {
        estado.config.mapaPropriedades[prefixo] = propriedade;
    }
};

document.addEventListener('DOMContentLoaded', () => BreezeCSS.init());
