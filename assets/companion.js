/* Adds current form and trades to the original profiles and season charts. */
const C=window.FantasyCore, currentData=window.CurrentLoad.data;
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const sign=value=>value===null?'—':`${value>0?'+':''}${fmt(value,2)}`;
const displayDate=value=>value?new Date(value).toLocaleString():'Never';
const periodOptions=(historical=true)=>`<option value="season">2026–27 · season</option><option value="7">Last 7 calendar days</option><option value="14">Last 14 calendar days</option><option value="30">Last 30 calendar days</option>${historical?window.__DATASET.seasons.slice().reverse().map(s=>`<option value="${s}">${s} · historical</option>`).join(''):''}`;
const periodConfig=value=>({days:['7','14','30'].includes(value)?Number(value):null,weights:META.scoring});
const periodLabel=value=>{
  if(window.__DATASET.seasons.includes(value))return `${value} · regular season · rounded historical averages`;
  const p=C.bounds(periodConfig(value).days);
  return `${p.start?`${p.start} through ${p.end}`:`2026–27 through ${p.end}`} · calendar days UTC · completed regular season`;
};
const scoreLabel=()=>C.scoringName(META.scoring);
function statusPanel(compact=false){
  const load=window.CurrentLoad, d=load.data, unknown=d.games.filter(g=>g.type==='unknown').length;
  const title=d.connection==='not-connected'?'2026–27 is not connected':`${d.lines.length} player game records`;
  return `<section class="connection ${load.state==='cached'?'stale':''}" aria-label="Data status"><div><span class="eyebrow">2026–27 DATA</span><h3>${title}</h3><p>${load.state==='cached'?'Using the last verified snapshot. Refresh failed; figures may be outdated.':load.state==='unavailable'?'The data release could not be loaded. Historical stats are still available.':d.connection==='not-connected'?'Current-season data is on standby. Statistics will appear after a verified regular-season import.':'Calculated from imported raw game counters.'}</p><p class="small">Last successful collection: ${displayDate(d.updatedAt)} · ${unknown} unclassified games excluded<br>ESPN positions: ${d.positions.entries.length} verified players · imported ${displayDate(d.positions.importedAt)}</p></div>${compact?'':`<button class="btn ghost" onclick="go('data')">Data &amp; scoring</button>`}</section>`;
}
let activePage='home',routeGeneration=0;
const previousGo=go;
go=function(page){activePage=page;routeGeneration++;if(page==='trades')renderTrades();else previousGo(page);['home','board','compare','trades','data'].forEach(p=>el('tab-'+p).classList.toggle('active',p===page));};
const previousHome=renderHome;
renderHome=function(){previousHome();el('mainSearch').setAttribute('aria-label','Search NBA players');const hero=el('view').querySelector('.hero');hero.insertAdjacentHTML('beforeend',`<div class="hero-actions"><button class="btn" onclick="go('trades')">Evaluate a trade</button><button class="btn ghost" onclick="go('board')">Explore rankings</button></div>`);hero.insertAdjacentHTML('afterend',statusPanel());};
const previousFooter=metaFooter;
metaFooter=function(){return `<div class="scoring-badge">${scoreLabel()}${scoreLabel()==='ESPN default'?' · PTS + 3PM + 2FGM − FGA + FTM − FTA + REB + 2AST + 4STL + 4BLK − 2TO':' · Your saved custom weights apply'}</div><p class="small muted">Historical totals marked ≈ are reconstructed from rounded averages. Current samples exclude DNP, missing lines and non-regular-season games.</p>${previousFooter()}`;};
const previousPlayer=renderPlayer;
openPlayer=async function(id){
  const generation=++routeGeneration;activePage='player';['home','board','compare','trades','data'].forEach(p=>el('tab-'+p).classList.remove('active'));el('view').innerHTML='<p role="status">Loading player…</p>';
  const player=await api('/api/player/'+id);if(generation!==routeGeneration)return;CURRENT=player;sortState={key:'season',dir:'asc'};renderPlayer();window.scrollTo(0,0);
};
renderPlayer=function(){
  previousPlayer();const head=el('view').querySelector('.player-head');head.insertAdjacentHTML('afterbegin',`<span class="avatar" aria-hidden="true">${esc(CURRENT.full_name.split(' ').map(s=>s[0]).slice(0,2).join(''))}</span>`);
  const p=CURRENT.eligibility;head.insertAdjacentHTML('afterend',`<div class="eligibility"><b>ESPN 2026–27:</b> ${p?esc(p.positions.join(' / ')):'Not imported'}${p?`<span class="small"> · ${esc(p.source)} · observed ${displayDate(p.observedAt)}</span>`:'<span class="small"> · Historical G/F/C positions do not establish fantasy eligibility.</span>'}</div><div id="currentProfile"></div>`);renderCurrentProfile();
};
function aggregateTable(a){
  const keys=['pts','fgm','fga','fg3m','fg3a','ftm','fta','reb','ast','stl','blk','tov'];
  return `<div class="scroll" tabindex="0" aria-label="Season averages and raw totals"><table><thead><tr><th>2026–27</th>${keys.map(k=>`<th>${k.toUpperCase()}</th>`).join('')}<th>FPTS</th></tr></thead><tbody><tr><td>AVG / game</td>${keys.map(k=>`<td>${fmt(a.averages[k])}</td>`).join('')}<td class="fpts">${fmt(a.fptsPerGame)}</td></tr><tr><td>Raw totals · ${a.gp} GP</td>${keys.map(k=>`<td>${a.totals?fmt(a.totals[k],0):'—'}</td>`).join('')}<td>${fmt(a.totalFpts)}</td></tr></tbody></table></div><p class="small muted">FG ${fmt(a.percentages.fg)}% · 3PT ${fmt(a.percentages.three)}% · FT ${fmt(a.percentages.ft)}% · percentages use cumulative made/attempted shots; — means unavailable or no attempts.</p>`;
}
function renderCurrentProfile(){
  const id=CURRENT.player_id,season=C.aggregate(currentData,id,{weights:META.scoring}),samples=[7,14,30].map(days=>C.aggregate(currentData,id,{days,weights:META.scoring}));
  const games=new Map(currentData.games.map(g=>[g.id,g])),lines=currentData.lines.filter(r=>r.nbaId===id).sort((a,b)=>games.get(b.gameId).start.localeCompare(games.get(a.gameId).start));
  el('currentProfile').innerHTML=`<section class="panel"><div class="section-title"><h3>2026–27 · current form</h3><span class="badge">${scoreLabel()}</span></div><p class="small muted">${periodLabel('season')}. Updated ${displayDate(currentData.updatedAt)}.</p>
    <div class="cards compact-cards">${[season,...samples].map((a,i)=>`<div class="card ${i===0?'hero-stat':''}"><div class="label">${i===0?'Season AVG':`${a.period.days} calendar days`}</div><div class="value">${fmt(a.fptsPerGame)}</div><div class="small muted">${a.gp} complete GP · ${a.dnp} DNP · ${a.missing} missing</div>${i?`<div class="small muted">${a.period.start} – ${a.period.end} UTC</div>`:''}</div>`).join('')}</div>
    ${!season.gp?`<p class="empty">${currentData.connection==='not-connected'?'No real game data connected.':'No complete, eligible game line is available for this player.'} An empty sample is not a zero performance.</p>`:''}${aggregateTable(season)}<p class="small muted">League coverage: ${season.uncollectedGames} finished regular-season games have no box score. An absent player row is unknown, never an inferred DNP. ${currentData.games.filter(g=>g.type==='unknown').length} unclassified games excluded.</p>
    <details><summary>Compare current AVG with historical seasons</summary><div class="scroll"><table class="compact-table"><thead><tr><th>Season</th><th>Historical GP</th><th>Historical FPTS/G</th><th>Current minus historical</th></tr></thead><tbody>${CURRENT.seasons.filter(s=>s.season!==C.SEASON).map(s=>`<tr><td>${s.season}</td><td>${s.played?s.gp:'—'}</td><td>${s.played?fmt(s.fpts_per_game):'—'}</td><td>${s.played&&season.gp?sign(season.fptsPerGame-s.fpts_per_game):'—'}</td></tr>`).join('')}</tbody></table></div></details>
    <details><summary>Game log · ${lines.length} records</summary>${lines.length?`<div class="scroll"><table><thead><tr><th>Date UTC</th><th>Team / opponent</th><th>Type / status</th><th>Participation</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>3PA</th><th>FGM</th><th>FGA</th><th>FTM</th><th>FTA</th><th>STL</th><th>BLK</th><th>TO</th><th>FPTS</th></tr></thead><tbody>${lines.map(r=>{const g=games.get(r.gameId),home=r.teamId===g.home.id;return `<tr><td>${g.start.slice(0,10)}</td><td>${esc(home?g.home.code:g.away.code)} ${home?'vs':'@'} ${esc(home?g.away.code:g.home.code)}</td><td>${esc(g.type)} / ${esc(g.status)}</td><td title="${esc(r.comment)}">${r.participation==='dnp'?'DNP':r.participation==='missing'?'Missing data':'Played'}</td><td>${r.seconds===null?'—':fmt(r.seconds/60)}</td><td>${fmt(r.stats?.pts,0)}</td><td>${fmt(r.stats?.reb,0)}</td><td>${fmt(r.stats?.ast,0)}</td>${["fg3m","fg3a","fgm","fga","ftm","fta","stl","blk","tov"].map(k=>`<td>${fmt(r.stats?.[k],0)}</td>`).join("")}<td class="fpts">${fmt(C.fantasyPoints(r.stats,META.scoring))}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="muted">No game records imported. This does not establish whether this player had a scheduled game.</p>'}</details></section>
    <section class="panel"><h3>Find similar players</h3><div class="filters"><label>Period<select id="similarPeriod">${periodOptions(false)}</select></label><label>Match by<select id="similarMode"><option value="both">ESPN position + close AVG</option><option value="positions">Compatible ESPN position</option><option value="fpts">Close FPTS AVG</option></select></label><label>Max AVG difference<input id="similarTolerance" type="number" min="0" value="5" step="0.5"></label><label>Minimum complete GP<input id="similarMin" type="number" min="1" value="3"></label></div><div id="similarResults"></div></section>`;
  ['similarPeriod','similarMode','similarTolerance','similarMin'].forEach(id=>el(id).onchange=renderSimilar);renderSimilar();
}
function renderSimilar(){
  try{const period=el('similarPeriod').value,result=C.similarPlayers(currentData,CURRENT.player_id,{...periodConfig(period),mode:el('similarMode').value,tolerance:Number(el('similarTolerance').value),minGames:Number(el('similarMin').value)});
    el('similarResults').innerHTML=`<p class="small muted">${periodLabel(period)} · ${scoreLabel()} · reference: ${result.base.gp} GP, ${fmt(result.base.fptsPerGame)} AVG</p>${result.results.length?`<div class="similar-grid">${result.results.map(p=>`<button class="similar-player" onclick="openPlayer(${p.nbaId})"><b>${esc(p.name)}</b><span>${p.eligibility?esc(p.eligibility.positions.join('/')):'ESPN not imported'}</span><strong>${fmt(p.stats.fptsPerGame)} AVG <small>· ${p.stats.gp} GP</small></strong><span>Difference ${fmt(p.gap)} · ${p.stats.dnp} DNP · ${p.stats.missing} missing</span></button>`).join('')}</div>`:`<p class="empty">${esc(result.reason)}</p>`}`;
  }catch(error){el('similarResults').textContent=error.message;}
}
const tradeState={left:[],right:[],period:'2025-26',replacement:28.5};let tradeRequest=0;
function renderTrades(){
  el('view').innerHTML=`<div class="page-heading"><span class="eyebrow">TRADE WORKBENCH</span><h1>Compare the whole deal.</h1><p class="muted">Build both sides, then account for every roster slot.</p></div><div class="panel"><div class="filters"><label>Shared period<select id="tradePeriod">${periodOptions()}</select></label><label>Hypothetical free-agent AVG<input id="replacementAvg" type="number" min="0" step="0.5" value="${tradeState.replacement}"></label><span class="badge">${scoreLabel()}</span></div><p class="small muted" id="tradePeriodNote"></p></div>
    <div class="trade-grid">${['left','right'].map((side,i)=>`<section class="panel trade-side"><div class="section-title"><h2>Side ${i?'B':'A'}</h2><span class="small muted">Up to 5 players</span></div><div class="searchbox"><input id="tradeSearch-${side}" aria-label="Add player to side ${i?'B':'A'}" placeholder="Find a player…" autocomplete="off"><div class="results" id="tradeResults-${side}" hidden></div></div><div id="tradePlayers-${side}" class="trade-players"></div></section>`).join('')}</div><div id="tradeSummary" aria-live="polite"></div><p class="small muted">Replacement players are hypothetical: this is not a live free-agent list. Results compare sums of per-game averages on equal roster slots. They do not predict an exact change to a team average weighted by games played.</p>${statusPanel(true)}`;
  el('tradePeriod').value=tradeState.period;['left','right'].forEach(side=>wireSearch(el('tradeSearch-'+side),el('tradeResults-'+side),p=>addTrade(side,p.player_id)));
  el('tradePeriod').onchange=()=>{tradeState.period=el('tradePeriod').value;updateTrades();};el('replacementAvg').oninput=()=>{tradeState.replacement=el('replacementAvg').value===''?NaN:Number(el('replacementAvg').value);updateTrades();};updateTrades();
}
function addTrade(side,id){if(tradeState[side].length>=5||[...tradeState.left,...tradeState.right].includes(id))return;tradeState[side].push(id);updateTrades();}
function removeTrade(side,id){tradeState[side]=tradeState[side].filter(x=>x!==id);updateTrades();}
function metric(player,period){if(window.__DATASET.seasons.includes(period)){const row=player.seasons.find(s=>s.season===period);return {avg:row?.played?row.fpts_per_game:null,gp:row?.gp||0,extra:'historical average'};}const a=C.aggregate(currentData,player.player_id,periodConfig(period));return {avg:a.fptsPerGame,gp:a.gp,extra:`${a.dnp} DNP · ${a.missing} missing`};}
async function updateTrades(){
  const request=++tradeRequest,profiles=await Promise.all([...tradeState.left,...tradeState.right].map(id=>api('/api/player/'+id)));if(request!==tradeRequest||activePage!=='trades')return;
  const players=new Map(profiles.map(p=>[p.player_id,p])),values={left:[],right:[]},slots=Math.max(tradeState.left.length,tradeState.right.length);el('tradePeriodNote').textContent=periodLabel(tradeState.period);
  for(const side of ['left','right'])el('tradePlayers-'+side).innerHTML=tradeState[side].map(id=>{const p=players.get(id),m=metric(p,tradeState.period);values[side].push(m.avg);return `<article class="trade-player"><div><button class="text-button" onclick="openPlayer(${id})">${esc(p.full_name)}</button><span class="small muted">${m.gp} GP · ${m.extra}</span></div><strong>${m.avg===null?'—':fmt(m.avg)} <small>AVG</small></strong><button class="remove" aria-label="Remove ${esc(p.full_name)} from side ${side==='left'?'A':'B'}" onclick="removeTrade('${side}',${id})">×</button></article>`;}).join('')+(tradeState[side].length?'':'<p class="muted">Add players to this side.</p>')+(tradeState.left.length&&tradeState.right.length?Array.from({length:slots-tradeState[side].length},()=>`<article class="trade-player replacement"><div><b>Hypothetical free agent</b><span class="small muted">One roster slot · assumption</span></div><strong>${fmt(tradeState.replacement)} <small>AVG</small></strong></article>`).join(''):'');
  try{const result=C.tradeValue(values.left,values.right,tradeState.replacement);el('tradeSummary').innerHTML=result?`<section class="panel trade-result"><span class="eyebrow">${result.slots} EQUAL ROSTER SLOTS · ${scoreLabel()}</span><div class="trade-grid">${[['A',result.left],['B',result.right]].map(([name,s])=>`<div><h3>Side ${name}</h3><div class="result-number">${fmt(s.sum,2)}</div><p>Sum of AVG · ${s.players} player${s.players===1?'':'s'}${s.added?` + ${s.added} hypothetical replacement`:''}</p><b>${fmt(s.average,2)} AVG per slot</b></div>`).join('')}</div><div class="trade-difference">B − A: <b>${sign(result.sumDifference)}</b> sum of AVG <span>· <b>${sign(result.averageDifference)}</b> per slot</span></div></section>`:`<div class="empty">${!values.left.length||!values.right.length?'Add at least one player on each side to compare.':'A selected player has no complete sample for this period. The trade cannot be scored; unavailable is not zero.'}</div>`;}catch(error){el('tradeSummary').innerHTML=`<p class="empty warn">${esc(error.message)}</p>`;}
}
const previousData=renderData;
renderData=function(){previousData();el('view').querySelector('h2').insertAdjacentHTML('afterend',statusPanel(true));el('view').insertAdjacentHTML('beforeend',`<section class="panel"><h3>2026–27 import status</h3><p>No browser request is sent to API-NBA, ESPN or NBA.com. API keys belong only in the separate local collector.</p><p class="muted">A reviewed data snapshot and a separate ESPN eligibility import are required. Automatic collection is disabled. Game types need verified classification; unknown games are excluded. All ${currentData.lines.length} current player lines passed schema validation.</p><p class="small muted">Historical validation warnings above are retained from the original archive; they concern rounded averages.</p></section>`);};
const previousSave=saveScoring,previousReset=resetScoring;
saveScoring=async function(){try{await previousSave();}catch(error){let message=el('scoringError');if(!message){message=document.createElement('p');message.id='scoringError';message.className='warn';el('view').append(message);}message.textContent=error.message;}};
resetScoring=async function(){await previousReset();comparePlayers={};for(const id of compareIds)comparePlayers[id]=await api('/api/player/'+id);};
const previousCompare=renderCompare;
renderCompare=function(){previousCompare();el('compareSearch').setAttribute('aria-label','Add a comparison player');el('view').querySelector('h2').insertAdjacentHTML('afterend',`<p class="badge">${scoreLabel()}</p>`);};
const labeledData=renderData;
renderData=function(){labeledData();el('view').querySelector('h2').insertAdjacentHTML('afterend',`<p class="badge">${scoreLabel()}</p><p class="small muted" id="pwaStatus">${esc(window.PWA_STATUS||'Offline cache not supported')}</p>`);};
window.addEventListener('pwa-status',()=>{if(el('pwaStatus'))el('pwaStatus').textContent=window.PWA_STATUS;});
renderBoard=function(){
  el('view').innerHTML=`<h2>Fantasy rankings</h2><p class="small muted">Season filters apply to AVG, GP and totals. Historical totals are approximate.</p><div class="panel"><div class="filters"><label>Season<select id="fSeason"><option value="">5 historical seasons</option>${SEASONS.map(s=>`<option>${s}</option>`).join('')}</select></label><label>Sort by<select id="fSort"><option value="weighted_avg">Weighted FPTS/G</option><option value="simple_avg">Simple season AVG</option><option value="season_fpts">Selected season FPTS/G</option><option value="total_fpts">Total fantasy points</option><option value="gp">Games played</option><option value="name">Player name</option></select></label><label>Team<select id="fTeam"><option value="">All teams</option>${META.teams.map(t=>`<option>${t}</option>`).join('')}</select></label><label>Position<select id="fPos"></select></label><label>Min GP<input id="fGp" type="number" min="0" value="0"></label><button class="btn" onclick="loadBoard()">Apply filters</button></div><p class="small muted" id="boardNote"></p><div class="scroll" id="boardTable"></div></div>`;
  el('fSeason').onchange=()=>{setBoardPositions();loadBoard();};['fSort','fTeam','fPos','fGp'].forEach(id=>el(id).onchange=loadBoard);setBoardPositions();loadBoard();
  el('view').querySelector('h2').insertAdjacentHTML('afterend',`<p class="badge">${scoreLabel()}</p>`);
};
function setBoardPositions(){const current=el('fSeason').value===C.SEASON;el('fPos').innerHTML='<option value="">All positions</option>'+(current?C.POSITIONS:META.positions).map(p=>`<option>${esc(p)}</option>`).join('');el('boardNote').textContent=current?'2026–27: verified ESPN position membership only. Missing positions are not inferred.':'Historical position labels are NBA G/F/C categories, not ESPN fantasy eligibility.';}
let boardRequest=0;
loadBoard=async function(){
  const request=++boardRequest,season=el('fSeason').value,q=new URLSearchParams({season,sort:el('fSort').value,team:el('fTeam').value,position:el('fPos').value,min_gp:el('fGp').value,limit:2000});
  let {results}=await api('/api/leaderboard?'+q);if(request!==boardRequest||activePage!=='board')return;
  if(season&&season!==C.SEASON){const sort=q.get('sort'),field=sort==='gp'?'season_gp':sort==='total_fpts'?'total_fpts':'season_fpts';results.sort((a,b)=>sort==='name'?a.full_name.localeCompare(b.full_name):b[field]-a[field]);}
  results=results.slice(0,150).map((r,i)=>({...r,rank:i+1}));
  el('boardTable').innerHTML=results.length?`<table><thead><tr><th>#</th><th>Player</th><th>Team</th><th>Position</th><th>FPTS/G</th><th>GP</th><th>Total FPTS${season===C.SEASON?'':' ≈'}</th></tr></thead><tbody>${results.map(r=>`<tr><td>${r.rank}</td><td><button class="text-button" onclick="openPlayer(${r.player_id})">${esc(r.full_name)}</button></td><td>${esc(r.team)}</td><td>${esc(r.position||'—')}</td><td class="fpts">${fmt(season?r.season_fpts:q.get('sort')==='simple_avg'?r.simple_avg:r.weighted_avg)}</td><td>${season?r.season_gp:r.total_gp}</td><td>${fmt(r.total_fpts,0)}</td></tr>`).join('')}</tbody></table>`:`<p class="empty">${season===C.SEASON&&currentData.connection==='not-connected'?'2026–27 is not connected. No current-season ranking is available.':'No complete sample matches these filters.'}</p>`;
};
function networkNotice(){let node=el('networkNotice');if(!node){node=document.createElement('div');node.id='networkNotice';node.setAttribute('role','status');document.body.prepend(node);}node.hidden=navigator.onLine&&window.CurrentLoad.state==='fresh';node.textContent=!navigator.onLine?'Offline · showing data already saved on this device. Check its collection date.':window.CurrentLoad.state==='cached'?'Last verified data · refresh failed. Check the collection date before using current form.':'Current-season data could not be loaded. Historical stats remain available.';}
window.addEventListener('online',networkNotice);window.addEventListener('offline',networkNotice);networkNotice();
// A one-use, tab-local snapshot protects the current view during an app update.
// Saved scoring continues to use its original localStorage key.
window.FantasySession={
  capture(){return {page:activePage,playerId:CURRENT?.player_id,
    trade:{...tradeState,left:[...tradeState.left],right:[...tradeState.right]},compare:[...compareIds],
    controls:[...document.querySelectorAll('#view input[id],#view select[id],#view textarea[id],#navSearch')].filter(e=>!['password','file'].includes(e.type)).map(e=>({id:e.id,value:e.value,checked:e.checked})),
    details:[...document.querySelectorAll('#view details')].map(e=>e.open),focus:document.activeElement?.id,scroll:window.scrollY};},
  async restore(saved){
    if(!saved||typeof saved!=='object')throw new Error('Invalid view snapshot');
    const valid=new Set([...window.__DATASET.players.map(p=>p[0]),...currentData.players.map(p=>p.nbaId)]);
    const ids=(list,max)=>[...new Set(Array.isArray(list)?list:[])].filter(id=>valid.has(id)).slice(0,max);
    compareIds=ids(saved.compare,4);comparePlayers={};
    for(const id of compareIds)comparePlayers[id]=await api('/api/player/'+id);
    if(saved.trade){tradeState.left=ids(saved.trade.left,5);tradeState.right=ids(saved.trade.right,5).filter(id=>!tradeState.left.includes(id));
      if(['season','7','14','30',...window.__DATASET.seasons].includes(saved.trade.period))tradeState.period=saved.trade.period;
      tradeState.replacement=Number.isFinite(saved.trade.replacement)?saved.trade.replacement:NaN;}
    if(saved.page==='player'&&valid.has(saved.playerId))await openPlayer(saved.playerId);
    else go(['home','board','compare','trades','data'].includes(saved.page)?saved.page:'home');
    const restoreControls=()=>{for(const field of saved.controls||[]){const node=typeof field.id==='string'?el(field.id):null;if(!node||!node.matches('input,select,textarea')||['password','file'].includes(node.type))continue;node.value=String(field.value??'');if(typeof field.checked==='boolean')node.checked=field.checked;}};
    restoreControls();if(activePage==='board'){setBoardPositions();restoreControls();await loadBoard();}
    if(activePage==='trades')await updateTrades();
    if(activePage==='compare')loadCompareBody();
    if(activePage==='player')renderSimilar();
    [...document.querySelectorAll('#view details')].forEach((node,i)=>{node.open=!!saved.details?.[i];});
    if(typeof saved.focus==='string')el(saved.focus)?.focus({preventScroll:true});
    window.scrollTo(0,Number.isFinite(saved.scroll)?saved.scroll:0);
  }
};
const beforeUpdateData=renderData;
renderData=function(){beforeUpdateData();el('view').insertAdjacentHTML('beforeend','<section class="panel"><h3>Application updates</h3><p id="appVersionStatus" aria-live="polite">Checking application version...</p><button class="btn ghost" onclick="window.AppUpdates.check()">Check for app updates</button></section>');window.AppUpdates?.render();};
const beforeUpdateGo=go;
go=function(page){beforeUpdateGo(page);window.dispatchEvent(new Event('nba:view'));};
