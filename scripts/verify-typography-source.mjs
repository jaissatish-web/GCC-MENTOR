/** Prevent UI typography drift while keeping resume/document fonts independent. */
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import ts from 'typescript'
import postcss from 'postcss'
const root='app/typography.css', css=readFileSync(root,'utf8')
let pages=0, styles=0, components=0
function visit(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
 const path=dir+'/'+entry.name
 if(entry.isDirectory()){if(!/^components\/(templates|resume)$/.test(path))visit(path);continue}
 if(entry.name==='page.tsx')pages++
 if(path.endsWith('.css')&&path!==root){
  const sheet=postcss.parse(readFileSync(path,'utf8'));sheet.walkDecls(d=>{if(!/^font-(size|family|weight)$|^line-height$|^letter-spacing$/.test(d.prop))return
   // Explicit resume render selectors are authored document typography.
   const scope=(d.parent.selector||'').replace(/:not\(:where\([\s\S]*?\)\)/g,'');if(/resume-render|data-document-preview|actual-template-orbit-face|actual-template|template-paper|document-font/.test(scope))return
   assert.ok(d.value.includes('var(')||/^(inherit|normal|0|initial|unset)$/.test(d.value),`Use central typography tokens: ${path}: ${d.prop}: ${d.value}`)
  });styles++
 }
 if(path.endsWith('.tsx')){
  components++;const source=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  function node(n){if(ts.isPropertyAssignment(n)&&['fontSize','fontFamily','fontWeight','lineHeight','letterSpacing'].includes(n.name.getText(ast))){const value=n.initializer.getText(ast);assert.ok(value.includes('var(')||/inherit|normal/.test(value),`Use a typography token instead of an inline font: ${path} ${n.name.getText(ast)}`)}ts.forEachChild(n,node)}node(ast)
  for(const match of source.matchAll(/text-\[(\d+(?:\.\d+)?px)\]/g))assert.ok(css.includes('text-['+match[1]+']'),`Unmapped legacy text size ${match[1]} in ${path}`)
 }
}}
visit('app');visit('components')
for(const token of ['font','title-size','section-size','card-title-size','body-size','description-size','reading-size','input-size','lead-size','helper-size','caption-size'])assert.ok(css.includes('--ui-'+token+':'),token)
for(const boundary of ['data-document-preview','#resume-render','.actual-template-orbit-face','data-typography="document"'])assert.ok(css.includes(boundary),'Document isolation '+boundary)
console.log(`PASS: ${pages} route files, ${components} UI components and ${styles} stylesheets use centralized typography; resume/template sources excluded`)
