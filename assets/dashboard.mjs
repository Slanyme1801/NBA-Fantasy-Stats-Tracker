import {SEASON, DEFAULT_SCORING, bounds, aggregate, playerIdFor, playerKeyFor} from './core.mjs';
const nightFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
export function nightDate(value){const parts=Object.fromEntries(nightFormatter.formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
// Only validated, completed regular-season counters contribute. Missing is never zero.
export function dashboardRanking(data,{period='7',asOf=new Date(),weights=DEFAULT_SCORING,team='',position='',minGames=1,sort='season_fpts'}={}){
  if(!['night','7','14','30'].includes(String(period)))throw new Error('Invalid dashboard period');
  const now=new Date(asOf),end=bounds(null,now).end;
  const eligible=data.games.filter(g=>g.season===SEASON&&g.league==='standard'&&g.type==='regular'&&g.status==='finished'&&new Date(g.start)<=now);
  // Include a more recent night even when its box scores are missing, rather than silently showing older leaders.
  const night=eligible.map(g=>nightDate(g.start)).sort().at(-1)||null;
  const range=period==='night'?{start:night,end:night,timeZone:'America/New_York'}:bounds(Number(period),now);
  const games=eligible.filter(g=>period==='night'?nightDate(g.start)===night:new Date(g.start).toISOString().slice(0,10)>=range.start&&new Date(g.start).toISOString().slice(0,10)<=end);
  const gameMap=new Map(games.map(g=>[g.id,g]));
  const sample={...data,games,lines:data.lines.filter(r=>gameMap.has(r.gameId))};
  const positions=new Map(data.positions.entries.map(p=>[p.nbaId,p.positions]));
  let rows=data.players.map(p=>{
    const a=aggregate(sample,playerIdFor(p),{weights,asOf:now});
    const playerLines=sample.lines.filter(r=>playerKeyFor(r)===playerKeyFor(p)&&r.participation==='played');
    const teams=[...new Set(playerLines.map(r=>{const g=gameMap.get(r.gameId);return r.teamId===g.home.id?g.home.code:g.away.code;}))];
    return {id:playerIdFor(p),playerKey:playerKeyFor(p),identityPending:p.nbaId==null,name:p.name,teams,positions:positions.get(p.nbaId)||[],...a};
  }).filter(r=>r.gp>0&&r.gp>=minGames&&(!team||r.teams.includes(team))&&(!position||r.positions.includes(position)));
  const field=sort==='total_fpts'?'totalFpts':sort==='gp'?'gp':'fptsPerGame';
  rows.sort((a,b)=>(sort==='name'?a.name.localeCompare(b.name):b[field]-a[field])||a.name.localeCompare(b.name)||String(a.id).localeCompare(String(b.id)));
  return {rows,range,night,importedGames:games.length,boxedGames:games.filter(g=>g.statsState==='available').length};
}
