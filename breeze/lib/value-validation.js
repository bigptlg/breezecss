'use strict'
// Optional full grammar; conservative fallback never rejects unknown modern functions.
let tree
try { tree = require('css-tree') } catch {}
const globalValue = /^(inherit|initial|unset|revert|revert-layer)$/i
const number = '[+-]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:e[+-]?\\d+)?'
const numeric = new RegExp('^('+number+')([a-z%]*)$', 'i')
const lengthUnit = /^(?:%|px|cm|mm|q|in|pc|pt|em|rem|ex|rex|ch|rch|cap|rcap|ic|ric|lh|rlh|(?:[sld]?v)(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))$/i
function length(v, negative = false) {
  const m = numeric.exec(v)
  return !!m && (lengthUnit.test(m[2]) || (!m[2] && +m[1] === 0)) && (negative || +m[1] >= 0)
}
function supports(prop, value) {
  if (typeof value !== 'string' || prop.startsWith('--') || globalValue.test(value) || /\b(?:var|env|attr)\(/i.test(value)) return true
  // css-tree may lag behind browsers: only reject definite mismatches for known grammar.
  if (tree) {
    try { const result = tree.lexer.matchProperty(prop, value); if (result.matched) return true; if (result.error && result.error.name === 'SyntaxMatchError') return false } catch {}
  }
  if (/^(padding|margin)(-|$)/.test(prop)) {
    const parts = value.trim().split(/\s+/)
    if (/[()\\]/.test(value)) return true
    return parts.every(v => {
      if (v === 'auto') return prop.startsWith('margin')
      const m = numeric.exec(v)
      return length(v, prop.startsWith('margin'))
    })
  }
  if (/^(?:color|background-color|border(?:-[a-z]+)?-color|outline-color|text-decoration-color)$/.test(prop) && /^[a-z]+$/i.test(value)) return new Set(['aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen', 'transparent', 'currentcolor', 'canvas', 'canvastext', 'linktext', 'visitedtext', 'activetext', 'buttonface', 'buttontext', 'buttonborder', 'field', 'fieldtext', 'highlight', 'highlighttext', 'selecteditem', 'selecteditemtext', 'mark', 'marktext', 'graytext', 'accentcolor', 'accentcolortext']).has(value.toLowerCase())
  if (/^(?:(?:min-|max-)?(?:width|height|inline-size|block-size))$/.test(prop)) {
    if (/^(auto|none|min-content|max-content|fit-content|stretch|contain|available|-webkit-fill-available)$/i.test(value)) return true
    if (!/[()\\]/.test(value)) return length(value)
  }
  if (/color$/.test(prop) && /^color-mix\(/i.test(value)) {
    if (!/^color-mix\(\s*in\s+[\w-]+(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?\s*,/i.test(value)) return false
  }
  if (prop === 'transform') {
    const m = /^(rotate|skew[XY]|scale[XY]?|translate[XY])\(([^()]*)\)$/i.exec(value)
    if (!m) return true
    return m[2].split(/[,\s]+/).every(v => { const n = numeric.exec(v); if (!n) return false; const u=n[2].toLowerCase(); return /^(rotate|skew)/i.test(m[1]) ? /^(deg|rad|grad|turn)$/.test(u) || (!u && +n[1]===0) : /^scale/i.test(m[1]) ? !u || u==='%' : length(v, true) })
  }
  return true
}
module.exports = { supports }
