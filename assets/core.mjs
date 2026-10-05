// Shared by the static app, collector and tests. No provider calls in the browser.
export const SEASON = '2026-27';
export const DEFAULT_SCORING = Object.freeze({pts:1,fg3m:1,fgm:2,fga:-1,ftm:1,fta:-1,reb:1,ast:2,stl:4,blk:4,tov:-2});
export const COUNTERS = [...Object.keys(DEFAULT_SCORING), 'fg3a'];
export const POSITIONS = ['PG','SG','SF','PF','C'];
export const GAME_TYPES = ['regular','preseason','playoffs','play-in','cup-final','all-star','unknown'];
export const GAME_STATUSES = ['scheduled','live','finished','postponed','delayed','canceled'];
export const emptySeason = () => ({schemaVersion:1,season:SEASON,provider:'API-NBA / API-Sports',connection:'not-connected',updatedAt:null,coverageCheckedAt:null,players:[],games:[],lines:[],positions:{season:SEASON,source:'ESPN manual import',importedAt:null,entries:[]}});
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const validId = value => Number.isSafeInteger(value) && value > 0;
const validDate = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const safeText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 300 && !/[<>\x00-\x1f]/.test(value);
export function validateWeights(weights) {
  requireValue(weights && Object.keys(DEFAULT_SCORING).every(k => Number.isFinite(weights[k]) && Math.abs(weights[k]) <= 1000), 'Invalid scoring weights');
  return weights;
}
export function fantasyPoints(stats, weights = DEFAULT_SCORING) {
  validateWeights(weights);
  if (!stats || Object.keys(DEFAULT_SCORING).some(k => !Number.isFinite(stats[k]))) return null;
  return Object.keys(DEFAULT_SCORING).reduce((sum,k) => sum + stats[k]*weights[k],0);
}
export function scoringName(weights) {
  return Object.keys(DEFAULT_SCORING).every(k => weights[k] === DEFAULT_SCORING[k]) ? 'ESPN default' : 'Custom scoring';
}
export function validatePositions(document, knownIds) {
  requireValue(document?.season === SEASON && Array.isArray(document.entries), 'ESPN import must be a 2026-27 snapshot');
  requireValue(safeText(document.source) && /ESPN/i.test(document.source), 'ESPN source is required');
  requireValue(!document.entries.length || validDate(document.importedAt), 'ESPN import timestamp required');
  const nbaIds = new Set(), espnIds = new Set();
  for (const p of document.entries) {
    requireValue(validId(p.nbaId) && (!knownIds || knownIds.has(p.nbaId)) && validId(p.espnId), 'Unknown NBA ID or invalid ESPN ID');
    requireValue(!nbaIds.has(p.nbaId) && !espnIds.has(p.espnId), 'Duplicate ESPN identity');
    nbaIds.add(p.nbaId); espnIds.add(p.espnId);
    requireValue(Array.isArray(p.positions) && p.positions.length > 0 && new Set(p.positions).size === p.positions.length && p.positions.every(x => POSITIONS.includes(x)), 'Only verified PG/SG/SF/PF/C eligibility is accepted');
    requireValue(safeText(p.source) && validDate(p.observedAt) && Date.parse(p.observedAt) <= Date.parse(document.importedAt), 'Eligibility needs source and observation date before import');
  }
  return document;
}
export function validateIdentityMap(document) {
  requireValue(document?.season === SEASON && Array.isArray(document.players), 'Invalid identity map season');
  const providerIds = new Set(), nbaIds = new Set();
  for (const p of document.players) {
    requireValue(validId(p.nbaId) && validId(p.providerId), 'NBA and provider IDs are required');
    requireValue(!providerIds.has(p.providerId) && !nbaIds.has(p.nbaId), 'Duplicate identity mapping');
    requireValue(safeText(p.name) && safeText(p.source) && validDate(p.verifiedAt), 'Identity mapping needs name, source and verification date');
    providerIds.add(p.providerId); nbaIds.add(p.nbaId);
  }
  return document;
}
export function validateSeason(data, historicalIds = []) {
  requireValue(data?.schemaVersion === 1 && data.season === SEASON, 'Unsupported season/schema');
  requireValue(['not-connected','connected'].includes(data.connection), 'Invalid connection state');
  requireValue(Array.isArray(data.players) && Array.isArray(data.games) && Array.isArray(data.lines), 'Missing data arrays');
  validateIdentityMap({season:SEASON,players:data.players});
  const players = new Map(data.players.map(p => [p.nbaId,p]));
  const games = new Map();
  for (const g of data.games) {
    requireValue(validId(g.id) && !games.has(g.id), 'Duplicate/invalid game ID');
    requireValue(g.season === SEASON && g.league === 'standard' && validDate(g.start), 'Invalid game scope/date');
    requireValue(GAME_TYPES.includes(g.type) && GAME_STATUSES.includes(g.status), 'Invalid game classification/status');
    requireValue(validId(g.home?.id) && validId(g.away?.id) && g.home.id !== g.away.id && safeText(g.home.code) && safeText(g.away.code), 'Invalid game teams');
    requireValue(g.type === 'unknown' || (safeText(g.classification?.source) && validDate(g.classification?.verifiedAt)), 'Game type needs verified provenance');
    requireValue(['not-fetched','available','missing'].includes(g.statsState), 'Invalid game coverage');
    games.set(g.id,g);
  }
  const keys = new Set();
  for (const r of data.lines) {
    const g = games.get(r.gameId), p = players.get(r.nbaId), key = `${r.gameId}:${r.nbaId}`;
    requireValue(g && p && r.providerId === p.providerId, 'Unmapped line identity');
    requireValue(!keys.has(key), 'Duplicate game/player line'); keys.add(key);
    requireValue([g.home.id,g.away.id].includes(r.teamId), 'Line team does not belong to game');
    requireValue(['played','dnp','missing'].includes(r.participation), 'Invalid participation');
    requireValue(validDate(r.updatedAt), 'Line needs update timestamp');
    requireValue(r.comment == null || typeof r.comment === 'string', 'Invalid participation comment');
    if (r.participation === 'played') {
      requireValue(COUNTERS.every(k => Number.isSafeInteger(r.stats?.[k]) && r.stats[k] >= 0), 'Played line requires all raw counters');
      requireValue(Number.isInteger(r.seconds) && r.seconds >= 0 && (r.seconds > 0 || COUNTERS.some(k => r.stats[k] > 0)), 'Played line needs participation evidence');
      const s = r.stats;
      requireValue(s.fgm <= s.fga && s.fg3m <= s.fg3a && s.fg3m <= s.fgm && s.fg3a <= s.fga && s.ftm <= s.fta, 'Invalid shooting counters');
      requireValue(s.pts === 2*s.fgm+s.fg3m+s.ftm, 'Points do not reconcile with shots');
    } else requireValue(r.stats === null, 'DNP/missing rows cannot masquerade as zero stats');
  }
  if (data.connection === 'not-connected') requireValue(!data.games.length && !data.lines.length && !data.players.length && data.updatedAt === null, 'Disconnected data must be empty');
  else requireValue(validDate(data.updatedAt) && validDate(data.coverageCheckedAt), 'Connected data needs collection and coverage timestamps');
  validatePositions(data.positions,new Set([...historicalIds,...players.keys()]));
  return data;
}
export function bounds(days = null, asOf = new Date()) {
  const now = new Date(asOf);
  requireValue(Number.isFinite(+now), 'Invalid period date');
  requireValue(days === null || [7,14,30].includes(Number(days)), 'Period must be season, 7, 14 or 30 calendar days');
  const end = now.toISOString().slice(0,10);
  const startDate = new Date(`${end}T00:00:00Z`);
  if (days !== null) startDate.setUTCDate(startDate.getUTCDate() - Number(days) + 1);
  return {start:days === null ? null : startDate.toISOString().slice(0,10),end,timeZone:'UTC',days};
}
export function aggregate(data,nbaId,{days=null,asOf=new Date(),weights=DEFAULT_SCORING}={}) {
  const period = bounds(days,asOf), games = new Map(data.games.map(g => [g.id,g]));
  const inPeriod = g => {
    if(g?.season !== SEASON || g.league !== 'standard' || g.type !== 'regular' || g.status !== 'finished') return false;
    const day=new Date(g.start).toISOString().slice(0,10);
    return day <= period.end && (!period.start || day >= period.start);
  };
  const lines = data.lines.filter(r => r.nbaId === nbaId && inPeriod(games.get(r.gameId)));
  const played = lines.filter(r => r.participation === 'played');
  const totals = Object.fromEntries(COUNTERS.map(k => [k,played.reduce((sum,r) => sum+r.stats[k],0)]));
  const gp = played.length;
  const totalFpts = gp ? fantasyPoints(totals,weights) : null;
  const averages = Object.fromEntries(COUNTERS.map(k => [k,gp ? totals[k]/gp : null]));
  const pct = (m,a) => gp && totals[a] > 0 ? 100*totals[m]/totals[a] : null;
  // The provider does not guarantee complete rosters. An absent player line is
  // unknown, never an inferred DNP. Global uncollected games remain visible.
  return {period,gp,totals:gp ? totals:null,averages,totalFpts,fptsPerGame:gp ? totalFpts/gp:null,minutes:gp ? played.reduce((sum,r)=>sum+r.seconds,0)/60/gp:null,
    percentages:{fg:pct('fgm','fga'),three:pct('fg3m','fg3a'),ft:pct('ftm','fta')},
    dnp:lines.filter(r=>r.participation==='dnp').length,missing:lines.filter(r=>r.participation==='missing').length,
    gamesInPeriod:data.games.filter(inPeriod).length,uncollectedGames:data.games.filter(g=>inPeriod(g)&&g.statsState!=='available').length};
}
export function similarPlayers(data,nbaId,{mode='both',tolerance=5,minGames=3,limit=12,...period}={}) {
  requireValue(['positions','fpts','both'].includes(mode), 'Invalid similarity mode');
  requireValue(Number.isFinite(tolerance) && tolerance >= 0 && Number.isInteger(minGames) && minGames >= 1, 'Invalid similarity filters');
  const base = aggregate(data,nbaId,period), eligibility = new Map(data.positions.entries.map(p=>[p.nbaId,p]));
  const own = eligibility.get(nbaId)?.positions || [];
  if (!base.gp || (mode !== 'fpts' && !own.length)) return {base,results:[],reason:!base.gp ? 'No complete games for this period.' : 'Verified ESPN eligibility is missing for this player.'};
  if (base.gp < minGames) return {base,results:[],reason:`Reference player has fewer than ${minGames} complete games.`};
  const results = data.players.filter(p=>p.nbaId!==nbaId).map(p=>{
    const stats=aggregate(data,p.nbaId,period), pos=eligibility.get(p.nbaId);
    return {...p,stats,eligibility:pos,compatible:pos?.positions.some(x=>own.includes(x)) || false,gap:stats.gp ? Math.abs(stats.fptsPerGame-base.fptsPerGame):Infinity};
  }).filter(p=>p.stats.gp>=minGames && (mode==='fpts'||p.compatible) && (mode==='positions'||p.gap<=tolerance))
    .sort((a,b)=>a.gap-b.gap || b.stats.gp-a.stats.gp || a.nbaId-b.nbaId).slice(0,limit);
  return {base,results,reason:results.length ? null : 'No player meets these filters and sample size.'};
}
// Replace an entire fetched game's lines, including deletions in provider corrections.
export function replaceGameLines(existing,gameId,incoming) {
  requireValue(incoming.every(r=>r.gameId===gameId), 'Wrong game in replacement');
  const keys=new Set();
  for(const r of incoming){requireValue(!keys.has(r.nbaId),'Duplicate player in provider response');keys.add(r.nbaId);}
  return [...existing.filter(r=>r.gameId!==gameId),...incoming];
}

// Slot-normalized trade estimate, not a games-weighted team average.
export function tradeValue(left, right, replacement = 28.5) {
  requireValue(Number.isFinite(replacement) && replacement >= 0, 'Replacement AVG must be a non-negative number');
  requireValue(Array.isArray(left) && Array.isArray(right) && left.length <= 5 && right.length <= 5, 'Choose up to five players per side');
  if (!left.length || !right.length || [...left,...right].some(v=>!Number.isFinite(v))) return null;
  const slots = Math.max(left.length,right.length);
  const side = values => {
    const added = slots-values.length, sum = values.reduce((a,b)=>a+b,0)+added*replacement;
    return {players:values.length,added,rawSum:values.reduce((a,b)=>a+b,0),sum,average:sum/slots};
  };
  const a=side(left),b=side(right);
  return {left:a,right:b,slots,sumDifference:b.sum-a.sum,averageDifference:b.average-a.average};
}
