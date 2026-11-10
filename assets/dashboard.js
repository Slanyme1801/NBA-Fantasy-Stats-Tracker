/* Independent home dashboard and period-aware ranking extension. */
(function(){
  let selected='night';
  const labels={night:'Latest imported night','7':'Last 7 days','14':'Last 14 days','30':'Last 30 days'};
  const ranking=period=>window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring});
  const rangeLabel=r=>r.range.start?`${r.range.start}${r.range.start===r.range.end?'':` through ${r.range.end}`} · ${r.range.timeZone}`:'No completed regular-season date imported';
  const originalHome=renderHome;
  renderHome=function(){originalHome();el('view').querySelector('.hero').insertAdjacentHTML('afterend',`<section class="dashboard panel" aria-labelledby="dashboardTitle"><div class="section-title"><div><span class="eyebrow">THE FANTASY PULSE</span><h2 id="dashboardTitle">Standout performances</h2></div><span class="badge">${esc(scoreLabel())}</span></div><p class="muted">Top 10 in the imported sample · ranked by fantasy points per game, minimum 1 complete game.</p><div class="dashboard-periods" role="group" aria-label="Performance period">${Object.entries(labels).map(([key,label])=>`<button type="button" class="btn ghost" data-period="${key}" aria-pressed="${selected===key}">${label}</button>`).join('')}</div><div id="dashboardBody" aria-live="polite"></div></section>`);document.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{selected=button.dataset.period;renderDashboard();});renderDashboard();};
  function renderDashboard(){
    const result=ranking(selected),rows=result.rows.slice(0,10),max=Math.max(1,...rows.map(r=>Math.abs(r.fptsPerGame)));
    document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.period===selected));
    el('dashboardBody').innerHTML=`<div class="dashboard-summary"><div><h3><button class="text-button" id="dashboardCategory">${esc(labels[selected])} →</button></h3><p class="small">${rangeLabel(result)}</p></div><button class="btn ghost" id="dashboardRankings">View these rankings →</button></div><p class="dashboard-warning">Imported sample only, not a complete league ranking. ${result.boxedGames} / ${result.importedGames} imported finished games have box scores. ${window.CurrentLoad.state==='cached'?'Cached snapshot: refresh failed. ':''}Snapshot: ${esc(displayDate(currentData.updatedAt))}.</p>${rows.length?`<ol class="dashboard-leaders">${rows.map((r,i)=>`<li style="--order:${i};--score-width:${Math.abs(r.fptsPerGame)/max*100}%"><button class="dashboard-player" data-player="${r.id}"><span class="dashboard-rank">${i+1}</span><span class="dashboard-avatar" aria-hidden="true">${esc(r.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</span><span class="dashboard-name"><strong>${esc(r.name)}</strong><small>${esc(r.teams.join(' / '))} · ${r.gp} GP · ${r.dnp} DNP · ${r.missing} missing</small></span><span class="dashboard-score"><strong>${fmt(r.fptsPerGame)}</strong><small>FPTS/G</small></span></button></li>`).join('')}</ol>`:'<p class="empty">No complete player performances in this period. Missing imports are not zero performances.</p>'}<p class="small muted">Finished regular-season games only. Unimported games and absent player lines are unknown, not recorded DNP. The latest imported night uses New York dates; 7/14/30-day windows include today in UTC.</p>`;
    el('dashboardRankings').onclick=()=>openDashboardRankings(selected);
    el('dashboardCategory').onclick=()=>openDashboardRankings(selected);
    el('dashboardBody').querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openPlayer(Number(b.dataset.player)));
  }
  const originalBoard=renderBoard,originalLoadBoard=loadBoard;
  renderBoard=function(){originalBoard();el('fSeason').closest('label').insertAdjacentHTML('afterend',`<label>Current period<select id="fDashboardPeriod"><option value="season">Full imported sample</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>`);el('fDashboardPeriod').onchange=()=>{el('fSeason').value=C.SEASON;setBoardPositions();loadBoard();};};
  loadBoard=async function(){
    const period=el('fDashboardPeriod')?.value;
    if(!period||period==='season'||el('fSeason').value!==C.SEASON)return originalLoadBoard();
    ++boardRequest; // Invalidate any older asynchronous historical response.
    const result=window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring,team:el('fTeam').value,position:el('fPos').value,minGames:Number(el('fGp').value),sort:el('fSort').value});
    el('boardNote').textContent=`${rangeLabel(result)}. Imported sample only, not league-wide rankings. ${result.boxedGames} / ${result.importedGames} imported finished games have box scores. Minimum 1 complete game. Positions use verified ESPN eligibility only.`;
    el('boardTable').innerHTML=result.rows.length?`<table><thead><tr><th>#</th><th>Player</th><th>Team</th><th>Position</th><th>FPTS/G</th><th>GP</th><th>Total FPTS</th></tr></thead><tbody>${result.rows.slice(0,150).map((r,i)=>`<tr><td>${i+1}</td><td><button class="text-button" data-player="${r.id}">${esc(r.name)}</button></td><td>${esc(r.teams.join('/'))}</td><td>${esc(r.positions.join('/')||'—')}</td><td class="fpts">${fmt(r.fptsPerGame)}</td><td>${r.gp}</td><td>${fmt(r.totalFpts)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">No complete sample matches this period and these filters.</p>';
    el('boardTable').querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openPlayer(Number(b.dataset.player)));
  };
  function openDashboardRankings(period){go('board');el('fSeason').value=C.SEASON;el('fSort').value='season_fpts';el('fDashboardPeriod').value=period;setBoardPositions();loadBoard();window.scrollTo(0,0);}
  const capture=window.FantasySession.capture,restore=window.FantasySession.restore;
  window.FantasySession.capture=()=>({...capture(),dashboardPeriod:selected});
  window.FantasySession.restore=async saved=>{if(Object.hasOwn(labels,saved?.dashboardPeriod))selected=saved.dashboardPeriod;return restore(saved);};
})();
