/**
 * BreezeCSS v2 — core/renderer.js
 * Responsável por gerar e injetar regras CSS no DOM
 */

'use strict';

import Cache from './cache.js';
import Logger from './logger.js';

// Fallback robusto para CSS.escape
const cssEscape = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
    ? CSS.escape
    : s => s.replace(/([[\]{}()*+?.,\\^$|#\s:])/g, '\\$1');

const Renderer = (() => {
    let _config = null;
    let _tagEstilo = null;
    let _sheet = null;

    // Regras em modo build (acumuladas sem inserir no DOM)
    let _modoOffline = false;
    let _regrasOffline = [];

    /**
     * Inicializa o renderer
     */
    function inicializar(config) {
        _config = config;
    }

    /**
     * Activa modo offline (build) — acumula regras sem tocar no DOM
     */
    function ativarModoOffline() {
        _modoOffline = true;
        _regrasOffline = [];
    }

    function desativarModoOffline() {
        _modoOffline = false;
    }

    function obterRegrasOffline() {
        return [..._regrasOffline];
    }

    /**
     * Obtém (ou cria) a <style> tag gerida pelo Breeze
     */
    function _obterSheet() {
        if (_sheet) return _sheet;

        _tagEstilo = document.createElement('style');
        _tagEstilo.id = 'breeze-v2-estilos';
        _tagEstilo.setAttribute('data-breeze', 'v2');
        document.head.appendChild(_tagEstilo);
        _sheet = _tagEstilo.sheet;

        Logger.debug('Elemento <style> criado no DOM');
        return _sheet;
    }

    /**
     * Insere uma regra CSS bruta (com cache e deduplicação)
     */
    function _inserirRegra(regra) {
        if (Cache.temRegra(regra)) return;
        Cache.registarRegra(regra);

        if (_modoOffline) {
            _regrasOffline.push(regra);
            return;
        }

        const sheet = _obterSheet();
        try {
            sheet.insertRule(regra, sheet.cssRules.length);
            Logger.debug(`Regra inserida → ${regra}`);
        } catch (e) {
            Logger.erro(`Falha ao inserir regra: "${regra}"`, e);
        }
    }

    /**
     * Constrói o seletor CSS a partir da classe original e variantes.
     *
     * CORRECÇÃO: variantes estruturais como '.dark &' e '.group:hover &'
     * requerem substituição do '&' pelo seletor escapado, não concatenação simples.
     *
     * Casos suportados:
     *   ':hover'           → .classe:hover
     *   '::placeholder'    → .classe::placeholder
     *   '.dark &'          → .dark .classe
     *   '.group:hover &'   → .group:hover .classe
     */
    function _construirSeletor(classeOriginal, variantes) {
        const escapado = '.' + cssEscape(classeOriginal);

        if (!variantes || variantes.length === 0) return escapado;

        let seletor = escapado;

        for (const v of variantes) {
            const pseudo = _config.variantes[v];
            if (!pseudo) continue;

            if (pseudo.includes('&')) {
                // Variante estrutural: substituir '&' pelo seletor actual
                seletor = pseudo.replace(/&/g, seletor);
            } else {
                // Pseudo-classe ou pseudo-elemento simples: concatenar
                seletor = seletor + pseudo;
            }
        }

        return seletor;
    }

    /**
     * Envolve uma regra numa media query de breakpoint
     */
    function _comMediaQuery(breakpoint, regra) {
        const tamanho = _config.breakpoints[breakpoint];
        if (!tamanho) return regra;
        return `@media (min-width: ${tamanho}) { ${regra} }`;
    }

    /**
     * Renderiza um array de resultados do parser.
     * Recebe opcionalmente o elemento DOM para transforms combinados.
     *
     * CORRECÇÃO: o elemento é passado para que transforms sejam associados
     * ao elemento concreto (via data-breeze-id), não ao seletor de classe.
     */
    function renderizar(resultados, classeOriginal, elemento) {
        if (!resultados || resultados.length === 0) return;

        resultados.forEach(resultado => {
            if (resultado.eTransform) {
                _renderizarTransform(resultado, classeOriginal, elemento);
            } else {
                _renderizarRegular(resultado, classeOriginal);
            }
        });
    }

    /**
     * Renderiza uma propriedade normal (não-transform).
     * Suporta múltiplas propriedades no mesmo mapeamento (ex: 'width; height').
     */
    function _renderizarRegular(resultado, classeOriginal) {
        const { breakpoint, variantes, propriedade, valor } = resultado;
        const seletor = _construirSeletor(classeOriginal, variantes);

        // Suporte a múltiplas propriedades separadas por ';' (ex: size → 'width; height')
        const propriedades = propriedade.split(';').map(p => p.trim()).filter(Boolean);

        propriedades.forEach(prop => {
            let regra = `${seletor} { ${prop}: ${valor}; }`;
            if (breakpoint) {
                regra = _comMediaQuery(breakpoint, `${seletor} { ${prop}: ${valor}; }`);
            }
            _inserirRegra(regra);
        });
    }

    /**
     * Renderiza um transform, combinando com outros transforms do mesmo elemento.
     *
     * CORRECÇÃO: usa o data-breeze-id do elemento (passado pelo engine) para
     * construir um seletor único por elemento, garantindo que rotate + scale
     * do mesmo elemento se combinam correctamente sem interferir com outros.
     *
     * Se o elemento não tiver ID (modo build/offline), recai para seletor de classe.
     */
    function _renderizarTransform(resultado, classeOriginal, elemento) {
        const { breakpoint, variantes, tipoTransform, valor: valorFragmento } = resultado;

        // Chave de contexto: breakpoint + variantes (para isolar contextos responsivos)
        const chaveContexto = `${breakpoint || ''}|${(variantes || []).join(',')}`;

        let seletorRegra;
        let chaveTransform;

        if (elemento && elemento.getAttribute) {
            // Modo online: usar data-breeze-id do elemento para isolar transforms por elemento
            const breezeId = elemento.getAttribute('data-breeze-id');
            if (breezeId) {
                chaveTransform = `elem:${breezeId}::${chaveContexto}`;
                seletorRegra = `[data-breeze-id="${breezeId}"]`;
                if (variantes && variantes.length > 0) {
                    const pseudos = variantes
                        .map(v => _config.variantes[v])
                        .filter(p => p && !p.includes('&'))
                        .join('');
                    seletorRegra += pseudos;
                }
            }
        }

        // Fallback: modo build ou elemento sem ID — usar seletor de classe
        if (!chaveTransform) {
            const seletorClasse = _construirSeletor(classeOriginal, variantes);
            chaveTransform = `cls:${seletorClasse}::${chaveContexto}`;
            seletorRegra = seletorClasse;
        }

        // Actualizar o fragmento deste tipo de transform
        Cache.atualizarTransform(chaveTransform, tipoTransform, valorFragmento);

        // Construir o transform combinado com todos os tipos registados para esta chave
        const transformCombinado = Cache.construirTransform(chaveTransform);
        if (!transformCombinado) return;

        let regraTransform = `${seletorRegra} { transform: ${transformCombinado}; }`;
        if (breakpoint) {
            regraTransform = _comMediaQuery(
                breakpoint,
                `${seletorRegra} { transform: ${transformCombinado}; }`
            );
        }

        // Remover regra anterior do mesmo seletor (para actualizar transforms combinados)
        _removerRegraTransformExistente(seletorRegra, breakpoint);

        if (_modoOffline) {
            _regrasOffline.push(regraTransform);
            return;
        }

        const sheet = _obterSheet();
        try {
            sheet.insertRule(regraTransform, sheet.cssRules.length);
            Logger.debug(`Transform combinado → ${regraTransform}`);
        } catch (e) {
            Logger.erro(`Falha ao inserir transform: "${regraTransform}"`, e);
        }
    }

    /**
     * Remove regras de transform existentes para um dado seletor
     */
    function _removerRegraTransformExistente(seletor, breakpoint) {
        if (_modoOffline || !_sheet) return;

        const rules = Array.from(_sheet.cssRules);
        for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i];
            if (breakpoint) {
                if (typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule) {
                    const inner = Array.from(rule.cssRules);
                    for (let j = inner.length - 1; j >= 0; j--) {
                        if (inner[j].selectorText === seletor &&
                            inner[j].style && inner[j].style.transform !== undefined) {
                            rule.deleteRule(j);
                        }
                    }
                }
            } else {
                if (rule.selectorText === seletor &&
                    rule.style && rule.style.transform !== undefined) {
                    _sheet.deleteRule(i);
                }
            }
        }
    }

    /**
     * Insere regras globais (reset, etc.)
     */
    function inserirRegrasGlobais(regrasGlobais) {
        for (const seletor in regrasGlobais) {
            const props = regrasGlobais[seletor];
            const declaracoes = Object.entries(props)
                .map(([p, v]) => `${p}: ${v}`)
                .join('; ');
            _inserirRegra(`${seletor} { ${declaracoes}; }`);
        }
    }

    /**
     * Insere variáveis CSS de tema no :root
     */
    function inserirVariaveisCSS(tema) {
        if (!tema) return;

        const variaveis = [];

        if (tema.cores) {
            Object.entries(tema.cores).forEach(([nome, valor]) => {
                variaveis.push(`--breeze-${nome}: ${valor}`);
            });
        }
        if (tema.espacamento) {
            Object.entries(tema.espacamento).forEach(([nome, valor]) => {
                variaveis.push(`--breeze-spacing-${nome}: ${valor}`);
            });
        }
        if (tema.fontes) {
            Object.entries(tema.fontes).forEach(([nome, valor]) => {
                variaveis.push(`--breeze-font-${nome}: ${valor}`);
            });
        }

        if (variaveis.length > 0) {
            _inserirRegra(`:root { ${variaveis.join('; ')}; }`);
        }

        _inserirKeyframes();
    }

    /**
     * Insere keyframes de animações pré-definidas
     */
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
                    try {
                        _obterSheet().insertRule(kf, _obterSheet().cssRules.length);
                    } catch (e) {
                        // Keyframes podem falhar em alguns contextos de teste
                    }
                } else {
                    _regrasOffline.push(kf);
                }
            }
        });
    }

    /**
     * Gera CSS estático formatado (para modo build)
     */
    function gerarCSSEstatico(minificar = false) {
        if (minificar) {
            return _regrasOffline.join('');
        }
        return _regrasOffline.join('\n');
    }

    /**
     * Limpa a stylesheet gerida
     */
    function limpar() {
        if (_tagEstilo) {
            _tagEstilo.remove();
            _tagEstilo = null;
            _sheet = null;
        }
    }

    return {
        inicializar,
        renderizar,
        inserirRegrasGlobais,
        inserirVariaveisCSS,
        ativarModoOffline,
        desativarModoOffline,
        obterRegrasOffline,
        gerarCSSEstatico,
        limpar,
    };
})();

export default Renderer;