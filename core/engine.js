/**
 * BreezeCSS v2 — core/engine.js
 * Motor principal: coordena parser, renderer, cache e observer
 */

'use strict';

import Cache from './cache.js';
import Parser from './parser.js';
import Renderer from './renderer.js';
import Observer from './observer.js';
import Logger from './logger.js';

const Engine = (() => {
    let _config = null;
    let _iniciado = false;

    // Contador de IDs para transforms combinados por elemento
    let _idCounter = 0;
    const _mapaIdsElemento = new WeakMap();

    /**
     * Obtém ou cria um ID único para um elemento + contexto de transform.
     * O ID é escrito como data-breeze-id no elemento DOM.
     */
    function _obterIdElemento(elemento) {
        if (!_mapaIdsElemento.has(elemento)) {
            const id = `b${++_idCounter}`;
            _mapaIdsElemento.set(elemento, id);
            elemento.setAttribute('data-breeze-id', id);
        }
        return _mapaIdsElemento.get(elemento);
    }

    /**
     * Processa uma lista de elementos DOM.
     * Passa o elemento ao Renderer para que transforms sejam isolados por elemento.
     */
    function processarElementos(elementos) {
        for (const el of elementos) {
            if (!el.classList || el.classList.length === 0) continue;

            const classesRelevantes = Parser.extrairClassesRelevantes(el);
            if (classesRelevantes.length === 0) continue;

            for (const classe of classesRelevantes) {
                const resultados = Parser.interpretarClasse(classe);
                if (!resultados || resultados.length === 0) continue;

                // Se algum resultado for transform, garantir ID no elemento antes de renderizar
                const temTransform = resultados.some(r => r.eTransform);
                if (temTransform) {
                    _obterIdElemento(el);
                }

                Renderer.renderizar(resultados, classe, el);
            }
        }
    }

    /**
     * Ponto de entrada: inicializa a biblioteca.
     */
    function init(configUsuario = {}) {
        if (_iniciado) {
            Logger.aviso('BreezeCSS já foi inicializado. Chame BreezeCSS.reiniciar() para reinicializar.');
            return;
        }

        _config = _construirConfig(configUsuario);
        _iniciado = true;

        Logger.configurar({
            nivel: _config.debug ? 'debug' : (_config.log === false ? 'silencioso' : 'info'),
            silencioso: _config.log === false,
        });

        Logger.info('Inicializando BreezeCSS v2...');

        // Aplicar plugins registados antes do init
        if (_config.plugins && _config.plugins.length > 0) {
            _config.plugins.forEach(plugin => _aplicarPlugin(plugin));
        }

        // Inicializar módulos com a config final
        Parser.inicializar(_config);
        Renderer.inicializar(_config);

        // Inserir CSS base
        if (_config.reset) {
            Renderer.inserirRegrasGlobais(_config.regrasGlobais);
        }
        Renderer.inserirVariaveisCSS(_config.tema);

        // Processar DOM actual (scan inicial)
        const elementosIniciais = Observer.coletarInicialmente();
        processarElementos(elementosIniciais);

        // Iniciar observer para mudanças futuras
        Observer.iniciar(processarElementos);

        Logger.info(`BreezeCSS v2 pronto. ${elementosIniciais.length} elementos processados.`);
    }

    /**
     * Reinicia a biblioteca (útil em testes ou SPA com reset de estado)
     */
    function reiniciar() {
        Observer.parar();
        Renderer.limpar();
        Cache.limpar();
        _config = null;
        _iniciado = false;
        _idCounter = 0;
        Logger.debug('BreezeCSS reiniciado.');
    }

    /**
     * Processa o DOM manualmente (útil após injeção de HTML dinâmico)
     */
    function processar() {
        _garantirIniciado();
        const elementos = Observer.coletarInicialmente();
        processarElementos(elementos);
        Logger.debug(`processar() manual: ${elementos.length} elementos`);
    }

    function build(htmlString, opcoes = {}) {
        if (typeof DOMParser === 'undefined') {
            Logger.erro('build() requer DOMParser. Em Node.js use jsdom ou similar.');
            return '';
        }

        if (!_iniciado) {
            Logger.aviso('build() chamado sem init(). A usar config padrão.');
            _config = _construirConfig({});
            Parser.inicializar(_config);
            Renderer.inicializar(_config);
        }

        Logger.info('Iniciando modo build...');

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const elementos = Array.from(doc.querySelectorAll('*'));

        Renderer.ativarModoOffline();
        Cache.limpar();
        Parser.inicializar(_config);

        if (_config.reset) {
            Renderer.inserirRegrasGlobais(_config.regrasGlobais);
        }
        Renderer.inserirVariaveisCSS(_config.tema);

        processarElementos(elementos);

        const css = Renderer.gerarCSSEstatico(opcoes.minificar ?? false);
        Renderer.desativarModoOffline();

        Logger.info(`Build concluído: ${css.length} caracteres de CSS gerado`);
        return css;
    }

    /**
     * Regista e aplica um plugin
     */
    function use(plugin) {
        if (!plugin || typeof plugin.setup !== 'function') {
            Logger.erro('Plugin inválido: deve ter uma função setup(ctx)');
            return;
        }

        Logger.info(`Plugin carregado: "${plugin.nome || 'sem nome'}"`);

        if (_iniciado) {
            _aplicarPlugin(plugin);
        } else {
            if (!_config) _config = _construirConfig({});
            if (!_config.plugins) _config.plugins = [];
            _config.plugins.push(plugin);
        }
    }

    function _aplicarPlugin(plugin) {
        const ctx = _criarContextoPlugin();
        plugin.setup(ctx);
    }

    function _criarContextoPlugin() {
        return {
            addMapping: (prefixo, propriedade) => {
                _config.mapaPropriedades[prefixo] = propriedade;
                Logger.debug(`Plugin adicionou mapeamento: ${prefixo} → ${propriedade}`);
            },
            addFixedClass: (nome, estilo) => {
                _config.classesFixas[nome] = estilo;
                Logger.debug(`Plugin adicionou classe fixa: ${nome}`);
            },
            addVariant: (nome, pseudo) => {
                _config.variantes[nome] = pseudo;
                Logger.debug(`Plugin adicionou variante: ${nome} → ${pseudo}`);
            },
            addBreakpoint: (nome, tamanho) => {
                _config.breakpoints[nome] = tamanho;
                Logger.debug(`Plugin adicionou breakpoint: ${nome} → ${tamanho}`);
            },
            addProcessor: (prefixo, fn) => {
                _config.processadoresEspeciais[prefixo] = fn;
                Logger.debug(`Plugin adicionou processador: ${prefixo}`);
            },
            config: _config,
        };
    }

    // ─── API pública de extensão ───────────────────────────────────────────

    function addMapping(prefixo, propriedade) {
        _garantirIniciado();
        _config.mapaPropriedades[prefixo] = propriedade;
        _reprocessarDOM();
    }

    function addVariant(nome, pseudo) {
        _garantirIniciado();
        _config.variantes[nome] = pseudo;
        _reprocessarDOM();
    }

    function addBreakpoint(nome, tamanho) {
        _garantirIniciado();
        _config.breakpoints[nome] = tamanho;
        _reprocessarDOM();
    }

    function addComponent(nome, classes) {
        _garantirIniciado();
        Cache.registarComponente(nome, classes);
        Logger.debug(`Componente registado: "${nome}" → [${classes.join(', ')}]`);
        _reprocessarDOM();
    }

    function addFixedClass(nome, estilo) {
        _garantirIniciado();
        _config.classesFixas[nome] = estilo;
        _reprocessarDOM();
    }

    function addProcessor(prefixo, fn) {
        _garantirIniciado();
        _config.processadoresEspeciais[prefixo] = fn;
        _reprocessarDOM();
    }

    /**
     * Reprocessa o DOM após extensão em runtime.
     * Limpa apenas o cache de classes resolvidas para forçar re-parse,
     * mantendo o cache de regras CSS (evita duplicação).
     */
    function _reprocessarDOM() {
        if (!_iniciado) return;
        Cache.limparClassesResolvidas();
        const elementos = Observer.coletarInicialmente();
        processarElementos(elementos);
    }

    function obterStats() {
        return {
            cache: Cache.obterStats(),
            config: {
                breakpoints: Object.keys(_config?.breakpoints || {}),
                variantes: Object.keys(_config?.variantes || {}),
                classesFixas: Object.keys(_config?.classesFixas || {}).length,
                mapeamentos: Object.keys(_config?.mapaPropriedades || {}).length,
            }
        };
    }

    function _garantirIniciado() {
        if (_iniciado && _config) return;

        Logger.aviso('BreezeCSS não foi inicializado. A inicializar com config padrão.');
        _config = _construirConfig({});

        Parser.inicializar(_config);
        Renderer.inicializar(_config);

        if (_config.reset) {
            Renderer.inserirRegrasGlobais(_config.regrasGlobais);
        }
        Renderer.inserirVariaveisCSS(_config.tema);

        const elementos = Observer.coletarInicialmente();
        processarElementos(elementos);
        Observer.iniciar(processarElementos);

        _iniciado = true;
    }

    // ─── Construção da configuração ────────────────────────────────────────

    function _construirConfig(configUsuario) {
        const base = _configPadrao();
        return {
            ...base,
            ...configUsuario,
            classesFixas:          { ...base.classesFixas,          ...(configUsuario.classesFixas          || {}) },
            mapaPropriedades:      { ...base.mapaPropriedades,      ...(configUsuario.mapaPropriedades      || {}) },
            variantes:             { ...base.variantes,             ...(configUsuario.variantes             || {}) },
            breakpoints:           { ...base.breakpoints,           ...(configUsuario.breakpoints           || {}) },
            regrasGlobais:         { ...base.regrasGlobais,         ...(configUsuario.regrasGlobais         || {}) },
            processadoresEspeciais:{ ...base.processadoresEspeciais,...(configUsuario.processadoresEspeciais|| {}) },
            transformPrefixos: base.transformPrefixos,
            tema: _mesclarTema(base.tema, configUsuario.tema),
            plugins: configUsuario.plugins || [],
        };
    }

    function _mesclarTema(base, usuario) {
        if (!usuario) return base;
        return {
            cores:       { ...(base.cores       || {}), ...(usuario.cores       || {}) },
            espacamento: { ...(base.espacamento  || {}), ...(usuario.espacamento || {}) },
            fontes:      { ...(base.fontes       || {}), ...(usuario.fontes      || {}) },
        };
    }

    function _configPadrao() {
        return {
            log:   true,
            debug: false,
            reset: true,

            tema: {
                cores:       {},
                espacamento: {},
                fontes:      {},
            },

            breakpoints: {
                sm:    '640px',
                md:    '768px',
                lg:    '1024px',
                xl:    '1280px',
                '2xl': '1536px',
            },

            variantes: {
                'hover':         ':hover',
                'active':        ':active',
                'focus':         ':focus',
                'focus-visible': ':focus-visible',
                'visited':       ':visited',
                'disabled':      ':disabled',
                'checked':       ':checked',
                'first':         ':first-child',
                'last':          ':last-child',
                'even':          ':nth-child(even)',
                'odd':           ':nth-child(odd)',
                'placeholder':   '::placeholder',
                'before':        '::before',
                'after':         '::after',
                'dark':          '.dark &',
            },

            regrasGlobais: {
                '*':                  { 'margin': '0', 'padding': '0' },
                'html':               { 'box-sizing': 'border-box' },
                '*, *::before, *::after': { 'box-sizing': 'inherit' },
            },

            // Prefixos que geram transform (combinados automaticamente)
            transformPrefixos: [
                'rotate',
                'scale', 'scale-x', 'scale-y',
                'translate-x', 'translate-y',
                'skew-x', 'skew-y',
            ],

            mapaPropriedades: {
                // Espaçamento
                'm':       'margin',
                'mt':      'margin-top',
                'mr':      'margin-right',
                'mb':      'margin-bottom',
                'ml':      'margin-left',
                'mx':      'margin-inline',
                'my':      'margin-block',
                'p':       'padding',
                'pt':      'padding-top',
                'pr':      'padding-right',
                'pb':      'padding-bottom',
                'pl':      'padding-left',
                'px':      'padding-inline',
                'py':      'padding-block',
                'gap':     'gap',
                'gap-x':   'column-gap',
                'gap-y':   'row-gap',

                // Dimensões
                'w':     'width',
                'h':     'height',
                'min-w': 'min-width',
                'min-h': 'min-height',
                'max-w': 'max-width',
                'max-h': 'max-height',
                'size':  'width; height',

                // Cores
                'bg':            'background-color',
                'text':          'color',
                'border-color':  'border-color',
                'outline-color': 'outline-color',

                // Tipografia
                'text-size':   'font-size',
                'font-size':   'font-size',
                'leading':     'line-height',
                'tracking':    'letter-spacing',
                'font-family': 'font-family',

                // Bordas
                'border':   'border-width',
                'border-t': 'border-top-width',
                'border-r': 'border-right-width',
                'border-b': 'border-bottom-width',
                'border-l': 'border-left-width',
                'rounded':  'border-radius',
                'rounded-t': 'border-top-left-radius; border-top-right-radius',
                'rounded-b': 'border-bottom-left-radius; border-bottom-right-radius',
                'rounded-l': 'border-top-left-radius; border-bottom-left-radius',
                'rounded-r': 'border-top-right-radius; border-bottom-right-radius',

                // Posicionamento
                'top':    'top',
                'right':  'right',
                'bottom': 'bottom',
                'left':   'left',
                'z':      'z-index',
                'inset':  'inset',

                // Efeitos
                'opacity':       'opacity',
                'shadow':        'box-shadow',
                'blur':          'filter',
                'brightness':    'filter',
                'contrast':      'filter',
                'grayscale':     'filter',
                'saturate':      'filter',
                'drop-shadow':   'filter',
                'backdrop-blur': 'backdrop-filter',
                'filter': 'filter',

                // Backgrounds
                'bg-gradient': 'background-image',
                'bg-image':    'background-image',
                'bg-size':     'background-size',
                'bg-pos':      'background-position',
                'bg-repeat':   'background-repeat',
                'bg-attach':   'background-attachment',

                // Transforms (tratados especialmente pelo parser e renderer)
                'rotate':      'transform',
                'scale':       'transform',
                'scale-x':     'transform',
                'scale-y':     'transform',
                'translate-x': 'transform',
                'translate-y': 'transform',
                'skew-x':      'transform',
                'skew-y':      'transform',

                // Grid
                'cols':     'grid-template-columns',
                'rows':     'grid-template-rows',
                'col-span': 'grid-column',
                'row-span': 'grid-row',

                // Animações / Transições
                'duration': 'transition-duration',
                'delay':    'transition-delay',
                'ease':     'transition-timing-function',
                'animate':  'animation',

                // Misc
                'content':  'content',
                'cursor':   'cursor',
                'outline':  'outline',
                'ring':     'box-shadow',
                'aspect':   'aspect-ratio',
                'columns':  'columns',
            },

            processadoresEspeciais: {
                'blur':          v => `blur(${v})`,
                'brightness':    v => `brightness(${v})`,
                'contrast':      v => `contrast(${v})`,
                'grayscale':     v => `grayscale(${v})`,
                'saturate':      v => `saturate(${v})`,
                'drop-shadow':   v => `drop-shadow(${v})`,
                'backdrop-blur': v => `blur(${v})`,
                'bg-gradient':   v => {
                    if (v.startsWith('linear-gradient') ||
                        v.startsWith('radial-gradient') ||
                        v.startsWith('conic-gradient')) {
                        return v;
                    }
                    return `linear-gradient(${v})`;
                },
                'cols':      v => /^\d+$/.test(v) ? `repeat(${v}, 1fr)` : v,
                'col-span':  v => `span ${v} / span ${v}`,
                'row-span':  v => `span ${v} / span ${v}`,
                'ring':      v => `0 0 0 ${v} currentColor`,
                'aspect':    v => ({ square: '1/1', video: '16/9', photo: '4/3' })[v] || v,
                // size usa o mesmo valor para width e height (renderer gera as duas regras)
                'size':      v => v,
            },

            classesFixas: {
                // Background
                'bg-fixed':   'background-attachment: fixed',
                'bg-scroll': 'background-attachment: scroll',
                'bg-local': 'background-attachment: local',

                // Display
                'block':        'display: block',
                'inline':       'display: inline',
                'inline-block': 'display: inline-block',
                'flex':         'display: flex',
                'inline-flex':  'display: inline-flex',
                'grid':         'display: grid',
                'inline-grid':  'display: inline-grid',
                'hidden':       'display: none',
                'contents':     'display: contents',
                'table':        'display: table',
                'table-cell':   'display: table-cell',

                // Flex
                'flex-row':         'flex-direction: row',
                'flex-col':         'flex-direction: column',
                'flex-row-reverse': 'flex-direction: row-reverse',
                'flex-col-reverse': 'flex-direction: column-reverse',
                'flex-wrap':        'flex-wrap: wrap',
                'flex-nowrap':      'flex-wrap: nowrap',
                'flex-1':           'flex: 1 1 0%',
                'flex-auto':        'flex: 1 1 auto',
                'flex-none':        'flex: none',
                'flex-grow':        'flex-grow: 1',
                'flex-shrink':      'flex-shrink: 1',
                'flex-shrink-0':    'flex-shrink: 0',

                // Justify & Align
                'justify-start':   'justify-content: flex-start',
                'justify-end':     'justify-content: flex-end',
                'justify-center':  'justify-content: center',
                'justify-between': 'justify-content: space-between',
                'justify-around':  'justify-content: space-around',
                'justify-evenly':  'justify-content: space-evenly',
                'items-start':     'align-items: flex-start',
                'items-end':       'align-items: flex-end',
                'items-center':    'align-items: center',
                'items-baseline':  'align-items: baseline',
                'items-stretch':   'align-items: stretch',
                'self-auto':       'align-self: auto',
                'self-start':      'align-self: flex-start',
                'self-end':        'align-self: flex-end',
                'self-center':     'align-self: center',
                'self-stretch':    'align-self: stretch',
                'place-center':    'place-items: center',

                // Position
                'relative': 'position: relative',
                'absolute': 'position: absolute',
                'fixed':    'position: fixed',
                'sticky':   'position: sticky',
                'static':   'position: static',

                // Overflow
                'overflow-auto':     'overflow: auto',
                'overflow-hidden':   'overflow: hidden',
                'overflow-visible':  'overflow: visible',
                'overflow-scroll':   'overflow: scroll',
                'overflow-x-auto':   'overflow-x: auto',
                'overflow-y-auto':   'overflow-y: auto',
                'overflow-x-hidden': 'overflow-x: hidden',
                'overflow-y-hidden': 'overflow-y: hidden',

                // Text
                'text-left':    'text-align: left',
                'text-center':  'text-align: center',
                'text-right':   'text-align: right',
                'text-justify': 'text-align: justify',
                'uppercase':    'text-transform: uppercase',
                'lowercase':    'text-transform: lowercase',
                'capitalize':   'text-transform: capitalize',
                'italic':       'font-style: italic',
                'not-italic':   'font-style: normal',
                'underline':    'text-decoration: underline',
                'line-through': 'text-decoration: line-through',
                'no-underline': 'text-decoration: none',
                'truncate':     'overflow: hidden; text-overflow: ellipsis; white-space: nowrap',
                'antialiased':  '-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale',

                // Font Weight
                'font-thin':     'font-weight: 100',
                'font-light':    'font-weight: 300',
                'font-normal':   'font-weight: 400',
                'font-medium':   'font-weight: 500',
                'font-semibold': 'font-weight: 600',
                'font-bold':     'font-weight: 700',
                'font-black':    'font-weight: 900',

                // Border Radius
                'rounded-none': 'border-radius: 0',
                'rounded-sm':   'border-radius: 0.125rem',
                'rounded':      'border-radius: 0.25rem',
                'rounded-md':   'border-radius: 0.375rem',
                'rounded-lg':   'border-radius: 0.5rem',
                'rounded-xl':   'border-radius: 0.75rem',
                'rounded-2xl':  'border-radius: 1rem',
                'rounded-3xl':  'border-radius: 1.5rem',
                'rounded-full': 'border-radius: 9999px',

                // Shadow
                'shadow-sm':    'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'shadow':       'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'shadow-md':    'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)',
                'shadow-lg':    'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1)',
                'shadow-xl':    'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1)',
                'shadow-2xl':   'box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)',
                'shadow-none':  'box-shadow: none',
                'shadow-inner': 'box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

                // Transitions
                'transition':           'transition-property: all; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                'transition-none':      'transition-property: none',
                'transition-colors':    'transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                'transition-opacity':   'transition-property: opacity; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                'transition-transform': 'transition-property: transform; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                'transition-shadow':    'transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',

                // Cursor
                'cursor-pointer':     'cursor: pointer',
                'cursor-default':     'cursor: default',
                'cursor-not-allowed': 'cursor: not-allowed',
                'cursor-wait':        'cursor: wait',
                'cursor-text':        'cursor: text',
                'cursor-grab':        'cursor: grab',
                'cursor-grabbing':    'cursor: grabbing',

                // Pointer Events
                'pointer-events-none': 'pointer-events: none',
                'pointer-events-auto': 'pointer-events: auto',

                // User Select
                'select-none': 'user-select: none',
                'select-text': 'user-select: text',
                'select-all':  'user-select: all',

                // Object Fit
                'object-contain': 'object-fit: contain',
                'object-cover':   'object-fit: cover',
                'object-fill':    'object-fit: fill',
                'object-none':    'object-fit: none',

                // Whitespace
                'whitespace-normal':   'white-space: normal',
                'whitespace-nowrap':   'white-space: nowrap',
                'whitespace-pre':      'white-space: pre',
                'whitespace-pre-wrap': 'white-space: pre-wrap',
                'whitespace-pre-line': 'white-space: pre-line',

                // Visibility
                'visible':   'visibility: visible',
                'invisible': 'visibility: hidden',

                // Isolamento
                'isolate':        'isolation: isolate',
                'isolation-auto': 'isolation: auto',

                // Mix Blend
                'mix-blend-normal':   'mix-blend-mode: normal',
                'mix-blend-multiply': 'mix-blend-mode: multiply',
                'mix-blend-screen':   'mix-blend-mode: screen',
                'mix-blend-overlay':  'mix-blend-mode: overlay',

                // List
                'list-none':    'list-style-type: none',
                'list-disc':    'list-style-type: disc',
                'list-decimal': 'list-style-type: decimal',

                // Resize
                'resize':      'resize: both',
                'resize-x':    'resize: horizontal',
                'resize-y':    'resize: vertical',
                'resize-none': 'resize: none',

                // Appearance & Outline
                'appearance-none': '-webkit-appearance: none; appearance: none',
                'outline-none':    'outline: 2px solid transparent; outline-offset: 2px',

                // Will Change
                'will-change-transform': 'will-change: transform',
                'will-change-opacity':   'will-change: opacity',

                // Animações pré-definidas
                'animate-spin':    'animation: breeze-spin 1s linear infinite',
                'animate-ping':    'animation: breeze-ping 1s cubic-bezier(0,0,0.2,1) infinite',
                'animate-pulse':   'animation: breeze-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                'animate-bounce':  'animation: breeze-bounce 1s infinite',
                'animate-fade-in': 'animation: breeze-fade-in 0.3s ease-in-out',
                'animate-slide-in':'animation: breeze-slide-in 0.3s ease-out',
            },
        };
    }

    return {
        init,
        reiniciar,
        processar,
        build,
        use,
        addMapping,
        addVariant,
        addBreakpoint,
        addComponent,
        addFixedClass,
        addProcessor,
        obterStats,
    };
})();

export default Engine;