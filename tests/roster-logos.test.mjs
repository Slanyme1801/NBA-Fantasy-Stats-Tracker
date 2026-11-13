import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {rosterSnapshot,rosterClubFor} from '../assets/rosters.mjs';
const js=fs.readFileSync(new URL('../assets/companion.js',import.meta.url),'utf8');
const ctx=vm.createContext({esc:String,C:{SEASON:'2026-27'},window:{CurrentRoster:{clubFor:p=>rosterClubFor(p,'2026-27')}}});
vm.runInContext(js.slice(js.indexOf('function ordinaryClubBadge'),js.indexOf('function decorateOrdinaryProfile')),ctx);
test('official active roster has 523 unique IDs and all 30 clubs, with dated provenance',()=>{
 assert.equal(rosterSnapshot.entries.length,523);assert.equal(new Set(rosterSnapshot.entries.map(x=>x[0])).size,523);assert.equal(new Set(rosterSnapshot.entries.map(x=>x[2])).size,30);assert.equal(rosterSnapshot.verifiedAt,'2026-11-13');assert.equal(rosterSnapshot.source,'https://www.nba.com/players');
});
test('known current roster enables a logo without a played game, not a historical club',()=>{
 const p={player_id:1627747,full_name:'Caris LeVert',last_team:'CLE',team_basis:'historical'};assert.equal(rosterClubFor(p,'2026-27').club,'MIL');const html=ctx.ordinaryClubBadge(p);assert.match(html,/1610612749/);assert.match(html,/effectif NBA vérifié le 2026-11-13/);assert.match(html,/https:\/\/www.nba.com\/players/);
});
test('verified match remains preferred and keeps the distinct provenance label',()=>{
 const html=ctx.ordinaryClubBadge({player_id:1627747,last_team:'CLE',team_basis:'latest-verified-import'});assert.match(html,/1610612739/);assert.match(html,/dernier match disponible/);assert.doesNotMatch(html,/effectif NBA vérifié/);
});
test('retired, unknown, numeric-ID mismatch and wrong season never inherit an old team',()=>{
 for(const p of [{player_id:201565,last_team:'CHI',team_basis:'historical'},{player_id:999999,full_name:'Caris LeVert',last_team:'CLE'},{player_id:'garbage',full_name:'Caris LeVert'}]){assert.equal(rosterClubFor(p,'2026-27'),null);assert.equal(ctx.ordinaryClubBadge(p),'');}
 assert.equal(rosterClubFor({player_id:1627747},'2027-28'),null);
});
test('provider identities need exact full names unique in both roster and current registry',()=>{
 const p={player_id:'highlightly:42',full_name:' Caris LeVert '};assert.equal(rosterClubFor(p,'2026-27',[{name:'Caris LeVert'}]).club,'MIL');
 assert.equal(rosterClubFor(p,'2026-27',[{name:'Caris LeVert'},{name:'CARIS LEVERT'}]),null);
 assert.equal(rosterClubFor(p,'2026-27',[]),null);assert.equal(rosterClubFor({...p,full_name:'Caris'},'2026-27',[{name:'Caris'}]),null);
 const normalized=rosterSnapshot.entries.map(x=>x[1].normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase());assert.equal(new Set(normalized).size,normalized.length);
});

test('newer official roster fixes Carson Cooper after Lakers signing without changing history',()=>{
 const p={player_id:1643721,last_team:'MEM',team_basis:'latest-verified-import',team_as_of:'2026-11-01T00:00:00.000Z'};
 const before=JSON.stringify(p),html=ctx.ordinaryClubBadge(p);
 assert.match(html,/1610612747/);assert.match(html,/effectif NBA vérifié/);assert.equal(JSON.stringify(p),before);
});
test('same-day or newer verified games cannot be overwritten by an older day-only snapshot',()=>{
 for(const date of ['2026-11-13T00:00:00Z','2026-11-13T20:00:00Z','2026-11-14T00:00:00Z']){
  const html=ctx.ordinaryClubBadge({player_id:1643721,last_team:'MEM',team_basis:'latest-verified-import',team_as_of:date});assert.match(html,/1610612763/);assert.match(html,/dernier match disponible/);
 }
});
test('missing or invalid match date never invents temporal precedence',()=>{
 for(const date of [undefined,'invalid'])assert.match(ctx.ordinaryClubBadge({player_id:1643721,last_team:'MEM',team_basis:'latest-verified-import',team_as_of:date}),/1610612763/);
});
