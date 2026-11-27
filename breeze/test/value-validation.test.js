const {test}=require('node:test'); const assert=require('node:assert/strict');
const {supports}=require('../lib/value-validation');
test('semantic validation: invalid and valid CSS values',()=>{
 for(const [p,v] of [['padding','banana'],['padding','-20px'],['padding','auto'],['background-color','banana'],['transform','rotate(banana)']]) assert.equal(supports(p,v),false,`${p}: ${v}`);
 for(const [p,v] of [['padding','20px'],['margin','-20px'],['margin','auto'],['padding','var(--spacing)'],['padding','clamp(10px,2vw,30px)'],['background-color','red'],['transform','rotate(30deg)']]) assert.equal(supports(p,v),true,`${p}: ${v}`);
});
test('Tailwind regressions: invalid units, dimensions and color-mix prelude',()=>{
 for(const [p,v] of [['padding','10banana'],['width','banana'],['background-color','color-mix(currentcolor 50%,transparent)']]) assert.equal(supports(p,v),false);
 for(const [p,v] of [['width','10dvw'],['padding','2cqi'],['background-color','color-mix(in srgb,red 50%,blue)']]) assert.equal(supports(p,v),true);
});
test('minifier preserves unquoted URL comment markers',()=>{
 const {minificarCSS}=require('../lib/cssgen'); assert.equal(minificarCSS('.a { background-image: url(/a/*b.png); } .b { color: blue; }'),'.a{background-image:url(/a/*b.png)}.b{color:blue}');
});
