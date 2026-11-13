import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const line=source.split('\n').find(s=>s.startsWith('const profilePositionLabel'));
const ctx=vm.createContext({safeText:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;')});vm.runInContext(line+';this.label=profilePositionLabel;',ctx);
test('profile heading shows historical position only, not latest import or ESPN details',()=>{
 assert.equal(ctx.label({historical_position:'G-F',position:'SG',identity_label:'ESPN not imported · Latest imported team: MIA (2026-11-13 UTC)',last_team:'MIA'}),'Poste historique : G-F');
 assert.match(source,/<span class="sub">\$\{profilePositionLabel\(p\)\}<\/span>/);
 assert.match(source,/<small>\$\{identityLabel\(p\)\}<\/small>/); // Search retains useful identity metadata.
});
test('missing historical position stays unavailable instead of borrowing ESPN position',()=>{
 assert.equal(ctx.label({historical_position:null,position:'PG'}),'Poste historique : —');
 assert.equal(ctx.label({position:'C'}),'Poste historique : C');
 assert.equal(ctx.label({}),'Poste historique : —');
 assert.equal(ctx.label({historical_position:'<G>'}),'Poste historique : &lt;G&gt;');
});
test('profile has no ESPN import badge, keeps statistics mount and minimal exception',()=>{
 const companion=fs.readFileSync(new URL('../assets/companion.js',import.meta.url),'utf8');
 const profile=companion.slice(companion.indexOf('renderPlayer=function(){'),companion.indexOf('function renderMinimalAvdija'));
 assert.doesNotMatch(profile,/class="eligibility"|Non importé|ESPN 2026/);
 assert.match(profile,/<div id="currentProfile"><\/div>/);assert.match(profile,/renderCurrentProfile\(\)/);assert.match(profile,/if\(renderMinimalAvdija\(CURRENT.player_id\)\)return/);
 assert.ok(companion.includes("p.eligibility?esc(p.eligibility.positions.join('/')):'ESPN non importé'"));
});
