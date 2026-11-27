import assert from 'node:assert/strict';
import {test} from 'node:test';
import {OFFICIAL_SACGSW,isReviewedSacGsw} from '../tools/nba-official-sacgsw.mjs';
import {published} from '../tools/files.mjs';
import {fantasyPoints} from '../assets/core.mjs';
test('only the available, explicitly sourced NBA final box is preserved',()=>{
 const exact={id:1589809,statsState:'available',boxScoreSource:OFFICIAL_SACGSW.source};
 assert(isReviewedSacGsw(exact));
 for(const other of [{id:1},{statsState:'missing'},{boxScoreSource:undefined}])assert(!isReviewedSacGsw({...exact,...other}));
});
test('reviewed SAC–GSW official lines are complete and have stable fantasy output',async()=>{
 const d=await published(),g=d.games.find(g=>g.id===OFFICIAL_SACGSW.gameId);
 assert(isReviewedSacGsw(g));assert.deepEqual(g.finalScores,[129,110]);assert.equal(g.refreshIssue,undefined);
 const rs=d.lines.filter(r=>r.gameId===g.id), played=rs.filter(r=>r.participation==='played');
 assert.equal(played.length,21);assert.equal(rs.filter(r=>r.participation==='dnp').length,6);
 assert.equal(new Set(rs.map(r=>r.playerKey)).size,27);
 for(const [t,n] of [[g.home.id,129],[g.away.id,110]])assert.equal(played.filter(r=>r.teamId===t).reduce((s,r)=>s+r.stats.pts,0),n);
 assert.equal(fantasyPoints(played.find(r=>r.nbaId===1627734).stats),57);
 assert.equal(fantasyPoints(played.find(r=>r.nbaId===1629001).stats),52);
});
