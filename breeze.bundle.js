/**
 * BreezeCSS v2.2.3 – breeze.bundle.js
 * Bundle sem módulos ES – compatível com <script src="...">
 * Autor: Pedro de Oliveira
 *
 * Novidades v2.2.3:
 *  • !important em classes fixas: flex!, hidden!, rounded! (e com variantes: hover:flex!)
 *  • !important em componentes:   btn! aplica !important a todas as propriedades internas
 *  • Aliases flex: grow[n], shrink[n], basis[valor] (mais ergonómicos que flex-g/flex-basis)
 *  • flex-g removido em favor de grow (flex-g mantido por compatibilidade)
 *  • Debounce no MutationObserver via requestAnimationFrame (batching de mutações)
 *  • safelist: classes pré-geradas mesmo antes de aparecerem no DOM
 *  • prefix: evita conflitos com outras frameworks (ex: bz-)
 *  • Minificador melhorado: remove espaços desnecessários dentro das declarações
 *
 * Novidades v2.2.2:
 *  • Suporte a flex-basis
 *  • BreezeCSS.exportar() – exporta todo o CSS gerado como ficheiro .css
 *
 * Novidades v2.2.1:
 *  • Suporte a !important: basta terminar o valor com ! → bg[red!], w[100%!]
 *
 * Novidades v2.2.0:
 *  • border[solid_1px_#fff]     – shorthand completo (style? width? color?)
 *  • border-t/r/b/l[...]        – shorthand por lado (ex: border-t[2px_solid_red])
 *  • font-weight[100] / fw[700] – peso de fonte arbitrário
 *  • text-shadow[...]           – sombra de texto
 *  • transition[prop_dur_ease]  – transição arbitrária
 *  • Fixes: border-color/style já incluíam prefixos; melhor fallback de parse
 */

(function (global) {
    'use strict';

    const cssEscape = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
        ? CSS.escape
        : s => s.replace(/([[\]{}()*+?.,\\^$|#\s:])/g, '\\$1');

    // ═══════════════════════════════════════════════════════════════════════
    // LOGGER
    // ═══════════════════════════════════════════════════════════════════════
    const Logger = (() => {
        const NIVEIS = { SILENCIOSO: 0, ERRO: 1, AVISO: 2, INFO: 3, DEBUG: 4 };
        let _nivel = NIVEIS.INFO;
        let _historico = [];
        const _maxHistorico = 200;
        const ESTILOS = {
            prefixo: 'color: #00ff88; font-weight: bold;',
            debug:   'color: #888;',
            info:    'color: #4af;',
            aviso:   'color: #fa0; font-weight: bold;',
            erro:    'color: #f44; font-weight: bold;',
        };
        function _registar(nivel, nomeNivel, estilo, ...args) {
            if (_nivel < nivel) return;
            const entrada = { nivel: nomeNivel, mensagem: args.join(' '), timestamp: new Date().toISOString() };
            _historico.push(entrada);
            if (_historico.length > _maxHistorico) _historico.shift();
            console.log(`%c[BreezeCSS v2]%c [${nomeNivel}]`, ESTILOS.prefixo, estilo, ...args);
        }
        return {
            debug: (...a) => _registar(NIVEIS.DEBUG, 'DEBUG', ESTILOS.debug, ...a),
            info:  (...a) => _registar(NIVEIS.INFO,  'INFO',  ESTILOS.info,  ...a),
            aviso: (...a) => _registar(NIVEIS.AVISO, 'AVISO', ESTILOS.aviso, ...a),
            erro:  (...a) => _registar(NIVEIS.ERRO,  'ERRO',  ESTILOS.erro,  ...a),
            configurar({ nivel, silencioso } = {}) {
                if (silencioso) { _nivel = NIVEIS.SILENCIOSO; return; }
                const mapa = { debug: 4, info: 3, aviso: 2, erro: 1, silencioso: 0 };
                if (nivel !== undefined && mapa[nivel] !== undefined) _nivel = mapa[nivel];
            },
            obterHistorico: () => [..._historico],
            limpar: () => { _historico = []; },
            NIVEIS,
        };
    })();

    // ═══════════════════════════════════════════════════════════════════════
    // CACHE
    // ═══════════════════════════════════════════════════════════════════════
    const Cache = (() => {
        const regrasCSS         = new Set();
        const classesResolvidas = new Map();
        const transformsPorChave = new Map();
        const componentes       = new Map();
        const stats = { hits: 0, misses: 0, total: 0 };

        function temRegra(r)      { stats.total++; if (regrasCSS.has(r)) { stats.hits++; return true; } stats.misses++; return false; }
        function registarRegra(r) { regrasCSS.add(r); }
        function temClasse(c)     { return classesResolvidas.has(c); }
        function obterClasse(c)   { return classesResolvidas.get(c) || null; }
        function registarClasse(c, r) { classesResolvidas.set(c, r); }

        function obterTransforms(chave) {
            if (!transformsPorChave.has(chave)) transformsPorChave.set(chave, new Map());
            return transformsPorChave.get(chave);
        }
        function atualizarTransform(chave, tipo, valor) {
            obterTransforms(chave).set(tipo, valor);
            return obterTransforms(chave);
        }
        function construirTransform(chave) {
            const t = obterTransforms(chave);
            if (t.size === 0) return null;
            const ordem = ['translateX', 'translateY', 'rotate', 'scale', 'scaleX', 'scaleY', 'skewX', 'skewY'];
            const partes = [];
            ordem.forEach(tipo => { if (t.has(tipo)) partes.push(t.get(tipo)); });
            t.forEach((v, tipo) => { if (!ordem.includes(tipo)) partes.push(v); });
            return partes.join(' ');
        }

        function registarComponente(n, c) { componentes.set(n, c); }
        function obterComponente(n)       { return componentes.get(n) || null; }
        function temComponente(n)         { return componentes.has(n); }

        function limpar() {
            regrasCSS.clear(); classesResolvidas.clear(); transformsPorChave.clear();
            stats.hits = 0; stats.misses = 0; stats.total = 0;
        }
        function obterStats() {
            return {
                ...stats,
                taxaAcerto: stats.total > 0 ? ((stats.hits / stats.total) * 100).toFixed(1) + '%' : '0%',
                regrasCacheadas: regrasCSS.size,
                classesCacheadas: classesResolvidas.size,
            };
        }
        // Devolve todas as regras CSS registadas no cache (strings originais
        // tal como foram passadas ao insertRule — sempre utilizáveis).
        function obterTodasRegras() { return Array.from(regrasCSS); }

        return {
            temRegra, registarRegra, temClasse, obterClasse, registarClasse,
            obterTransforms, atualizarTransform, construirTransform,
            registarComponente, obterComponente, temComponente,
            limpar, obterStats, obterTodasRegras,
        };
    })();

    // ═══════════════════════════════════════════════════════════════════════
    // RENDERER
    // ═══════════════════════════════════════════════════════════════════════
    const Renderer = (() => {
        let _config      = null;
        let _tagEstilo   = null;
        let _sheet       = null;
        let _modoOffline = false;
        let _regrasOffline = [];

        function inicializar(config) { _config = config; }
        function ativarModoOffline()  { _modoOffline = true; _regrasOffline = []; }
        function desativarModoOffline() { _modoOffline = false; }
        function obterRegrasOffline() { return [..._regrasOffline]; }

        function _obterSheet() {
            if (_sheet) return _sheet;
            _tagEstilo = document.createElement('style');
            _tagEstilo.id = 'breeze-v2-estilos';
            _tagEstilo.setAttribute('data-breeze', 'v2');
            document.head.appendChild(_tagEstilo);
            _sheet = _tagEstilo.sheet;
            return _sheet;
        }

        function _inserirRegra(regra) {
            if (Cache.temRegra(regra)) return;
            Cache.registarRegra(regra);
            if (_modoOffline) { _regrasOffline.push(regra); return; }
            const sheet = _obterSheet();
            try { sheet.insertRule(regra, sheet.cssRules.length); Logger.debug('Regra → ' + regra); }
            catch (e) { Logger.erro('Falha: ' + regra, e); }
        }

        function _construirSeletor(classeOriginal, variantes) {
            let seletor = '.' + cssEscape(classeOriginal);
            if (!variantes || variantes.length === 0) return seletor;
            for (const v of variantes) {
                const pseudo = _config.variantes[v];
                if (!pseudo) continue;
                if (pseudo.includes('&')) {
                    seletor = pseudo.replace(/&/g, seletor);
                } else {
                    seletor = seletor + pseudo;
                }
            }
            return seletor;
        }

        function _comMediaQuery(bp, regra) {
            const tam = _config.breakpoints[bp];
            return tam ? `@media (min-width: ${tam}) { ${regra} }` : regra;
        }

        function renderizar(resultados, classeOriginal, elemento) {
            if (!resultados || resultados.length === 0) return;
            resultados.forEach(r => {
                if (r.eTransform) _renderizarTransform(r, classeOriginal, elemento);
                else _renderizarRegular(r, classeOriginal);
            });
        }

        function _renderizarRegular(r, classeOriginal) {
            const seletor = _construirSeletor(classeOriginal, r.variantes);
            const props = r.propriedade.split(';').map(p => p.trim()).filter(Boolean);
            const sufixo = r.importante ? ' !important' : '';
            props.forEach(prop => {
                let regra = `${seletor} { ${prop}: ${r.valor}${sufixo}; }`;
                if (r.breakpoint) regra = _comMediaQuery(r.breakpoint, `${seletor} { ${prop}: ${r.valor}${sufixo}; }`);
                _inserirRegra(regra);
            });
        }

        function _renderizarTransform(r, classeOriginal, elemento) {
            const chaveContexto = `${r.breakpoint || ''}|${(r.variantes || []).join(',')}`;
            let seletorRegra, chaveTransform;

            if (elemento && typeof elemento.getAttribute === 'function') {
                const breezeId = elemento.getAttribute('data-breeze-id');
                if (breezeId) {
                    chaveTransform = `elem:${breezeId}::${chaveContexto}`;
                    seletorRegra = `[data-breeze-id="${breezeId}"]`;
                    if (r.variantes && r.variantes.length > 0) {
                        const pseudos = r.variantes
                            .map(v => _config.variantes[v])
                            .filter(p => p && !p.includes('&'))
                            .join('');
                        seletorRegra += pseudos;
                    }
                }
            }

            if (!chaveTransform) {
                const seletorClasse = _construirSeletor(classeOriginal, r.variantes);
                chaveTransform = `cls:${seletorClasse}::${chaveContexto}`;
                seletorRegra = seletorClasse;
            }

            Cache.atualizarTransform(chaveTransform, r.tipoTransform, r.valor);
            const transformCombinado = Cache.construirTransform(chaveTransform);
            if (!transformCombinado) return;

            if (!_modoOffline && _sheet) {
                const rules = Array.from(_sheet.cssRules);
                for (let i = rules.length - 1; i >= 0; i--) {
                    if (rules[i].selectorText === seletorRegra && rules[i].style?.transform) {
                        _sheet.deleteRule(i); break;
                    }
                }
            }

            const sufixo = r.importante ? ' !important' : '';
            let regra = `${seletorRegra} { transform: ${transformCombinado}${sufixo}; }`;
            if (r.breakpoint) regra = _comMediaQuery(r.breakpoint, `${seletorRegra} { transform: ${transformCombinado}${sufixo}; }`);

            if (_modoOffline) { _regrasOffline.push(regra); return; }
            const sheet = _obterSheet();
            try { sheet.insertRule(regra, sheet.cssRules.length); Logger.debug('Transform → ' + regra); }
            catch (e) { Logger.erro('Falha transform: ' + regra, e); }
        }

        function inserirRegrasGlobais(regrasGlobais) {
            for (const sel in regrasGlobais) {
                const props = regrasGlobais[sel];
                const decl = Object.entries(props).map(([p, v]) => `${p}: ${v}`).join('; ');
                _inserirRegra(`${sel} { ${decl}; }`);
            }
        }

        function inserirVariaveisCSS(tema) {
            if (!tema) return;
            const vars = [];
            if (tema.cores)       Object.entries(tema.cores).forEach(([n, v]) => vars.push(`--breeze-${n}: ${v}`));
            if (tema.espacamento) Object.entries(tema.espacamento).forEach(([n, v]) => vars.push(`--breeze-spacing-${n}: ${v}`));
            if (tema.fontes)      Object.entries(tema.fontes).forEach(([n, v]) => vars.push(`--breeze-font-${n}: ${v}`));
            if (vars.length > 0) _inserirRegra(`:root { ${vars.join('; ')}; }`);
            _inserirKeyframes();
        }

        function _inserirKeyframes() {
            const keyframes = [
                `@keyframes breeze-spin { to { transform: rotate(360deg); } }`,
                `@keyframes breeze-ping { 75%, 100% { transform: scale(2); opacity: 0; } }`,
                `@keyframes breeze-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`,
                `@keyframes breeze-bounce { 0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); } 50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); } }`,
                `@keyframes breeze-fade-in { from { opacity: 0; } to { opacity: 1; } }`,
                `@keyframes breeze-slide-in { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`,
            ];
            keyframes.forEach(kf => {
                if (!Cache.temRegra(kf)) {
                    Cache.registarRegra(kf);
                    if (!_modoOffline) {
                        try { _obterSheet().insertRule(kf, _obterSheet().cssRules.length); }
                        catch (e) { /* ignorar */ }
                    } else { _regrasOffline.push(kf); }
                }
            });
        }

        function gerarCSSEstatico(minificar = false) {
            return minificar ? _regrasOffline.join('') : _regrasOffline.join('\n');
        }

        // ─────────────────────────────────────────────────────────────────
        // obterRegrasDOMAtual
        // Lê as cssRules da <style> tag ao vivo e reconstrói CSS utilizável.
        // Usa rule.style para extrair declarações (evita bug do browser que
        // serializa cssText com blocos vazios em seletores escapados).
        // ─────────────────────────────────────────────────────────────────
        function obterRegrasDOMAtual() {
            if (!_sheet) return [];
            const linhas = [];
            const rules = Array.from(_sheet.cssRules || []);

            function _serializarEstilo(style) {
                // Lê cada propriedade declarada e reconstrói "prop: valor".
                // getPropertyValue pode devolver "" para "0" em alguns engines —
                // usamos acesso camelCase como fallback.
                const decls = [];
                for (let i = 0; i < style.length; i++) {
                    const prop = style[i];
                    let val    = style.getPropertyValue(prop);
                    const prio = style.getPropertyPriority(prop);
                    if (val === '' || val === undefined) {
                        const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                        val = style[camel] != null ? String(style[camel]) : '';
                    }
                    if (val !== '' && val !== undefined) {
                        decls.push(`  ${prop}: ${val}${prio ? ' !' + prio : ''};`);
                    }
                }
                return decls.join('\n');
            }

            function _serializarRegra(rule, indent) {
                const pad = indent || '';

                // CSSStyleRule (regra normal com seletor)
                if (rule.type === 1 && rule.style) {
                    const decls = _serializarEstilo(rule.style);
                    // Seletor: preferir selectorText que o browser normaliza
                    const sel = rule.selectorText || '';
                    if (!decls) return null; // regra vazia — ignorar
                    return `${pad}${sel} {\n${decls}\n${pad}}`;
                }

                // CSSMediaRule (@media)
                if (rule.type === 4 && rule.cssRules) {
                    const cond = rule.conditionText || rule.media?.mediaText || '';
                    const inner = Array.from(rule.cssRules)
                        .map(r => _serializarRegra(r, pad + '  '))
                        .filter(Boolean)
                        .join('\n');
                    if (!inner) return null;
                    return `${pad}@media ${cond} {\n${inner}\n${pad}}`;
                }

                // CSSKeyframesRule (@keyframes)
                if (rule.type === 7 && rule.cssRules) {
                    const nome = rule.name || '';
                    const inner = Array.from(rule.cssRules)
                        .map(r => {
                            const decls = _serializarEstilo(r.style);
                            return decls ? `  ${r.keyText} {\n${decls.replace(/^/gm, '  ')}\n  }` : null;
                        })
                        .filter(Boolean)
                        .join('\n');
                    if (!inner) return null;
                    return `${pad}@keyframes ${nome} {\n${inner}\n${pad}}`;
                }

                // Fallback para outros tipos (@font-face, etc.) — usar cssText
                if (rule.cssText) return pad + rule.cssText;
                return null;
            }

            for (const rule of rules) {
                const linha = _serializarRegra(rule, '');
                if (linha) linhas.push(linha);
            }

            return linhas;
        }

        function limpar() {
            if (_tagEstilo) { _tagEstilo.remove(); _tagEstilo = null; _sheet = null; }
        }

        return {
            inicializar, renderizar, inserirRegrasGlobais, inserirVariaveisCSS,
            ativarModoOffline, desativarModoOffline, obterRegrasOffline,
            gerarCSSEstatico, obterRegrasDOMAtual, limpar,
        };
    })();

    // ═══════════════════════════════════════════════════════════════════════
    // BORDER SHORTHAND PARSER
    // ═══════════════════════════════════════════════════════════════════════
    const ESTILOS_BORDA = new Set([
        'none','hidden','dotted','dashed','solid','double',
        'groove','ridge','inset','outset','initial','inherit','unset',
    ]);

    const REGEX_LARGURA_BORDA = /^(\d+(\.\d+)?(px|em|rem|%|vw|vh|pt|cm|mm)|thin|medium|thick)$/i;

    function _parece_cor(v) {
        return /^#[0-9a-fA-F]{3,8}$/.test(v)
            || /^rgba?\(/.test(v)
            || /^hsla?\(/.test(v)
            || /^var\(/.test(v)
            || /^(transparent|currentColor|black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|inherit|initial|unset)$/i.test(v);
    }

    function parsearBorderShorthand(valorBruto, lado = '') {
        const valor = valorBruto.replace(/_/g, ' ');
        const partes = _splitRespeitandoParenteses(valor);

        const resultado = [];
        const propStyle = `border${lado}-style`;
        const propWidth = `border${lado}-width`;
        const propColor = `border${lado}-color`;

        let temStyle = false, temWidth = false, temColor = false;

        for (const parte of partes) {
            if (!temStyle && ESTILOS_BORDA.has(parte.toLowerCase())) {
                resultado.push({ prop: propStyle, val: parte });
                temStyle = true;
            } else if (!temWidth && REGEX_LARGURA_BORDA.test(parte)) {
                resultado.push({ prop: propWidth, val: parte });
                temWidth = true;
            } else if (!temColor && _parece_cor(parte)) {
                resultado.push({ prop: propColor, val: parte });
                temColor = true;
            } else {
                Logger.aviso(`border shorthand: parte não reconhecida "${parte}", usando como largura`);
                if (!temWidth) { resultado.push({ prop: propWidth, val: parte }); temWidth = true; }
            }
        }

        return resultado;
    }

    function _splitRespeitandoParenteses(str) {
        const partes = [];
        let atual = '', profundidade = 0;
        for (const c of str) {
            if (c === '(') { profundidade++; atual += c; }
            else if (c === ')') { profundidade--; atual += c; }
            else if (c === ' ' && profundidade === 0) {
                if (atual) { partes.push(atual); atual = ''; }
            } else { atual += c; }
        }
        if (atual) partes.push(atual);
        return partes;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PARSER
    // ═══════════════════════════════════════════════════════════════════════
    const Parser = (() => {
        let _config = null;
        const REGEX_ARBITRARIO = /^(?<prefixo>[a-zA-Z-]+(?:-[a-zA-Z-]+)*)\[(?<valor>[^\]]+)\]$/;

        const BORDER_SHORTHAND_PREFIXOS = new Set([
            'border', 'border-t', 'border-r', 'border-b', 'border-l',
        ]);

        const BORDER_LADO_MAP = {
            'border':   '',
            'border-t': '-top',
            'border-r': '-right',
            'border-b': '-bottom',
            'border-l': '-left',
        };

        function inicializar(config) { _config = config; }

        function interpretarClasse(classeOriginal) {
            if (!_config) return null;
            if (Cache.temClasse(classeOriginal)) return Cache.obterClasse(classeOriginal);

            // Componente com sufixo ! → btn! expande como btn mas com importante: true
            const classeParaComponente = classeOriginal.endsWith('!') ? classeOriginal.slice(0, -1) : classeOriginal;
            const importanteComponente = classeOriginal.endsWith('!') && classeOriginal !== classeParaComponente;

            if (Cache.temComponente(classeParaComponente)) {
                const cls = Cache.obterComponente(classeParaComponente);
                const res = cls.map(c => interpretarClasse(c)).flat().filter(Boolean).map(r =>
                    importanteComponente ? { ...r, importante: true } : r
                );
                Cache.registarClasse(classeOriginal, res);
                return res;
            }

            const resultado = _parsearClasse(classeOriginal);
            Cache.registarClasse(classeOriginal, resultado);
            return resultado;
        }

        function _parsearClasse(classe) {
            const partes = _separarQualificadores(classe);
            if (!partes) return null;
            const { breakpoint, variantes, classeBase } = partes;
            return _resolverClasseFixa(classeBase, breakpoint, variantes)
                || _resolverClasseArbitraria(classeBase, breakpoint, variantes);
        }

        function _separarQualificadores(classe) {
            if (!classe.includes(':') && !classe.includes('[')) {
                return { breakpoint: null, variantes: [], classeBase: classe };
            }
            const segmentos = [];
            let atual = '', dentroColchetes = false;
            for (let i = 0; i < classe.length; i++) {
                const c = classe[i];
                if (c === '[') dentroColchetes = true;
                if (c === ']') dentroColchetes = false;
                if (c === ':' && !dentroColchetes) { segmentos.push(atual); atual = ''; }
                else atual += c;
            }
            segmentos.push(atual);
            const classeBase = segmentos.pop();
            let breakpoint = null;
            const variantes = [];
            for (const seg of segmentos) {
                if (_config.breakpoints[seg] !== undefined) breakpoint = seg;
                else if (_config.variantes[seg] !== undefined) variantes.push(seg);
                else { Logger.aviso(`Qualificador desconhecido: "${seg}" em "${classe}"`); return null; }
            }
            return { breakpoint, variantes, classeBase };
        }

        function _resolverClasseFixa(classeBase, breakpoint, variantes) {
            let importante = false;
            if (classeBase.endsWith('!')) {
                importante = true;
                classeBase = classeBase.slice(0, -1);
            }
            const estiloFixo = _config.classesFixas[classeBase];
            if (!estiloFixo) return null;
            return estiloFixo.split(';').map(d => d.trim()).filter(Boolean).map(d => {
                const idx = d.indexOf(':');
                if (idx === -1) return null;
                return {
                    tipo: 'fixo', classeBase, breakpoint,
                    variantes: variantes || [],
                    propriedade: d.slice(0, idx).trim(),
                    valor: d.slice(idx + 1).trim(),
                    importante,
                    eTransform: false,
                };
            }).filter(Boolean);
        }

        function _resolverClasseArbitraria(classeBase, breakpoint, variantes) {
            const match = classeBase.match(REGEX_ARBITRARIO);
            if (!match) return null;
            let { prefixo, valor } = match.groups;

            let importante = false;
            if (valor.endsWith('!')) {
                importante = true;
                valor = valor.slice(0, -1);
            }

            if (BORDER_SHORTHAND_PREFIXOS.has(prefixo)) {
                const valorComEspacos = valor.replace(/_/g, ' ');
                const partes = _splitRespeitandoParenteses(valorComEspacos);
                const temEstilo = partes.some(p => ESTILOS_BORDA.has(p.toLowerCase()));
                const temCor    = partes.some(p => _parece_cor(p));
                if (partes.length > 1 || temEstilo || temCor) {
                    const lado = BORDER_LADO_MAP[prefixo];
                    const declaracoes = parsearBorderShorthand(valor, lado);
                    if (declaracoes.length > 0) {
                        return declaracoes.map(({ prop, val }) => ({
                            tipo: 'arbitrario', classeBase, breakpoint,
                            variantes: variantes || [], prefixo,
                            propriedade: prop, valor: val,
                            importante,
                            eTransform: false, tipoTransform: null,
                        }));
                    }
                }
            }

            valor = _resolverValorTema(valor);
            valor = _substituirUnderscoreFora(valor);
            const propriedade = _config.mapaPropriedades[prefixo];
            if (!propriedade) { Logger.aviso(`Prefixo desconhecido: "${prefixo}"`); return null; }
            const eTransform = _config.transformPrefixos?.includes(prefixo) ?? false;
            let valorProcessado = valor, tipoTransform = null;
            if (eTransform) {
                const r = _processarTransform(prefixo, valor);
                valorProcessado = r.valorCss;
                tipoTransform = r.tipo;
            } else if (_config.processadoresEspeciais[prefixo]) {
                valorProcessado = _config.processadoresEspeciais[prefixo](valor);
            }
            return [{
                tipo: 'arbitrario', classeBase, breakpoint,
                variantes: variantes || [], prefixo, propriedade,
                valor: valorProcessado,
                importante,
                eTransform, tipoTransform,
            }];
        }

        // Substitui _ por espaço apenas fora de funções CSS como url(), var(), etc.
        // Dentro dessas funções o _ é parte do valor real e não deve ser tocado.
        function _substituirUnderscoreFora(valor) {
            let resultado = '';
            let profundidade = 0;
            for (let i = 0; i < valor.length; i++) {
                const c = valor[i];
                if (c === '(') profundidade++;
                else if (c === ')') profundidade--;
                resultado += (c === '_' && profundidade === 0) ? ' ' : c;
            }
            return resultado;
        }

        function _resolverValorTema(valor) {
            const t = _config.tema;
            if (!t) return valor;
            if (t.cores?.[valor])       return t.cores[valor];
            if (t.espacamento?.[valor]) return t.espacamento[valor];
            if (t.fontes?.[valor])      return t.fontes[valor];
            return valor;
        }

        function _processarTransform(prefixo, valor) {
            const mapa = {
                'rotate':      { tipo: 'rotate',    fn: v => `rotate(${v})` },
                'scale':       { tipo: 'scale',      fn: v => `scale(${v})` },
                'scale-x':     { tipo: 'scaleX',     fn: v => `scaleX(${v})` },
                'scale-y':     { tipo: 'scaleY',     fn: v => `scaleY(${v})` },
                'translate-x': { tipo: 'translateX', fn: v => `translateX(${v})` },
                'translate-y': { tipo: 'translateY', fn: v => `translateY(${v})` },
                'skew-x':      { tipo: 'skewX',      fn: v => `skewX(${v})` },
                'skew-y':      { tipo: 'skewY',      fn: v => `skewY(${v})` },
            };
            const cfg = mapa[prefixo];
            if (!cfg) return { tipo: prefixo, valorCss: valor };
            return { tipo: cfg.tipo, valorCss: cfg.fn(valor) };
        }

        function extrairClassesRelevantes(elemento) {
            return Array.from(elemento.classList).filter(classe => {
                // Normalizar sufixo ! para lookup em classesFixas e componentes
                const classeNorm = classe.endsWith('!') ? classe.slice(0, -1) : classe;

                if (_config.classesFixas[classeNorm]) return true;
                if (Cache.temComponente(classeNorm)) return true;
                if (!classe.includes(':') && !classe.includes('[')) return false;

                const partes = _separarQualificadoresRapido(classe);
                if (!partes) return false;
                const { classeBase } = partes;

                // classeBase também pode ter sufixo !
                const classeBaseNorm = classeBase.endsWith('!') ? classeBase.slice(0, -1) : classeBase;

                if (_config.classesFixas[classeBaseNorm]) return true;
                if (Cache.temComponente(classeBaseNorm)) return true;

                const matchArb = classeBaseNorm.match(REGEX_ARBITRARIO);
                if (matchArb) {
                    const p = matchArb.groups.prefixo;
                    return _config.mapaPropriedades[p] !== undefined
                        || BORDER_SHORTHAND_PREFIXOS.has(p);
                }

                return false;
            });
        }

        function _separarQualificadoresRapido(classe) {
            if (!classe.includes(':')) return { classeBase: classe };
            const segmentos = [];
            let atual = '', dentroColchetes = false;
            for (let i = 0; i < classe.length; i++) {
                const c = classe[i];
                if (c === '[') dentroColchetes = true;
                if (c === ']') dentroColchetes = false;
                if (c === ':' && !dentroColchetes) { segmentos.push(atual); atual = ''; }
                else atual += c;
            }
            segmentos.push(atual);
            const classeBase = segmentos.pop();
            for (const seg of segmentos) {
                if (_config.breakpoints[seg] === undefined && _config.variantes[seg] === undefined)
                    return null;
            }
            return { classeBase };
        }

        return { inicializar, interpretarClasse, extrairClassesRelevantes };
    })();

    // ═══════════════════════════════════════════════════════════════════════
    // OBSERVER
    // ═══════════════════════════════════════════════════════════════════════
    const Observer = (() => {
        let _observer = null;
        let _callback = null;

        // ── Debounce via requestAnimationFrame ──────────────────────────────
        // Todas as mutações ocorridas no mesmo frame são agrupadas numa única
        // chamada ao callback, evitando processamento repetido em páginas
        // dinâmicas que inserem muitos elementos de seguida.
        const _fila = new Set();
        let _agendado = false;

        function _agendarProcessamento(elementos) {
            elementos.forEach(el => _fila.add(el));
            if (_agendado) return;
            _agendado = true;
            requestAnimationFrame(() => {
                _agendado = false;
                const lista = Array.from(_fila);
                _fila.clear();
                Logger.debug(`Observer (rAF): ${lista.length} elemento(s)`);
                _callback(lista);
            });
        }

        function iniciar(callback) {
            if (_observer) { Logger.aviso('Observer já activo'); return; }
            _callback = callback;
            _observer = new MutationObserver(_aoMutar);
            _observer.observe(document.documentElement, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ['class'],
            });
            Logger.debug('MutationObserver iniciado (com debounce rAF)');
        }

        function parar() {
            if (_observer) { _observer.disconnect(); _observer = null; Logger.debug('Observer parado'); }
        }

        function _aoMutar(mutations) {
            const elementos = new Set();
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(no => {
                        if (no.nodeType === Node.ELEMENT_NODE) {
                            elementos.add(no);
                            no.querySelectorAll('*').forEach(el => elementos.add(el));
                        }
                    });
                } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
                    elementos.add(m.target);
                }
            }
            if (elementos.size > 0) _agendarProcessamento(Array.from(elementos));
        }

        function coletarInicialmente() { return Array.from(document.querySelectorAll('*')); }

        return { iniciar, parar, coletarInicialmente };
    })();

    // ═══════════════════════════════════════════════════════════════════════
    // ENGINE
    // ═══════════════════════════════════════════════════════════════════════
    const Engine = (() => {
        let _config   = null;
        let _iniciado = false;
        let _idCounter = 0;
        const _mapaIdsElemento = new WeakMap();

        // Registo permanente: breezeId → array de classes CSS de transform.
        // Usado na exportação para substituir [data-breeze-id="bN"] por seletores
        // de classe reais, tornando o CSS exportado independente do Breeze.
        const _mapaIdParaClasses = new Map();

        function _obterIdElemento(elemento) {
            if (!_mapaIdsElemento.has(elemento)) {
                const id = `b${++_idCounter}`;
                _mapaIdsElemento.set(elemento, id);
                elemento.setAttribute('data-breeze-id', id);
            }
            return _mapaIdsElemento.get(elemento);
        }

        function processarElementos(elementos) {
            for (const el of elementos) {
                if (!el.classList || el.classList.length === 0) continue;
                const classes = Parser.extrairClassesRelevantes(el);
                const classesTransform = [];
                for (const classe of classes) {
                    const resultados = Parser.interpretarClasse(classe);
                    if (!resultados || resultados.length === 0) continue;
                    if (resultados.some(r => r.eTransform)) {
                        _obterIdElemento(el);
                        classesTransform.push(classe);
                    }
                    Renderer.renderizar(resultados, classe, el);
                }
                // Actualizar o mapa id → classes de transform para este elemento
                if (classesTransform.length > 0) {
                    const id = el.getAttribute('data-breeze-id');
                    if (id) _mapaIdParaClasses.set(id, classesTransform);
                }
            }
        }

        function init(configUsuario = {}) {
            if (_iniciado) {
                Logger.aviso('BreezeCSS já foi inicializado. Use reiniciar() para reinicializar.');
                return;
            }
            _config = _construirConfig(configUsuario);
            _iniciado = true;
            Logger.configurar({
                nivel: _config.debug ? 'debug' : (_config.log === false ? 'silencioso' : 'info'),
                silencioso: _config.log === false,
            });
            Logger.info('Inicializando BreezeCSS v2.2.3...');
            if (_config.plugins) _config.plugins.forEach(p => _aplicarPlugin(p));

            // ── prefix ───────────────────────────────────────────────────
            // Se definido, aplica o prefixo a todas as classes fixas e
            // mapeamentos existentes, permitindo uso como bz-flex, bz-bg[red], …
            if (_config.prefix) {
                const pf = _config.prefix;
                const novasFixas = {};
                for (const [k, v] of Object.entries(_config.classesFixas))
                    novasFixas[pf + k] = v;
                _config.classesFixas = novasFixas;

                const novosMapa = {};
                for (const [k, v] of Object.entries(_config.mapaPropriedades))
                    novosMapa[pf + k] = v;
                _config.mapaPropriedades = novosMapa;
                Logger.info(`Prefix activo: "${pf}"`);
            }

            Parser.inicializar(_config);
            Renderer.inicializar(_config);
            if (_config.reset) Renderer.inserirRegrasGlobais(_config.regrasGlobais);
            Renderer.inserirVariaveisCSS(_config.tema);

            // ── safelist ─────────────────────────────────────────────────
            // Pré-gera as classes indicadas, mesmo que ainda não estejam no DOM.
            if (_config.safelist && _config.safelist.length > 0) {
                Logger.info(`Safelist: ${_config.safelist.length} classe(s)`);
                // Criar um elemento fantasma para forçar o processamento
                const fantasma = document.createElement('div');
                fantasma.className = _config.safelist.join(' ');
                processarElementos([fantasma]);
            }

            const elementosIniciais = Observer.coletarInicialmente();
            processarElementos(elementosIniciais);
            Observer.iniciar(processarElementos);
            Logger.info(`Pronto. ${elementosIniciais.length} elementos processados.`);
        }

        function reiniciar() {
            Observer.parar();
            Renderer.limpar();
            Cache.limpar();
            _mapaIdParaClasses.clear();
            _config = null;
            _iniciado = false;
            _idCounter = 0;
            Logger.debug('BreezeCSS reiniciado.');
        }

        function processar() {
            _garantirIniciado();
            processarElementos(Observer.coletarInicialmente());
        }

        function build(htmlString, opcoes = {}) {
            if (typeof DOMParser === 'undefined') {
                Logger.erro('build() requer DOMParser. Em Node.js use jsdom.');
                return '';
            }
            if (!_iniciado) { _garantirIniciado(); }
            Logger.info('Modo build...');
            const doc = new DOMParser().parseFromString(htmlString, 'text/html');
            const elementos = Array.from(doc.querySelectorAll('*'));
            Renderer.ativarModoOffline();
            Cache.limpar();
            Parser.inicializar(_config);
            if (_config.reset) Renderer.inserirRegrasGlobais(_config.regrasGlobais);
            Renderer.inserirVariaveisCSS(_config.tema);
            processarElementos(elementos);
            const css = Renderer.gerarCSSEstatico(opcoes.minificar ?? false);
            Renderer.desativarModoOffline();
            Logger.info(`Build: ${css.length} chars`);
            return css;
        }

        // ─────────────────────────────────────────────────────────────────
        // exportar
        //
        // Lê o CSS real presente no <style> do browser (via obterRegrasDOMAtual),
        // substitui seletores [data-breeze-id="bN"] pelos seletores de classe
        // originais (tornando o CSS portável, sem dependência do Breeze),
        // e dispara o download do ficheiro .css.
        //
        // Opções:
        //   nome             {string}  – nome do ficheiro (sem extensão). Default: 'breeze-output'
        //   minificar        {boolean} – output numa linha só.            Default: false
        //   incluirCabecalho {boolean} – adiciona comentário no topo.     Default: true
        //
        // Devolve o conteúdo CSS como string.
        // ─────────────────────────────────────────────────────────────────
        function exportar(opcoes = {}) {
            const {
                nome             = 'breeze-output',
                minificar        = false,
                incluirCabecalho = true,
            } = opcoes;

            // ── 1. Fonte de verdade: CSS real presente no DOM ────────────
            const regras = Renderer.obterRegrasDOMAtual();

            if (regras.length === 0) {
                Logger.aviso('exportar(): nenhuma regra CSS encontrada. O Breeze já foi inicializado?');
                return '';
            }

            // ── 2. Construir tabela de substituição ──────────────────────
            // [data-breeze-id="bN"] → seletor de classe baseado nas classes
            // de transform do elemento (ex: .translate-x\[10px\].rotate\[45deg\])
            //
            // Porquê: os IDs são dinâmicos e deixam de funcionar sem o Breeze.
            // Ao substituir por seletores de classe, o CSS exportado é autónomo.
            const tabelaSubstituicao = new Map(); // "bN" → seletor CSS

            for (const [id, classes] of _mapaIdParaClasses) {
                // Construir seletor combinado a partir das classes do elemento.
                // cssEscape trata os '[', ']' e outros caracteres especiais.
                const seletor = classes.map(c => '.' + cssEscape(c)).join('');
                tabelaSubstituicao.set(id, seletor);
            }

            // ── 3. Aplicar substituições nas regras ──────────────────────
            // Regex que captura [data-breeze-id="bN"] com ou sem pseudoclasse/
            // pseudoelemento a seguir (ex: [data-breeze-id="b1"]:hover).
            const REGEX_ID = /\[data-breeze-id="(b\d+)"\]/g;

            const regrasSubstituidas = regras.map(regra => {
                return regra.replace(REGEX_ID, (match, id) => {
                    return tabelaSubstituicao.has(id)
                        ? tabelaSubstituicao.get(id)
                        : match; // sem correspondência conhecida: manter original
                });
            });

            // ── 4. Montar conteúdo final ─────────────────────────────────
            let conteudo = '';

            if (incluirCabecalho) {
                const agora = new Date().toISOString().replace('T', ' ').slice(0, 19);
                conteudo += [
                    `/* =========================================`,
                    ` * Gerado por BreezeCSS v${BreezeCSS.versao}`,
                    ` * Data: ${agora}`,
                    ` * Total de regras: ${regrasSubstituidas.length}`,
                    ` * ========================================= */`,
                    '',
                ].join('\n');
            }

            if (minificar) {
                conteudo += regrasSubstituidas
                    .map(r => r
                        // Colapsar espaços em branco (incluindo newlines)
                        .replace(/\s+/g, ' ')
                        .trim()
                        // Remover espaço à volta de { } : ;
                        .replace(/\s*\{\s*/g, '{')
                        .replace(/\s*\}\s*/g, '}')
                        .replace(/\s*;\s*/g, ';')
                        // Remover último ; antes de }
                        .replace(/;}/g, '}')
                        // Remover espaços à volta de : dentro de declarações
                        // (mas não em pseudo-seletores como :hover — que ficam dentro de {})
                        .replace(/\{([^}]+)\}/g, (_, decls) =>
                            '{' + decls.replace(/\s*:\s*/g, ':') + '}'
                        )
                    )
                    .join('');
            } else {
                conteudo += regrasSubstituidas.join('\n') + '\n';
            }

            // ── 5. Download ──────────────────────────────────────────────
            if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
                try {
                    const blob = new Blob([conteudo], { type: 'text/css;charset=utf-8' });
                    const url  = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href     = url;
                    link.download = nome.endsWith('.css') ? nome : `${nome}.css`;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 100);
                    Logger.info(`exportar(): "${link.download}" (${regrasSubstituidas.length} regras, ${conteudo.length} chars)`);
                } catch (e) {
                    Logger.erro('exportar(): falha ao criar download', e);
                }
            } else {
                Logger.aviso('exportar(): ambiente sem DOM – CSS devolvido como string apenas.');
            }

            return conteudo;
        }

        function use(plugin) {
            if (!plugin || typeof plugin.setup !== 'function') { Logger.erro('Plugin inválido'); return; }
            Logger.info(`Plugin: "${plugin.nome || '?'}"`);
            if (_iniciado) _aplicarPlugin(plugin);
            else {
                if (!_config) _config = _construirConfig({});
                (_config.plugins = _config.plugins || []).push(plugin);
            }
        }

        function _aplicarPlugin(plugin) {
            plugin.setup({
                addMapping:    (p, prop) => { _config.mapaPropriedades[p] = prop; },
                addFixedClass: (n, e)    => { _config.classesFixas[n] = e; },
                addVariant:    (n, ps)   => { _config.variantes[n] = ps; },
                addBreakpoint: (n, t)    => { _config.breakpoints[n] = t; },
                addProcessor:  (p, fn)   => { _config.processadoresEspeciais[p] = fn; },
                config: _config,
            });
        }

        function addMapping(p, prop)  { _garantirIniciado(); _config.mapaPropriedades[p] = prop;      _reprocessarDOM(); }
        function addVariant(n, ps)    { _garantirIniciado(); _config.variantes[n] = ps;               _reprocessarDOM(); }
        function addBreakpoint(n, t)  { _garantirIniciado(); _config.breakpoints[n] = t;              _reprocessarDOM(); }
        function addFixedClass(n, e)  { _garantirIniciado(); _config.classesFixas[n] = e;             _reprocessarDOM(); }
        function addProcessor(p, fn)  { _garantirIniciado(); _config.processadoresEspeciais[p] = fn;  _reprocessarDOM(); }
        function addComponent(n, cls) {
            _garantirIniciado();
            Cache.registarComponente(n, cls);
            Logger.debug(`Componente: "${n}"`);
            _reprocessarDOM();
        }

        function _reprocessarDOM() {
            if (!_iniciado) return;
            processarElementos(Observer.coletarInicialmente());
        }

        function obterStats() {
            return {
                cache: Cache.obterStats(),
                config: {
                    breakpoints: Object.keys(_config?.breakpoints || {}),
                    variantes: Object.keys(_config?.variantes || {}),
                    classesFixas: Object.keys(_config?.classesFixas || {}).length,
                    mapeamentos: Object.keys(_config?.mapaPropriedades || {}).length,
                },
            };
        }

        function _garantirIniciado() {
            if (!_iniciado || !_config) {
                Logger.aviso('A inicializar com config padrão.');
                _config = _construirConfig({});
                Parser.inicializar(_config);
                Renderer.inicializar(_config);
                _iniciado = true;
            }
        }

        function _construirConfig(u) {
            const b = _configPadrao();
            return {
                ...b, ...u,
                classesFixas:          { ...b.classesFixas,          ...(u.classesFixas          || {}) },
                mapaPropriedades:      { ...b.mapaPropriedades,      ...(u.mapaPropriedades      || {}) },
                variantes:             { ...b.variantes,             ...(u.variantes             || {}) },
                breakpoints:           { ...b.breakpoints,           ...(u.breakpoints           || {}) },
                regrasGlobais:         { ...b.regrasGlobais,         ...(u.regrasGlobais         || {}) },
                processadoresEspeciais:{ ...b.processadoresEspeciais,...(u.processadoresEspeciais || {}) },
                transformPrefixos: b.transformPrefixos,
                tema: {
                    cores:       { ...(b.tema.cores       || {}), ...(u.tema?.cores       || {}) },
                    espacamento: { ...(b.tema.espacamento  || {}), ...(u.tema?.espacamento || {}) },
                    fontes:      { ...(b.tema.fontes       || {}), ...(u.tema?.fontes      || {}) },
                },
                plugins:  u.plugins  || [],
                safelist: u.safelist || [],
                prefix:   u.prefix   || '',
            };
        }

        function _configPadrao() {
            return {
                log: true, debug: false, reset: true,
                tema: { cores: {}, espacamento: {}, fontes: {} },

                breakpoints: {
                    sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
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
                    '*':                  { margin: '0', padding: '0' },
                    'html':               { 'box-sizing': 'border-box' },
                    '*, *::before, *::after': { 'box-sizing': 'inherit' },
                },

                transformPrefixos: [
                    'rotate', 'scale', 'scale-x', 'scale-y',
                    'translate-x', 'translate-y', 'skew-x', 'skew-y',
                ],

                mapaPropriedades: {
                    // Espaçamento
                    m: 'margin', mt: 'margin-top', mr: 'margin-right',
                    mb: 'margin-bottom', ml: 'margin-left',
                    mx: 'margin-inline', my: 'margin-block',
                    p: 'padding', pt: 'padding-top', pr: 'padding-right',
                    pb: 'padding-bottom', pl: 'padding-left',
                    px: 'padding-inline', py: 'padding-block',
                    gap: 'gap', 'gap-x': 'column-gap', 'gap-y': 'row-gap',

                    // Dimensões
                    w: 'width', h: 'height',
                    'min-w': 'min-width', 'min-h': 'min-height',
                    'max-w': 'max-width', 'max-h': 'max-height',
                    'size': 'width; height',

                    // Cor
                    bg: 'background-color', text: 'color',

                    // Bordas
                    border:    'border-width',
                    'border-t': 'border-top-width',
                    'border-r': 'border-right-width',
                    'border-b': 'border-bottom-width',
                    'border-l': 'border-left-width',

                    'border-color':   'border-color',
                    'border-t-color': 'border-top-color',
                    'border-r-color': 'border-right-color',
                    'border-b-color': 'border-bottom-color',
                    'border-l-color': 'border-left-color',

                    'border-style':   'border-style',
                    'border-t-style': 'border-top-style',
                    'border-r-style': 'border-right-style',
                    'border-b-style': 'border-bottom-style',
                    'border-l-style': 'border-left-style',

                    // Outline
                    'outline-color': 'outline-color',
                    outline: 'outline',
                    ring: 'box-shadow',

                    // Radius
                    rounded: 'border-radius',
                    'rounded-t': 'border-top-left-radius; border-top-right-radius',
                    'rounded-b': 'border-bottom-left-radius; border-bottom-right-radius',
                    'rounded-l': 'border-top-left-radius; border-bottom-left-radius',
                    'rounded-r': 'border-top-right-radius; border-bottom-right-radius',

                    // Tipografia
                    'text-size': 'font-size', 'font-size': 'font-size',
                    'leading': 'line-height', 'tracking': 'letter-spacing',
                    'font-family': 'font-family',
                    'fw': 'font-weight',
                    'font-weight': 'font-weight',

                    // Sombras
                    shadow: 'box-shadow',
                    'text-shadow': 'text-shadow',

                    // Posicionamento
                    top: 'top', right: 'right', bottom: 'bottom', left: 'left',
                    z: 'z-index', inset: 'inset',

                    // Efeitos visuais
                    opacity: 'opacity',
                    blur: 'filter', brightness: 'filter', contrast: 'filter',
                    grayscale: 'filter', saturate: 'filter',
                    'drop-shadow': 'filter', 'backdrop-blur': 'backdrop-filter',

                    // Background
                    'bg-gradient': 'background-image', 'bg-image': 'background-image',
                    'bg-size': 'background-size', 'bg-pos': 'background-position',
                    'bg-repeat': 'background-repeat',
                    'bg-attach': 'background-attachment', filter: 'filter',

                    // Flex
                    'flex-basis': 'flex-basis',
                    'flex-g': 'flex-grow',      // mantido por compatibilidade
                    grow: 'flex-grow',
                    shrink: 'flex-shrink',
                    basis: 'flex-basis',

                    // Transforms
                    rotate: 'transform', scale: 'transform',
                    'scale-x': 'transform', 'scale-y': 'transform',
                    'translate-x': 'transform', 'translate-y': 'transform',
                    'skew-x': 'transform', 'skew-y': 'transform',

                    // Grid
                    cols: 'grid-template-columns', rows: 'grid-template-rows',
                    'col-span': 'grid-column', 'row-span': 'grid-row',

                    // Transição
                    'transition-prop': 'transition',

                    // Animação / timing
                    duration: 'transition-duration', delay: 'transition-delay',
                    ease: 'transition-timing-function', animate: 'animation',
                    'animate-delay': 'animation-delay',
                    'animate-duration': 'animation-duration',

                    // Outros
                    content: 'content', cursor: 'cursor',
                    aspect: 'aspect-ratio', columns: 'columns',
                },

                processadoresEspeciais: {
                    blur:           v => `blur(${v})`,
                    brightness:     v => `brightness(${v})`,
                    contrast:       v => `contrast(${v})`,
                    grayscale:      v => `grayscale(${v})`,
                    saturate:       v => `saturate(${v})`,
                    'drop-shadow':  v => `drop-shadow(${v})`,
                    'backdrop-blur':v => `blur(${v})`,
                    'bg-gradient':  v => (
                        v.startsWith('linear-gradient') ||
                        v.startsWith('radial-gradient') ||
                        v.startsWith('conic-gradient')
                    ) ? v : `linear-gradient(${v})`,
                    cols:       v => /^\d+$/.test(v) ? `repeat(${v}, 1fr)` : v,
                    'col-span': v => `span ${v} / span ${v}`,
                    'row-span': v => `span ${v} / span ${v}`,
                    ring:       v => `0 0 0 ${v} currentColor`,
                    aspect:     v => ({ square: '1/1', video: '16/9', photo: '4/3' })[v] || v,
                    'fw': v => {
                        const mapa = { thin: '100', extralight: '200', light: '300',
                            normal: '400', medium: '500', semibold: '600',
                            bold: '700', extrabold: '800', black: '900' };
                        return mapa[v.toLowerCase()] || v;
                    },
                    'font-weight': v => {
                        const mapa = { thin: '100', extralight: '200', light: '300',
                            normal: '400', medium: '500', semibold: '600',
                            bold: '700', extrabold: '800', black: '900' };
                        return mapa[v.toLowerCase()] || v;
                    },
                    'transition-prop': v => v,
                },

                classesFixas: {
                    // Display
                    block: 'display: block', inline: 'display: inline',
                    'inline-block': 'display: inline-block',
                    flex: 'display: flex', 'inline-flex': 'display: inline-flex',
                    grid: 'display: grid', 'inline-grid': 'display: inline-grid',
                    hidden: 'display: none', contents: 'display: contents',
                    table: 'display: table', 'table-cell': 'display: table-cell',

                    // Background attachment
                    'bg-fixed': 'background-attachment: fixed',
                    'bg-scroll': 'background-attachment: scroll',
                    'bg-local': 'background-attachment: local',

                    // Flex
                    'flex-row': 'flex-direction: row', 'flex-col': 'flex-direction: column',
                    'flex-row-reverse': 'flex-direction: row-reverse',
                    'flex-col-reverse': 'flex-direction: column-reverse',
                    'flex-wrap': 'flex-wrap: wrap', 'flex-nowrap': 'flex-wrap: nowrap',
                    'flex-1': 'flex: 1 1 0%', 'flex-auto': 'flex: 1 1 auto',
                    'flex-none': 'flex: none', 'flex-grow': 'flex-grow: 1',
                    'flex-shrink': 'flex-shrink: 1', 'flex-shrink-0': 'flex-shrink: 0',
                    'justify-start': 'justify-content: flex-start',
                    'justify-end': 'justify-content: flex-end',
                    'justify-center': 'justify-content: center',
                    'justify-between': 'justify-content: space-between',
                    'justify-around': 'justify-content: space-around',
                    'justify-evenly': 'justify-content: space-evenly',
                    'items-start': 'align-items: flex-start',
                    'items-end': 'align-items: flex-end',
                    'items-center': 'align-items: center',
                    'items-baseline': 'align-items: baseline',
                    'items-stretch': 'align-items: stretch',
                    'self-auto': 'align-self: auto',
                    'self-start': 'align-self: flex-start', 'self-end': 'align-self: flex-end',
                    'self-center': 'align-self: center', 'self-stretch': 'align-self: stretch',
                    'place-center': 'place-items: center',

                    // Posição
                    relative: 'position: relative', absolute: 'position: absolute',
                    fixed: 'position: fixed', sticky: 'position: sticky', static: 'position: static',

                    // Overflow
                    'overflow-auto': 'overflow: auto', 'overflow-hidden': 'overflow: hidden',
                    'overflow-visible': 'overflow: visible', 'overflow-scroll': 'overflow: scroll',
                    'overflow-x-auto': 'overflow-x: auto', 'overflow-y-auto': 'overflow-y: auto',
                    'overflow-x-hidden': 'overflow-x: hidden', 'overflow-y-hidden': 'overflow-y: hidden',

                    // Texto
                    'text-left': 'text-align: left', 'text-center': 'text-align: center',
                    'text-right': 'text-align: right', 'text-justify': 'text-align: justify',
                    uppercase: 'text-transform: uppercase', lowercase: 'text-transform: lowercase',
                    capitalize: 'text-transform: capitalize',
                    italic: 'font-style: italic', 'not-italic': 'font-style: normal',
                    underline: 'text-decoration: underline',
                    'line-through': 'text-decoration: line-through',
                    'no-underline': 'text-decoration: none',
                    truncate: 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap',
                    antialiased: '-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale',
                    'font-thin': 'font-weight: 100', 'font-light': 'font-weight: 300',
                    'font-normal': 'font-weight: 400', 'font-medium': 'font-weight: 500',
                    'font-semibold': 'font-weight: 600', 'font-bold': 'font-weight: 700',
                    'font-extrabold': 'font-weight: 800', 'font-black': 'font-weight: 900',

                    // Border radius
                    'rounded-none': 'border-radius: 0', 'rounded-sm': 'border-radius: 0.125rem',
                    rounded: 'border-radius: 0.25rem', 'rounded-md': 'border-radius: 0.375rem',
                    'rounded-lg': 'border-radius: 0.5rem', 'rounded-xl': 'border-radius: 0.75rem',
                    'rounded-2xl': 'border-radius: 1rem', 'rounded-3xl': 'border-radius: 1.5rem',
                    'rounded-full': 'border-radius: 9999px',

                    // Border style fixo
                    solid:  'border-style: solid',
                    dashed: 'border-style: dashed',
                    dotted: 'border-style: dotted',
                    double: 'border-style: double',
                    'border-none': 'border: none',

                    // Sombras
                    'shadow-sm': 'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)',
                    shadow: 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                    'shadow-md': 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    'shadow-lg': 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    'shadow-xl': 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    'shadow-2xl': 'box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    'shadow-none': 'box-shadow: none',
                    'shadow-inner': 'box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

                    // Transições
                    transition: 'transition-property: all; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                    'transition-none': 'transition-property: none',
                    'transition-colors': 'transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                    'transition-opacity': 'transition-property: opacity; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                    'transition-transform': 'transition-property: transform; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',
                    'transition-shadow': 'transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms',

                    // Cursor
                    'cursor-pointer': 'cursor: pointer', 'cursor-default': 'cursor: default',
                    'cursor-not-allowed': 'cursor: not-allowed', 'cursor-wait': 'cursor: wait',
                    'cursor-text': 'cursor: text', 'cursor-grab': 'cursor: grab',
                    'cursor-grabbing': 'cursor: grabbing',
                    'pointer-events-none': 'pointer-events: none',
                    'pointer-events-auto': 'pointer-events: auto',

                    // Seleção / user-select
                    'select-none': 'user-select: none', 'select-text': 'user-select: text',
                    'select-all': 'user-select: all',

                    // Objeto
                    'object-contain': 'object-fit: contain', 'object-cover': 'object-fit: cover',
                    'object-fill': 'object-fit: fill', 'object-none': 'object-fit: none',

                    // Whitespace
                    'whitespace-normal': 'white-space: normal',
                    'whitespace-nowrap': 'white-space: nowrap', 'whitespace-pre': 'white-space: pre',
                    'whitespace-pre-wrap': 'white-space: pre-wrap',
                    'whitespace-pre-line': 'white-space: pre-line',

                    // Visibilidade
                    visible: 'visibility: visible', invisible: 'visibility: hidden',
                    isolate: 'isolation: isolate', 'isolation-auto': 'isolation: auto',

                    // Blend
                    'mix-blend-normal': 'mix-blend-mode: normal',
                    'mix-blend-multiply': 'mix-blend-mode: multiply',
                    'mix-blend-screen': 'mix-blend-mode: screen',
                    'mix-blend-overlay': 'mix-blend-mode: overlay',

                    // List
                    'list-none': 'list-style-type: none', 'list-disc': 'list-style-type: disc',
                    'list-decimal': 'list-style-type: decimal',

                    // Resize
                    resize: 'resize: both', 'resize-x': 'resize: horizontal',
                    'resize-y': 'resize: vertical', 'resize-none': 'resize: none',

                    // Misc
                    'appearance-none': '-webkit-appearance: none; appearance: none',
                    'outline-none': 'outline: 2px solid transparent; outline-offset: 2px',
                    'will-change-transform': 'will-change: transform',
                    'will-change-opacity': 'will-change: opacity',

                    // Animações
                    'animate-spin': 'animation: breeze-spin 1s linear infinite',
                    'animate-ping': 'animation: breeze-ping 1s cubic-bezier(0,0,0.2,1) infinite',
                    'animate-pulse': 'animation: breeze-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                    'animate-bounce': 'animation: breeze-bounce 1s infinite',
                    'animate-fade-in': 'animation: breeze-fade-in 0.3s ease-in-out',
                    'animate-slide-in': 'animation: breeze-slide-in 0.3s ease-out',
                },
            };
        }

        return {
            init, reiniciar, processar, build, exportar, use,
            addMapping, addVariant, addBreakpoint, addComponent,
            addFixedClass, addProcessor, obterStats,
        };
    })();

    // ═══════════════════════════════════════════════════════════════════════
    // API PÚBLICA
    // ═══════════════════════════════════════════════════════════════════════
    const BreezeCSS = {
        init:          (c = {}) => Engine.init(c),
        reiniciar:     ()       => Engine.reiniciar(),
        processar:     ()       => Engine.processar(),
        build:         (h, o)   => Engine.build(h, o),

        /**
         * exportar(opcoes?)
         *
         * Exporta o CSS real gerado pelo BreezeCSS como ficheiro .css.
         *
         * Lê directamente o <style> injectado no browser (não o cache interno),
         * garantindo que o output reflecte o estado final da página — incluindo
         * transforms combinados e sem regras obsoletas.
         *
         * Seletores dinâmicos [data-breeze-id="bN"] são automaticamente
         * convertidos para seletores de classe CSS (.translate-x\[10px\], etc.),
         * tornando o ficheiro exportado portável e independente do Breeze.
         *
         * @param {object}  opcoes
         * @param {string}  opcoes.nome             – nome do ficheiro (sem .css). Default: 'breeze-output'
         * @param {boolean} opcoes.minificar         – minifica o output.           Default: false
         * @param {boolean} opcoes.incluirCabecalho  – adiciona comentário no topo. Default: true
         * @returns {string} CSS gerado
         *
         * @example
         * BreezeCSS.exportar()
         * BreezeCSS.exportar({ nome: 'meu-site', minificar: true })
         * BreezeCSS.exportar({ nome: 'estilos', incluirCabecalho: false })
         */
        exportar:      (o = {}) => Engine.exportar(o),

        use:           (p)      => Engine.use(p),
        addMapping:    (p, pr)  => Engine.addMapping(p, pr),
        addVariant:    (n, ps)  => Engine.addVariant(n, ps),
        addBreakpoint: (n, t)   => Engine.addBreakpoint(n, t),
        addComponent:  (n, c)   => Engine.addComponent(n, c),
        addFixedClass: (n, e)   => Engine.addFixedClass(n, e),
        addProcessor:  (p, fn)  => Engine.addProcessor(p, fn),
        stats:         ()       => Engine.obterStats(),
        versao: '2.2.3',
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BreezeCSS.init(global.BreezeConfig || {}));
    } else {
        BreezeCSS.init(global.BreezeConfig || {});
    }

    global.BreezeCSS = BreezeCSS;

})(typeof window !== 'undefined' ? window : globalThis);
