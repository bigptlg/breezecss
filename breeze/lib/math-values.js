'use strict'
  function normalizarMatematica(valor) {
    if (!/\b(?:calc|min|max|clamp|round|mod|rem|abs|sign|hypot|pow|sqrt|log|exp|sin|cos|tan|asin|acos|atan|atan2)\(/i.test(valor)) return valor;
    const math = /^(?:calc|min|max|clamp|round|mod|rem|abs|sign|hypot|pow|sqrt|log|exp|sin|cos|tan|asin|acos|atan|atan2)$/i;
    const stack = []; let out = "", quote = "";
    for (let i=0;i<valor.length;i++) {
      const c=valor[i];
      if(c==='\\'){out+=valor.slice(i,i+2);i++;continue;}
      if(quote){out+=c;if(c===quote)quote="";continue;}
      if(c==='"'||c==="'"){quote=c;out+=c;continue;}
      if(c==='('){const name=(valor.slice(0,i).match(/[a-zA-Z][a-zA-Z0-9-]*$/)||[])[0]||"";stack.push((stack.at(-1)!==false || !stack.length) && (math.test(name)||(!name&&stack.at(-1)===true)));out+=c;continue;}
      if(c===')'){stack.pop();out+=c;continue;}
      if(stack.at(-1) && (c==='+'||c==='-')) {
        const left=out.trimEnd(), right=valor.slice(i+1).trimStart();
        if (/[\d%)]$/.test(left)|| /\d(?:[a-z]+)$/i.test(left)) {
          if (!/\d[eE]$/.test(left) && /^(?:[+\-\d.(]|(?:var|calc|min|max|clamp)\()/i.test(right)) {out=left+' '+c+' ';while(/\s/.test(valor[i+1]||''))i++;continue;}
        }
      }
      out+=c;
    }
    return out;
  }

module.exports = { normalizarMatematica }
