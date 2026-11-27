'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { minificarCSS } = require('../lib/cssgen.js')

function gerar(n) {
  let s = ''
  for (let i = 0; i < n; i++) {
    s += '.p\\[' + i + 'px\\]{padding:' + i + 'px; margin : 0 ;}\n'
    s += '/* c */ .a\\:b[x="a  b"]:hover{background:url(data:image/png;base64,AA//BB)}\n'
  }
  return s
}

test('minificarCSS: preserva strings, url() e escapes', () => {
  const out = minificarCSS('.a{ content : "x  /* y */ ;" ; w : url(a//*b) ; }\n/* c */\n.b\\:c{ color : red ; }')
  assert.strictEqual(out, '.a{content:"x  /* y */ ;";w:url(a//*b)}.b\\:c{color:red}')
})

test('minificarCSS: tempo linear em CSS grande (regressão O(n²))', () => {
  const css = gerar(40000) // ~6 MB; a versão quadrática levava ~48 s
  const t0 = process.hrtime.bigint()
  const out = minificarCSS(css)
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  assert.ok(out.length < css.length)
  assert.ok(ms < 5000, 'minificarCSS demorou ' + Math.round(ms) + ' ms')
})
