/* Independent home dashboard and period-aware ranking extension. */
(function(){
  let selected='night',stopCarousel=()=>{};
  const labels={night:'Latest imported night','7':'Last 7 days','14':'Last 14 days','30':'Last 30 days'};
  const ranking=period=>window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring});
  const rangeLabel=r=>r.range.start?`${r.range.start}${r.range.start===r.range.end?'':` through ${r.range.end}`} · ${r.range.timeZone}`:'No completed regular-season date imported';
  const originalHome=renderHome;
  renderHome=function(){originalHome();el('view').querySelector('.hero').insertAdjacentHTML('afterend',`<section class="dashboard panel" aria-labelledby="dashboardTitle"><div class="section-title"><div><span class="eyebrow">THE FANTASY PULSE</span><h2 id="dashboardTitle">Standout performances</h2></div><span class="badge">${esc(scoreLabel())}</span></div><p class="muted">Top 10 in the imported sample · ranked by fantasy points per game, minimum 1 complete game.</p><div class="dashboard-periods" role="group" aria-label="Performance period">${Object.entries(labels).map(([key,label])=>`<button type="button" class="btn ghost" data-period="${key}" aria-pressed="${selected===key}">${label}</button>`).join('')}</div><div id="dashboardBody"></div></section>`);document.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{selected=button.dataset.period;renderDashboard();});renderDashboard();};
  function renderDashboard(){
    stopCarousel();
    const result=ranking(selected),rows=result.rows.slice(0,10);
    document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.period===selected));
    el('dashboardBody').innerHTML=`<div class="dashboard-summary"><div><h3><button class="text-button" id="dashboardCategory">${esc(labels[selected])} →</button></h3><p class="small">${rangeLabel(result)}</p></div><button class="btn ghost" id="dashboardRankings">View these rankings →</button></div><p class="dashboard-warning">Imported sample only, not a complete league ranking. ${result.boxedGames} / ${result.importedGames} imported finished games have box scores. ${window.CurrentLoad.state==='cached'?'Cached snapshot: refresh failed. ':''}Snapshot: ${esc(displayDate(currentData.updatedAt))}.</p>${rows.length?`<section id="dashboardCarousel" class="dashboard-carousel" role="region" aria-roledescription="carousel" aria-label="Top performances"><div class="dashboard-carousel-heading"><span class="eyebrow">IN THE SPOTLIGHT</span><span id="dashboardSlideCount"></span></div><div class="dashboard-slide-window"><div id="dashboardSlide"></div></div><div class="dashboard-carousel-controls"><button type="button" class="btn ghost" id="dashboardPrevious" aria-label="Previous player">←</button><button type="button" class="btn ghost" id="dashboardPause">Pause slideshow</button><button type="button" class="btn ghost" id="dashboardNext" aria-label="Next player">→</button></div></section><h3>Complete top ${rows.length}</h3><div class="dashboard-table-wrap"><table class="dashboard-table"><caption class="small">${esc(labels[selected])} · imported sample · FPTS/G</caption><thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">Team</th><th scope="col">GP</th><th scope="col">FPTS/G</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><th scope="row"><button class="dashboard-player" data-player="${esc(r.id)}">${esc(r.name)}</button>${r.identityPending?'<small class="muted">NBA history link pending</small>':''}</th><td>${esc(r.teams.join(' / '))}</td><td>${r.gp}</td><td class="fpts">${fmt(r.fptsPerGame)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">No complete player performances in this period. Missing imports are not zero performances.</p>'}<p class="small muted">Finished regular-season games only. Unimported games and absent player lines are unknown, not recorded DNP. The latest imported night uses New York dates; 7/14/30-day windows include today in UTC.</p>`;
    if(rows.length)startCarousel(rows);
    el('dashboardRankings').onclick=()=>openDashboardRankings(selected);
    el('dashboardCategory').onclick=()=>openDashboardRankings(selected);
    el('dashboardBody').querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.player));
  }
  function startCarousel(rows){
    const root=el('dashboardCarousel'),slide=el('dashboardSlide'),pause=el('dashboardPause');
    const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let index=0,paused=!!motion?.matches,hovered=false,timer=null;
    const clear=()=>{if(timer!==null)window.clearTimeout(timer);timer=null;};
    const schedule=()=>{clear();if(!paused&&!hovered&&rows.length>1&&window.setTimeout)timer=window.setTimeout(()=>{if(!root.isConnected){clear();return;}if(!document.hidden)show(index+1);else schedule();},5000);};
    function show(next){
      index=(next+rows.length)%rows.length;const r=rows[index];
      slide.innerHTML=`<div class="dashboard-spotlight"><span class="dashboard-spotlight-rank">#${index+1}</span><div class="dashboard-spotlight-info"><button class="text-button dashboard-spotlight-name" data-player="${esc(r.id)}">${esc(r.name)}</button><p>${esc(r.teams.join(' / '))} · ${r.gp} GP · ${r.dnp} DNP · ${r.missing} missing</p>${r.identityPending?'<small>NBA history link pending</small>':''}</div><div class="dashboard-spotlight-score"><strong>${fmt(r.fptsPerGame)}</strong><span>FPTS / GAME</span></div></div>`;
      slide.querySelector('[data-player]').onclick=()=>openPlayer(String(r.id));
      el('dashboardSlideCount').textContent=`${index+1} / ${rows.length}`;
      pause.textContent=paused?'Play slideshow':'Pause slideshow';pause.setAttribute('aria-pressed',String(paused));
      schedule();
    }
    pause.onclick=()=>{paused=!paused;show(index);};
    el('dashboardPrevious').onclick=()=>{paused=true;show(index-1);};
    el('dashboardNext').onclick=()=>{paused=true;show(index+1);};
    root.onmouseenter=()=>{hovered=true;clear();};root.onmouseleave=()=>{hovered=false;schedule();};
    // Keyboard interaction pauses until the visitor explicitly presses Play.
    root.onfocusin=event=>{if(event?.target===pause)return;paused=true;clear();pause.textContent='Play slideshow';pause.setAttribute('aria-pressed','true');};
    const reduced=()=>{if(motion.matches){paused=true;clear();pause.textContent='Play slideshow';pause.setAttribute('aria-pressed','true');}};
    motion?.addEventListener?.('change',reduced);
    stopCarousel=()=>{clear();motion?.removeEventListener?.('change',reduced);};
    show(0);
  }
  const originalBoard=renderBoard,originalLoadBoard=loadBoard;
  renderBoard=function(){originalBoard();el('fSeason').closest('label').insertAdjacentHTML('afterend',`<label>Current period<select id="fDashboardPeriod"><option value="season">Full imported sample</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>`);el('fDashboardPeriod').onchange=()=>{el('fSeason').value=C.SEASON;setBoardPositions();loadBoard();};};
  loadBoard=async function(){
    const period=el('fDashboardPeriod')?.value;
    const periodActive=!!period&&period!=='season'&&el('fSeason').value===C.SEASON;
    const sort=el('fSort'),averageOption=sort.querySelector('option[value="season_fpts"]');
    if(averageOption)averageOption.textContent=periodActive?'Selected period FPTS/G':'Selected season FPTS/G';
    // Historical average modes both map to per-game average in a single
    // current period. Keep the visible selection honest on every entry path,
    // including direct navigation, restored controls and subsequent sort edits.
    if(periodActive&&['weighted_avg','simple_avg'].includes(sort.value))sort.value='season_fpts';
    if(!periodActive)return originalLoadBoard();
    ++boardRequest; // Invalidate any older asynchronous historical response.
    const result=window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring,team:el('fTeam').value,position:el('fPos').value,minGames:Number(el('fGp').value),sort:el('fSort').value});
    el('boardNote').textContent=`${rangeLabel(result)}. Imported sample only, not league-wide rankings. ${result.boxedGames} / ${result.importedGames} imported finished games have box scores. Minimum 1 complete game. Positions use verified ESPN eligibility only.`;
    el('boardTable').innerHTML=result.rows.length?`<table><thead><tr><th>#</th><th>Player</th><th>Team</th><th>Position</th><th>FPTS/G</th><th>GP</th><th>Total FPTS</th></tr></thead><tbody>${result.rows.slice(0,150).map((r,i)=>`<tr><td>${i+1}</td><td><button class="text-button" data-player="${esc(r.id)}">${esc(r.name)}</button>${r.identityPending?'<small class="muted"> · NBA history link pending</small>':''}</td><td>${esc(r.teams.join('/'))}</td><td>${esc(r.positions.join('/')||'—')}</td><td class="fpts">${fmt(r.fptsPerGame)}</td><td>${r.gp}</td><td>${fmt(r.totalFpts)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">No complete sample matches this period and these filters.</p>';
    el('boardTable').querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.player));
  };
  function openDashboardRankings(period){go('board');el('fSeason').value=C.SEASON;el('fSort').value='season_fpts';el('fDashboardPeriod').value=period;setBoardPositions();loadBoard();window.scrollTo(0,0);}
  const capture=window.FantasySession.capture,restore=window.FantasySession.restore;
  window.FantasySession.capture=()=>({...capture(),dashboardPeriod:selected});
  window.FantasySession.restore=async saved=>{if(Object.hasOwn(labels,saved?.dashboardPeriod))selected=saved.dashboardPeriod;return restore(saved);};
})();
