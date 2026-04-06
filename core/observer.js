/**
 * BreezeCSS v2 — core/observer.js
 * MutationObserver: detecta novos elementos e mudanças de classes no DOM
 * NÃO usa querySelectorAll('*') — apenas processa o que muda
 */

'use strict';

import Logger from './logger.js';

const Observer = (() => {
    let _observer = null;
    let _callbackProcessar = null;

    /**
     * Inicia a observação do DOM
     * @param {Function} callbackProcessar - função chamada com lista de elementos a processar
     */
    function iniciar(callbackProcessar) {
        if (_observer) {
            Logger.aviso('Observer já está em execução');
            return;
        }

        _callbackProcessar = callbackProcessar;

        _observer = new MutationObserver(_aoMutar);

        _observer.observe(document.documentElement, {
            childList: true,       // novos elementos adicionados
            subtree: true,         // em qualquer profundidade
            attributes: true,      // mudanças de atributos (class)
            attributeFilter: ['class'], // apenas o atributo class
        });

        Logger.debug('MutationObserver iniciado');
    }

    /**
     * Para a observação
     */
    function parar() {
        if (_observer) {
            _observer.disconnect();
            _observer = null;
            Logger.debug('MutationObserver parado');
        }
    }

    /**
     * Callback do MutationObserver
     * Extrai elementos relevantes de cada mutation e chama o processador
     */
    function _aoMutar(mutations) {
        const elementosParaProcessar = new Set();

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Novos nós adicionados ao DOM
                mutation.addedNodes.forEach(no => {
                    if (no.nodeType === Node.ELEMENT_NODE) {
                        // Processar o elemento e todos os seus descendentes
                        _coletarElementos(no, elementosParaProcessar);
                    }
                });
            } else if (mutation.type === 'attributes') {
                // Mudança de classe num elemento existente
                if (mutation.target.nodeType === Node.ELEMENT_NODE) {
                    elementosParaProcessar.add(mutation.target);
                }
            }
        }

        if (elementosParaProcessar.size > 0) {
            Logger.debug(`Observer detectou ${elementosParaProcessar.size} elemento(s) para processar`);
            _callbackProcessar(Array.from(elementosParaProcessar));
        }
    }

    /**
     * Recolhe o elemento e os seus descendentes para processamento
     */
    function _coletarElementos(elemento, conjunto) {
        if (!elemento.classList) return;
        conjunto.add(elemento);

        const filhos = elemento.querySelectorAll('*');
        filhos.forEach(filho => conjunto.add(filho));
    }

    /**
     * Coleta todos os elementos do DOM no momento actual (scan inicial)
     * Usado apenas uma vez no init — não substitui o Observer
     */
    function coletarInicialmente() {
        return Array.from(document.querySelectorAll('*'));
    }

    return {
        iniciar,
        parar,
        coletarInicialmente,
    };
})();

export default Observer;
