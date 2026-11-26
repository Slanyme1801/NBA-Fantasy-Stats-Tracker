import {COUNTERS, playerKeyFor} from './core.mjs';

// Official box scores confirm these Highlightly keys are not separate players.
// Season-scoped; the collector and the verified release are deliberately untouched.
const season = '2026-27';
// Drive the audit from docs/verified-player-aliases.md.
const verified = [
  {from:208, to:66483557, nbaId:1630595, name:'Cade Cunningham'},
  {from:377, to:76563422, nbaId:1641705, name:'Victor Wembanyama'},
  {from:111, to:45495722, nbaId:203507, name:'Giannis Antetokounmpo'},
  {from:17, to:46686092, nbaId:203999, name:'Nikola Jokic'},
];
const normalize = s => String(s).normalize('NFKD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();
const rank = {played:2,dnp:1,missing:0};
const equivalent = (a,b) => a.teamId===b.teamId && a.participation===b.participation &&
  a.seconds===b.seconds && COUNTERS.every(k=>a.stats?.[k]===b.stats?.[k]);

// After release checksum/schema verification and raw caching, project a single
// identity for every consumer. No name-only matching, counter edits or row sums.
export function reconcilePlayerAliases(data){
  const aliases=new Map(), issues=[];
  if(data.schemaVersion!==2 || data.provider!=='Highlightly' || data.season!==season)return {data,aliases,issues};
  const players=new Map(data.players.map(p=>[p.providerId,p]));
  const targets=new Map();
  for(const {from,to,nbaId,name} of verified){
    const a=players.get(from), b=players.get(to);
    if(!a&&!b)continue;
    if(b?.nbaId!==nbaId || normalize(b.name)!==normalize(name) ||
      (a&&(a.nbaId!=null || normalize(a.name)!==normalize(name)))){
      if(a)issues.push({name,reason:'identity'});
      continue;
    }
    aliases.set(`highlightly:${from}`,b.nbaId);
    targets.set(from,b);
  }
  if(!targets.size)return {data,aliases,issues};
  const canonicalIds=new Set([...targets.values()].map(p=>p.providerId));
  const lines=[], ranks=new Map();
  for(const row of data.lines){
    const target=targets.get(row.providerId);
    if(!target&&!canonicalIds.has(row.providerId)){lines.push(row);continue;}
    const projected=target?{...row,providerId:target.providerId,nbaId:target.nbaId,playerKey:playerKeyFor(target)}:row;
    const key=`${row.gameId}:${projected.providerId}`;
    const previous=ranks.get(key);
    if(!previous){
      ranks.set(key,{index:lines.length,raw:row});
      lines.push(projected);
      continue;
    }
    // Both observations stay in the raw release/cache. Prefer evidence of play
    // to DNP/missing, then the verified canonical source in a same-status tie.
    if(!equivalent(previous.raw,row))issues.push({name:players.get(projected.providerId).name,gameId:row.gameId,reason:'overlap'});
    const delta=rank[row.participation]-rank[previous.raw.participation];
    if(delta>0 || (delta===0&&!target)){
      lines[previous.index]=projected;
      previous.raw=row;
    }
  }
  return {data:{...data,players:data.players.filter(p=>!targets.has(p.providerId)),lines},aliases,issues};
}
