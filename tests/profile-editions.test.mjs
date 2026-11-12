import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../assets/companion.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('function decorateEditionProfile('),source.indexOf('function toggleProfileMotion('));
const ctx={};vm.createContext(ctx);vm.runInContext(body,ctx);
function head(){const writes=[];return {writes,classList:{toggle:(...x)=>writes.push(['class',...x])},querySelector:selector=>({insertAdjacentHTML:(where,html)=>writes.push([selector,where,html])})};}
test('editorial editions match the exact user selection, with one combined treatment for dual players',()=>{
 const groups={dual:[201939,203999,203954,1628983],legend:[203110,203081,1626164,1628369],mvp:[201142,201935,203507,201566,201565]};
 for(const [edition,ids] of Object.entries(groups))for(const id of ids){const h=head();ctx.decorateEditionProfile(h,id);assert.deepEqual(h.writes.slice(0,2),[['class','edition-profile',true],['class','edition-'+edition,true]]);assert.match(JSON.stringify(h.writes),/Sélection éditoriale du site/);assert.match(JSON.stringify(h.writes),/barème fantasy inchangé/);assert.equal(h.writes.length,5);}
 for(const id of [2544,'2544',1629651,1629630,null,'highlightly:201939']){const h=head();ctx.decorateEditionProfile(h,id);assert.deepEqual(h.writes,[]);}
});
test('edition decoration preserves stats, photos and navigation and has mobile and reduced-motion styling',async()=>{
 assert.doesNotMatch(body,/\.src\s*=|\.innerHTML\s*=|aggregate\(|fantasyPoints|onclick/);
 const css=await fs.readFile(new URL('../assets/dashboard.css',import.meta.url),'utf8');
 for(const name of ['mvp','legend','dual'])assert.match(css,new RegExp('\\.player-head\\.edition-'+name+'\\{'));
 assert.match(css,/@media\(max-width:760px\)\{\.player-head\.edition-profile/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.edition-profile/);
 assert.match(source,/decorateGoatProfile\(head,CURRENT.player_id\);\s*decorateEditionProfile\(head,CURRENT.player_id\)/);
});
