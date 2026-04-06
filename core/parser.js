/**
 * BreezeCSS v2 — core/parser.js
 * Parser robusto de classes utilitárias
 */

'use strict';

import Cache from './cache.js';
import Logger from './logger.js';

// Regex principal para capturar prefixo e valor arbitrário: prefixo[valor]
const REGEX_ARBITRARIO = /^(?<prefixo>[a-zA-Z-]+(?:-[a-zA-Z-]+)*)\[(?<valor>[^\]]+)\]$/;

const Parser = (() => {
    let _config = null;

    /**
     * Inicializa o parser com a config global
     */
    function inicializar(config) {
        _config = config;
    }

    /**
     * Ponto de entrada principal: interpreta uma string de classe.
     * Retorna null se não reconhecida, ou um array de resultados.
     */
    function interpretarClasse(classeOriginal) {
        if (!_config) {
            Logger.erro('Parser não inicializado. Chame inicializar(config) primeiro.');
            return null;
        }

        // Cache hit
        if (Cache.temClasse(classeOriginal)) {
            return Cache.obterClasse(classeOriginal);
        }

        // Verificar se é um componente
        if (Cache.temComponente(classeOriginal)) {
            const classesComponente = Cache.obterComponente(classeOriginal);
            const resultados = classesComponente
                .map(c => interpretarClasse(c))
                .flat()
                .filter(Boolean);
            Cache.registarClasse(classeOriginal, resultados);
            return resultados;
        }

        const resultado = _parsearClasse(classeOriginal);
        Cache.registarClasse(classeOriginal, resultado);
        return resultado;
    }

    /**
     * Parser interno: extrai breakpoints, variantes e valor da classe
     */
    function _parsearClasse(classe) {
        const partes = _separarQualificadores(classe);
        if (!partes) return null;

        const { breakpoint, variantes, classeBase } = partes;

        // Tentar como classe fixa primeiro
        const resultadoFixo = _resolverClasseFixa(classeBase, breakpoint, variantes);
        if (resultadoFixo) return resultadoFixo;

        // Tentar como classe arbitrária (prefixo[valor])
        return _resolverClasseArbitraria(classeBase, breakpoint, variantes, classe);
    }

    /**
     * Separa qualificadores (breakpoints e variantes) da classe base.
     * Suporta múltiplos: md:hover:focus:bg[red]
     */
    function _separarQualificadores(classe) {
        // Optimização: se não tem ':' nem '[', é classe base directa
        if (!classe.includes(':') && !classe.includes('[')) {
            return { breakpoint: null, variantes: [], classeBase: classe };
        }

        const segmentos = [];
        let atual = '';
        let dentroColchetes = false;

        for (let i = 0; i < classe.length; i++) {
            const char = classe[i];
            if (char === '[') dentroColchetes = true;
            if (char === ']') dentroColchetes = false;

            if (char === ':' && !dentroColchetes) {
                segmentos.push(atual);
                atual = '';
            } else {
                atual += char;
            }
        }
        segmentos.push(atual); // último segmento = classe base

        if (segmentos.length === 0) return null;

        const classeBase = segmentos.pop();
        let breakpoint = null;
        const variantes = [];

        for (const seg of segmentos) {
            if (_config.breakpoints[seg] !== undefined) {
                breakpoint = seg;
            } else if (_config.variantes[seg] !== undefined) {
                variantes.push(seg);
            } else {
                Logger.aviso(`Qualificador desconhecido: "${seg}" em "${classe}"`);
                return null;
            }
        }

        return { breakpoint, variantes, classeBase };
    }

    /**
     * Resolve uma classe fixa (sem valor arbitrário).
     * Ex: "flex", "hidden", "rounded-lg"
     */
    function _resolverClasseFixa(classeBase, breakpoint, variantes) {
        const estiloFixo = _config.classesFixas[classeBase];
        if (!estiloFixo) return null;

        const declaracoes = _parsearDeclaracoes(estiloFixo);
        if (!declaracoes.length) return null;

        return declaracoes.map(({ propriedade, valor }) => ({
            tipo: 'fixo',
            classeBase,
            breakpoint,
            variantes: variantes || [],
            propriedade,
            valor,
            eTransform: false,
        }));
    }

    /**
     * Resolve uma classe arbitrária (prefixo[valor]).
     * Ex: "p[20px]", "bg[#ff0000]", "rotate[45deg]"
     */
    function _resolverClasseArbitraria(classeBase, breakpoint, variantes, classeOriginal) {
        const match = classeBase.match(REGEX_ARBITRARIO);
        if (!match) return null;

        let { prefixo, valor } = match.groups;

        // Resolver alias de tema
        valor = _resolverValorTema(valor);

        // Resolver underscores → espaços (ex: linear-gradient com underscores)
        valor = valor.replace(/_/g, ' ');

        const propriedade = _config.mapaPropriedades[prefixo];
        if (!propriedade) {
            Logger.aviso(`Mapeamento não encontrado para prefixo: "${prefixo}"`);
            return null;
        }

        // Verificar se é transform
        const eTransform = _config.transformPrefixos?.includes(prefixo) ?? false;

        let valorProcessado = valor;
        let tipoTransform = null;

        if (eTransform) {
            const resultado = _processarTransform(prefixo, valor);
            valorProcessado = resultado.valorCss;
            tipoTransform = resultado.tipo;
        } else if (_config.processadoresEspeciais[prefixo]) {
            valorProcessado = _config.processadoresEspeciais[prefixo](valor);
        }

        return [{
            tipo: 'arbitrario',
            classeBase,
            classeOriginal,
            breakpoint,
            variantes: variantes || [],
            prefixo,
            propriedade,
            valor: valorProcessado,
            eTransform,
            tipoTransform,
        }];
    }

    /**
     * Resolve valores que são aliases do tema.
     * Ex: "primario" → "#00ff88"
     */
    function _resolverValorTema(valor) {
        const tema = _config.tema;
        if (!tema) return valor;

        if (tema.cores && tema.cores[valor])           return tema.cores[valor];
        if (tema.espacamento && tema.espacamento[valor]) return tema.espacamento[valor];
        if (tema.fontes && tema.fontes[valor])          return tema.fontes[valor];

        return valor;
    }

    /**
     * Processa valores de transform, retornando o fragmento CSS correcto e o tipo.
     */
    function _processarTransform(prefixo, valor) {
        const mapa = {
            'rotate':      { tipo: 'rotate',     fn: v => `rotate(${v})` },
            'scale':       { tipo: 'scale',       fn: v => `scale(${v})` },
            'scale-x':     { tipo: 'scaleX',      fn: v => `scaleX(${v})` },
            'scale-y':     { tipo: 'scaleY',      fn: v => `scaleY(${v})` },
            'translate-x': { tipo: 'translateX',  fn: v => `translateX(${v})` },
            'translate-y': { tipo: 'translateY',  fn: v => `translateY(${v})` },
            'skew-x':      { tipo: 'skewX',       fn: v => `skewX(${v})` },
            'skew-y':      { tipo: 'skewY',       fn: v => `skewY(${v})` },
        };

        const cfg = mapa[prefixo];
        if (!cfg) return { tipo: prefixo, valorCss: valor };

        return { tipo: cfg.tipo, valorCss: cfg.fn(valor) };
    }

    /**
     * Parseia uma string de declarações CSS.
     * "display: flex" → [{ propriedade: 'display', valor: 'flex' }]
     */
    function _parsearDeclaracoes(estiloStr) {
        return estiloStr
            .split(';')
            .map(d => d.trim())
            .filter(Boolean)
            .map(d => {
                const idx = d.indexOf(':');
                if (idx === -1) return null;
                return {
                    propriedade: d.slice(0, idx).trim(),
                    valor: d.slice(idx + 1).trim(),
                };
            })
            .filter(Boolean);
    }

    /**
     * Extrai todas as classes relevantes de um elemento DOM.
     */
    function extrairClassesRelevantes(elemento) {
        return Array.from(elemento.classList).filter(classe => {
            // Classe fixa conhecida?
            if (_config.classesFixas[classe]) return true;

            // Componente registado?
            if (Cache.temComponente(classe)) return true;

            // Classe simples sem modificadores — verificar no mapa de propriedades
            if (!classe.includes(':') && !classe.includes('[')) {
                return false; // Não é Breeze se não é fixa nem componente
            }

            // Tem qualificadores: separar e verificar prefixo da classe base
            const partes = _separarQualificadoresRapido(classe);
            if (!partes) return false;

            const { classeBase } = partes;

            // Classe base fixa?
            if (_config.classesFixas[classeBase]) return true;

            // Componente?
            if (Cache.temComponente(classeBase)) return true;

            // Classe arbitrária: verificar se o prefixo existe no mapa
            const matchArb = classeBase.match(REGEX_ARBITRARIO);
            if (matchArb) {
                return _config.mapaPropriedades[matchArb.groups.prefixo] !== undefined;
            }

            return false;
        });
    }

    /**
     * Versão rápida de _separarQualificadores para uso no filtro.
     * Retorna null se encontrar qualificadores inválidos.
     */
    function _separarQualificadoresRapido(classe) {
        if (!classe.includes(':')) {
            return { breakpoint: null, variantes: [], classeBase: classe };
        }

        const segmentos = [];
        let atual = '';
        let dentroColchetes = false;

        for (let i = 0; i < classe.length; i++) {
            const char = classe[i];
            if (char === '[') dentroColchetes = true;
            if (char === ']') dentroColchetes = false;
            if (char === ':' && !dentroColchetes) {
                segmentos.push(atual);
                atual = '';
            } else {
                atual += char;
            }
        }
        segmentos.push(atual);

        const classeBase = segmentos.pop();
        for (const seg of segmentos) {
            if (_config.breakpoints[seg] === undefined && _config.variantes[seg] === undefined) {
                return null; // qualificador desconhecido → não é Breeze
            }
        }

        return { classeBase };
    }

    return {
        inicializar,
        interpretarClasse,
        extrairClassesRelevantes,
    };
})();

export default Parser;