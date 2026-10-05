(function () {
  const D = window.__DATASET;
  if (!D) return;
  window.__OFFLINE = true;

  const STAT_KEYS = ["pts", "fg3m", "fgm", "fga", "ftm", "fta", "reb", "ast",
                     "stl", "blk", "tov"];
  const COLS = ["player_id", "season", "team", "gp", "min", "pts", "fg3m", "fgm",
                "fga", "ftm", "fta", "reb", "ast", "stl", "blk", "tov", "team_count"];

  /* ---- scoring (persisted locally so a custom barème survives a reload) ---- */
  const STORE = "nbafs.scoring";
  function getScoring() {
    const w = Object.assign({}, D.scoring);
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      if (saved) for (const k of Object.keys(w)) if (k in saved && Number.isFinite(Number(saved[k])) && Math.abs(Number(saved[k]))<=1000) w[k] = Number(saved[k]);
    } catch (e) { /* private mode: fall back to the built-in barème */ }
    return w;
  }
  function setScoring(weights) {
    const w = getScoring();
    for (const k of Object.keys(w)) if (k in weights) w[k] = Number(weights[k]);
    try { localStorage.setItem(STORE, JSON.stringify(w)); } catch (e) {}
    return w;
  }

  /* ---- engine (port of app/scoring.py — no rounding anywhere) ---- */
  function fptsPerGame(row, w) {
    let total = 0;
    for (const k of STAT_KEYS) {
      const v = row[k];
      if (v === null || v === undefined) continue;
      total += v * w[k];
    }
    return total;
  }
  const simpleAverage = (vals) =>
    vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  function weightedAverage(pairs) {
    let num = 0, den = 0;
    for (const [f, gp] of pairs) { num += f * gp; den += gp; }
    return den === 0 ? null : num / den;
  }

  /* ---- dataset indexing ---- */
  const norm = (s) => (s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[-.]/g, " ").split(/\s+/).filter(Boolean).join(" ");

  const players = new Map();
  for (const [id, name, pos, team] of D.players) {
    players.set(id, { player_id: id, full_name: name, position: pos || null,
                      last_team: team || null, search_name: norm(name), seasons: new Map() });
  }
  const rows = D.rows.map((r) => {
    const row = {};
    COLS.forEach((c, i) => { row[c] = r[i]; });
    row.season = D.seasons[row.season];
    const p = players.get(row.player_id);
    if (p) { p.seasons.set(row.season, row); row.full_name = p.full_name; row.position = p.position; }
    return row;
  });

  /* ---- endpoints (mirror app/services.py) ---- */
  function seasonPayload(row, w) {
    const fpts = fptsPerGame(row, w);
    const gp = row.gp || 0;
    const out = { season: row.season, played: gp > 0, team: row.team, gp: gp,
                  min: row.min, team_count: row.team_count || 1,
                  fpts_per_game: fpts, total_fpts: fpts * gp,
                  source: D.source, fetched_at: D.generated_at };
    for (const k of STAT_KEYS) out[k] = row[k];
    out.teams = [];
    out.teams_label = out.team_count > 1
      ? `${row.team || ""} +${out.team_count - 1}` : (row.team || "");
    return out;
  }

  function playerPayload(id) {
    const p = players.get(id);
    if (!p) return null;
    const w = getScoring();
    const seasons = D.seasons.map((s) => {
      const row = p.seasons.get(s);
      return row ? seasonPayload(row, w)
                 : { season: s, played: false, note: "N/A - Did not play" };
    });
    const played = seasons.filter((s) => s.played);
    const pairs = played.map((s) => [s.fpts_per_game, s.gp]);
    return {
      player_id: p.player_id, full_name: p.full_name, position: p.position,
      last_team: p.last_team, seasons,
      summary: {
        simple_avg: simpleAverage(pairs.map((x) => x[0])),
        weighted_avg: weightedAverage(pairs),
        total_fpts: pairs.reduce((a, [f, gp]) => a + f * gp, 0),
        total_gp: pairs.reduce((a, [, gp]) => a + gp, 0),
        seasons_played: pairs.length,
        best_season: played.length
          ? played.reduce((a, b) => (b.fpts_per_game > a.fpts_per_game ? b : a)).season
          : null,
      },
      scoring: w,
    };
  }

  function search(q, limit) {
    const key = norm(q);
    if (!key) return [];
    const out = [];
    for (const p of players.values()) {
      if (p.search_name.includes(key)) {
        out.push({ player_id: p.player_id, full_name: p.full_name,
                   position: p.position, last_team: p.last_team, seasons: p.seasons.size });
      }
    }
    out.sort((a, b) => {
      const na = norm(a.full_name), nb = norm(b.full_name);
      const rank = (n) => (n.startsWith(key) ? 0 : n.split(" ").some((w) => w.startsWith(key)) ? 1 : 2);
      return rank(na) - rank(nb) || a.full_name.localeCompare(b.full_name);
    });
    return out.slice(0, limit || 12);
  }

  function leaderboard(params) {
    const w = getScoring();
    const season = params.get("season") || null;
    // `season` filters; displaySeason only fills the season column.
    const displaySeason = season || D.seasons[D.seasons.length - 1];
    const sort = params.get("sort") || "weighted_avg";
    const minGp = parseFloat(params.get("min_gp") || "0");
    const team = params.get("team") || null;
    const position = params.get("position") || null;
    const limit = parseInt(params.get("limit") || "100", 10);
    const out = [];

    for (const p of players.values()) {
      const played = [...p.seasons.values()].filter((r) => (r.gp || 0) > 0);
      if (!played.length) continue;
      const pairs = played.map((r) => [fptsPerGame(r, w), r.gp]);
      const latest = played.reduce((a, b) => (b.season > a.season ? b : a));
      const seasonRow = p.seasons.get(displaySeason);
      const seasonFpts = seasonRow && (seasonRow.gp || 0) > 0 ? fptsPerGame(seasonRow, w) : null;
      const seasonGp = seasonRow && seasonRow.gp ? seasonRow.gp : 0;

      const rec = {
        player_id: p.player_id, full_name: p.full_name, position: p.position,
        team: latest.team,
        simple_avg: simpleAverage(pairs.map((x) => x[0])),
        weighted_avg: weightedAverage(pairs),
        total_gp: pairs.reduce((a, [, gp]) => a + gp, 0),
        total_fpts: pairs.reduce((a, [f, gp]) => a + f * gp, 0),
        season: displaySeason, season_fpts: seasonFpts, season_gp: seasonGp,
      };
      if (season) {
        if (seasonFpts === null || seasonGp < minGp) continue;
        if (team && (seasonRow.team || "") !== team) continue;
      } else {
        if (rec.total_gp < minGp) continue;
        if (team && (latest.team || "") !== team) continue;
      }
      if (position && (rec.position || "") !== position) continue;
      out.push(rec);
    }

    const keys = {
      weighted_avg: (r) => r.weighted_avg || 0,
      simple_avg: (r) => r.simple_avg || 0,
      season_fpts: (r) => r.season_fpts || 0,
      gp: (r) => (season ? r.season_gp : r.total_gp),
      total_fpts: (r) => r.total_fpts || 0,
      name: (r) => r.full_name,
    };
    const key = keys[sort] || keys.weighted_avg;
    out.sort(sort === "name"
      ? (a, b) => key(a).localeCompare(key(b))
      : (a, b) => key(b) - key(a));
    const top = out.slice(0, limit);
    top.forEach((r, i) => { r.rank = i + 1; });
    return top;
  }

  function meta() {
    const perSeason = {};
    for (const r of rows) perSeason[r.season] = (perSeason[r.season] || 0) + 1;
    const teams = [...new Set(rows.map((r) => r.team).filter(Boolean))].sort();
    const positions = [...new Set([...players.values()].map((p) => p.position).filter(Boolean))].sort();
    return {
      seasons: D.seasons, stat_labels: D.stat_labels, scoring: getScoring(),
      players: players.size, rows_per_season: perSeason, teams, positions,
      last_update: D.generated_at, source: D.source, provider: D.provider,
      validation: D.validation, update_job: "idle", offline: true,
    };
  }

  /* ---- fetch shim: same routes and shapes as the FastAPI app ---- */

  // A plain object rather than `new Response(...)`: fewer assumptions about the
  // runtime, so this also works in older WebViews and in a headless DOM.
  const json = (body, status) => ({
    ok: !status || status < 400,
    status: status || 200,
    json: async () => JSON.parse(JSON.stringify(body)),
    text: async () => JSON.stringify(body),
  });

  window.LegacyApi = async function (input, init) {
    const raw = typeof input === "string" ? input : input.url;
    if (!raw || raw.indexOf("/api/") === -1) {
      throw new Error("Unknown local query");
    }
    const url = new URL(raw, location.href.startsWith("file:") ? "http://local/" : location.href);
    const path = url.pathname;
    const method = ((init && init.method) || "GET").toUpperCase();

    if (path === "/api/meta") return json(meta());
    if (path === "/api/search") {
      return json({ results: search(url.searchParams.get("q") || "",
                                    parseInt(url.searchParams.get("limit") || "12", 10)) });
    }
    if (path.startsWith("/api/player/")) {
      const payload = playerPayload(parseInt(path.split("/").pop(), 10));
      return payload ? json(payload) : json({ detail: "Player not found" }, 404);
    }
    if (path === "/api/leaderboard") return json({ results: leaderboard(url.searchParams) });
    if (path === "/api/scoring") {
      if (method === "PUT") {
        const body = JSON.parse((init && init.body) || "{}");
        return json({ scoring: setScoring(body.weights || {}) });
      }
      return json({ scoring: getScoring(), labels: D.stat_labels });
    }
    if (path === "/api/update" || path === "/api/update/status") {
      return json({ status: "unavailable", log: [
        "This build has the 5 seasons embedded in the file itself.",
        "Collection is a separate, manually configured local process.",
      ], report: null });
    }
    return json({ detail: "Not found" }, 404);
  };
})();
