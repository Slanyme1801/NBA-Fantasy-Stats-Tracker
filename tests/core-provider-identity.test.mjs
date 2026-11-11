import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,now} from './fixtures.mjs';
import {migrateHighlightlySeason,validateSeason,validateIdentityMap,validateProviderRegistry,findPlayer,playerKeyFor,playerIdFor,aggregate,similarPlayers} from '../assets/core.mjs';
const data=()=>{const s=fixture();s.provider='Highlightly';s.games.forEach(g=>g.provider='Highlightly');s.lines.forEach(l=>l.provider='Highlightly');return migrateHighlightlySeason(s);};
function unknown(){const s=data();s.players[0].nbaId=null;s.players[1].nbaId=null;s.lines[0].nbaId=null;s.lines[1].nbaId=null;s.positions.entries=[];return validateSeason(s);}
test('schema1 converts to stable provider keys and both lookup aliases give identical totals',()=>{
 const s=data();assert.equal(s.schemaVersion,2);assert.equal(playerKeyFor(s.players[0]),'highlightly:101');assert.equal(playerIdFor(s.players[0]),1);assert.equal(findPlayer(s,1),findPlayer(s,'highlightly:101'));assert.deepEqual(aggregate(s,1,{asOf:now}),aggregate(s,'highlightly:101',{asOf:now}));
});
test('invalid identifiers never aggregate all unknown NBA IDs',()=>{
 const s=unknown();for(const identifier of [null,undefined,NaN,0,-1,'','null','highlightly:null','highlightly:9007199254740992']){assert.equal(findPlayer(s,identifier),null);assert.equal(aggregate(s,identifier,{asOf:now}).gp,0);}
 assert.equal(aggregate(s,'highlightly:101',{asOf:now}).gp,1);assert.equal(aggregate(s,'highlightly:102',{asOf:now}).gp,1);assert.equal(playerIdFor(s.players[0]),'highlightly:101');
});
test('unknown missing row has zero GP; unknown distinct provider keys remain independently comparable',()=>{
 const s=unknown();const result=similarPlayers(s,'highlightly:101',{mode:'fpts',minGames:1,tolerance:100,asOf:now});assert.ok(result.results.some(p=>p.playerKey==='highlightly:102'));
 s.lines[0].participation='missing';s.lines[0].stats=null;s.lines[0].seconds=null;validateSeason(s);const a=aggregate(s,'highlightly:101',{asOf:now});assert.equal(a.gp,0);assert.equal(a.missing,1);
});
test('verified mapping validator remains strict; provider registry rejects collisions and line identity divergence',()=>{
 const s=unknown();assert.throws(()=>validateIdentityMap({season:s.season,players:s.players}));validateProviderRegistry({provider:s.provider,season:s.season,players:s.players});
 const duplicate=structuredClone(s);duplicate.players.push({...duplicate.players[0],name:'Different label'});assert.throws(()=>validateSeason(duplicate));
 const line=structuredClone(s);line.lines[0].playerKey='highlightly:102';assert.throws(()=>validateSeason(line),/identity/);
 const wrong=structuredClone(s);wrong.lines[0].nbaId=999;assert.throws(()=>validateSeason(wrong),/identity/);
});
