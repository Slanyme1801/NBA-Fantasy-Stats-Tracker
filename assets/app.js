
const SEASONS = [];
let META = null, CURRENT = null, sortState = {key:"season", dir:"asc"};
const fmt = (v, d=1) => (v===null||v===undefined||Number.isNaN(v)) ? "—" : Number(v).toFixed(d);
const el = id => document.getElementById(id);
const playerArg=id=>window.PlayerIdentity.inlineArg(id);
const canonicalPlayerId=id=>window.PlayerIdentity.canonical(id);
const playerPath=id=>'/api/player/'+window.PlayerIdentity.path(id);
const safeText=value=>window.PlayerIdentity.html(value);
// Presentation-only translations for provider metadata and calculation messages.
const uiFr=value=>String(value??'').replace(/Historical position:/g,'Poste historique :').replace(/Historical team:/g,'Équipe historique :').replace(/Latest imported team:/g,'Dernière équipe importée :').replace(/NBA identity link pending/g,'Liaison à l’identité NBA en attente').replace(/ESPN not imported/g,'ESPN non importé').replace(/ESPN position not imported/g,'Poste ESPN non importé').replace(/Team not available/g,'Équipe indisponible').replace(/No historical record/g,'Aucune donnée historique').replace(/No complete regular-season games/g,'Aucun match complet de saison régulière').replace(/Not connected/g,'Non connecté').replace(/No complete games for this period\./g,'Aucun match complet sur cette période.').replace(/Verified ESPN eligibility is missing for this player\./g,'Éligibilité ESPN vérifiée manquante pour ce joueur.').replace(/Reference player has fewer than (\d+) complete games\./g,'Le joueur de référence a moins de $1 matchs complets.').replace(/No player meets these filters and sample size\./g,'Aucun joueur ne satisfait ces filtres et la taille minimale de l’échantillon.').replace(/Invalid similarity filters/g,'Filtres de similarité invalides').replace(/Replacement AVG must be a non-negative number/g,'La moyenne du remplaçant doit être un nombre positif ou nul').replace(/Choose up to five players per side/g,'Choisissez jusqu’à cinq joueurs par côté').replace(/ESPN default/g,'Barème ESPN par défaut').replace(/Custom scoring/g,'Barème personnalisé').replace(/Daily attempt at (.*?) UTC\. Verified partial dataset only; GitHub Actions may run late or skip scheduled events\./g,'Tentative quotidienne à $1 UTC. Données partielles vérifiées uniquement ; GitHub Actions peut retarder ou ignorer une exécution.').replace(/Invalid weight: (\w+)/g,'Coefficient invalide : $1').replace(/do not reconcile with/g,'ne correspondent pas à');
const statLabelFr={pts:'Points (PTS)',fg3m:'Tirs à 3 points réussis (3PM)',fgm:'Tirs réussis (FGM)',fga:'Tirs tentés (FGA)',ftm:'Lancers francs réussis (FTM)',fta:'Lancers francs tentés (FTA)',reb:'Rebonds (REB)',ast:'Passes décisives (AST)',stl:'Interceptions (STL)',blk:'Contres (BLK)',tov:'Balles perdues (TO)'};
const identityLabel = p => uiFr(p.identity_label || [p.position ? `Historical position: ${p.position}` : '',p.last_team ? `Historical team: ${p.last_team}` : ''].filter(Boolean).join(' · ')).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(path, opts){
  const r = await window.AppApi(path, opts);
  if(!r.ok) throw new Error((await r.json().catch(()=>({detail:r.statusText}))).detail);
  return r.json();
}

/* ---------------- search ---------------- */
function wireSearch(input, box, onSelect){
  // onSelect defaults to opening the player page; the Compare tab passes its
  // own handler to add a player to the comparison instead of navigating away.
  const select = onSelect || (p => openPlayer(p.player_id));
  let items = [], sel = -1, timer = null;
  const close = () => { box.hidden = true; sel = -1; };
  const render = () => {
    box.innerHTML = items.length ? "" : "<div><span>Aucun joueur trouvé</span></div>";
    items.forEach((p,i) => {
      const d = document.createElement("div");
      if(i===sel) d.className = "sel";
      d.innerHTML = `<span>${safeText(p.full_name)}</span><small>${identityLabel(p)}</small>`;
      d.onmousedown = e => { e.preventDefault(); close(); input.value=""; select(p); };
      box.appendChild(d);
    });
    box.hidden = false;
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    close(); // Do not leave stale results selectable while a new search is pending.
    const q = input.value.trim();
    if(q.length < 2){ close(); return; }
    timer = setTimeout(async () => {
      try { const found = (await api("/api/search?q=" + encodeURIComponent(q))).results; if(input.isConnected && input.value.trim()===q){ items=found; render(); } }
      catch(e){ close(); }
    }, 120);
  });
  input.addEventListener("keydown", e => {
    if(box.hidden) return;
    if(e.key === "ArrowDown"){ sel = Math.min(sel+1, items.length-1); render(); e.preventDefault(); }
    else if(e.key === "ArrowUp"){ sel = Math.max(sel-1, 0); render(); e.preventDefault(); }
    else if(e.key === "Enter" && items[sel]){ const chosen=items[sel]; close(); input.value=""; select(chosen); }
    else if(e.key === "Escape"){ close(); }
  });
  input.addEventListener("blur", () => setTimeout(close, 120));
}

/* ---------------- routing ---------------- */
function go(page){
  ["home","board","compare","data"].forEach(p => el("tab-"+p).classList.toggle("active", p===page));
  if(page==="home") renderHome();
  if(page==="board") renderBoard();
  if(page==="compare") renderCompare();
  if(page==="data") renderData();
}

/* ---------------- home ---------------- */
function renderHome(){
  const loaded = META && META.players > 0;
  el("view").innerHTML = `
    <section class="hero">
      <h1>Te fait pas SCAM narvalo</h1>
      <p>Viens cons les stats à jour et historiques des boys pour vérifier ton trade avant de te faire scam.</p>
      <div class="searchbox">
        <input id="mainSearch" placeholder="Rechercher un joueur NBA…" autocomplete="off">
        <div class="results" id="mainResults" hidden></div>
      </div>
      <div class="seasons-strip">${SEASONS.map(s=>`<b>${s}</b>`).join("<span>•</span>")}</div>
    </section>
    ${loaded ? "" : emptyState()}
    ${loaded ? metaFooter() : ""}`;
  const input = el("mainSearch");
  if(input){ wireSearch(input, el("mainResults")); input.focus(); }
}

function emptyState(){
  return `<div class="empty">
    <p><b>Aucune donnée NBA importée pour le moment.</b> Aucune statistique ne s’affiche avant son import : l’application n’invente aucun chiffre.</p>
    <p>Lancez <code>python -m app.ingest</code>, ou ouvrez <b>Données et barème</b> pour démarrer une mise à jour.</p>
  </div>`;
}

function metaFooter(){
  const v = META.validation;
  const problems = v ? v.problem_count : 0;
  return `<div class="footer-meta">
    Source historique : ${META.source || "—"}<br>
    Dernière mise à jour : ${META.last_update ? new Date(META.last_update).toLocaleString('fr-FR') : "—"}<br>
    ${META.players} joueurs · ${Object.entries(META.rows_per_season||{}).map(([s,c])=>`${s}: ${c}`).join(" · ")}<br>
    ${problems ? `<span class="warn">${problems} avertissement(s) de validation : voir Données et barème.</span>` : "Validation des données réussie."}
  </div>`;
}

/* ---------------- player page ---------------- */
async function openPlayer(id){
  ["home","board","compare","trades","data"].forEach(p => el("tab-"+p).classList.remove("active"));
  el("view").innerHTML = `<p class="dim">Chargement…</p>`;
  CURRENT = await api(playerPath(id));
  sortState = {key:"season", dir:"asc"};
  renderPlayer();
}

function renderPlayer(){
  const p = CURRENT, s = p.summary;
  const played = p.seasons.filter(x => x.played && x.season !== "2026-27");
  el("view").innerHTML = `
    <div class="player-head">
      <h2>${safeText(p.full_name)}</h2>
      <span class="sub">${identityLabel(p)}</span>
    </div>
    <div class="cards">
      <div class="card hero-stat">
        <div class="label">Moyenne fantasy sur 5 ans</div>
        <div class="value">${fmt(s.simple_avg)}</div>
        <div class="label">FPTS/M historiques sur ${s.seasons_played} saison${s.seasons_played===1?"":"s"} jouée${s.seasons_played===1?"":"s"}</div>
      </div>
      <div class="card">
        <div class="label">FPTS/M pondérés sur 5 ans</div>
        <div class="value">${fmt(s.weighted_avg)}</div>
        <div class="label">Σ(FPTS/G × GP) ÷ ΣGP</div>
      </div>
      <div class="card">
        <div class="label">Total fantasy approximatif sur 5 ans</div>
        <div class="value">${fmt(s.total_fpts, 0)}</div>
        <div class="label">${fmt(s.total_gp,0)} matchs joués</div>
      </div>
      <div class="card">
        <div class="label">Meilleure saison fantasy</div>
        <div class="value">${s.best_season || "—"}</div>
        <div class="label">${played.length ? fmt(Math.max(...played.map(x=>x.fpts_per_game))) + " FPTS/G" : ""}</div>
      </div>
    </div>

    <div class="season-pills">${p.seasons.map(seasonPill).join("")}</div>

    <div class="panel">
      <h3>Points fantasy par match et par saison</h3>
      <div class="legend">
        <span><i style="background:var(--amber)"></i>FPTS/G</span>
        <span><i style="background:var(--cyan)"></i>PPG</span>
      </div>
      ${chart(p.seasons)}
    </div>

    <div class="panel">
      <h3>Saison par saison</h3>
      <div class="scroll">${playerTable(p.seasons)}</div>
    </div>
    ${metaFooter()}`;
}

function seasonPill(x){
  if(!x.played) return `<div class="pill"><div class="s">${x.season}</div><div class="v dim">N/D</div><div class="d dim">${uiFr(x.note) || "Aucun match joué"}</div></div>`;
  const label = x.teams_label ? x.teams_label : (x.team || "");
  return `<div class="pill"><div class="s">${x.season}${label ? " · " + label : ""}</div>
    <div class="v">${fmt(x.fpts_per_game)}</div>
    <div class="d dim">${fmt(x.gp,0)} GP · ${x.exact ? "" : "≈ "}${fmt(x.total_fpts,0)} FP</div></div>`;
}

const COLS = [
  ["season","Saison",null],["gp","GP",0],["min","MPG",1],["pts","PPG",1],["fg3m","3PM",1],
  ["fgm","FGM",1],["fga","FGA",1],["ftm","FTM",1],["fta","FTA",1],["reb","RPG",1],
  ["ast","APG",1],["stl","SPG",1],["blk","BPG",1],["tov","TO",1],
  ["fpts_per_game","FPTS/G",1],["total_fpts","Total PF ≈ historique",0],
];

function playerTable(seasons){
  const rows = seasons.slice();
  const {key, dir} = sortState;
  rows.sort((a,b) => {
    if(!a.played) return 1; if(!b.played) return -1;
    const va = a[key], vb = b[key];
    const c = (typeof va === "string") ? va.localeCompare(vb) : (va - vb);
    return dir === "asc" ? c : -c;
  });
  const head = COLS.map(([k,label]) =>
    `<th class="${k==='fpts_per_game'?'fpts':''}" onclick="sortBy('${k}')">${label}${sortState.key===k?(sortState.dir==="asc"?" ↑":" ↓"):""}</th>`).join("");
  const body = rows.map(x => {
    if(!x.played) return `<tr><td>${x.season}</td><td class="dnp" colspan="${COLS.length-1}">${uiFr(x.note) || "N/D — Aucun match joué"}</td></tr>`;
    return "<tr>" + COLS.map(([k,,d]) => {
      if(k === "season") return `<td>${x.season}${x.teams_label ? ` <span class="dim">${x.teams_label}</span>` : ""}</td>`;
      const cls = k === "fpts_per_game" ? ' class="fpts num"' : ' class="num"';
      return `<td${cls}>${fmt(x[k], d)}</td>`;
    }).join("") + "</tr>";
  }).join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function sortBy(key){
  sortState = {key, dir: sortState.key === key && sortState.dir === "desc" ? "asc" : "desc"};
  if(key === "season" && sortState.key === "season" && sortState.dir === "desc") sortState.dir = "desc";
  renderPlayer();
}

/* ---------------- chart (inline SVG) ---------------- */
function chart(seasons){
  const W = 720, H = 260, PAD_L = 44, PAD_B = 34, PAD_T = 16, PAD_R = 14;
  const pts = seasons.map(s => s.played ? {x:s.season, f:s.fpts_per_game, p:s.pts} : {x:s.season, f:null, p:null});
  const vals = pts.flatMap(d => [d.f, d.p]).filter(v => v !== null);
  if(!vals.length) return `<p class="dim">Aucune saison jouée sur cette période.</p>`;
  const max = Math.max(1,...vals) * 1.15, min = Math.min(0,...vals)*1.15;
  const xw = (W - PAD_L - PAD_R) / Math.max(pts.length - 1, 1);
  const X = i => PAD_L + i * xw;
  const Y = v => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - min) / (max - min));
  const line = (key, color) => {
    const segs = [];
    let cur = [];
    pts.forEach((d,i) => {
      if(d[key] === null){ if(cur.length) segs.push(cur); cur = []; }
      else cur.push(`${X(i)},${Y(d[key])}`);
    });
    if(cur.length) segs.push(cur);
    return segs.map(s => `<polyline fill="none" stroke="${color}" stroke-width="2.5"
       stroke-linejoin="round" points="${s.join(" ")}"/>`).join("") +
      pts.map((d,i) => d[key]===null ? "" :
        `<circle cx="${X(i)}" cy="${Y(d[key])}" r="4" fill="${color}"/>`).join("");
  };
  const grid = [0,.25,.5,.75,1].map(t => {
    const v = min + (max - min) * t;
    return `<line x1="${PAD_L}" x2="${W-PAD_R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ccd7e6"/>
            <text x="${PAD_L-8}" y="${Y(v)+4}" fill="#536781" font-size="11" text-anchor="end">${v.toFixed(0)}</text>`;
  }).join("");
  const labels = pts.map((d,i) =>
    `<text x="${X(i)}" y="${H-10}" fill="#475b76" font-size="11" text-anchor="middle">${d.x}</text>`).join("");
  const values = pts.map((d,i) => d.f===null ? "" :
    `<text x="${X(i)}" y="${Y(d.f)-11}" fill="#c8102e" font-size="11.5" font-weight="600" text-anchor="middle">${d.f.toFixed(1)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Points fantasy par match et par saison">
    ${grid}${line("p","#17408b")}${line("f","#c8102e")}${values}${labels}</svg>`;
}

/* ---------------- compare ---------------- */
const COMPARE_COLORS = ["#c8102e", "#17408b", "#176c46", "#8148a1"];
let compareIds = [];
let comparePlayers = {}; // player_id -> payload cache

function renderCompare(){
  el("view").innerHTML = `
    <h2 style="letter-spacing:-.03em">Comparer les joueurs</h2>
    <p class="dim" style="margin-top:-6px">Sélectionnez 2 à 4 joueurs pour comparer leur forme récente et leurs saisons.</p>
    <div class="panel">
      <div class="chips" id="compareChips"></div>
      <div class="searchbox" id="compareSearchWrap" style="max-width:420px;margin-top:${compareIds.length?'12px':'0'}">
        <input id="compareSearch" placeholder="Ajouter un joueur…" autocomplete="off"
          ${compareIds.length>=4?'disabled':''}>
        <div class="results" id="compareResults" hidden></div>
      </div>
    </div>
    <div id="compareBody"></div>`;
  renderChips();
  const input = el("compareSearch");
  wireSearch(input, el("compareResults"), (p) => addComparePlayer(p.player_id));
  loadCompareBody();
}

function renderChips(){
  el("compareChips").innerHTML = compareIds.map((id,i) => {
    const p = comparePlayers[id];
    const name = p ? p.full_name : "…";
    return `<span class="chip" style="border-color:${COMPARE_COLORS[i]}">
      <i style="background:${COMPARE_COLORS[i]}"></i>${safeText(name)}
      <button onclick="removeComparePlayer(${playerArg(id)})" aria-label="Retirer">×</button></span>`;
  }).join("") || `<span class="dim" style="font-size:13.5px">Aucun joueur sélectionné.</span>`;
}

async function addComparePlayer(id){
  id=canonicalPlayerId(id);if(id===null)return;
  if(compareIds.includes(id) || compareIds.length>=4) return;
  compareIds.push(id);
  if(!comparePlayers[id]) comparePlayers[id] = await api(playerPath(id));
  renderCompare();
}
function removeComparePlayer(id){
  id=canonicalPlayerId(id);
  compareIds = compareIds.filter(x => x!==id);
  renderCompare();
}

async function loadCompareBody(){
  const body = el("compareBody");
  if(compareIds.length < 2){
    body.innerHTML = `<div class="empty">Ajoutez au moins 2 joueurs pour afficher la comparaison.</div>`;
    return;
  }
  const players = compareIds.map(id => comparePlayers[id]);
  body.innerHTML = `
    ${compareCurrentTable(players)}
    <div class="panel">
      <h3>Points fantasy par match et par saison</h3>
      <div class="legend">${players.map((p,i) =>
        `<span><i style="background:${COMPARE_COLORS[i]}"></i>${safeText(p.full_name)}</span>`).join("")}</div>
      ${compareChart(players)}
    </div>
    <div class="panel">
      <h3>Saison par saison — FPTS/G</h3>
      <div class="scroll">${compareTable(players)}</div>
    </div>`;
}

// Same raw counters, scoring weights and UTC windows as the current profile.
// Missing samples stay unavailable; current data never borrows historical stats.
function compareCurrentTable(players,{asOf=new Date()}={}){
  const core=window.FantasyCore,data=window.CurrentLoad?.data;
  if(!core||!data)return `<section class="panel compare-current"><h3>Forme actuelle comparée</h3><p class="empty">Données actuelles indisponibles. Les comparaisons historiques restent accessibles ci-dessous.</p></section>`;
  const periods=[{days:null,label:`${core.SEASON} · échantillon importé`},{days:7,label:'7 derniers jours'},{days:14,label:'14 derniers jours'},{days:30,label:'30 derniers jours'}];
  const headers=players.map(p=>`<th scope="col"><button class="text-button" onclick="openPlayer(${playerArg(p.player_id)})">${safeText(p.full_name)}</button></th>`).join('');
  const rows=periods.map(({days,label})=>{
    const range=core.bounds(days,asOf);
    const dates=range.start?`${range.start} au ${range.end} · UTC`:`Jusqu’au ${range.end} · UTC`;
    const cells=players.map(p=>{
      const a=core.aggregate(data,p.player_id,{days,asOf,weights:META.scoring});
      return `<td>${a.gp?`<strong class="fpts num">${fmt(a.fptsPerGame)} <small>FP / match</small></strong><div class="small">${a.gp} MJ · ${fmt(a.minutes)} MIN / match${data.minutesPrecision==='rounded-whole-minute'?' ≈':''}</div>`:'<strong>—</strong><div class="small">0 match complet · moyenne et minutes indisponibles</div>'}</td>`;
    }).join('');
    return `<tr><th scope="row">${label}<small style="display:block;font-weight:400">${dates}</small></th>${cells}</tr>`;
  }).join('');
  return `<section class="panel compare-current"><h3>Forme actuelle comparée</h3><p class="small muted">Même période et même barème pour tous · matchs disponibles.</p><div class="scroll" tabindex="0" role="region" aria-label="Comparaison des moyennes, matchs joués et minutes par période"><table class="compare-periods"><caption class="small">Moyenne fantasy, matchs joués (MJ) et minutes par match (MIN)</caption><thead><tr><th scope="col">Période</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function compareChart(players){
  const W = 720, H = 260, PAD_L = 44, PAD_B = 34, PAD_T = 16, PAD_R = 14;
  const allVals = players.flatMap(p => p.seasons.filter(s=>s.played).map(s=>s.fpts_per_game));
  if(!allVals.length) return `<p class="dim">Aucune saison jouée pour les joueurs sélectionnés.</p>`;
  const max = Math.max(1,...allVals) * 1.15, min = Math.min(0,...allVals)*1.15;
  const xw = (W - PAD_L - PAD_R) / (SEASONS.length - 1);
  const X = i => PAD_L + i * xw;
  const Y = v => PAD_T + (H - PAD_T - PAD_B) * (1 - (v-min) / (max-min));
  const grid = [0,.25,.5,.75,1].map(t => {
    const v = min+(max-min)*t;
    return `<line x1="${PAD_L}" x2="${W-PAD_R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ccd7e6"/>
            <text x="${PAD_L-8}" y="${Y(v)+4}" fill="#536781" font-size="11" text-anchor="end">${v.toFixed(0)}</text>`;
  }).join("");
  const labels = SEASONS.map((s,i) =>
    `<text x="${X(i)}" y="${H-10}" fill="#475b76" font-size="11" text-anchor="middle">${s}</text>`).join("");
  const lines = players.map((p,pi) => {
    const color = COMPARE_COLORS[pi];
    const segs = []; let cur = [];
    p.seasons.forEach((s,i) => {
      if(!s.played){ if(cur.length) segs.push(cur); cur = []; }
      else cur.push([X(i), Y(s.fpts_per_game)]);
    });
    if(cur.length) segs.push(cur);
    return segs.map(seg => `<polyline fill="none" stroke="${color}" stroke-width="2.5"
        stroke-linejoin="round" points="${seg.map(pt=>pt.join(",")).join(" ")}"/>`).join("") +
      p.seasons.map((s,i) => s.played ?
        `<circle cx="${X(i)}" cy="${Y(s.fpts_per_game)}" r="4" fill="${color}"/>` : "").join("");
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Comparaison des points fantasy par match">
    ${grid}${lines}${labels}</svg>`;
}

function compareTable(players){
  const head = `<th>Saison</th>` + players.map((p,i) =>
    `<th class="fpts" style="color:${COMPARE_COLORS[i]}">${safeText(p.full_name)}</th>`).join("");
  const rows = SEASONS.map((s,i) => {
    const cells = players.map(p => {
      const season = p.seasons[i];
      return season.played
        ? `<td class="fpts num">${fmt(season.fpts_per_game)}</td>`
        : `<td class="dnp">N/D</td>`;
    }).join("");
    return `<tr><td>${s}</td>${cells}</tr>`;
  }).join("");
  const summaryRow = (label, key) => `<tr><td><b>${label}</b></td>` +
    players.map(p => `<td class="num"><b>${fmt(p.summary[key])}</b></td>`).join("") + `</tr>`;
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}
    ${summaryRow("Moyenne simple sur 5 ans","simple_avg")}
    ${summaryRow("FPTS/M pondérés sur 5 ans","weighted_avg")}
    </tbody></table>`;
}

/* ---------------- leaderboard ---------------- */
async function renderBoard(){
  const seasonOpts = ["<option value=''>5 saisons historiques</option>"]
    .concat(SEASONS.map(s => `<option>${s}</option>`)).join("");
  const teamOpts = ["<option value=''>Toutes les équipes</option>"]
    .concat((META.teams||[]).map(t => `<option>${t}</option>`)).join("");
  const posOpts = ["<option value=''>Tous les postes</option>"]
    .concat((META.positions||[]).map(t => `<option>${t}</option>`)).join("");
  el("view").innerHTML = `
    <h2 style="letter-spacing:-.03em">Classements fantasy</h2>
    <div class="panel">
      <div class="filters">
        <label>Saison<select id="fSeason">${seasonOpts}</select></label>
        <label>Trier par<select id="fSort">
          <option value="weighted_avg">FPTS/M pondérés sur 5 ans</option>
          <option value="simple_avg">FPTS/M simples sur 5 ans</option>
          <option value="season_fpts">FPTS/M de la saison sélectionnée</option>
          <option value="total_fpts">Total des points fantasy</option>
          <option value="gp">Matchs joués</option>
          <option value="name">Nom du joueur</option>
        </select></label>
        <label>Équipe<select id="fTeam">${teamOpts}</select></label>
        <label>Poste<select id="fPos">${posOpts}</select></label>
        <label>Matchs min.<input type="number" id="fGp" value="0" min="0" max="410" style="width:90px"></label>
        <button class="btn" onclick="loadBoard()">Appliquer les filtres</button>
      </div>
      <div class="scroll" id="boardTable"><p class="dim">Chargement…</p></div>
    </div>`;
  ["fSeason","fSort","fTeam","fPos"].forEach(id => el(id).onchange = loadBoard);
  loadBoard();
}

async function loadBoard(){
  const q = new URLSearchParams({
    season: el("fSeason").value, sort: el("fSort").value, team: el("fTeam").value,
    position: el("fPos").value, min_gp: el("fGp").value || 0, limit: 150,
  });
  for(const [k,v] of [...q]) if(!v) q.delete(k);
  const {results} = await api("/api/leaderboard?" + q.toString());
  const season = el("fSeason").value;
  if(!results.length){ el("boardTable").innerHTML = `<p class="dim">Aucun joueur ne correspond à ces filtres.</p>`; return; }
  el("boardTable").innerHTML = `<table>
    <thead><tr><th>#</th><th>Joueur</th><th>Équipe</th><th>Pos</th>
      <th>5Y FPTS/G</th><th class="fpts">FPTS/M pondérés</th>
      <th>${season || "2025-26"} FPTS/G</th><th>GP</th><th>Total PF ≈ historique</th></tr></thead>
    <tbody>${results.map(r => `
      <tr class="clickable" onclick="openPlayer(${playerArg(r.player_id)})">
        <td>${r.rank}</td><td>${safeText(r.full_name)}</td><td>${r.team||"—"}</td><td>${r.position||"—"}</td>
        <td class="num">${fmt(r.simple_avg)}</td>
        <td class="fpts num">${fmt(r.weighted_avg)}</td>
        <td class="num">${r.season_fpts===null?"—":fmt(r.season_fpts)}</td>
        <td class="num">${fmt(season ? r.season_gp : r.total_gp, 0)}</td>
        <td class="num">${fmt(r.total_fpts,0)}</td>
      </tr>`).join("")}</tbody></table>`;
}

/* ---------------- data & scoring ---------------- */
function renderData(){
  const v = META.validation;
  el("view").innerHTML = `
    <h2 style="letter-spacing:-.03em">Données et barème</h2>
    <div class="panel">
      <h3>Réglages du barème</h3><p class="small muted">Repères : FPTS = points fantasy ; FPTS/G ou FPTS/M = points fantasy par match ; GP = matchs joués ; AVG = moyenne ; DNP = non-participation. Les abréviations statistiques NBA restent conservées.</p>
      <p class="dim" style="margin-top:0;font-size:13.5px">Les coefficients s’appliquent aux moyennes par match. Leur modification recalcule immédiatement les points fantasy, sans réimporter les données NBA.</p>
      <div class="scoring-grid">${Object.entries(META.stat_labels).map(([k,label]) =>
        `<label>${statLabelFr[k]||label}<input type="number" step="0.5" id="w-${k}" value="${META.scoring[k]}"></label>`).join("")}</div>
      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn" onclick="saveScoring()">Enregistrer le barème</button>
        <button class="btn ghost" onclick="resetScoring()">Rétablir le barème par défaut</button>
      </div>
    </div>
    <div class="panel">
      <h3>Données NBA</h3>
      <p class="dim" style="font-size:13.5px;margin-top:0">
        Fournisseur : ${META.provider} · Source: ${META.source || "—"}<br>
        Dernière mise à jour : ${META.last_update ? new Date(META.last_update).toLocaleString('fr-FR') : "jamais"}<br>
        ${META.players} joueurs · ${Object.entries(META.rows_per_season||{}).map(([s,c])=>`${s}: ${c}`).join(" · ") || "aucune saison chargée"}
      </p>
      ${window.__OFFLINE
        ? `<p class="dim" style="font-size:13.5px">Les moyennes historiques sont arrondies et les totaux reconstitués approximatifs. Les archives restent inchangées. Les données de la nouvelle saison sont collectées séparément et importées après validation.</p>`
        : `<button class="btn" onclick="startUpdate()">Actualiser les données NBA</button>`}
      <pre id="jobLog" style="white-space:pre-wrap;color:var(--ink-dim);font-size:12.5px"></pre>
    </div>
    <div class="panel">
      <h3>Rapport de validation</h3>
      ${v ? `<p class="dim" style="font-size:13.5px">${v.rows} lignes vérifiées · ${v.problem_count} problème(s)</p>
        <ul class="dim" style="font-size:13px">${(v.problems||[]).slice(0,25).map(p=>`<li>${safeText(uiFr(p))}</li>`).join("") || "<li>Aucune incohérence détectée.</li>"}</ul>`
        : `<p class="dim">Aucun import effectué.</p>`}
    </div>`;
}

async function saveScoring(){
  const weights = {};
  Object.keys(META.stat_labels).forEach(k => weights[k] = parseFloat(el("w-"+k).value));
  await api("/api/scoring", {method:"PUT", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({weights})});
  await loadMeta(); comparePlayers = {}; for(const id of compareIds) comparePlayers[id] = await api(playerPath(id)); renderData();
}
async function resetScoring(){
  const d = {pts:1,fg3m:1,fgm:2,fga:-1,ftm:1,fta:-1,reb:1,ast:2,stl:4,blk:4,tov:-2};
  await api("/api/scoring", {method:"PUT", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({weights:d})});
  await loadMeta(); renderData();
}
async function startUpdate(){
  el("jobLog").textContent = "Démarrage…";
  await api("/api/update", {method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({provider: META.provider})});
  const poll = setInterval(async () => {
    const s = await api("/api/update/status");
    el("jobLog").textContent = s.log.join("\n");
    if(s.status !== "running"){
      clearInterval(poll);
      el("jobLog").textContent += `\nMise à jour : ${s.status}.`;
      await loadMeta();
    }
  }, 1500);
}

/* ---------------- boot ---------------- */
async function loadMeta(){
  META = await api("/api/meta");
  SEASONS.length = 0; SEASONS.push(...META.seasons);
}
window.startApp = async () => {
  await loadMeta();
  wireSearch(el("navSearch"), el("navResults"));
  go("home");
};
