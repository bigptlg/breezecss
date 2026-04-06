/**
 * BreezeCSS v2 — core/logger.js
 * Sistema de logging inteligente com níveis e formatação
 */

'use strict';

const Logger = (() => {
    const NIVEIS = { SILENCIOSO: 0, ERRO: 1, AVISO: 2, INFO: 3, DEBUG: 4 };

    let _nivel = NIVEIS.INFO;
    let _prefixo = '[BreezeCSS v2]';
    let _historico = [];
    let _maxHistorico = 200;

    const ESTILOS = {
        prefixo: 'color: #00ff88; font-weight: bold;',
        debug:   'color: #888;',
        info:    'color: #4af;',
        aviso:   'color: #fa0; font-weight: bold;',
        erro:    'color: #f44; font-weight: bold;',
    };

    function _registar(nivel, nomeNivel, estiloMsg, ...args) {
        if (_nivel < nivel) return;

        const entrada = {
            nivel: nomeNivel,
            mensagem: args.join(' '),
            timestamp: new Date().toISOString(),
        };

        _historico.push(entrada);
        if (_historico.length > _maxHistorico) _historico.shift();

        console.log(
            `%c${_prefixo}%c [${nomeNivel}]`,
            ESTILOS.prefixo,
            estiloMsg,
            ...args
        );
    }

    function debug(...args) {
        _registar(NIVEIS.DEBUG, 'DEBUG', ESTILOS.debug, ...args);
    }

    function info(...args) {
        _registar(NIVEIS.INFO, 'INFO', ESTILOS.info, ...args);
    }

    function aviso(...args) {
        _registar(NIVEIS.AVISO, 'AVISO', ESTILOS.aviso, ...args);
    }

    function erro(...args) {
        _registar(NIVEIS.ERRO, 'ERRO', ESTILOS.erro, ...args);
    }

    function configurar({ nivel, silencioso } = {}) {
        if (silencioso === true) {
            _nivel = NIVEIS.SILENCIOSO;
            return;
        }
        if (nivel === 'debug')   _nivel = NIVEIS.DEBUG;
        if (nivel === 'info')    _nivel = NIVEIS.INFO;
        if (nivel === 'aviso')   _nivel = NIVEIS.AVISO;
        if (nivel === 'erro')    _nivel = NIVEIS.ERRO;
        if (nivel === false || nivel === 'silencioso') _nivel = NIVEIS.SILENCIOSO;
    }

    function obterHistorico() {
        return [..._historico];
    }

    function limpar() {
        _historico = [];
    }

    return {
        debug,
        info,
        aviso,
        erro,
        configurar,
        obterHistorico,
        limpar,
        NIVEIS,
    };
})();

export default Logger;
