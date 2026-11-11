/* Independent home dashboard and period-aware ranking extension. */
(function(){
  let selected='night',stopCarousel=()=>{};
  const labels={night:'Dernière soirée importée','7':'7 derniers jours','14':'14 derniers jours','30':'30 derniers jours'};
  const ranking=period=>window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring});
  const rangeLabel=r=>r.range.start?`${r.range.start}${r.range.start===r.range.end?'':` au ${r.range.end}`} · ${r.range.timeZone}`:'Aucune date de saison régulière terminée importée';
  const originalHome=renderHome;
  renderHome=function(){originalHome();el('view').querySelector('.hero').insertAdjacentHTML('afterend',`<section class="dashboard panel" aria-labelledby="dashboardTitle"><div class="section-title"><div><span class="eyebrow">LE RYTHME FANTASY</span><h2 id="dashboardTitle">Les performances à la une</h2></div><span class="badge">${esc(scoreLabel())}</span></div><p class="muted">Top 10 de l’échantillon importé · classement par moyenne fantasy, minimum 1 match complet.</p><div class="dashboard-periods" role="group" aria-label="Période des performances">${Object.entries(labels).map(([key,label])=>`<button type="button" class="btn ghost" data-period="${key}" aria-pressed="${selected===key}">${label}</button>`).join('')}</div><div id="dashboardBody"></div></section>`);document.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{selected=button.dataset.period;renderDashboard();});renderDashboard();};
  function renderDashboard(){
    stopCarousel();
    const result=ranking(selected),rows=result.rows.slice(0,10);
    document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.period===selected));
    el('dashboardBody').innerHTML=`<div class="dashboard-summary"><div><h3><button class="text-button" id="dashboardCategory">${esc(labels[selected])} →</button></h3><p class="small">${rangeLabel(result)}</p></div><button class="btn ghost" id="dashboardRankings">Voir ce classement →</button></div><p class="dashboard-warning">Échantillon partiel uniquement, pas un classement complet de la ligue. ${result.boxedGames} / ${result.importedGames} matchs terminés importés disposent de statistiques. ${window.CurrentLoad.state==='cached'?'Données en cache : actualisation échouée. ':''}Données au : ${esc(displayDate(currentData.updatedAt))}.</p>${rows.length?`<section id="dashboardCarousel" class="dashboard-carousel" role="region" aria-roledescription="carrousel" aria-label="Meilleures performances"><div class="dashboard-carousel-heading"><span class="eyebrow">À LA UNE</span><span id="dashboardSlideCount"></span></div><div class="dashboard-slide-window"><div id="dashboardSlide"></div></div><div class="dashboard-carousel-controls"><button type="button" class="btn ghost" id="dashboardPrevious" aria-label="Joueur précédent">←</button><button type="button" class="btn ghost" id="dashboardNext" aria-label="Joueur suivant">→</button></div></section><h3>Top complet : ${rows.length}</h3><div class="dashboard-table-wrap"><table class="dashboard-table"><caption class="small">${esc(labels[selected])} · échantillon importé · FP / match</caption><thead><tr><th scope="col">#</th><th scope="col">Joueur</th><th scope="col">Équipe</th><th scope="col">MJ</th><th scope="col">FP / match</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><th scope="row"><button class="dashboard-player" data-player="${esc(r.id)}">${esc(r.name)}</button>${r.identityPending?'<small class="muted">Lien avec l’historique NBA en attente</small>':''}</th><td>${esc(r.teams.join(' / '))}</td><td>${r.gp}</td><td class="fpts">${fmt(r.fptsPerGame)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Aucune performance complète sur cette période. Une donnée absente ne vaut pas zéro.</p>'}<p class="small muted">Matchs terminés de saison régulière uniquement. Les matchs non importés et les lignes absentes restent inconnus, sans être considérés comme des non-participations. La dernière soirée suit la date de New York ; les périodes de 7/14/30 jours incluent aujourd’hui en UTC.</p>`;
    if(rows.length)startCarousel(rows);
    el('dashboardRankings').onclick=()=>openDashboardRankings(selected);
    el('dashboardCategory').onclick=()=>openDashboardRankings(selected);
    el('dashboardBody').querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.player));
  }
  function startCarousel(rows){
    const root=el('dashboardCarousel'),slide=el('dashboardSlide');
    const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let index=0,paused=!!motion?.matches,hovered=false,focused=false,timer=null;
    const clear=()=>{if(timer!==null)window.clearTimeout(timer);timer=null;};
    const schedule=()=>{clear();if(!paused&&!hovered&&!focused&&rows.length>1&&window.setTimeout)timer=window.setTimeout(()=>{if(!root.isConnected){clear();return;}if(!document.hidden)show(index+1);else schedule();},8000);};
    function show(next){
      index=(next+rows.length)%rows.length;const r=rows[index];
      slide.innerHTML=`<div class="dashboard-spotlight"><span class="dashboard-spotlight-rank">#${index+1}</span><div class="dashboard-spotlight-info"><button class="text-button dashboard-spotlight-name" data-player="${esc(r.id)}">${esc(r.name)}</button><p>${esc(r.teams.join(' / '))} · ${r.gp} MJ · ${r.dnp} non joué(s) · ${r.missing} absent(s)</p>${r.identityPending?'<small>Lien avec l’historique NBA en attente</small>':''}</div><div class="dashboard-spotlight-score"><strong>${fmt(r.fptsPerGame)}</strong><span>MOYENNE FANTASY / MATCH</span><small>sur la période sélectionnée</small></div></div>${matchLine(r.latestMatch)}`;
      slide.querySelector('[data-player]').onclick=()=>openPlayer(String(r.id));
      el('dashboardSlideCount').textContent=`${index+1} / ${rows.length}`;

      schedule();
    }
    el('dashboardPrevious').onclick=()=>{show(index-1);};
    el('dashboardNext').onclick=()=>{show(index+1);};
    root.onmouseenter=()=>{hovered=true;clear();};root.onmouseleave=()=>{hovered=false;schedule();};
    // Suspend while reading/interacting; reduced-motion visitors navigate manually.
    root.onfocusin=()=>{focused=true;clear();};
    root.onfocusout=event=>{if(!root.contains?.(event?.relatedTarget)){focused=false;schedule();}};
    const reduced=()=>{paused=!!motion.matches;schedule();};
    motion?.addEventListener?.('change',reduced);
    stopCarousel=()=>{clear();motion?.removeEventListener?.('change',reduced);};
    show(0);
  }
  function matchLine(match){
    if(!match)return '<p class="muted">Aucune ligne de match complète disponible.</p>';
    const s=match.stats,minutes=Math.floor(match.seconds/60)+':'+String(match.seconds%60).padStart(2,'0');
    const cells=[['MIN ≈',minutes],['PTS',s.pts],['REB',s.reb],['PASSES',s.ast],['INT',s.stl],['CONTRES',s.blk],['BP',s.tov],['TIRS',s.fgm+'/'+s.fga],['3 PTS',s.fg3m+'/'+s.fg3a],['LF',s.ftm+'/'+s.fta],['FANTASY',fmt(match.fpts)]];
    return `<div class="dashboard-match"><h4>Dernier match disponible dans cette période</h4><p>${esc(match.date.slice(0,10))} (UTC) · ${match.home?'à domicile contre':'à l’extérieur contre'} ${esc(match.opponent)} · statistiques de ce match, pas une moyenne</p><dl class="dashboard-statline">${cells.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="small muted">Tirs et lancers : réussis / tentés. Minutes approximatives selon la source. Les matchs non importés ne sont pas inclus.</p></div>`;
  }
  const originalBoard=renderBoard,originalLoadBoard=loadBoard;
  renderBoard=function(){originalBoard();el('fSeason').closest('label').insertAdjacentHTML('afterend',`<label>Période actuelle<select id="fDashboardPeriod"><option value="season">Échantillon importé complet</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>`);el('fDashboardPeriod').onchange=()=>{el('fSeason').value=C.SEASON;setBoardPositions();loadBoard();};};
  loadBoard=async function(){
    const period=el('fDashboardPeriod')?.value;
    const periodActive=!!period&&period!=='season'&&el('fSeason').value===C.SEASON;
    const sort=el('fSort'),averageOption=sort.querySelector('option[value="season_fpts"]');
    if(averageOption)averageOption.textContent=periodActive?'Moyenne fantasy sur la période':'Moyenne fantasy sur la saison';
    // Historical average modes both map to per-game average in a single
    // current period. Keep the visible selection honest on every entry path,
    // including direct navigation, restored controls and subsequent sort edits.
    if(periodActive&&['weighted_avg','simple_avg'].includes(sort.value))sort.value='season_fpts';
    if(!periodActive)return originalLoadBoard();
    ++boardRequest; // Invalidate any older asynchronous historical response.
    const result=window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring,team:el('fTeam').value,position:el('fPos').value,minGames:Number(el('fGp').value),sort:el('fSort').value});
    el('boardNote').textContent=`${rangeLabel(result)}. Échantillon importé uniquement, pas un classement de toute la ligue. ${result.boxedGames} / ${result.importedGames} matchs terminés importés disposent de statistiques. Minimum 1 match complet. Postes selon l’éligibilité ESPN vérifiée uniquement.`;
    el('boardTable').innerHTML=result.rows.length?`<table><thead><tr><th>#</th><th>Joueur</th><th>Équipe</th><th>Poste</th><th>FP / match</th><th>MJ</th><th>Total fantasy</th></tr></thead><tbody>${result.rows.slice(0,150).map((r,i)=>`<tr><td>${i+1}</td><td><button class="text-button" data-player="${esc(r.id)}">${esc(r.name)}</button>${r.identityPending?'<small class="muted"> · Lien avec l’historique NBA en attente</small>':''}</td><td>${esc(r.teams.join('/'))}</td><td>${esc(r.positions.join('/')||'—')}</td><td class="fpts">${fmt(r.fptsPerGame)}</td><td>${r.gp}</td><td>${fmt(r.totalFpts)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Aucun échantillon complet pour cette période et ces filtres.</p>';
    el('boardTable').querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.player));
  };
  function openDashboardRankings(period){go('board');el('fSeason').value=C.SEASON;el('fSort').value='season_fpts';el('fDashboardPeriod').value=period;setBoardPositions();loadBoard();window.scrollTo(0,0);}
  const capture=window.FantasySession.capture,restore=window.FantasySession.restore;
  window.FantasySession.capture=()=>({...capture(),dashboardPeriod:selected});
  window.FantasySession.restore=async saved=>{if(Object.hasOwn(labels,saved?.dashboardPeriod))selected=saved.dashboardPeriod;return restore(saved);};
})();
