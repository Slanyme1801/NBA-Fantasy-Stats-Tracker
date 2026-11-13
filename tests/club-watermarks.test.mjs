import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync(new URL('../assets/companion.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../assets/dashboard.css',import.meta.url),'utf8');
const ctx=vm.createContext({});vm.runInContext(js.slice(js.indexOf('function profileThemeFor'),js.indexOf('function setProfileTheme'))+js.slice(js.indexOf('function clubWatermarkMarkup'),js.indexOf('function decorateProfileExperience')),ctx);
test('only selected legends and dual profiles get their actual club mark',()=>{
 for(const [id,club] of [[203110,'gsw'],[203081,'por'],[1626164,'phx'],[1628369,'bos'],[201939,'gsw'],[203999,'den'],[203954,'phi'],[1628983,'okc']]){
  const t=ctx.profileThemeFor(id),html=ctx.clubWatermarkMarkup(t.edition,t.club);assert.ok(html.includes(`assets/club-logos/${club}.svg`));assert.match(html,/alt="" aria-hidden="true" draggable="false"/);
 }
 for(const id of [2544,1630166,201142,201935,203507,1629651]){const t=ctx.profileThemeFor(id);assert.equal(ctx.clubWatermarkMarkup(t.edition,t.club),'');}
 assert.equal(ctx.clubWatermarkMarkup('legend','__proto__'),'');
});
test('decorative layer is static, noninteractive and responsive without changing photo sizing',()=>{
 assert.match(js,/<div class="experience-scenery" aria-hidden="true">\$\{clubWatermarkMarkup\(edition,club\)\}/);
 assert.match(css,/\.club-watermark\{position:absolute;left:2%;top:30px;width:46%;height:540px;max-height:85%;object-fit:contain;opacity:\.16;pointer-events:none;user-select:none;animation:none!important;transition:none!important\}/);
 assert.match(css,/@media\(max-width:760px\)\{\.club-watermark\{left:7%;top:24px;width:86%;height:340px/);
 assert.match(css,/max-height:460px;object-fit:contain/);assert.match(css,/max-height:310px/);
});
test('all seven local SVGs have official source records and no script or external content',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('../assets/club-logos/sources.json',import.meta.url),'utf8'));assert.equal(Object.keys(sources).length,7);
 for(const [club,meta] of Object.entries(sources)){
  assert.match(meta.source,/^https:\/\/cdn\.nba\.com\/logos\/nba\/\d+\/primary\/[LD]\/logo.svg$/);
  const svg=fs.readFileSync(new URL(`../assets/club-logos/${club.toLowerCase()}.svg`,import.meta.url),'utf8');assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script|<foreignObject|\son[a-z]+\s*=|(?:href|src)=["']https?:/i);
 }
});
