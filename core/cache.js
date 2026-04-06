/**
 * BreezeCSS v2 — core/cache.js
 * Cache inteligente de regras CSS e classes processadas
 */

'use strict';

const Cache = (() => {
    // Cache de regras CSS já inseridas (evita duplicação)
    const regrasCSS = new Set();

    // Cache de classes já resolvidas → { classe: resultado[] }
    const classesResolvidas = new Map();

    // Cache de transforms por chave composta (seletor::breakpoint|variantes)
    const transformsPorChave = new Map();

    // Cache de componentes registados
    const componentes = new Map();

    // Estatísticas de cache (modo debug)
    const stats = { hits: 0, misses: 0, total: 0 };

    /**
     * Verifica se uma regra CSS já foi inserida
     */
    function temRegra(regra) {
        stats.total++;
        if (regrasCSS.has(regra)) {
            stats.hits++;
            return true;
        }
        stats.misses++;
        return false;
    }

    /**
     * Regista uma regra CSS como inserida
     */
    function registarRegra(regra) {
        regrasCSS.add(regra);
    }

    /**
     * Verifica se uma classe já foi resolvida (parseada)
     */
    function temClasse(classe) {
        return classesResolvidas.has(classe);
    }

    /**
     * Obtém o resultado resolvido de uma classe
     */
    function obterClasse(classe) {
        return classesResolvidas.get(classe) || null;
    }

    /**
     * Regista o resultado resolvido de uma classe
     */
    function registarClasse(classe, resultado) {
        classesResolvidas.set(classe, resultado);
    }

    /**
     * Gestão de transforms por chave composta
     * A chave inclui seletor + breakpoint + variantes para isolar contextos
     */
    function obterTransforms(chave) {
        if (!transformsPorChave.has(chave)) {
            transformsPorChave.set(chave, new Map());
        }
        return transformsPorChave.get(chave);
    }

    function atualizarTransform(chave, tipo, valor) {
        const transforms = obterTransforms(chave);
        transforms.set(tipo, valor);
        return transforms;
    }

    function construirTransform(chave) {
        const transforms = obterTransforms(chave);
        if (transforms.size === 0) return null;

        const ordem = [
            'translateX', 'translateY',
            'rotate',
            'scale', 'scaleX', 'scaleY',
            'skewX', 'skewY',
        ];

        const partes = [];

        // Adicionar transforms na ordem definida
        ordem.forEach(tipo => {
            if (transforms.has(tipo)) {
                partes.push(transforms.get(tipo));
            }
        });

        // Adicionar quaisquer transforms não ordenados no fim
        transforms.forEach((val, tipo) => {
            if (!ordem.includes(tipo)) {
                partes.push(val);
            }
        });

        return partes.join(' ');
    }

    /**
     * Componentes
     */
    function registarComponente(nome, classes) {
        componentes.set(nome, classes);
    }

    function obterComponente(nome) {
        return componentes.get(nome) || null;
    }

    function temComponente(nome) {
        return componentes.has(nome);
    }

    /**
     * Limpa todo o cache
     */
    function limpar() {
        regrasCSS.clear();
        classesResolvidas.clear();
        transformsPorChave.clear();
        stats.hits = 0;
        stats.misses = 0;
        stats.total = 0;
    }

    /**
     * Estatísticas do cache
     */
    function obterStats() {
        return {
            ...stats,
            taxaAcerto: stats.total > 0
                ? ((stats.hits / stats.total) * 100).toFixed(1) + '%'
                : '0%',
            regrasCacheadas: regrasCSS.size,
            classesCacheadas: classesResolvidas.size,
        };
    }

    function limparClassesResolvidas() {
        classesResolvidas.clear();
    }

    return {
        temRegra,
        registarRegra,
        temClasse,
        obterClasse,
        registarClasse,
        obterTransforms,
        atualizarTransform,
        construirTransform,
        registarComponente,
        obterComponente,
        temComponente,
        limpar,
        obterStats,
        limparClassesResolvidas,
    };
})();

export default Cache;