import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {aggregate,DEFAULT_SCORING,validateSeason} from '../assets/core.mjs';
import {dashboardRanking,playerGameSeries} from '../assets/dashboard.mjs';
import {reconcilePlayerAliases} from '../assets/player-aliases.mjs';
const bytes=readFileSync(new URL('../data/releases/2026-27-6b3521df5baa22da.json',import.meta.url));
const history=JSON.parse(readFileSync(new URL('../data/history-v1.json',import.meta.url)));
const ids=history.players.map(p=>p[0]), raw=validateSeason(JSON.parse(bytes),ids);
const pairs=[[208,66483557,1630595],[377,76563422,1641705],[111,45495722,203507],[17,46686092,203999]];
const asOf='2026-11-25T21:44:14Z';
test('verified projection preserves raw data, all games and every original box counter',()=>{
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'6b3521df5baa22da7faf4339d079a3cd77e390494dc8e03c1c9c5abd36d7979b');
  const {data,aliases,issues}=reconcilePlayerAliases(raw);
  assert.equal(data.games,raw.games);
  assert.equal(data.lines.length,raw.lines.length);
  assert.equal(data.positions,raw.positions);
  assert.equal(data.players.length,raw.players.length-4);
  assert.deepEqual(issues,[]);
  assert.deepEqual([...aliases],pairs.map(([a,,id])=>[`highlightly:${a}`,id]));
  validateSeason(data,ids);
  for(const [i,l] of raw.lines.entries()){
    const p=pairs.find(([key])=>key===l.providerId), actual=data.lines[i];
    if(!p)assert.equal(actual,l);
    else assert.deepEqual(actual,{...l,providerId:p[1],nbaId:p[2],playerKey:`highlightly:${p[1]}`});
  }
  assert.deepEqual(raw,JSON.parse(bytes));
});
test('home, totals, custom weights and per-game series across four verified profiles',()=>{
  const {data}=reconcilePlayerAliases(raw);
  for(const period of ['7','14','30']){
    const {rows,boxedGames}=dashboardRanking(data,{period,asOf});
    const original=dashboardRanking(raw,{period,asOf});
    assert.equal(boxedGames,original.boxedGames);
    assert.equal(new Set(rows.slice(0,10).map(r=>r.name)).size,10);
  }
  for(const [id,days,gp,total] of [[1630595,14,5,266],[1641705,30,14,1013],[203507,30,11,637],[203999,30,14,824]]){
    const a=aggregate(data,id,{days,asOf});
    assert.deepEqual([a.gp,a.totalFpts],[gp,total]);
    const series=playerGameSeries(data,id,{asOf});
    assert.equal(new Set(series.map(x=>x.gameId)).size,series.length);
    const weights={...DEFAULT_SCORING,pts:3,tov:-5};
    assert.equal(aggregate(data,id,{days,asOf,weights}).totalFpts,total+2*a.totals.pts-3*a.totals.tov);
  }
});
test('a later raw release is reconciled again, with no duplication in a same-game overlap',()=>{
  const [a,b,id]=pairs[0], source=raw.lines.find(r=>r.providerId===a&&r.participation==='played');
  const canonical={...source,providerId:b,playerKey:`highlightly:${b}`,nbaId:id,seconds:source.seconds+60};
  const replay={...raw,updatedAt:'2026-11-26T19:40:00Z',lines:[...raw.lines,canonical]};
  for(const lines of [replay.lines,[...replay.lines].reverse()]){
    const next=reconcilePlayerAliases({...replay,lines});
    assert.equal(next.data.lines.length,raw.lines.length);
    assert.deepEqual(next.issues,[{name:'Cade Cunningham',gameId:source.gameId,reason:'overlap'}]);
    assert.deepEqual(next.data.lines.find(l=>l.providerId===b&&l.gameId===source.gameId),canonical);
    assert.equal(aggregate(next.data,id,{days:14,asOf}).totalFpts,266);
    validateSeason(next.data,ids);
  }
  assert.equal(replay.lines.at(-1),canonical);
});
test('changed identity is left alone, without blocking the other players',()=>{
  const [a,,id]=pairs[0];
  const input={...raw,players:raw.players.map(p=>p.providerId===a?{...p,name:'Another player'}:p)};
  const {data,aliases,issues}=reconcilePlayerAliases(input);
  assert.equal(aliases.has(`highlightly:${a}`),false);
  assert.ok(data.players.some(p=>p.providerId===a));
  assert.deepEqual(issues,[{name:'Cade Cunningham',reason:'identity'}]);
  assert.equal(aggregate(data,id,{days:14,asOf}).totalFpts,151);
  assert.equal(aggregate(data,203999,{days:30,asOf}).totalFpts,824);
});
