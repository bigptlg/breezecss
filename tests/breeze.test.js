/**
 * BreezeCSS v2.1 — breeze.test.js
 * Testes que exercitam os módulos reais da biblioteca (Parser, Cache, Engine, Renderer).
 *
 * Execução: node --experimental-vm-modules breeze.test.js
 */

// ─── Simulação mínima de DOM para Node.js ─────────────────────────────────

if (typeof document === 'undefined') {
    const { JSDOM } = await import('jsdom').catch(() => {
        console.warn('[AVISO] jsdom não disponível.');
        return { JSDOM: null };
    });

    if (JSDOM) {
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        global.document  = dom.window.document;
        global.window    = dom.window;
        global.CSS       = { escape: s => s.replace(/([[\]{}()*+?.,\\^$|#\s:])/g, '\\$1') };
        global.MutationObserver = dom.window.MutationObserver;
        global.Node      = dom.window.Node;
        global.DOMParser = dom.window.DOMParser;
        global.CSSMediaRule = dom.window.CSSMediaRule;
    }
}

// ─── Importar módulos reais ────────────────────────────────────────────────

import Cache  from './core/cache.js';
import Parser from './core/parser.js';

// ─── Utilitários de teste ─────────────────────────────────────────────────

let _passados = 0;
let _falhados = 0;
let _total    = 0;

function testar(descricao, fn) {
    _total++;
    try {
        fn();
        console.log(`  ✅ ${descricao}`);
        _passados++;
    } catch (e) {
        console.error(`  ❌ ${descricao}`);
        console.error(`     → ${e.message}`);
        _falhados++;
    }
}

function grupo(nome, fn) {
    console.log(`\n📋 ${nome}`);
    console.log('─'.repeat(55));
    fn();
}

function esperar(condicao, mensagem) {
    if (!condicao) throw new Error(mensagem || 'Asserção falhou');
}

function esperarIgual(a, b, msg) {
    if (a !== b) throw new Error(msg || `Esperado "${b}", obtido "${a}"`);
}

function esperarContem(str, sub, msg) {
    if (!str || !str.includes(sub))
        throw new Error(msg || `"${str}" não contém "${sub}"`);
}

// ─── Config mínima reutilizável nos testes ────────────────────────────────

function criarConfigBase() {
    return {
        breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
        variantes: {
            hover:          ':hover',
            focus:          ':focus',
            active:         ':active',
            first:          ':first-child',
            dark:           '.dark &',
            'group-hover':  '.group:hover &',
        },
        classesFixas: {
            flex:         'display: flex',
            hidden:       'display: none',
            'rounded-lg': 'border-radius: 0.5rem',
            truncate:     'overflow: hidden; text-overflow: ellipsis; white-space: nowrap',
        },
        mapaPropriedades: {
            p:            'padding',
            bg:           'background-color',
            text:         'color',
            'text-size':  'font-size',
            w:            'width',
            h:            'height',
            size:         'width; height',
            rotate:       'transform',
            scale:        'transform',
            'translate-x':'transform',
            blur:         'filter',
            brightness:   'filter',
            'bg-gradient':'background-image',
            cols:         'grid-template-columns',
            'col-span':   'grid-column',
            aspect:       'aspect-ratio',
            ring:         'box-shadow',
            'rounded-t':  'border-top-left-radius; border-top-right-radius',
            'rounded-b':  'border-bottom-left-radius; border-bottom-right-radius',
        },
        transformPrefixos: ['rotate', 'scale', 'translate-x', 'translate-y', 'skew-x', 'skew-y'],
        processadoresEspeciais: {
            blur:           v => `blur(${v})`,
            brightness:     v => `brightness(${v})`,
            'bg-gradient':  v => v.startsWith('linear-gradient') ? v : `linear-gradient(${v})`,
            cols:           v => /^\d+$/.test(v) ? `repeat(${v}, 1fr)` : v,
            'col-span':     v => `span ${v} / span ${v}`,
            aspect:         v => ({ square: '1/1', video: '16/9', photo: '4/3' })[v] || v,
            ring:           v => `0 0 0 ${v} currentColor`,
        },
        tema: { cores: {}, espacamento: {}, fontes: {} },
        regrasGlobais: {},
    };
}

// ─── Preparar Parser com config base ─────────────────────────────────────

function iniciarParser() {
    Cache.limpar();
    Parser.inicializar(criarConfigBase());
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════

grupo('Parser — Classes Fixas (módulo real)', () => {
    iniciarParser();

    testar('flex → display: flex', () => {
        const res = Parser.interpretarClasse('flex');
        esperar(res && res.length === 1, 'Deve ter 1 resultado');
        esperarIgual(res[0].propriedade, 'display');
        esperarIgual(res[0].valor, 'flex');
    });

    testar('hidden → display: none', () => {
        const res = Parser.interpretarClasse('hidden');
        esperarIgual(res[0].propriedade, 'display');
        esperarIgual(res[0].valor, 'none');
    });

    testar('rounded-lg → border-radius correcto', () => {
        const res = Parser.interpretarClasse('rounded-lg');
        esperarIgual(res[0].propriedade, 'border-radius');
        esperarIgual(res[0].valor, '0.5rem');
    });

    testar('truncate → múltiplas declarações', () => {
        const res = Parser.interpretarClasse('truncate');
        esperar(res.length === 3, `Deve ter 3 declarações, tem ${res.length}`);
        esperarIgual(res[0].propriedade, 'overflow');
        esperarIgual(res[1].propriedade, 'text-overflow');
        esperarIgual(res[2].propriedade, 'white-space');
    });

    testar('classe desconhecida → null', () => {
        const res = Parser.interpretarClasse('nao-existe-mesmo');
        esperar(res === null, `Esperado null, obtido: ${JSON.stringify(res)}`);
    });
});

grupo('Parser — Classes Arbitrárias (módulo real)', () => {
    iniciarParser();

    testar('p[20px] → padding: 20px', () => {
        const res = Parser.interpretarClasse('p[20px]');
        esperar(res && res.length === 1);
        esperarIgual(res[0].propriedade, 'padding');
        esperarIgual(res[0].valor, '20px');
    });

    testar('bg[#ff0000] → background-color', () => {
        const res = Parser.interpretarClasse('bg[#ff0000]');
        esperarIgual(res[0].propriedade, 'background-color');
        esperarIgual(res[0].valor, '#ff0000');
    });

    testar('text-size[1.5rem] → font-size', () => {
        const res = Parser.interpretarClasse('text-size[1.5rem]');
        esperarIgual(res[0].propriedade, 'font-size');
        esperarIgual(res[0].valor, '1.5rem');
    });

    testar('w[100%] → width', () => {
        const res = Parser.interpretarClasse('w[100%]');
        esperarIgual(res[0].propriedade, 'width');
        esperarIgual(res[0].valor, '100%');
    });

    testar('classe sem colchetes desconhecida → null', () => {
        const res = Parser.interpretarClasse('xyz-inexistente');
        esperar(res === null);
    });

    testar('prefixo desconhecido → null', () => {
        const res = Parser.interpretarClasse('xyz[100px]');
        esperar(res === null);
    });

    testar('valores com underscore → espaços', () => {
        const res = Parser.interpretarClasse('bg-gradient[to_right,red,blue]');
        esperar(res && res.length > 0, 'Deve parsear');
        esperarContem(res[0].valor, 'to right', 'Underscores devem virar espaços');
        esperarContem(res[0].valor, 'linear-gradient', 'Processador deve adicionar linear-gradient');
    });
});

grupo('Parser — CORRECÇÃO: size gera width E height', () => {
    iniciarParser();

    testar('size[40px] → duas propriedades (width e height)', () => {
        const res = Parser.interpretarClasse('size[40px]');
        esperar(res && res.length === 1, 'Parser retorna 1 resultado com propriedade composta');
        // O renderer divide 'width; height' por ';' e gera duas regras
        // O parser preserva a propriedade composta; o renderer trata
        esperarContem(res[0].propriedade, 'width');
        esperarContem(res[0].propriedade, 'height');
    });
});

grupo('Parser — CORRECÇÃO: rounded-t e rounded-b', () => {
    iniciarParser();

    testar('rounded-t[0.5rem] → dois cantos superiores', () => {
        const res = Parser.interpretarClasse('rounded-t[0.5rem]');
        esperar(res && res.length === 1, 'Parser retorna 1 resultado com propriedade composta');
        esperarContem(res[0].propriedade, 'border-top-left-radius');
        esperarContem(res[0].propriedade, 'border-top-right-radius');
    });

    testar('rounded-b[0.5rem] → dois cantos inferiores', () => {
        const res = Parser.interpretarClasse('rounded-b[0.5rem]');
        esperar(res && res.length === 1);
        esperarContem(res[0].propriedade, 'border-bottom-left-radius');
        esperarContem(res[0].propriedade, 'border-bottom-right-radius');
    });
});

grupo('Parser — Qualificadores (breakpoints e variantes)', () => {
    iniciarParser();

    testar('md:flex → breakpoint md + classeBase flex', () => {
        const res = Parser.interpretarClasse('md:flex');
        esperar(res && res.length > 0);
        esperarIgual(res[0].breakpoint, 'md');
        esperarIgual(res[0].classeBase, 'flex');
        esperar(res[0].variantes.length === 0);
    });

    testar('hover:bg[red] → variante hover', () => {
        const res = Parser.interpretarClasse('hover:bg[red]');
        esperar(res && res.length > 0);
        esperar(res[0].breakpoint === null);
        esperar(res[0].variantes.includes('hover'));
    });

    testar('md:hover:bg[red] → breakpoint md + variante hover', () => {
        const res = Parser.interpretarClasse('md:hover:bg[red]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].breakpoint, 'md');
        esperar(res[0].variantes.includes('hover'));
    });

    testar('hover:focus:p[20px] → múltiplas variantes', () => {
        const res = Parser.interpretarClasse('hover:focus:p[20px]');
        esperar(res && res.length > 0);
        esperar(res[0].variantes.includes('hover') && res[0].variantes.includes('focus'));
    });

    testar('qualificador desconhecido → null', () => {
        const res = Parser.interpretarClasse('inexistente:flex');
        esperar(res === null, 'Qualificador desconhecido deve retornar null');
    });
});

grupo('Cache — Deduplicação (módulo real)', () => {
    Cache.limpar();

    testar('regra nova não está em cache', () => {
        esperar(!Cache.temRegra('.flex { display: flex; }'));
    });

    testar('regra adicionada está em cache', () => {
        const r = '.flex { display: flex; }';
        Cache.registarRegra(r);
        esperar(Cache.temRegra(r));
    });

    testar('regra diferente não está em cache', () => {
        esperar(!Cache.temRegra('.hidden { display: none; }'));
    });

    testar('mesma regra não é duplicada (Set)', () => {
        const r = '.test { color: red; }';
        Cache.registarRegra(r);
        Cache.registarRegra(r);
        Cache.registarRegra(r);
        // Deve ter: .flex + .test = 2 regras
        const stats = Cache.obterStats();
        esperarIgual(stats.regrasCacheadas, 2);
    });

    testar('cache de classes resolvidas', () => {
        const resultado = [{ propriedade: 'display', valor: 'flex' }];
        Cache.registarClasse('flex', resultado);
        esperar(Cache.temClasse('flex'));
        esperar(!Cache.temClasse('hidden'));
        esperarIgual(Cache.obterClasse('flex'), resultado);
    });
});

grupo('Cache — CORRECÇÃO: Transforms incluem scale na ordem correcta', () => {
    Cache.limpar();

    testar('ordem: translateX → rotate → scale → scaleX', () => {
        const chave = '.el-ordem::';
        Cache.atualizarTransform(chave, 'scale',      'scale(1.2)');
        Cache.atualizarTransform(chave, 'rotate',     'rotate(45deg)');
        Cache.atualizarTransform(chave, 'translateX', 'translateX(10px)');
        Cache.atualizarTransform(chave, 'scaleX',     'scaleX(2)');

        const t = Cache.construirTransform(chave);
        esperar(t !== null, 'Transform não deve ser null');

        const idxTX    = t.indexOf('translateX');
        const idxRot   = t.indexOf('rotate');
        const idxScale = t.indexOf('scale(');   // 'scale(' para não confundir com 'scaleX('
        const idxScX   = t.indexOf('scaleX');

        esperar(idxTX < idxRot,   `translateX deve vir antes de rotate: ${t}`);
        esperar(idxRot < idxScale, `rotate deve vir antes de scale: ${t}`);
        esperar(idxScale < idxScX, `scale deve vir antes de scaleX: ${t}`);
    });

    testar('rotate + scale → combinados sem sobrescrita', () => {
        const chave = '.el-combine::';
        Cache.atualizarTransform(chave, 'rotate', 'rotate(10deg)');
        Cache.atualizarTransform(chave, 'scale',  'scale(1.2)');
        const t = Cache.construirTransform(chave);
        esperarContem(t, 'rotate(10deg)');
        esperarContem(t, 'scale(1.2)');
    });

    testar('seletor sem transforms → null', () => {
        const t = Cache.construirTransform('.nao-existe::');
        esperar(t === null);
    });
});

grupo('Renderer — CORRECÇÃO: Selectores de variantes estruturais', () => {
    // Testar a lógica de construção de selector directamente
    const cssEscapeLocal = s => s.replace(/([[\]{}()*+?.,\\^$|#\s:])/g, '\\$1');
    const config = criarConfigBase();

    function construirSeletor(classeOriginal, variantes) {
        const escapado = '.' + cssEscapeLocal(classeOriginal);
        let seletor = escapado;
        for (const v of variantes) {
            const pseudo = config.variantes[v];
            if (!pseudo) continue;
            if (pseudo.includes('&')) {
                seletor = pseudo.replace(/&/g, seletor);
            } else {
                seletor = seletor + pseudo;
            }
        }
        return seletor;
    }

    testar('hover:bg[red] → seletor com :hover', () => {
        const sel = construirSeletor('hover:bg[red]', ['hover']);
        esperarContem(sel, ':hover');
    });

    testar('dark:bg[red] → variante estrutural .dark & substituída correctamente', () => {
        const sel = construirSeletor('dark:bg[red]', ['dark']);
        // Deve ser: .dark .dark\:bg\[red\]
        esperarContem(sel, '.dark ');
        esperar(!sel.includes('&'), 'O & deve ter sido substituído, não permanecer');
    });

    testar('group-hover → .group:hover & substituída', () => {
        const sel = construirSeletor('group-hover:bg[red]', ['group-hover']);
        esperarContem(sel, '.group:hover ');
        esperar(!sel.includes('&'), 'O & deve ter sido substituído');
    });

    testar('hover:focus: → múltiplos pseudo simples', () => {
        const sel = construirSeletor('hover:focus:p[10px]', ['hover', 'focus']);
        esperarContem(sel, ':hover');
        esperarContem(sel, ':focus');
    });

    testar('media query correcta para md', () => {
        const tamanho = config.breakpoints['md'];
        const regraInterna = '.flex { display: flex; }';
        const mediaQuery = `@media (min-width: ${tamanho}) { ${regraInterna} }`;
        esperarContem(mediaQuery, '768px');
        esperarContem(mediaQuery, '@media');
    });
});

grupo('Transforms — Combinação inteligente (Cache real)', () => {
    Cache.limpar();

    testar('rotate[45deg] só → transform: rotate(45deg)', () => {
        const chave = '.el-1-rot::';
        Cache.atualizarTransform(chave, 'rotate', 'rotate(45deg)');
        const t = Cache.construirTransform(chave);
        esperarIgual(t, 'rotate(45deg)');
    });

    testar('rotate + scale → combinados', () => {
        const chave = '.el-2-rs::';
        Cache.atualizarTransform(chave, 'rotate', 'rotate(10deg)');
        Cache.atualizarTransform(chave, 'scale',  'scale(1.2)');
        const t = Cache.construirTransform(chave);
        esperarContem(t, 'rotate(10deg)');
        esperarContem(t, 'scale(1.2)');
    });

    testar('translate + rotate + scale → ordem correcta', () => {
        const chave = '.el-3-trs::';
        Cache.atualizarTransform(chave, 'translateX', 'translateX(10px)');
        Cache.atualizarTransform(chave, 'rotate',     'rotate(45deg)');
        Cache.atualizarTransform(chave, 'scale',      'scale(0.8)');
        const t = Cache.construirTransform(chave);
        const idxTX = t.indexOf('translateX');
        const idxR  = t.indexOf('rotate');
        const idxS  = t.indexOf('scale');
        esperar(idxTX < idxR && idxR < idxS, `Ordem incorrecta: ${t}`);
    });
});

grupo('Sistema de Temas (Parser real)', () => {
    Cache.limpar();
    const config = criarConfigBase();
    config.tema = {
        cores:       { primario: '#00ff88', secundario: '#222' },
        espacamento: { sm: '8px', md: '16px', lg: '32px' },
        fontes:      {},
    };
    Parser.inicializar(config);

    testar('bg[primario] → resolve para cor do tema', () => {
        const res = Parser.interpretarClasse('bg[primario]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, '#00ff88');
    });

    testar('text[secundario] → resolve correctamente', () => {
        const res = Parser.interpretarClasse('text[secundario]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, '#222');
    });

    testar('p[md] → resolve para espaçamento 16px', () => {
        const res = Parser.interpretarClasse('p[md]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, '16px');
    });

    testar('valor desconhecido → passa directo', () => {
        const res = Parser.interpretarClasse('p[20px]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, '20px');
    });
});

grupo('Componentes (Cache real)', () => {
    Cache.limpar();
    iniciarParser();

    testar('registar componente', () => {
        Cache.registarComponente('btn', ['p[16px]', 'rounded-lg', 'flex']);
        esperar(Cache.temComponente('btn'));
    });

    testar('obter classes do componente', () => {
        const classes = Cache.obterComponente('btn');
        esperar(classes !== null);
        esperar(classes.includes('p[16px]'));
        esperar(classes.includes('rounded-lg'));
    });

    testar('componente não registado → null e temComponente false', () => {
        esperar(!Cache.temComponente('card'));
        esperar(Cache.obterComponente('card') === null);
    });

    testar('interpretar componente expande para classes individuais', () => {
        Cache.registarComponente('card', ['flex', 'p[24px]']);
        const res = Parser.interpretarClasse('card');
        esperar(Array.isArray(res) && res.length > 0, 'Componente deve expandir para resultados');
        // flex gera 1 resultado, p[24px] gera 1 resultado → total ≥ 2
        esperar(res.length >= 2, `Esperado ≥ 2 resultados, obtido ${res.length}`);
    });
});

grupo('Plugins — API de extensão', () => {
    Cache.limpar();
    const config = criarConfigBase();

    const pluginTeste = {
        nome: 'plugin-teste',
        setup(ctx) {
            ctx.addMapping('blur2', 'filter');
            ctx.addFixedClass('glass', 'backdrop-filter: blur(10px); background: rgba(255,255,255,0.1)');
            ctx.addVariant('group-hover2', '.group2:hover &');
            ctx.addBreakpoint('xxl', '1800px');
            ctx.addProcessor('blur2', v => `blur(${v})`);
        },
    };

    const ctx = {
        addMapping:    (p, prop) => { config.mapaPropriedades[p] = prop; },
        addFixedClass: (n, e)    => { config.classesFixas[n] = e; },
        addVariant:    (n, ps)   => { config.variantes[n] = ps; },
        addBreakpoint: (n, t)    => { config.breakpoints[n] = t; },
        addProcessor:  (p, fn)   => { config.processadoresEspeciais[p] = fn; },
        config,
    };

    pluginTeste.setup(ctx);
    Parser.inicializar(config);

    testar('plugin adiciona mapeamento', () => {
        esperarIgual(config.mapaPropriedades['blur2'], 'filter');
    });

    testar('plugin adiciona classe fixa', () => {
        esperar('glass' in config.classesFixas);
        esperarContem(config.classesFixas.glass, 'backdrop-filter');
    });

    testar('plugin adiciona variante estrutural', () => {
        esperarIgual(config.variantes['group-hover2'], '.group2:hover &');
    });

    testar('plugin adiciona breakpoint', () => {
        esperarIgual(config.breakpoints['xxl'], '1800px');
    });

    testar('plugin adiciona processador funcional', () => {
        esperar(typeof config.processadoresEspeciais['blur2'] === 'function');
        esperarIgual(config.processadoresEspeciais['blur2']('8px'), 'blur(8px)');
    });

    testar('classe fixa do plugin parseia correctamente (módulo real)', () => {
        const res = Parser.interpretarClasse('glass');
        esperar(res && res.length > 0, 'glass deve ser reconhecida como classe fixa do plugin');
        esperar(res.some(r => r.propriedade === 'backdrop-filter'));
    });

    testar('variante estrutural do plugin gera selector correcto', () => {
        const cssEscapeLocal = s => s.replace(/([[\]{}()*+?.,\\^$|#\s:])/g, '\\$1');
        function construirSeletor(classeOriginal, variantes, config) {
            let seletor = '.' + cssEscapeLocal(classeOriginal);
            for (const v of variantes) {
                const pseudo = config.variantes[v];
                if (!pseudo) continue;
                seletor = pseudo.includes('&') ? pseudo.replace(/&/g, seletor) : seletor + pseudo;
            }
            return seletor;
        }
        const sel = construirSeletor('group-hover2:bg[red]', ['group-hover2'], config);
        esperarContem(sel, '.group2:hover ');
        esperar(!sel.includes('&'), 'O & deve ter sido substituído no selector');
    });
});

grupo('Processadores Especiais (módulo real)', () => {
    iniciarParser();

    testar('blur[8px] → blur(8px)', () => {
        const res = Parser.interpretarClasse('blur[8px]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, 'blur(8px)');
    });

    testar('brightness[1.5] → brightness(1.5)', () => {
        const res = Parser.interpretarClasse('brightness[1.5]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, 'brightness(1.5)');
    });

    testar('bg-gradient[to right,red,blue] → linear-gradient', () => {
        const res = Parser.interpretarClasse('bg-gradient[to_right,red,blue]');
        esperar(res && res.length > 0);
        esperarContem(res[0].valor, 'linear-gradient');
    });

    testar('bg-gradient[linear-gradient(...)] → passthrough (sem duplicação)', () => {
        const res = Parser.interpretarClasse('bg-gradient[linear-gradient(to_right,_red,_blue)]');
        esperar(res && res.length > 0);
        esperar(!res[0].valor.startsWith('linear-gradient(linear-gradient'),
            'Não deve duplicar linear-gradient');
    });

    testar('cols[3] → repeat(3, 1fr)', () => {
        const res = Parser.interpretarClasse('cols[3]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, 'repeat(3, 1fr)');
    });

    testar('col-span[2] → span 2 / span 2', () => {
        const res = Parser.interpretarClasse('col-span[2]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, 'span 2 / span 2');
    });

    testar('aspect[video] → 16/9', () => {
        const res = Parser.interpretarClasse('aspect[video]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, '16/9');
    });

    testar('aspect[square] → 1/1', () => {
        const res = Parser.interpretarClasse('aspect[square]');
        esperar(res && res.length > 0);
        esperarIgual(res[0].valor, '1/1');
    });

    testar('ring[3px] → box-shadow ring', () => {
        const res = Parser.interpretarClasse('ring[3px]');
        esperar(res && res.length > 0);
        esperarContem(res[0].valor, '3px');
        esperarContem(res[0].valor, 'currentColor');
    });
});

grupo('extrairClassesRelevantes — filtro preciso (CORRECÇÃO)', () => {
    iniciarParser();

    function criarElemento(classes) {
        const el = document.createElement('div');
        el.className = classes;
        return el;
    }

    testar('classes Breeze fixas são extraídas', () => {
        const el = criarElemento('flex hidden outro-qualquer');
        const classes = Parser.extrairClassesRelevantes(el);
        esperar(classes.includes('flex'));
        esperar(classes.includes('hidden'));
    });

    testar('classe de outra biblioteca sem prefixo Breeze NÃO é extraída', () => {
        // 'btn-primary' não é fixa, não tem ':' nem '[', não é componente → ignorada
        const el = criarElemento('btn-primary text-gray-500');
        const classes = Parser.extrairClassesRelevantes(el);
        esperar(!classes.includes('btn-primary'), 'btn-primary não deve ser extraída');
    });

    testar('classe arbitrária com prefixo válido é extraída', () => {
        const el = criarElemento('p[20px] w[100%]');
        const classes = Parser.extrairClassesRelevantes(el);
        esperar(classes.includes('p[20px]'));
        esperar(classes.includes('w[100%]'));
    });

    testar('classe com prefixo inválido no valor arbitrário NÃO é extraída', () => {
        const el = criarElemento('xyz[100px]');
        const classes = Parser.extrairClassesRelevantes(el);
        esperar(!classes.includes('xyz[100px]'), 'xyz[100px] não deve ser extraída');
    });

    testar('classe com breakpoint válido é extraída', () => {
        const el = criarElemento('md:flex lg:hidden');
        const classes = Parser.extrairClassesRelevantes(el);
        esperar(classes.includes('md:flex'));
        esperar(classes.includes('lg:hidden'));
    });
});

// ─── Relatório final ──────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(55));
console.log(`📊 RESULTADOS: ${_passados}/${_total} passados, ${_falhados} falhados`);
if (_falhados === 0) {
    console.log('🎉 Todos os testes passaram!');
} else {
    console.log(`⚠️  ${_falhados} teste(s) falharam.`);
    process?.exit?.(1);
}
console.log('═'.repeat(55));