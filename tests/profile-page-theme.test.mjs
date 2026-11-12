import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const s=await fs.readFile(new URL('../assets/companion.js',import.meta.url),'utf8');
const attrs={};const c={document:{body:{setAttribute:(k,v)=>attrs[k]=v}}};vm.createContext(c);vm.runInContext(s.slice(s.indexOf('function profileThemeFor('),s.indexOf('function decorateGoatProfile(')),c);
test('full-page themes use exact selections and clear club and edition on ordinary navigation',()=>{
 for(const [id,edition,club] of [[2544,'goat',''],[201142,'mvp',''],[203081,'legend','por'],[1628369,'legend','bos'],[1626164,'legend','phx'],[203110,'legend','gsw'],[201939,'dual','gsw'],[203999,'dual','den'],[203954,'dual','phi'],[1628983,'dual','okc']]){c.setProfileTheme(id);assert.equal(attrs['data-profile-edition'],edition);assert.equal(attrs['data-profile-club'],club);}
 for(const id of [null,1629651,'highlightly:2544',1629630]){c.setProfileTheme(id);assert.equal(attrs['data-profile-edition'],'');assert.equal(attrs['data-profile-club'],'');}
 assert.match(s,/go=function\(page\)\{setProfileTheme\(null\)/);assert.match(s,/if\(id===null\)return;setProfileTheme\(null\)/);assert.match(s,/renderPlayer=function\(\)\{\s*setProfileTheme\(CURRENT.player_id\)/);
});
function contrast(a,b){const L=x=>{const v=x.match(/\w\w/g).map(t=>parseInt(t,16)/255).map(t=>t<=.04045?t/12.92:((t+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('all accents support white button text and panel text remains high contrast',()=>{
 for(const color of ['8b6010','805413','174c92','b32337','65358e','006642','24476d','17549a','12608d'])assert.ok(contrast(color,'ffffff')>=4.5,color);
 for(const [fg,bg] of [['292319','fffaf0'],['61533b','fffaf0'],['172b43','f9fbff'],['43566d','f9fbff'],['f7e4b8','211438']])assert.ok(contrast(fg,bg)>=4.5);
});
test('full-page rules style sections tables navigation and reset motion without touching calculations',async()=>{const css=await fs.readFile(new URL('../assets/dashboard.css',import.meta.url),'utf8');for(const x of ['header.top','#view .panel','#view .card','#view th','#view td','#view summary'])assert.ok(css.includes(x));assert.match(css,/body\[data-profile-club="bos"\]/);assert.match(css,/prefers-reduced-motion:reduce/);});
test('default theme variables have lower specificity than club and edition palettes',async()=>{
 const css=await fs.readFile(new URL('../assets/dashboard.css',import.meta.url),'utf8');
 assert.ok(css.includes('body:where([data-profile-edition]:not([data-profile-edition=""])){--edition-accent'));
 assert.ok(!css.includes('body[data-profile-edition]:not([data-profile-edition=""]){--edition-accent'));
});
