/* Adds forme actuelle and trades to the original profiles and season charts. */
const C=window.FantasyCore, currentData=window.CurrentLoad.data;
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const sign=value=>value===null?'—':`${value>0?'+':''}${fmt(value,2)}`;
const displayDate=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toISOString().replace('T',' ').replace('.000Z',' UTC'):'Non renseigné';
const partialCoverage=d=>d.scope?.completeSeason===false||/highlightly/i.test(d.provider||'');
function refreshScheduleLabel(d){
  const schedule=d.refreshSchedule;
  return schedule?.configured===true&&schedule?.verified===true&&typeof schedule.description==='string'&&schedule.description.trim()?`Actualisation automatique des données : ${uiFr(schedule.description)}`:'Aucune actualisation automatique configurée.';
}
function coverageDetails(d){
  const partial=partialCoverage(d), intervals=Array.isArray(d.coverage)?d.coverage:[];
  const dates=[...new Set((intervals.length?intervals:[d.scope]).filter(Boolean).map(c=>c.startDate&&c.endDate?`${c.startDate} au ${c.endDate}`:null).filter(Boolean))];
  const fetched=intervals.flatMap(c=>Array.isArray(c.requests)?c.requests:[]).map(r=>r.fetchedAt).filter(t=>typeof t==='string'&&Number.isFinite(Date.parse(t))).sort((a,b)=>Date.parse(a)-Date.parse(b));
  const sourceDates=fetched.length?`${displayDate(fetched[0])}${Date.parse(fetched[0])!==Date.parse(fetched.at(-1))?` au ${displayDate(fetched.at(-1))}`:''}`:'Non renseigné';
  const playerCount=new Set(d.lines.map(r=>C.playerKeyFor(r))).size;
  const finished=d.games.filter(g=>g.status==='finished'),boxed=finished.filter(g=>g.statsState==='available').length;
  const unmapped=d.games.filter(g=>g.refreshIssue?.code==='unmapped-players'),preserved=unmapped.filter(g=>g.refreshIssue.preservedPreviousBoxScore).length;
  const gaps=unmapped.length?`<br>${unmapped.length} feuilles de match différées attendent leur import par identifiant fournisseur ; ${preserved} conservent une ancienne feuille vérifiée. La liaison NBA n’est pas nécessaire pour importer les statistiques.`:'';
  const pendingLinks=d.lines.filter(r=>C.playerKeyFor(r)?.startsWith('highlightly:')&&!Number.isSafeInteger(r.nbaId)).length;
  const links=pendingLinks?`<br>${pendingLinks} lignes de joueur attendent une liaison à l’historique NBA ; les statistiques disponibles sont incluses. Cela ne modifie pas la couverture des matchs.`:'';
  return `${partial?'Échantillon partiel : ni la saison ni toute la ligue ne sont couvertes. ':''}<strong>${boxed} sur ${finished.length} matchs terminés importés disposent d’une feuille de statistiques.</strong> ${d.games.length} matchs importés · ${playerCount} joueurs avec des statistiques importées · ${d.lines.length} lignes de statistiques individuelles. Dates des requêtes couvertes : ${esc(dates.join('; ')||'Non renseigné')} (${esc(d.scope?.timeZone||'fuseau horaire non renseigné')}).<br>Source récupérée : ${esc(sourceDates)}. Données normalisées : ${esc(displayDate(d.updatedAt))}.<br>${esc(refreshScheduleLabel(d))}${gaps}${links}${d.minutesPrecision==='rounded-whole-minute'?'<br>Les minutes sont approximatives (arrondi du fournisseur à la minute).':''}`;
}
const periodOptions=(historical=true)=>`<option value="season">2026–27 · ${partialCoverage(currentData)?'échantillon importé':'saison'}</option><option value="7">7 derniers jours calendaires</option><option value="14">14 derniers jours calendaires</option><option value="30">30 derniers jours calendaires</option>${historical?window.__DATASET.seasons.slice().reverse().map(s=>`<option value="${s}">${s} · historique</option>`).join(''):''}`;
const periodConfig=value=>({days:['7','14','30'].includes(value)?Number(value):null,weights:META.scoring});
const periodLabel=value=>{
  if(window.__DATASET.seasons.includes(value))return `${value} · historique`;
  const p=C.bounds(periodConfig(value).days);
  return `${p.start?`${p.start} au ${p.end}`:`2026–27 au ${p.end}`} · UTC`;
};
const scoreLabel=()=>uiFr(C.scoringName(META.scoring));
function statusPanel(compact=false){
  const load=window.CurrentLoad, d=load.data, unknown=d.games.filter(g=>g.type==='unknown').length;
  const title=d.connection==='not-connected'?'Saison 2026–27 non connectée':partialCoverage(d)?'Échantillon partiel 2026–27':`${d.lines.length} lignes de statistiques individuelles`;
  return `<section class="connection ${load.state==='cached'?'stale':''}" aria-label="État des données"><div><span class="eyebrow">DONNÉES 2026–27</span><h3>${title}</h3><p>${load.state==='cached'?'Dernières données vérifiées utilisées. Échec de l’actualisation ; les chiffres peuvent être anciens.':load.state==='unavailable'?'Impossible de charger les données actuelles. Les statistiques historiques restent disponibles.':d.connection==='not-connected'?'Données de la saison actuelle en attente. Les statistiques apparaîtront après un import vérifié de saison régulière.':'Calculé à partir des statistiques brutes importées.'}</p><p class="small">${coverageDetails(d)}<br>${unknown} matchs importés non classifiés exclus<br>Postes ESPN : ${d.positions.entries.length} joueurs vérifiés · import du ${displayDate(d.positions.importedAt)}</p></div>${compact?'':`<button class="btn ghost" onclick="go('data')">Données et barème</button>`}</section>`;
}
let activePage='home',routeGeneration=0;
const previousGo=go;
go=function(page){activePage=page;routeGeneration++;if(page==='trades')renderTrades();else previousGo(page);['home','board','compare','trades','data'].forEach(p=>el('tab-'+p).classList.toggle('active',p===page));};
const previousHome=renderHome;
renderHome=function(){previousHome();el('mainSearch').setAttribute('aria-label','Rechercher des joueurs NBA');const hero=el('view').querySelector('.hero');hero.insertAdjacentHTML('beforeend',`<div class="hero-actions"><button class="btn" onclick="go('trades')">Évaluer un échange</button><button class="btn ghost" onclick="go('board')">Explorer les classements</button></div>`);};
const previousFooter=metaFooter;
metaFooter=function(){return `<div class="scoring-badge">${scoreLabel()} · <button class="text-button" onclick="go('data')">Données et barème</button></div>`;};
const previousPlayer=renderPlayer;
openPlayer=async function(id){
  id=canonicalPlayerId(id);if(id===null)return;
  const generation=++routeGeneration;activePage='player';['home','board','compare','trades','data'].forEach(p=>el('tab-'+p).classList.remove('active'));el('view').innerHTML='<p role="status">Chargement du joueur…</p>';
  const player=await api(playerPath(id));if(generation!==routeGeneration)return;CURRENT=player;sortState={key:'season',dir:'asc'};renderPlayer();window.scrollTo(0,0);
};
renderPlayer=function(){
  previousPlayer();const head=el('view').querySelector('.player-head');head.insertAdjacentHTML('afterbegin',`<span class="avatar" aria-hidden="true">${esc(CURRENT.full_name.split(' ').map(s=>s[0]).slice(0,2).join(''))}</span>`);
  const p=CURRENT.eligibility;head.insertAdjacentHTML('afterend',`<div class="eligibility"><b>ESPN 2026–27:</b> ${p?esc(p.positions.join(' / ')):'Non importé'}</div><div id="currentProfile"></div>`);renderCurrentProfile();
};
function aggregateTable(a){
  const keys=['pts','fgm','fga','fg3m','fg3a','ftm','fta','reb','ast','stl','blk','tov'];
  return `<div class="scroll" tabindex="0" aria-label="Moyennes de l’échantillon importé et totaux bruts"><table><thead><tr><th>2026–27${partialCoverage(currentData)?' échantillon':''}</th>${keys.map(k=>`<th>${k.toUpperCase()}</th>`).join('')}<th>FPTS</th></tr></thead><tbody><tr><td>Moyenne / match</td>${keys.map(k=>`<td>${fmt(a.averages[k])}</td>`).join('')}<td class="fpts">${fmt(a.fptsPerGame)}</td></tr><tr><td>Totaux bruts · ${a.gp} GP</td>${keys.map(k=>`<td>${a.totals?fmt(a.totals[k],0):'—'}</td>`).join('')}<td>${fmt(a.totalFpts)}</td></tr></tbody></table></div><p class="small muted">FG ${fmt(a.percentages.fg)}% · 3PT ${fmt(a.percentages.three)}% · FT ${fmt(a.percentages.ft)}% · pourcentages calculés sur les tirs cumulés réussis/tentés ; — signifie indisponible ou aucune tentative.</p>`;
}
function recentGameChart(id){
  const all=window.FantasyDashboard.playerGameSeries(currentData,id,{weights:META.scoring});
  const points=all.slice(-20);
  if(!points.length)return '<section class="panel"><h3>Match après match</h3><p class="muted">Aucun match complet disponible pour tracer une courbe. Les données absentes ne valent pas zéro.</p></section>';
  const W=680,H=160,L=48,R=16,T=20,B=32;
  const graph=(key,label,color)=>{
    const values=points.map(p=>p[key]),min=Math.min(0,...values),max=Math.max(1,...values),span=max-min||1;
    const x=i=>L+(points.length===1?.5:i/(points.length-1))*(W-L-R),y=v=>T+(max-v)/span*(H-T-B);
    const ticks=[min,(min+max)/2,max].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" fill="var(--ink-dim)" font-size="11">${fmt(v,0)}</text>`).join('');
    const path=points.map((p,i)=>`${x(i)},${y(p[key])}`).join(' ');
    return `<div class="recent-game-plot"><h4>${label}</h4><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} pour les ${points.length} derniers matchs importés ; valeurs dans le tableau ci-dessous"><title>${label} par match importé</title>${ticks}${points.length>1?`<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${path}"/>`:''}${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p[key])}" r="4" fill="${color}"><title>${esc(p.date.slice(0,10))} contre ${esc(p.opponent)} : ${fmt(p[key])} ${label}</title></circle>`).join('')}<text x="${L}" y="${H-7}" fill="var(--ink-dim)" font-size="11">${points[0].date.slice(0,10)}</text><text x="${W-R}" y="${H-7}" text-anchor="end" fill="var(--ink-dim)" font-size="11">${points.at(-1).date.slice(0,10)}</text></svg></div>`;
  };
  return `<section class="panel recent-games"><h3>Match après match</h3><p class="small muted">${points.length} derniers matchs complets importés${all.length>20?' (sur '+all.length+')':''}. Points fantasy et minutes jouées.</p><div class="recent-game-plots">${graph('fpts','Points fantasy','#17408b')}${graph('minutes','Minutes jouées','#c8102e')}</div><details><summary>Valeurs de la courbe</summary><div class="scroll" tabindex="0" aria-label="Valeurs des derniers matchs"><table><thead><tr><th>Date UTC</th><th>Adversaire</th><th>Points fantasy</th><th>Minutes ≈</th></tr></thead><tbody>${points.map(p=>`<tr><td>${p.date.slice(0,10)}</td><td>${esc(p.opponent)}</td><td>${fmt(p.fpts)}</td><td>${fmt(p.minutes)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
}
function renderCurrentProfile(){
  const id=CURRENT.player_id,season=C.aggregate(currentData,id,{weights:META.scoring}),samples=[7,14,30].map(days=>C.aggregate(currentData,id,{days,weights:META.scoring}));
  const games=new Map(currentData.games.map(g=>[g.id,g])),lines=currentData.lines.filter(r=>window.PlayerIdentity.matches(r,id)).sort((a,b)=>games.get(b.gameId).start.localeCompare(games.get(a.gameId).start));
  el('currentProfile').innerHTML=`<section class="panel"><div class="section-title"><h3>2026–27 · forme actuelle</h3><span class="badge">${scoreLabel()}</span></div><p class="small muted">Saison 2026–27 · matchs disponibles</p>
    <div class="cards compact-cards">${[season,...samples].map((a,i)=>`<div class="card ${i===0?'hero-stat':''}"><div class="label">${i===0?(partialCoverage(currentData)?'Moyenne de l’échantillon':'Moyenne de saison'):`${a.period.days} jours calendaires`}</div><div class="value">${fmt(a.fptsPerGame)}</div><div class="small muted">${a.gp} matchs joués</div>${i?`<div class="small muted">${a.period.start} – ${a.period.end} UTC</div>`:''}</div>`).join('')}</div>
    ${!season.gp?`<p class="empty">${currentData.connection==='not-connected'?'Aucune donnée de match connectée.':'Aucune ligne de match complète et admissible pour ce joueur.'}</p>`:''}${aggregateTable(season)}
    <details><summary>Comparer la moyenne actuelle aux saisons historiques</summary><div class="scroll"><table class="compact-table"><thead><tr><th>Saison</th><th>Matchs historiques</th><th>FPTS/M historiques</th><th>Actuel moins historique</th></tr></thead><tbody>${CURRENT.seasons.filter(s=>s.season!==C.SEASON).map(s=>`<tr><td>${s.season}</td><td>${s.played?s.gp:'—'}</td><td>${s.played?fmt(s.fpts_per_game):'—'}</td><td>${s.played&&season.gp?sign(season.fptsPerGame-s.fpts_per_game):'—'}</td></tr>`).join('')}</tbody></table></div></details>
    <details><summary>Historique des matchs · ${lines.length} enregistrements</summary>${lines.length?`<div class="scroll"><table><thead><tr><th>Date UTC</th><th>Équipe / adversaire</th><th>Type / statut</th><th>Participation</th><th>MIN${currentData.minutesPrecision==='rounded-whole-minute'?' ≈':''}</th><th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>3PA</th><th>FGM</th><th>FGA</th><th>FTM</th><th>FTA</th><th>STL</th><th>BLK</th><th>TO</th><th>FPTS</th></tr></thead><tbody>${lines.map(r=>{const g=games.get(r.gameId),home=r.teamId===g.home.id;return `<tr><td>${g.start.slice(0,10)}</td><td>${esc(home?g.home.code:g.away.code)} ${home?'vs':'@'} ${esc(home?g.away.code:g.home.code)}</td><td>${esc(({regular:'Saison régulière',preseason:'Présaison',playoffs:'Séries éliminatoires',unknown:'Non classifié'})[g.type]||g.type)} / ${esc(({finished:'Terminé',scheduled:'Programmé',live:'En cours',postponed:'Reporté',cancelled:'Annulé'})[g.status]||g.status)}</td><td title="${esc(r.comment)}">${r.participation==='dnp'?'DNP':r.participation==='missing'?'Données manquantes':'A joué'}</td><td>${r.seconds===null?'—':`${currentData.minutesPrecision==='rounded-whole-minute'?'≈ ':''}${fmt(r.seconds/60)}`}</td><td>${fmt(r.stats?.pts,0)}</td><td>${fmt(r.stats?.reb,0)}</td><td>${fmt(r.stats?.ast,0)}</td>${["fg3m","fg3a","fgm","fga","ftm","fta","stl","blk","tov"].map(k=>`<td>${fmt(r.stats?.[k],0)}</td>`).join("")}<td class="fpts">${fmt(C.fantasyPoints(r.stats,META.scoring))}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="muted">Aucun match importé. Cela ne permet pas de savoir si un match était prévu pour ce joueur.</p>'}</details></section>
    ${recentGameChart(id)}<section class="panel"><h3>Trouver des joueurs similaires</h3><div class="filters"><label>Période<select id="similarPeriod">${periodOptions(false)}</select></label><label>Comparer selon<select id="similarMode"><option value="both">Poste ESPN et moyenne proche</option><option value="positions">Poste ESPN compatible</option><option value="fpts">Moyenne fantasy proche</option></select></label><label>Écart maximal de moyenne<input id="similarTolerance" type="number" min="0" value="5" step="0.5"></label><label>Matchs complets minimum<input id="similarMin" type="number" min="1" value="3"></label></div><div id="similarResults"></div></section>`;
  ['similarPeriod','similarMode','similarTolerance','similarMin'].forEach(id=>el(id).onchange=renderSimilar);renderSimilar();
}
function renderSimilar(){
  try{const period=el('similarPeriod').value,result=C.similarPlayers(currentData,CURRENT.player_id,{...periodConfig(period),mode:el('similarMode').value,tolerance:Number(el('similarTolerance').value),minGames:Number(el('similarMin').value)});
    el('similarResults').innerHTML=`<p class="small muted">${periodLabel(period)} · ${scoreLabel()} · référence : ${result.base.gp} GP, ${fmt(result.base.fptsPerGame)} Moy.</p>${result.results.length?`<div class="similar-grid">${result.results.map(p=>`<button class="similar-player" onclick="openPlayer(${playerArg(C.playerIdFor(p))})"><b>${esc(p.name)}</b><span>${p.eligibility?esc(p.eligibility.positions.join('/')):'ESPN non importé'}</span><strong>${fmt(p.stats.fptsPerGame)} Moy. <small>· ${p.stats.gp} GP</small></strong><span>Écart ${fmt(p.gap)} · ${p.stats.dnp} DNP · ${p.stats.missing} manquants</span></button>`).join('')}</div>`:`<p class="empty">${esc(uiFr(result.reason))}</p>`}`;
  }catch(error){el('similarResults').textContent=uiFr(error.message);}
}
const tradeState={left:[],right:[],period:'2025-26',replacement:28.5};let tradeRequest=0;
function renderTrades(){
  el('view').innerHTML=`<div class="page-heading"><span class="eyebrow">SIMULATEUR D’ÉCHANGES</span><h1>Comparez l’échange dans son ensemble.</h1><p class="muted">Composez les deux côtés, puis tenez compte de chaque place dans l’effectif.</p></div><div class="panel"><div class="filters"><label>Période commune<select id="tradePeriod">${periodOptions()}</select></label><label>Moyenne hypothétique d’un joueur libre<input id="replacementAvg" type="number" min="0" step="0.5" value="${tradeState.replacement}"></label><span class="badge">${scoreLabel()}</span></div><p class="small muted" id="tradePeriodNote"></p></div>
    <div class="trade-grid">${['left','right'].map((side,i)=>`<section class="panel trade-side"><div class="section-title"><h2>Côté ${i?'B':'A'}</h2><span class="small muted">Jusqu’à 5 joueurs</span></div><div class="searchbox"><input id="tradeSearch-${side}" aria-label="Ajouter un joueur au côté ${i?'B':'A'}" placeholder="Rechercher un joueur…" autocomplete="off"><div class="results" id="tradeResults-${side}" hidden></div></div><div id="tradePlayers-${side}" class="trade-players"></div></section>`).join('')}</div><div id="tradeSummary" aria-live="polite"></div>`;
  el('tradePeriod').value=tradeState.period;['left','right'].forEach(side=>wireSearch(el('tradeSearch-'+side),el('tradeResults-'+side),p=>addTrade(side,p.player_id)));
  el('tradePeriod').onchange=()=>{tradeState.period=el('tradePeriod').value;updateTrades();};el('replacementAvg').oninput=()=>{tradeState.replacement=el('replacementAvg').value===''?NaN:Number(el('replacementAvg').value);updateTrades();};updateTrades();
}
function addTrade(side,id){id=canonicalPlayerId(id);if(id===null||!['left','right'].includes(side))return;if(tradeState[side].length>=5||[...tradeState.left,...tradeState.right].includes(id))return;tradeState[side].push(id);updateTrades();}
function removeTrade(side,id){id=canonicalPlayerId(id);if(!['left','right'].includes(side))return;tradeState[side]=tradeState[side].filter(x=>x!==id);updateTrades();}
function metric(player,period){if(window.__DATASET.seasons.includes(period)){const row=player.seasons.find(s=>s.season===period);return {avg:row?.played?row.fpts_per_game:null,gp:row?.gp||0,extra:'moyenne historique'};}const a=C.aggregate(currentData,player.player_id,periodConfig(period));return {avg:a.fptsPerGame,gp:a.gp,extra:`${a.dnp} DNP · ${a.missing} manquants`};}
async function updateTrades(){
  const request=++tradeRequest,profiles=await Promise.all([...tradeState.left,...tradeState.right].map(id=>api(playerPath(id))));if(request!==tradeRequest||activePage!=='trades')return;
  const players=new Map(profiles.map(p=>[p.player_id,p])),values={left:[],right:[]},slots=Math.max(tradeState.left.length,tradeState.right.length);el('tradePeriodNote').textContent=periodLabel(tradeState.period);
  for(const side of ['left','right'])el('tradePlayers-'+side).innerHTML=tradeState[side].map(id=>{const p=players.get(id),m=metric(p,tradeState.period);values[side].push(m.avg);return `<article class="trade-player"><div><button class="text-button" onclick="openPlayer(${playerArg(id)})">${esc(p.full_name)}</button><span class="small muted">${m.gp} GP · ${m.extra}</span></div><strong>${m.avg===null?'—':fmt(m.avg)} <small>Moy.</small></strong><button class="remove" aria-label="Retirer ${esc(p.full_name)} du côté ${side==='left'?'A':'B'}" onclick="removeTrade('${side}',${playerArg(id)})">×</button></article>`;}).join('')+(tradeState[side].length?'':'<p class="muted">Ajoutez des joueurs de ce côté.</p>')+(tradeState.left.length&&tradeState.right.length?Array.from({length:slots-tradeState[side].length},()=>`<article class="trade-player replacement"><div><b>Joueur libre hypothétique</b><span class="small muted">Une place dans l’effectif · hypothèse</span></div><strong>${fmt(tradeState.replacement)} <small>Moy.</small></strong></article>`).join(''):'');
  try{const result=C.tradeValue(values.left,values.right,tradeState.replacement);el('tradeSummary').innerHTML=result?`<section class="panel trade-result"><span class="eyebrow">${result.slots} PLACES ÉQUIVALENTES DANS L’EFFECTIF · ${scoreLabel()}</span><div class="trade-grid">${[['A',result.left],['B',result.right]].map(([name,s])=>`<div><h3>Côté ${name}</h3><div class="result-number">${fmt(s.sum,2)}</div><p>Somme des moyennes · ${s.players} joueur${s.players===1?'':'s'}${s.added?` + ${s.added} remplaçant hypothétique`:''}</p><b>${fmt(s.average,2)} moyenne par place</b></div>`).join('')}</div><div class="trade-difference">B − A: <b>${sign(result.sumDifference)}</b> somme des moyennes <span>· <b>${sign(result.averageDifference)}</b> par place</span></div></section>`:`<div class="empty">${!values.left.length||!values.right.length?'Ajoutez au moins un joueur de chaque côté pour comparer.':'Un joueur sélectionné n’a aucun échantillon complet sur cette période. L’échange ne peut pas être calculé ; indisponible ne signifie pas zéro.'}</div>`;}catch(error){el('tradeSummary').innerHTML=`<p class="empty warn">${esc(uiFr(error.message))}</p>`;}
}
const previousData=renderData;
renderData=function(){previousData();el('view').querySelector('h2').insertAdjacentHTML('afterend',statusPanel(true));el('view').insertAdjacentHTML('beforeend',`<section class="panel"><h3>État de l’import 2026–27</h3><p>Le navigateur n’envoie aucune requête à Highlightly, API-NBA, ESPN ou NBA.com. Les clés API sont réservées au collecteur local séparé.</p><p class="muted">Des données vérifiées et un import distinct des éligibilités ESPN sont nécessaires. ${esc(refreshScheduleLabel(currentData))} Les types de matchs doivent être vérifiés ; les matchs non classifiés sont exclus. Les ${currentData.lines.length} lignes actuelles de joueurs ont passé la validation du schéma.</p><p class="small muted">Les avertissements de validation ci-dessus sont conservés depuis les archives originales et concernent les moyennes arrondies.</p></section>`);};
const previousSave=saveScoring,previousReset=resetScoring;
saveScoring=async function(){try{await previousSave();}catch(error){let message=el('scoringError');if(!message){message=document.createElement('p');message.id='scoringError';message.className='warn';el('view').append(message);}message.textContent=uiFr(error.message);}};
resetScoring=async function(){await previousReset();comparePlayers={};for(const id of compareIds)comparePlayers[id]=await api(playerPath(id));};
const renderDataWithStatus=renderData;
renderData=function(){renderDataWithStatus();
 const periods=['night','available','7','14','30'].map(period=>{const r=window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring});const label={night:'Dernière soirée importée',available:'Dernière soirée disponible','7':'7 jours','14':'14 jours','30':'30 jours'}[period];return `<tr><td>${label}</td><td>${r.range.start||'—'} au ${r.range.end||'—'}</td><td>${r.boxedGames} / ${r.importedGames}</td></tr>`;}).join('');
 el('view').insertAdjacentHTML('beforeend',`<section class="panel"><h3>Lecture des chiffres</h3><p>Les classements et moyennes reposent sur l’échantillon disponible, pas nécessairement toute la ligue ou la saison. Seuls les matchs terminés de saison régulière sont retenus. Les lignes absentes restent inconnues, jamais assimilées à zéro ni à une non-participation (DNP). Les DNP et les lignes manquantes sont exclus des moyennes.</p><p>Les totaux historiques marqués ≈ sont reconstitués à partir de moyennes arrondies. Les minutes actuelles sont approximatives lorsque le fournisseur les arrondit à la minute. Tirs et lancers sont présentés sous la forme réussis / tentés ; les pourcentages utilisent les tirs cumulés.</p><p>Les périodes de 7/14/30 jours incluent aujourd’hui en UTC. Les soirées du dashboard suivent les dates de New York. La statline affichée est celle du dernier match disponible de la période, distincte de la moyenne sur cette période. Les courbes montrent les 20 derniers matchs joués disponibles, avec deux échelles séparées ; elles ne sont pas des projections.</p><p>Les éligibilités ESPN proviennent uniquement d’entrées vérifiées. Les postes historiques NBA G/F/C ne les remplacent pas. Un lien NBA manquant n’empêche pas d’utiliser les statistiques du fournisseur.</p><p>Les remplaçants du simulateur d’échanges sont hypothétiques, pas une liste de joueurs libres en temps réel. Les résultats comparent les sommes de moyennes à nombre égal de places ; ils ne prédisent pas la variation exacte d’une moyenne d’équipe pondérée par les matchs joués.</p><div class="scroll"><table><thead><tr><th>Période</th><th>Dates</th><th>Feuilles disponibles / matchs importés</th></tr></thead><tbody>${periods}</tbody></table></div>${previousFooter()}</section><section class="panel"><h3>Sources des postes ESPN</h3>${currentData.positions.entries.length?`<div class="scroll"><table><thead><tr><th>Identifiant NBA</th><th>Postes</th><th>Source</th><th>Observation</th></tr></thead><tbody>${currentData.positions.entries.map(p=>`<tr><td>${p.nbaId}</td><td>${esc(p.positions.join('/'))}</td><td>${esc(p.source)}</td><td>${displayDate(p.observedAt)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Aucun poste ESPN vérifié importé.</p>'}</section>`);
};
const previousCompare=renderCompare;
renderCompare=function(){previousCompare();el('compareSearch').setAttribute('aria-label','Ajouter un joueur à la comparaison');el('view').querySelector('h2').insertAdjacentHTML('afterend',`<p class="badge">${scoreLabel()}</p>`);};
const labeledData=renderData;
renderData=function(){labeledData();el('view').querySelector('h2').insertAdjacentHTML('afterend',`<p class="badge">${scoreLabel()}</p><p class="small muted" id="pwaStatus">${esc(window.PWA_STATUS||'Cache hors ligne non pris en charge')}</p>`);};
window.addEventListener('pwa-status',()=>{if(el('pwaStatus'))el('pwaStatus').textContent=window.PWA_STATUS;});
renderBoard=function(){
  el('view').innerHTML=`<h2>Classements fantasy</h2><p class="small muted">Filtrez les joueurs par saison, équipe et poste.</p><div class="panel"><div class="filters"><label>Saison<select id="fSeason"><option value="">5 saisons historiques</option>${SEASONS.map(s=>`<option>${s}</option>`).join('')}</select></label><label>Trier par<select id="fSort"><option value="weighted_avg">FPTS/M pondérés</option><option value="simple_avg">Moyenne simple de saison</option><option value="season_fpts">FPTS/M de la saison sélectionnée</option><option value="total_fpts">Total des points fantasy</option><option value="gp">Matchs joués</option><option value="name">Nom du joueur</option></select></label><label>Équipe<select id="fTeam"><option value="">Toutes les équipes</option>${META.teams.map(t=>`<option>${t}</option>`).join('')}</select></label><label>Poste<select id="fPos"></select></label><label>Matchs min.<input id="fGp" type="number" min="0" value="0"></label><button class="btn" onclick="loadBoard()">Appliquer les filtres</button></div><p class="small muted" id="boardNote"></p><div class="scroll" id="boardTable"></div></div>`;
  el('fSeason').onchange=()=>{setBoardPositions();loadBoard();};['fSort','fTeam','fPos','fGp'].forEach(id=>el(id).onchange=loadBoard);setBoardPositions();loadBoard();
  el('view').querySelector('h2').insertAdjacentHTML('afterend',`<p class="badge">${scoreLabel()}</p>`);
};
function setBoardPositions(){const current=el('fSeason').value===C.SEASON;el('fPos').innerHTML='<option value="">Tous les postes</option>'+(current?C.POSITIONS:META.positions).map(p=>`<option>${esc(p)}</option>`).join('');el('boardNote').textContent=current?'Postes ESPN disponibles':'Postes historiques NBA';}
let boardRequest=0;
loadBoard=async function(){
  const request=++boardRequest,season=el('fSeason').value,q=new URLSearchParams({season,sort:el('fSort').value,team:el('fTeam').value,position:el('fPos').value,min_gp:el('fGp').value,limit:2000});
  let {results}=await api('/api/leaderboard?'+q);if(request!==boardRequest||activePage!=='board')return;
  if(season&&season!==C.SEASON){const sort=q.get('sort'),field=sort==='gp'?'season_gp':sort==='total_fpts'?'total_fpts':'season_fpts';results.sort((a,b)=>sort==='name'?a.full_name.localeCompare(b.full_name):b[field]-a[field]);}
  results=results.slice(0,150).map((r,i)=>({...r,rank:i+1}));
  el('boardTable').innerHTML=results.length?`<table><thead><tr><th>#</th><th>Joueur</th><th>Équipe</th><th>Poste</th><th>FPTS/G</th><th>GP</th><th>Total FPTS${season===C.SEASON?'':' ≈'}</th></tr></thead><tbody>${results.map(r=>`<tr><td>${r.rank}</td><td><button class="text-button" onclick="openPlayer(${playerArg(r.player_id)})">${esc(r.full_name)}</button></td><td>${esc(r.team)}</td><td>${esc(r.position||'—')}</td><td class="fpts">${fmt(season?r.season_fpts:q.get('sort')==='simple_avg'?r.simple_avg:r.weighted_avg)}</td><td>${season?r.season_gp:r.total_gp}</td><td>${fmt(r.total_fpts,0)}</td></tr>`).join('')}</tbody></table>`:`<p class="empty">${season===C.SEASON&&currentData.connection==='not-connected'?'Saison 2026–27 non connectée. Aucun classement de la saison actuelle disponible.':'Aucun échantillon complet ne correspond à ces filtres.'}</p>`;
};
function networkNotice(){let node=el('networkNotice');if(!node){node=document.createElement('div');node.id='networkNotice';node.setAttribute('role','status');document.body.prepend(node);}node.hidden=navigator.onLine&&window.CurrentLoad.state==='fresh';node.textContent=!navigator.onLine?'Hors ligne · affichage des données déjà enregistrées sur cet appareil. Vérifiez leur date de collecte.':window.CurrentLoad.state==='cached'?'Dernières données vérifiées · échec de l’actualisation. Vérifiez la date de collecte avant d’utiliser la forme actuelle.':'Impossible de charger la saison actuelle. Les statistiques historiques restent disponibles.';}
window.addEventListener('online',networkNotice);window.addEventListener('offline',networkNotice);networkNotice();
// A one-use, tab-local snapshot protects the current view during an app update.
// Saved scoring continues to use its original localStorage key.
window.FantasySession={
  capture(){return {page:activePage,playerId:CURRENT?.player_id,
    trade:{...tradeState,left:[...tradeState.left],right:[...tradeState.right]},compare:[...compareIds],
    controls:[...document.querySelectorAll('#view input[id],#view select[id],#view textarea[id],#navSearch')].filter(e=>!['password','file'].includes(e.type)).map(e=>({id:e.id,value:e.value,checked:e.checked})),
    details:[...document.querySelectorAll('#view details')].map(e=>e.open),focus:document.activeElement?.id,scroll:window.scrollY};},
  async restore(saved){
    if(!saved||typeof saved!=='object')throw new Error('État de vue sauvegardé invalide');
    const valid=new Set([...window.__DATASET.players.map(p=>p[0]),...currentData.players.map(p=>C.playerIdFor(p))]);
    const ids=(list,max)=>[...new Set((Array.isArray(list)?list:[]).map(canonicalPlayerId))].filter(id=>valid.has(id)).slice(0,max);
    compareIds=ids(saved.compare,4);comparePlayers={};
    for(const id of compareIds)comparePlayers[id]=await api(playerPath(id));
    if(saved.trade){tradeState.left=ids(saved.trade.left,5);tradeState.right=ids(saved.trade.right,5).filter(id=>!tradeState.left.includes(id));
      if(['season','7','14','30',...window.__DATASET.seasons].includes(saved.trade.period))tradeState.period=saved.trade.period;
      tradeState.replacement=Number.isFinite(saved.trade.replacement)?saved.trade.replacement:NaN;}
    if(saved.page==='player'&&valid.has(canonicalPlayerId(saved.playerId)))await openPlayer(saved.playerId);
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
renderData=function(){beforeUpdateData();el('view').insertAdjacentHTML('beforeend','<section class="panel"><h3>Mises à jour de l’application</h3><p id="appVersionStatus" aria-live="polite">Vérification de la version de l’application…</p><button class="btn ghost" onclick="window.AppUpdates.check()">Rechercher des mises à jour</button></section>');window.AppUpdates?.render();};
const beforeUpdateGo=go;
go=function(page){beforeUpdateGo(page);window.dispatchEvent(new Event('nba:view'));};
