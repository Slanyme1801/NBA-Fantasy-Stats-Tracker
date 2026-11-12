import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../assets/companion.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('function profileNicknameFor('),source.indexOf('renderPlayer=function(){'));
const ctx={};vm.createContext(ctx);vm.runInContext(body,ctx);
function fakeHead(){const writes=[];return {writes,insertAdjacentHTML:(...x)=>writes.push(x),classList:{toggle:(x,on)=>writes.push(['class',x,on])},querySelector:selector=>({querySelector:()=>null,insertAdjacentHTML:(where,html)=>writes.push([selector,where,html])})};}
test('royal presentation is exclusive to LeBron and leaves other profiles untouched',()=>{
 for(const id of [1629651,201939,'highlightly:2544',null,undefined]){const head=fakeHead();ctx.decorateGoatProfile(head,id);assert.deepEqual(head.writes,[]);}
 for(const id of [2544,'2544']){const head=fakeHead();ctx.decorateGoatProfile(head,id);assert.equal(head.writes[0][1],'goat-profile');assert.match(JSON.stringify(head.writes),/Aucun bonus dans le barème/);assert.match(JSON.stringify(head.writes),/aria-hidden/);}
});
test('royal presentation is responsive, reduced-motion aware, and does not replace statistics or source images',async()=>{
 const css=await fs.readFile(new URL('../assets/dashboard.css',import.meta.url),'utf8');
 assert.match(source,/decorateGoatProfile\(head,CURRENT.player_id\)/);
 assert.doesNotMatch(body,/\.src\s*=|\.innerHTML\s*=|fantasyPoints|aggregate\(/);
 assert.match(css,/@media\(max-width:760px\)\{\.player-head\.goat-profile/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.goat-profile/);
 assert.match(css,/\.goat-profile \.profile-portrait \.profile-photo\{[^}]*object-fit:contain/);
});
