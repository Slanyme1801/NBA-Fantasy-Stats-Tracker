import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../assets/core.mjs';
import {fixture,game,line,player,stats,now} from './fixtures.mjs';
const source=await fs.readFile(new URL('../assets/app.js',import.meta.url),'utf8');
function setup(){
 const data=fixture();data.schemaVersion=2;data.provider='Highlightly';data.minutesPrecision='rounded-whole-minute';
 data.players=[{...player(1),nbaId:null,playerKey:'highlightly:101'},{...player(2),nbaId:null,playerKey:'highlightly:102'}];
 data.games=[game(1,'2026-10-25T01:00:00Z'),game(2,'2026-11-03T01:00:00Z'),game(3,'2026-11-12T01:00:00Z'),game(4,'2026-11-16T01:00:00Z')];
 data.lines=[1,2,3,4].map((id,i)=>({...line(id,1,{stats:stats({pts:10*(i+1)}),seconds:1200+600*i}),nbaId:null,playerKey:'highlightly:101'}));
 data.lines.push({...line(2,2,{participation:'dnp',stats:null,seconds:null}),nbaId:null,playerKey:'highlightly:102'},{...line(3,2,{participation:'missing',stats:null,seconds:null}),nbaId:null,playerKey:'highlightly:102'});
 const players=[{player_id:'highlightly:101',full_name:'Alpha <test>',seasons:[]},{player_id:'highlightly:102',full_name:'Beta',seasons:[]}];
 const html=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const context=vm.createContext({window:{FantasyCore:core,CurrentLoad:{data},PlayerIdentity:{html,inlineArg:id=>html(JSON.stringify(id))}},document:{},console});
 vm.runInContext(source,context);context.players=players;context.now=now;
 vm.runInContext('META={scoring:window.FantasyCore.DEFAULT_SCORING}',context);
 return {data,context,render:()=>vm.runInContext('compareCurrentTable(players,{asOf:now})',context)};
}
test('current comparison shows exact season/7/14/30 averages and minutes with stable provider routes',()=>{
 const a=setup(),html=a.render(),rows=[...html.matchAll(/<tr><th scope="row">(.*?)<\/tr>/gs)].map(x=>x[0]);assert.equal(rows.length,4);
 for(const [i,days] of [null,7,14,30].entries()){
  const expected=core.aggregate(a.data,'highlightly:101',{days,asOf:now});
  assert.ok(rows[i].includes(`${expected.fptsPerGame.toFixed(1)} <small>FP / match</small>`));
  assert.ok(rows[i].includes(`${expected.gp} MJ · ${expected.minutes.toFixed(1)} MIN / match ≈`));
 }
 assert.match(html,/openPlayer\(&quot;highlightly:101&quot;\)/);assert.match(html,/Alpha &lt;test&gt;/);assert.match(html,/Échantillon importé partiel/);assert.match(html,/tabindex="0"/);
 assert.match(rows[1],/2026-11-09 au 2026-11-15/);assert.match(rows[2],/2026-11-02 au 2026-11-15/);
});
test('missing or DNP samples never become zero averages or historical substitutes',()=>{
 const a=setup();a.context.players[1].seasons=[{season:'2025-26',gp:82,fpts_per_game:99}];const html=a.render();
 assert.equal((html.match(/0 match complet · moyenne et minutes indisponibles/g)||[]).length,4);
 assert.match(html,/1 non-participation\(s\) · 1 ligne\(s\) manquante\(s\)/);assert.doesNotMatch(html,/99\.0/);
});
test('comparison uses current custom scoring and reports unavailable current dataset without hiding history',()=>{
 const a=setup();vm.runInContext('META.scoring={...META.scoring,pts:3}',a.context);
 const expected=core.aggregate(a.data,'highlightly:101',{asOf:now,weights:{...core.DEFAULT_SCORING,pts:3}});
 assert.ok(a.render().includes(`${expected.fptsPerGame.toFixed(1)} <small>FP / match</small>`));
 a.context.window.CurrentLoad.data=null;assert.match(a.render(),/comparaisons historiques restent accessibles/);
});
