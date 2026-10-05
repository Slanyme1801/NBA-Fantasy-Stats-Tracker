
const SEASONS = [];
let META = null, CURRENT = null, sortState = {key:"season", dir:"asc"};
const fmt = (v, d=1) => (v===null||v===undefined||Number.isNaN(v)) ? "—" : Number(v).toFixed(d);
const el = id => document.getElementById(id);

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
    box.innerHTML = items.length ? "" : "<div><span>No player found</span></div>";
    items.forEach((p,i) => {
      const d = document.createElement("div");
      if(i===sel) d.className = "sel";
      d.innerHTML = `<span>${p.full_name}</span><small>${[p.position,p.last_team].filter(Boolean).join(" · ")||""}</small>`;
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
      <h1>Every NBA player, scored your way.</h1>
      <p>Five historical seasons. One place to explore players and evaluate trades.</p>
      <div class="searchbox">
        <input id="mainSearch" placeholder="Search NBA player…" autocomplete="off">
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
    <p><b>No NBA data imported yet.</b> Nothing is displayed until real stats are loaded — the app never estimates or invents numbers.</p>
    <p>Run <code>python -m app.ingest</code>, or open <b>Data &amp; scoring</b> and start an update.</p>
  </div>`;
}

function metaFooter(){
  const v = META.validation;
  const problems = v ? v.problem_count : 0;
  return `<div class="footer-meta">
    Historical source: ${META.source || "—"}<br>
    Last updated: ${META.last_update ? new Date(META.last_update).toLocaleString() : "—"}<br>
    ${META.players} players · ${Object.entries(META.rows_per_season||{}).map(([s,c])=>`${s}: ${c}`).join(" · ")}<br>
    ${problems ? `<span class="warn">${problems} validation warning(s) — see Data &amp; scoring.</span>` : "Data validation passed."}
  </div>`;
}

/* ---------------- player page ---------------- */
async function openPlayer(id){
  ["home","board","compare","trades","data"].forEach(p => el("tab-"+p).classList.remove("active"));
  el("view").innerHTML = `<p class="dim">Loading…</p>`;
  CURRENT = await api("/api/player/" + id);
  sortState = {key:"season", dir:"asc"};
  renderPlayer();
}

function renderPlayer(){
  const p = CURRENT, s = p.summary;
  const played = p.seasons.filter(x => x.played && x.season !== "2026-27");
  el("view").innerHTML = `
    <div class="player-head">
      <h2>${p.full_name}</h2>
      <span class="sub">${[p.position, p.last_team].filter(Boolean).join(" · ") || ""}</span>
    </div>
    <div class="cards">
      <div class="card hero-stat">
        <div class="label">5-year fantasy average</div>
        <div class="value">${fmt(s.simple_avg)}</div>
        <div class="label">Historical FPTS/G over ${s.seasons_played} season${s.seasons_played===1?"":"s"} played</div>
      </div>
      <div class="card">
        <div class="label">Weighted 5-year FPTS/G</div>
        <div class="value">${fmt(s.weighted_avg)}</div>
        <div class="label">Σ(FPTS/G × GP) ÷ ΣGP</div>
      </div>
      <div class="card">
        <div class="label">Approx. 5-year fantasy total</div>
        <div class="value">${fmt(s.total_fpts, 0)}</div>
        <div class="label">${fmt(s.total_gp,0)} games played</div>
      </div>
      <div class="card">
        <div class="label">Best fantasy season</div>
        <div class="value">${s.best_season || "—"}</div>
        <div class="label">${played.length ? fmt(Math.max(...played.map(x=>x.fpts_per_game))) + " FPTS/G" : ""}</div>
      </div>
    </div>

    <div class="season-pills">${p.seasons.map(seasonPill).join("")}</div>

    <div class="panel">
      <h3>Fantasy points per game by season</h3>
      <div class="legend">
        <span><i style="background:var(--amber)"></i>FPTS/G</span>
        <span><i style="background:var(--cyan)"></i>PPG</span>
      </div>
      ${chart(p.seasons)}
    </div>

    <div class="panel">
      <h3>Season by season</h3>
      <div class="scroll">${playerTable(p.seasons)}</div>
    </div>
    ${metaFooter()}`;
}

function seasonPill(x){
  if(!x.played) return `<div class="pill"><div class="s">${x.season}</div><div class="v dim">N/A</div><div class="d dim">${x.note || "Did not play"}</div></div>`;
  const label = x.teams_label ? x.teams_label : (x.team || "");
  return `<div class="pill"><div class="s">${x.season}${label ? " · " + label : ""}</div>
    <div class="v">${fmt(x.fpts_per_game)}</div>
    <div class="d dim">${fmt(x.gp,0)} GP · ${x.exact ? "" : "≈ "}${fmt(x.total_fpts,0)} FP</div></div>`;
}

const COLS = [
  ["season","Season",null],["gp","GP",0],["min","MPG",1],["pts","PPG",1],["fg3m","3PM",1],
  ["fgm","FGM",1],["fga","FGA",1],["ftm","FTM",1],["fta","FTA",1],["reb","RPG",1],
  ["ast","APG",1],["stl","SPG",1],["blk","BPG",1],["tov","TO",1],
  ["fpts_per_game","FPTS/G",1],["total_fpts","Total FP ≈ historical",0],
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
    if(!x.played) return `<tr><td>${x.season}</td><td class="dnp" colspan="${COLS.length-1}">${x.note || "N/A — Did not play"}</td></tr>`;
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
  if(!vals.length) return `<p class="dim">No season played in this window.</p>`;
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
    return `<line x1="${PAD_L}" x2="${W-PAD_R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#26314c"/>
            <text x="${PAD_L-8}" y="${Y(v)+4}" fill="#6b7690" font-size="11" text-anchor="end">${v.toFixed(0)}</text>`;
  }).join("");
  const labels = pts.map((d,i) =>
    `<text x="${X(i)}" y="${H-10}" fill="#9aa6bf" font-size="11" text-anchor="middle">${d.x}</text>`).join("");
  const values = pts.map((d,i) => d.f===null ? "" :
    `<text x="${X(i)}" y="${Y(d.f)-11}" fill="#ffb020" font-size="11.5" font-weight="600" text-anchor="middle">${d.f.toFixed(1)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Fantasy points per game by season">
    ${grid}${line("p","#54c8e8")}${line("f","#ffb020")}${values}${labels}</svg>`;
}

/* ---------------- compare ---------------- */
const COMPARE_COLORS = ["#ffb020", "#54c8e8", "#43c98a", "#ff6b81"];
let compareIds = [];
let comparePlayers = {}; // player_id -> payload cache

function renderCompare(){
  el("view").innerHTML = `
    <h2 style="letter-spacing:-.03em">Compare players</h2>
    <p class="dim" style="margin-top:-6px">Pick 2 to 4 players to compare season by season.</p>
    <div class="panel">
      <div class="chips" id="compareChips"></div>
      <div class="searchbox" id="compareSearchWrap" style="max-width:420px;margin-top:${compareIds.length?'12px':'0'}">
        <input id="compareSearch" placeholder="Add a player…" autocomplete="off"
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
      <i style="background:${COMPARE_COLORS[i]}"></i>${name}
      <button onclick="removeComparePlayer(${id})" aria-label="Remove">×</button></span>`;
  }).join("") || `<span class="dim" style="font-size:13.5px">No player selected yet.</span>`;
}

async function addComparePlayer(id){
  if(compareIds.includes(id) || compareIds.length>=4) return;
  compareIds.push(id);
  if(!comparePlayers[id]) comparePlayers[id] = await api("/api/player/"+id);
  renderCompare();
}
function removeComparePlayer(id){
  compareIds = compareIds.filter(x => x!==id);
  renderCompare();
}

async function loadCompareBody(){
  const body = el("compareBody");
  if(compareIds.length < 2){
    body.innerHTML = `<div class="empty">Add at least 2 players to see the comparison.</div>`;
    return;
  }
  const players = compareIds.map(id => comparePlayers[id]);
  body.innerHTML = `
    <div class="panel">
      <h3>Fantasy points per game by season</h3>
      <div class="legend">${players.map((p,i) =>
        `<span><i style="background:${COMPARE_COLORS[i]}"></i>${p.full_name}</span>`).join("")}</div>
      ${compareChart(players)}
    </div>
    <div class="panel">
      <h3>Season by season — FPTS/G</h3>
      <div class="scroll">${compareTable(players)}</div>
    </div>`;
}

function compareChart(players){
  const W = 720, H = 260, PAD_L = 44, PAD_B = 34, PAD_T = 16, PAD_R = 14;
  const allVals = players.flatMap(p => p.seasons.filter(s=>s.played).map(s=>s.fpts_per_game));
  if(!allVals.length) return `<p class="dim">No season played among the selected players.</p>`;
  const max = Math.max(1,...allVals) * 1.15, min = Math.min(0,...allVals)*1.15;
  const xw = (W - PAD_L - PAD_R) / (SEASONS.length - 1);
  const X = i => PAD_L + i * xw;
  const Y = v => PAD_T + (H - PAD_T - PAD_B) * (1 - (v-min) / (max-min));
  const grid = [0,.25,.5,.75,1].map(t => {
    const v = min+(max-min)*t;
    return `<line x1="${PAD_L}" x2="${W-PAD_R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#26314c"/>
            <text x="${PAD_L-8}" y="${Y(v)+4}" fill="#6b7690" font-size="11" text-anchor="end">${v.toFixed(0)}</text>`;
  }).join("");
  const labels = SEASONS.map((s,i) =>
    `<text x="${X(i)}" y="${H-10}" fill="#9aa6bf" font-size="11" text-anchor="middle">${s}</text>`).join("");
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
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Fantasy points per game comparison">
    ${grid}${lines}${labels}</svg>`;
}

function compareTable(players){
  const head = `<th>Season</th>` + players.map((p,i) =>
    `<th class="fpts" style="color:${COMPARE_COLORS[i]}">${p.full_name}</th>`).join("");
  const rows = SEASONS.map((s,i) => {
    const cells = players.map(p => {
      const season = p.seasons[i];
      return season.played
        ? `<td class="fpts num">${fmt(season.fpts_per_game)}</td>`
        : `<td class="dnp">N/A</td>`;
    }).join("");
    return `<tr><td>${s}</td>${cells}</tr>`;
  }).join("");
  const summaryRow = (label, key) => `<tr><td><b>${label}</b></td>` +
    players.map(p => `<td class="num"><b>${fmt(p.summary[key])}</b></td>`).join("") + `</tr>`;
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}
    ${summaryRow("Simple 5-Year Avg","simple_avg")}
    ${summaryRow("Weighted 5-Year FPTS/G","weighted_avg")}
    </tbody></table>`;
}

/* ---------------- leaderboard ---------------- */
async function renderBoard(){
  const seasonOpts = ["<option value=''>5 historical seasons</option>"]
    .concat(SEASONS.map(s => `<option>${s}</option>`)).join("");
  const teamOpts = ["<option value=''>All teams</option>"]
    .concat((META.teams||[]).map(t => `<option>${t}</option>`)).join("");
  const posOpts = ["<option value=''>All positions</option>"]
    .concat((META.positions||[]).map(t => `<option>${t}</option>`)).join("");
  el("view").innerHTML = `
    <h2 style="letter-spacing:-.03em">Fantasy rankings</h2>
    <div class="panel">
      <div class="filters">
        <label>Season<select id="fSeason">${seasonOpts}</select></label>
        <label>Sort by<select id="fSort">
          <option value="weighted_avg">Weighted 5-year FPTS/G</option>
          <option value="simple_avg">Simple 5-year FPTS/G</option>
          <option value="season_fpts">Selected season FPTS/G</option>
          <option value="total_fpts">Total fantasy points</option>
          <option value="gp">Games played</option>
          <option value="name">Player name</option>
        </select></label>
        <label>Team<select id="fTeam">${teamOpts}</select></label>
        <label>Position<select id="fPos">${posOpts}</select></label>
        <label>Min GP<input type="number" id="fGp" value="0" min="0" max="410" style="width:90px"></label>
        <button class="btn" onclick="loadBoard()">Apply filters</button>
      </div>
      <div class="scroll" id="boardTable"><p class="dim">Loading…</p></div>
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
  if(!results.length){ el("boardTable").innerHTML = `<p class="dim">No player matches these filters.</p>`; return; }
  el("boardTable").innerHTML = `<table>
    <thead><tr><th>#</th><th>Player</th><th>Team</th><th>Pos</th>
      <th>5Y FPTS/G</th><th class="fpts">Weighted FPTS/G</th>
      <th>${season || "2025-26"} FPTS/G</th><th>GP</th><th>Total FP ≈ historical</th></tr></thead>
    <tbody>${results.map(r => `
      <tr class="clickable" onclick="openPlayer(${r.player_id})">
        <td>${r.rank}</td><td>${r.full_name}</td><td>${r.team||"—"}</td><td>${r.position||"—"}</td>
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
    <h2 style="letter-spacing:-.03em">Data &amp; scoring</h2>
    <div class="panel">
      <h3>Scoring settings</h3>
      <p class="dim" style="margin-top:0;font-size:13.5px">Values apply to per-game averages. Changing them recalculates every FPTS instantly — NBA data is never re-imported.</p>
      <div class="scoring-grid">${Object.entries(META.stat_labels).map(([k,label]) =>
        `<label>${label}<input type="number" step="0.5" id="w-${k}" value="${META.scoring[k]}"></label>`).join("")}</div>
      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn" onclick="saveScoring()">Save scoring</button>
        <button class="btn ghost" onclick="resetScoring()">Restore defaults</button>
      </div>
    </div>
    <div class="panel">
      <h3>NBA data</h3>
      <p class="dim" style="font-size:13.5px;margin-top:0">
        Provider: ${META.provider} · Source: ${META.source || "—"}<br>
        Last updated: ${META.last_update ? new Date(META.last_update).toLocaleString() : "never"}<br>
        ${META.players} players · ${Object.entries(META.rows_per_season||{}).map(([s,c])=>`${s}: ${c}`).join(" · ") || "no season loaded"}
      </p>
      ${window.__OFFLINE
        ? `<p class="dim" style="font-size:13.5px">Historical averages are rounded; reconstructed totals are approximate. The archive is preserved unchanged. New season data is collected separately and imported only after validation.</p>`
        : `<button class="btn" onclick="startUpdate()">Update NBA data</button>`}
      <pre id="jobLog" style="white-space:pre-wrap;color:var(--ink-dim);font-size:12.5px"></pre>
    </div>
    <div class="panel">
      <h3>Validation report</h3>
      ${v ? `<p class="dim" style="font-size:13.5px">${v.rows} rows checked · ${v.problem_count} problem(s)</p>
        <ul class="dim" style="font-size:13px">${(v.problems||[]).slice(0,25).map(p=>`<li>${p}</li>`).join("") || "<li>No inconsistency detected.</li>"}</ul>`
        : `<p class="dim">No import has run yet.</p>`}
    </div>`;
}

async function saveScoring(){
  const weights = {};
  Object.keys(META.stat_labels).forEach(k => weights[k] = parseFloat(el("w-"+k).value));
  await api("/api/scoring", {method:"PUT", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({weights})});
  await loadMeta(); comparePlayers = {}; for(const id of compareIds) comparePlayers[id] = await api("/api/player/"+id); renderData();
}
async function resetScoring(){
  const d = {pts:1,fg3m:1,fgm:2,fga:-1,ftm:1,fta:-1,reb:1,ast:2,stl:4,blk:4,tov:-2};
  await api("/api/scoring", {method:"PUT", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({weights:d})});
  await loadMeta(); renderData();
}
async function startUpdate(){
  el("jobLog").textContent = "Starting…";
  await api("/api/update", {method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({provider: META.provider})});
  const poll = setInterval(async () => {
    const s = await api("/api/update/status");
    el("jobLog").textContent = s.log.join("\n");
    if(s.status !== "running"){
      clearInterval(poll);
      el("jobLog").textContent += `\nUpdate ${s.status}.`;
      await loadMeta();
    }
  }, 1500);
}

/* ---------------- boot ---------------- */
async function loadMeta(){
  META = await api("/api/meta");
  SEASONS.length = 0; SEASONS.push(...META.seasons);
}
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  const swUrl = new URL("sw.js", document.baseURI).href;
  window.PWA_STATUS = 'Preparing offline access…';
  navigator.serviceWorker.register(swUrl, {updateViaCache:"none"})
    .then(async r=>{await r.update();await navigator.serviceWorker.ready;window.PWA_STATUS='Offline app cache ready';})
    .catch(()=>{window.PWA_STATUS='Offline app cache unavailable in this browser';})
    .finally(()=>window.dispatchEvent(new Event('pwa-status')));
}
window.startApp = async () => {
  await loadMeta();
  wireSearch(el("navSearch"), el("navResults"));
  go("home");
};
