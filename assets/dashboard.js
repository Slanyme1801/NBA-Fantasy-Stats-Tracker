/* Independent home dashboard and period-aware ranking extension. */
(function(){
  let selected='available',stopCarousel=()=>{};
  const labels={available:'Dernière soirée disponible','7':'7 derniers jours','14':'14 derniers jours','30':'30 derniers jours'};
  const periods=['available','7','14','30'];
  const ranking=period=>window.FantasyDashboard.dashboardRanking(currentData,{period,weights:META.scoring});
  const rangeLabel=r=>r.range.start?`${r.range.start}${r.range.start===r.range.end?'':` au ${r.range.end}`} · ${r.range.timeZone}`:'Aucune soirée disponible';
  const originalHome=renderHome;
  renderHome=function(){originalHome();el('view').querySelector('.hero').insertAdjacentHTML('afterend',`<section class="dashboard panel" aria-labelledby="dashboardTitle"><div class="section-title"><div><span class="eyebrow">LE RYTHME FANTASY</span><h2 id="dashboardTitle">Les performances à la une</h2></div><span class="badge">${esc(scoreLabel())}</span></div><p class="muted">Top 10 disponible · moyenne fantasy par match.</p><div class="dashboard-periods" role="group" aria-label="Période des performances">${periods.map(key=>[key,labels[key]]).map(([key,label])=>`<button type="button" class="btn ghost" data-period="${key}" aria-pressed="${selected===key}">${label}</button>`).join('')}</div><div id="dashboardBody"></div></section>`);document.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{selected=button.dataset.period;renderDashboard();});renderDashboard();};
  function renderDashboard(){
    stopCarousel();
    const result=ranking(selected),rows=result.rows.slice(0,10);
    document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.period===selected));
    el('dashboardBody').innerHTML=`<div class="dashboard-summary"><div><h3><button class="text-button" id="dashboardCategory">${esc(labels[selected])} →</button></h3><p class="small">${rangeLabel(result)}</p></div><button class="btn ghost" id="dashboardRankings">Voir ce classement →</button></div>${rows.length?`<section id="dashboardCarousel" class="dashboard-carousel" role="region" aria-roledescription="carrousel" aria-label="Meilleures performances"><div class="dashboard-carousel-heading"><span class="eyebrow">À LA UNE</span><span id="dashboardSlideCount"></span></div><div class="dashboard-slide-window"><div id="dashboardSlide"></div></div><div class="dashboard-carousel-controls"><button type="button" class="btn ghost" id="dashboardPrevious" aria-label="Joueur précédent">←</button><button type="button" class="btn ghost" id="dashboardNext" aria-label="Joueur suivant">→</button></div></section><h3 id="dashboardComplete">Top complet : ${rows.length}</h3><div class="dashboard-table-wrap"><table class="dashboard-table"><caption class="small">${esc(labels[selected])} · échantillon importé · FP / match</caption><thead><tr><th scope="col">#</th><th scope="col">Joueur</th><th scope="col">Équipe</th><th scope="col">MJ</th><th scope="col">FP / match</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><th scope="row"><button class="dashboard-player" data-player="${esc(r.id)}">${esc(r.name)}</button>${r.identityPending?'<small class="muted">Lien avec l’historique NBA en attente</small>':''}</th><td>${esc(r.teams.join(' / '))}</td><td>${r.gp}</td><td class="fpts">${fmt(r.fptsPerGame)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Aucune performance disponible sur cette période.</p>'}`;
    if(rows.length)startCarousel(rows);
    el('dashboardRankings').onclick=()=>openDashboardRankings(selected);
    el('dashboardCategory').onclick=()=>openDashboardRankings(selected);
    el('dashboardBody').querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.player));
  }
  function startCarousel(rows){
    const root=el('dashboardCarousel'),slide=el('dashboardSlide');
    const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let index=0,paused=!!motion?.matches,hovered=false,focused=false,touching=false,timer=null;
    const clear=()=>{if(timer!==null)window.clearTimeout(timer);timer=null;};
    const schedule=()=>{clear();if(!paused&&!hovered&&!focused&&!touching&&rows.length>1&&window.setTimeout)timer=window.setTimeout(()=>{if(!root.isConnected){clear();return;}if(!document.hidden)show(index+1);else schedule();},8000);};
    function show(next){
      index=(next+rows.length)%rows.length;const r=rows[index];
      slide.innerHTML=`<div class="dashboard-spotlight"><span class="dashboard-spotlight-rank">#${index+1}</span><div class="spotlight-portrait">${window.PlayerPhotos?.portrait(r.id,{className:'spotlight-photo'})||''}</div><div class="dashboard-spotlight-info"><button class="text-button dashboard-spotlight-name" data-player="${esc(r.id)}">${esc(r.name)}</button><p>${esc(r.teams.join(' / '))} · ${r.gp} MJ</p>${r.identityPending?'<small>Lien avec l’historique NBA en attente</small>':''}</div><div class="dashboard-spotlight-score"><strong>${fmt(r.fptsPerGame)}</strong><span>MOYENNE FANTASY / MATCH</span><small>sur la période sélectionnée</small></div></div><div class="dashboard-quick-actions"><button class="btn ghost" id="dashboardCompare">Comparer ce joueur</button><a href="#dashboardComplete" class="btn ghost">Voir le top complet ↓</a></div>${matchLine(r.latestMatch)}`;
      slide.querySelector('[data-player]').onclick=()=>openPlayer(String(r.id));
      el('dashboardCompare').onclick=()=>{go('compare');addComparePlayer(r.id);window.scrollTo(0,0);};
      el('dashboardSlideCount').textContent=`${index+1} / ${rows.length}`;

      schedule();
    }
    el('dashboardPrevious').onclick=()=>{show(index-1);};
    el('dashboardNext').onclick=()=>{show(index+1);};
    let gesture=null,suppressClickUntil=0;
    root.ontouchstart=event=>{
      if(event.touches.length!==1){gesture=null;touching=false;schedule();return;}
      const t=event.touches[0];gesture={x:t.clientX,y:t.clientY,at:Date.now(),vertical:false};touching=true;clear();
    };
    root.ontouchmove=event=>{
      if(!gesture)return;
      if(event.touches.length!==1){gesture=null;return;}
      const t=event.touches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx))gesture.vertical=true;
    };
    root.ontouchend=event=>{
      const g=gesture,t=event.changedTouches?.[0];gesture=null;touching=false;
      if(g&&t&&!g.vertical&&event.touches.length===0&&Date.now()-g.at<1200){
        const dx=t.clientX-g.x,dy=t.clientY-g.y;
        if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.5){suppressClickUntil=Date.now()+500;show(index+(dx<0?1:-1));return;}
      }
      schedule();
    };
    root.ontouchcancel=()=>{gesture=null;touching=false;schedule();};
    const suppressSwipeClick=event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}};
    root.addEventListener?.('click',suppressSwipeClick,true);
    root.onmouseenter=()=>{hovered=true;clear();};root.onmouseleave=()=>{hovered=false;schedule();};
    // Suspend while reading/interacting; reduced-motion visitors navigate manually.
    root.onfocusin=()=>{focused=true;clear();};
    root.onfocusout=event=>{if(!root.contains?.(event?.relatedTarget)){focused=false;schedule();}};
    const reduced=()=>{paused=!!motion.matches;schedule();};
    motion?.addEventListener?.('change',reduced);
    stopCarousel=()=>{clear();root.removeEventListener?.('click',suppressSwipeClick,true);motion?.removeEventListener?.('change',reduced);};
    show(0);
  }
  function matchLine(match){
    if(!match)return '<p class="muted">Aucune ligne de match complète disponible.</p>';
    const s=match.stats,minutes=Math.floor(match.seconds/60)+':'+String(match.seconds%60).padStart(2,'0');
    const cells=[['MIN ≈',minutes],['PTS',s.pts],['REB',s.reb],['PASSES',s.ast],['INT',s.stl],['CONTRES',s.blk],['BP',s.tov],['TIRS',s.fgm+'/'+s.fga],['3 PTS',s.fg3m+'/'+s.fg3a],['LF',s.ftm+'/'+s.fta],['FANTASY',fmt(match.fpts)]];
    return `<div class="dashboard-match"><h4>Dernier match disponible dans cette période</h4><p>${esc(match.date.slice(0,10))} (UTC) · ${match.home?'à domicile contre':'à l’extérieur contre'} ${esc(match.opponent)} · statistiques de ce match, pas une moyenne</p><dl class="dashboard-statline">${cells.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></div>`;
  }
  const originalBoard=renderBoard,originalLoadBoard=loadBoard;
  renderBoard=function(){originalBoard();el('fSeason').closest('label').insertAdjacentHTML('afterend',`<label>Période actuelle<select id="fDashboardPeriod"><option value="season">Échantillon importé complet</option>${periods.map(key=>[key,labels[key]]).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>`);el('fDashboardPeriod').onchange=()=>{el('fSeason').value=C.SEASON;setBoardPositions();loadBoard();};};
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
    el('boardNote').textContent=`${rangeLabel(result)} · résultats disponibles`;
    renderBoardRows(result.rows.map((r,i)=>({rank:i+1,id:r.id,name:r.name,team:r.teams.join('/'),position:r.positions.join('/'),average:r.fptsPerGame,gp:r.gp,total:r.totalFpts,identityPending:r.identityPending})),'Aucun échantillon complet pour cette période et ces filtres.');
  };
  function openDashboardRankings(period){go('board');el('fSeason').value=C.SEASON;el('fSort').value='season_fpts';el('fDashboardPeriod').value=period;setBoardPositions();loadBoard();window.scrollTo(0,0);}
  const capture=window.FantasySession.capture,restore=window.FantasySession.restore;
  window.FantasySession.capture=()=>({...capture(),dashboardPeriod:selected});
  window.FantasySession.restore=async saved=>{if(saved?.dashboardPeriod==='night')selected='available';else if(Object.hasOwn(labels,saved?.dashboardPeriod))selected=saved.dashboardPeriod;return restore(saved);};
})();
