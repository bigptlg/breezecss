/**
 * BreezeCSS v2 — breeze.js
 * Autor: Pedro de Oliveira
 * Ponto de entrada público da biblioteca
 *
 * Uso básico:
 *   <script type="module" src="breeze.js"></script>
 *
 * Uso avançado:
 *   import BreezeCSS from './breeze.js'
 *   BreezeCSS.init({ tema: { cores: { primario: '#00ff88' } } })
 */

'use strict';

import Engine from './core/engine.js';

// ─── API pública ────────────────────────────────────────────────────────────

const BreezeCSS = {
    /**
     * Inicializa a biblioteca com configuração opcional.
     * Protegida contra dupla inicialização — chamar init() múltiplas vezes é seguro.
     */
    init: (config = {}) => Engine.init(config),

    /**
     * Reinicia completamente a biblioteca (limpa cache, observer e styles).
     * Útil em SPAs ou testes.
     */
    reiniciar: () => Engine.reiniciar(),

    /**
     * Processa manualmente o DOM actual.
     * Útil após injecção dinâmica de HTML quando o MutationObserver não detecta a mudança.
     */
    processar: () => Engine.processar(),

    /**
     * Gera CSS estático a partir de uma string HTML (modo build).
     * Requer DOMParser — funciona em browser e em Node com jsdom.
     * @param {string} htmlString
     * @param {Object} opcoes - { minificar: boolean }
     * @returns {string} CSS gerado
     */
    build: (htmlString, opcoes = {}) => Engine.build(htmlString, opcoes),

    /**
     * Carrega um plugin.
     * @param {{ nome: string, setup: Function }} plugin
     */
    use: (plugin) => Engine.use(plugin),

    // ─── Extensão em runtime ──────────────────────────────────────────────────

    /**
     * Adiciona mapeamento prefixo → propriedade CSS.
     * Dispara reprocessamento automático do DOM.
     */
    addMapping: (prefixo, propriedade) => Engine.addMapping(prefixo, propriedade),

    /**
     * Adiciona uma variante pseudo-classe/elemento.
     * Suporta variantes simples (':hover') e estruturais ('.dark &', '.group:hover &').
     * Dispara reprocessamento automático do DOM.
     */
    addVariant: (nome, pseudo) => Engine.addVariant(nome, pseudo),

    /**
     * Adiciona um breakpoint personalizado.
     * Dispara reprocessamento automático do DOM.
     */
    addBreakpoint: (nome, tamanho) => Engine.addBreakpoint(nome, tamanho),

    /**
     * Regista um componente (atalho para múltiplas classes).
     * Dispara reprocessamento automático do DOM.
     */
    addComponent: (nome, classes) => Engine.addComponent(nome, classes),

    /**
     * Adiciona uma classe fixa (sem valor arbitrário).
     * Dispara reprocessamento automático do DOM.
     */
    addFixedClass: (nome, estilo) => Engine.addFixedClass(nome, estilo),

    /**
     * Adiciona um processador personalizado para transformar valores.
     * Dispara reprocessamento automático do DOM.
     */
    addProcessor: (prefixo, fn) => Engine.addProcessor(prefixo, fn),

    /**
     * Retorna estatísticas de cache e configuração.
     */
    stats: () => Engine.obterStats(),

    versao: '2.1.0',
};

// ─── Auto-init ──────────────────────────────────────────────────────────────
// Se a biblioteca for incluída via <script>, inicializa automaticamente
// após o DOM estar carregado. Pode ser desactivado com data-no-auto-init.

if (typeof document !== 'undefined') {
    const scriptActual = document.currentScript;
    const autoInit = !scriptActual?.hasAttribute('data-no-auto-init');

    if (autoInit) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                const configInline = window.BreezeConfig || {};
                BreezeCSS.init(configInline);
            });
        } else {
            const configInline = window.BreezeConfig || {};
            BreezeCSS.init(configInline);
        }
    }
}

// Expõe globalmente para uso sem módulos
if (typeof window !== 'undefined') {
    window.BreezeCSS = BreezeCSS;
}

export default BreezeCSS;