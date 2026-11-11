import {SEASON, DEFAULT_SCORING, bounds, aggregate, playerIdFor, playerKeyFor, fantasyPoints, findPlayer} from './core.mjs';
const nightFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
export function nightDate(value){const parts=Object.fromEntries(nightFormatter.formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
// Only validated, completed regular-season counters contribute. Missing is never zero.
export function dashboardRanking(data,{period='7',asOf=new Date(),weights=DEFAULT_SCORING,team='',position='',minGames=1,sort='season_fpts'}={}){
  if(!['night','available','7','14','30'].includes(String(period)))throw new Error('Invalid dashboard period');
  const now=new Date(asOf),end=bounds(null,now).end;
  const eligible=data.games.filter(g=>g.season===SEASON&&g.league==='standard'&&g.type==='regular'&&g.status==='finished'&&new Date(g.start)<=now);
  // Include a more recent night even when its box scores are missing, rather than silently showing older leaders.
  const nightGames=period==='available'?eligible.filter(g=>g.statsState==='available'&&data.lines.some(r=>r.gameId===g.id&&r.participation==='played')):eligible;
  const night=nightGames.map(g=>nightDate(g.start)).sort().at(-1)||null;
  const nightPeriod=['night','available'].includes(period);
  const range=nightPeriod?{start:night,end:night,timeZone:'America/New_York'}:bounds(Number(period),now);
  const games=eligible.filter(g=>nightPeriod?nightDate(g.start)===night:new Date(g.start).toISOString().slice(0,10)>=range.start&&new Date(g.start).toISOString().slice(0,10)<=end);
  const gameMap=new Map(games.map(g=>[g.id,g]));
  const sample={...data,games,lines:data.lines.filter(r=>gameMap.has(r.gameId))};
  const positions=new Map(data.positions.entries.map(p=>[p.nbaId,p.positions]));
  let rows=data.players.map(p=>{
    const a=aggregate(sample,playerIdFor(p),{weights,asOf:now});
    const playerLines=sample.lines.filter(r=>playerKeyFor(r)===playerKeyFor(p)&&r.participation==='played');
    const teams=[...new Set(playerLines.map(r=>{const g=gameMap.get(r.gameId);return r.teamId===g.home.id?g.home.code:g.away.code;}))];
    const latestLine=[...playerLines].sort((a,b)=>new Date(gameMap.get(b.gameId).start)-new Date(gameMap.get(a.gameId).start))[0];
    const latestGame=latestLine?gameMap.get(latestLine.gameId):null;
    const latestMatch=latestLine?{gameId:latestGame.id,date:latestGame.start,opponent:latestLine.teamId===latestGame.home.id?latestGame.away.code:latestGame.home.code,home:latestLine.teamId===latestGame.home.id,seconds:latestLine.seconds,stats:{...latestLine.stats},fpts:fantasyPoints(latestLine.stats,weights)}:null;
    return {latestMatch,id:playerIdFor(p),playerKey:playerKeyFor(p),identityPending:p.nbaId==null,name:p.name,teams,positions:positions.get(p.nbaId)||[],...a};
  }).filter(r=>r.gp>0&&r.gp>=minGames&&(!team||r.teams.includes(team))&&(!position||r.positions.includes(position)));
  const field=sort==='total_fpts'?'totalFpts':sort==='gp'?'gp':'fptsPerGame';
  rows.sort((a,b)=>(sort==='name'?a.name.localeCompare(b.name):b[field]-a[field])||a.name.localeCompare(b.name)||String(a.id).localeCompare(String(b.id)));
  return {rows,range,night,importedGames:games.length,boxedGames:games.filter(g=>g.statsState==='available').length};
}

// Actual imported played games only: no fabricated zero points for gaps or DNP.
export function playerGameSeries(data,id,{weights=DEFAULT_SCORING,asOf=new Date()}={}){
  const person=findPlayer(data,id);if(!person)return [];
  const now=new Date(asOf),games=new Map(data.games.filter(g=>g.season===SEASON&&g.league==='standard'&&g.type==='regular'&&g.status==='finished'&&new Date(g.start)<=now).map(g=>[g.id,g]));
  const seen=new Set(),out=[];
  for(const line of data.lines){
    if(playerKeyFor(line)!==playerKeyFor(person)||!games.has(line.gameId)||seen.has(line.gameId))continue;
    seen.add(line.gameId);if(line.participation!=='played')continue;
    const fpts=fantasyPoints(line.stats,weights);if(fpts===null)continue;
    const g=games.get(line.gameId);out.push({gameId:g.id,date:g.start,opponent:line.teamId===g.home.id?g.away.code:g.home.code,fpts,minutes:line.seconds/60});
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date)||String(a.gameId).localeCompare(String(b.gameId)));
}
