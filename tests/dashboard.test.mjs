import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardRanking,nightDate} from '../assets/dashboard.mjs';
import {DEFAULT_SCORING,emptySeason} from '../assets/core.mjs';
import {fixture,game,line,player,stats,now} from './fixtures.mjs';
test('night groups games around midnight by New York date, not browser time zone',()=>{
 assert.equal(nightDate('2026-11-15T01:00:00Z'),'2026-11-14');
 const d=fixture();d.games.push(game(2,'2026-11-15T04:00:00Z'));d.lines.push(line(2,1));
 const r=dashboardRanking(d,{period:'night',asOf:now});assert.equal(r.night,'2026-11-14');assert.equal(r.rows[0].gp,2);assert.equal(r.importedGames,2);
});
test('7/14/30 windows include UTC boundaries and use exact averages, not totals',()=>{
 const d=fixture();d.games.push(game(2,'2026-11-09T00:00:00Z'),game(3,'2026-11-08T23:59:59Z'),game(4,'2026-10-17T00:00:00Z'));
 d.lines.push(line(2,1),line(3,1),line(4,1));
 for(const [period,gp] of [['7',2],['14',3],['30',4]]){const r=dashboardRanking(d,{period,asOf:now});assert.equal(r.rows.find(p=>p.id===1).gp,gp);assert.equal(r.rows.find(p=>p.id===1).totalFpts,r.rows.find(p=>p.id===1).fptsPerGame*gp);}
 assert.equal(dashboardRanking(d,{period:'7',asOf:now}).range.start,'2026-11-09');
});
test('excludes DNP, missing lines, unknown/preseason/live/future games; zero remains valid',()=>{
 const d=fixture();d.lines=[line(1,1,{stats:stats({pts:0,fgm:0,fga:0,fg3m:0,fg3a:0,ftm:0,fta:0,reb:0,ast:0,stl:0,blk:0,tov:0})}),line(1,2,{participation:'dnp',stats:null}),line(1,3,{participation:'missing',stats:null})];
 for(const [id,extra] of [[2,{type:'unknown'}],[3,{type:'preseason'}],[4,{status:'live'}],[5,{start:'2026-11-16T01:00:00Z'}]]){d.games.push(game(id,undefined,extra));d.lines.push(line(id,2));}
 const r=dashboardRanking(d,{period:'7',asOf:now});assert.equal(r.rows.length,1);assert.equal(r.rows[0].fptsPerGame,0);assert.equal(r.importedGames,1);
});
test('empty or latest missing night never silently falls back to older leaders',()=>{
 assert.deepEqual(dashboardRanking(emptySeason(),{period:'night',asOf:now}).rows,[]);
 const d=fixture();d.games.push(game(2,'2026-11-15T11:00:00Z',{statsState:'missing'}));
 const r=dashboardRanking(d,{period:'night',asOf:now});assert.equal(r.night,'2026-11-15');assert.equal(r.rows.length,0);assert.equal(r.importedGames,1);assert.equal(r.boxedGames,0);
});
test('custom scoring, team, verified position, min GP and sorting match rankings',()=>{
 const d=fixture();d.lines[1].stats=stats({ast:10});d.lines[2].teamId=20;
 assert.equal(dashboardRanking(d,{period:'7',asOf:now}).rows[0].id,2);
 assert.equal(dashboardRanking(d,{period:'7',asOf:now,weights:{...DEFAULT_SCORING,ast:-2}}).rows.at(-1).id,2);
 assert.deepEqual(dashboardRanking(d,{period:'7',asOf:now,team:'SIM'}).rows.map(r=>r.id),[3]);
 assert.deepEqual(dashboardRanking(d,{period:'7',asOf:now,position:'PG'}).rows.map(r=>r.id),[1]);
 assert.equal(dashboardRanking(d,{period:'7',asOf:now,minGames:2}).rows.length,0);
 assert.deepEqual(dashboardRanking(d,{period:'7',asOf:now,sort:'name'}).rows.map(r=>r.id),[1,2,3]);
});
test('retains all candidates for rankings, deterministic tie breaks, no rounding',()=>{
 const d=fixture();d.players=Array.from({length:12},(_,i)=>player(i+1));d.lines=d.players.map(p=>line(1,p.nbaId));
 const r=dashboardRanking(d,{period:'7',asOf:now});assert.equal(r.rows.length,12);assert.equal(r.rows[1].id,10);
 assert.throws(()=>dashboardRanking(d,{period:'365'}));
});
test('spotlight exposes latest played line inside period separately from average, ignoring missing and future games',()=>{
 const d=fixture();d.games=[game(1,'2026-11-10T01:00:00Z'),game(2,'2026-11-12T01:00:00Z'),game(3,'2026-11-14T01:00:00Z'),game(4,'2026-11-16T01:00:00Z')];
 d.lines=[line(1,1,{stats:stats({pts:10})}),line(2,1,{teamId:20,stats:stats({pts:30}),seconds:1999}),line(3,1,{participation:'missing',stats:null,seconds:null}),line(4,1,{stats:stats({pts:90})})];
 const row=dashboardRanking(d,{period:'7',asOf:now}).rows[0];
 assert.equal(row.gp,2);assert.equal(row.latestMatch.gameId,2);assert.equal(row.latestMatch.opponent,'TST');assert.equal(row.latestMatch.home,false);assert.equal(row.latestMatch.stats.pts,30);assert.equal(row.latestMatch.seconds,1999);assert.notEqual(row.latestMatch.fpts,row.fptsPerGame);
 const night=dashboardRanking(d,{period:'night',asOf:now});assert.equal(night.rows.length,0);
});
