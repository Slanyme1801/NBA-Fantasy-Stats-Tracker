// Deliberate projection of normalized data. Never publish raw responses or local state.
import {validateSeason,SEASON} from '../assets/core.mjs';
import {COOPER_DEBUT_REFERENCE} from './highlightly-participation-reference.mjs';
import {SOURCE_ERROR_CODES} from './highlightly-source-errors.mjs';
import {PROVIDER,datesInRange} from './highlightly.mjs';
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const date=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const pick=(object,keys)=>Object.fromEntries(keys.filter(k=>object[k]!==undefined).map(k=>[k,object[k]]));
export function authorizeHighlightlyPublication(authorization){
  requireValue(authorization?.provider===PROVIDER&&authorization.season===SEASON&&authorization.publicationAllowed===true&&authorization.publicDatasetAllowed===true&&authorization.approvedBy==='repository-owner'&&authorization.publicScope==='normalized-fantasy-stats'&&date(authorization.confirmedAt)&&typeof authorization.source==='string'&&authorization.source.trim().length>0,'Publication blocked: explicit owner attestation of public dataset permission is required');
  return authorization;
}
export function publicHighlightlySnapshot(candidate,authorization){
  authorizeHighlightlyPublication(authorization);validateSeason(candidate);
  requireValue(candidate.provider===PROVIDER&&candidate.scope?.completeSeason===false&&candidate.games.every(g=>g.provider===PROVIDER)&&candidate.lines.every(l=>l.provider===PROVIDER),'Publication blocked: mixed namespace or unsupported coverage');
  datesInRange(candidate.scope.startDate,candidate.scope.startDate);datesInRange(candidate.scope.endDate,candidate.scope.endDate);
  requireValue(candidate.scope.startDate<=candidate.scope.endDate&&candidate.scope.timeZone==='America/New_York','Invalid publication scope');
  const coverage=candidate.coverage||[{startDate:candidate.scope.startDate,endDate:candidate.scope.endDate,normalizedAt:candidate.updatedAt,requests:[]}];
  requireValue(Array.isArray(coverage)&&coverage.length>0,'Missing coverage provenance');
  const intervals=coverage.map(c=>{
    datesInRange(c.startDate,c.endDate);requireValue(date(c.normalizedAt)&&Array.isArray(c.requests),'Invalid coverage provenance');
    const fetched=[...new Set(c.requests.map(r=>r.fetchedAt))];requireValue(fetched.every(date),'Invalid source fetch timestamp');
    return {startDate:c.startDate,endDate:c.endDate,normalizedAt:c.normalizedAt,requests:fetched.map(fetchedAt=>({fetchedAt}))};
  });
  // Reject arbitrary caller data rather than spreading the private snapshot into a release.
  const result={schemaVersion:1,season:SEASON,provider:PROVIDER,publicationPolicy:'authorized-public-normalized',connection:candidate.connection,updatedAt:candidate.updatedAt,coverageCheckedAt:candidate.coverageCheckedAt,
    scope:{startDate:candidate.scope.startDate,endDate:candidate.scope.endDate,timeZone:'America/New_York',completeSeason:false,mayHaveGaps:true},coverage:intervals,minutesPrecision:'rounded-whole-minute',
    publicationAuthorization:{provider:PROVIDER,confirmedAt:authorization.confirmedAt,scope:'normalized-fantasy-stats',basis:'Owner attestation of provider permission'},
    players:candidate.players.map(p=>pick(p,['nbaId','providerId','name','source','verifiedAt'])),
    games:candidate.games.map(g=>({...pick(g,['id','season','league','start','status','type','statsState','provider','finalScores','boxScoreCheckedAt']),refreshIssue:publicRefreshIssue(g.refreshIssue),classification:g.classification?pick(g.classification,['source','verifiedAt']):null,home:pick(g.home,['id','code']),away:pick(g.away,['id','code'])})),
    lines:candidate.lines.map(l=>({...pick(l,['gameId','nbaId','providerId','teamId','participation','seconds','minutesPrecision','updatedAt','provider']),stats:l.stats?pick(l.stats,['pts','fgm','fga','fg3m','fg3a','ftm','fta','reb','ast','tov','stl','blk']):null,comment:null})),
    positions:{...pick(candidate.positions,['season','source','importedAt']),entries:candidate.positions.entries.map(p=>pick(p,['nbaId','espnId','positions','source','observedAt']))}};
  if(candidate.backfillProgress)result.backfillProgress=publicBackfillProgress(candidate.backfillProgress);
  // Only a reviewed, actually configured scheduler may be advertised as active.
  const schedule=authorization.refreshSchedule;
  if(schedule?.configured===true&&schedule.verified===true&&typeof schedule.description==='string'&&schedule.description.trim())result.refreshSchedule={configured:true,verified:true,description:schedule.description};
  return validateSeason(result);
}

// Durable checkpoints contain exactly this safe public projection, never a raw cache.
export function publicRefreshIssue(issue){
  if(!issue)return undefined;
  requireValue(['unmapped-players','backfill-pending','request-budget','source-data-error'].includes(issue.code)&&date(issue.attemptedAt)&&typeof issue.preservedPreviousBoxScore==='boolean','Invalid refresh issue');
  const result=pick(issue,['code','attemptedAt','preservedPreviousBoxScore']);
  if(issue.code==='unmapped-players'){
    requireValue(Number.isSafeInteger(issue.unmappedPlayerCount)&&issue.unmappedPlayerCount>0,'Invalid missing identity count');result.unmappedPlayerCount=issue.unmappedPlayerCount;
    if(issue.identityRevision!==undefined){requireValue(/^[a-f0-9]{64}$/.test(issue.identityRevision),'Invalid identity revision');result.identityRevision=issue.identityRevision;}
  }
  if(issue.sourceErrorCode!==undefined){requireValue(issue.code==='source-data-error'&&SOURCE_ERROR_CODES.has(issue.sourceErrorCode),'Invalid source error code');result.sourceErrorCode=issue.sourceErrorCode;}
  if(issue.identityObservations!==undefined)result.identityObservations=publicIdentityObservations(issue.identityObservations);
  if(issue.participationReference!==undefined)result.participationReference=publicParticipationReference(issue.participationReference);
  if(issue.officialReference!==undefined)result.officialReference=publicOfficialReference(issue.officialReference);
  // Free-form error messages are deliberately excluded.
  return result;
}
export function publicBackfillProgress(progress){
  const counts=['inventoryOffset','completedGamesSeen','outsideDateScopeFinished','regularGamesSeen','verifiedRegularBoxScores','verifiedBoxScores','sourceFailureGames','unmappedGames','unclassifiedGames','pendingGames'];
  requireValue(counts.every(k=>Number.isSafeInteger(progress[k])&&progress[k]>=0)&&(progress.inventoryTotal===null||(Number.isSafeInteger(progress.inventoryTotal)&&progress.inventoryTotal>=0))&&typeof progress.inventoryComplete==='boolean'&&typeof progress.budgetExhausted==='boolean'&&date(progress.attemptedAt)&&/^\d{4}-\d\d-\d\d$/.test(progress.inventoryDayUTC),'Invalid backfill progress');
  return pick(progress,[...counts,'inventoryTotal','inventoryComplete','inventoryDayUTC','budgetExhausted','attemptedAt']);
}

export function publicIdentityObservations(rows){
  const id=n=>Number.isSafeInteger(n)&&n>0;
  requireValue(Array.isArray(rows)&&rows.length<=100,'Invalid identity observations');
  return rows.map(r=>{requireValue(id(r.gameId)&&id(r.teamId)&&id(r.providerId)&&date(r.fetchedAt)&&(r.name===null||(typeof r.name==='string'&&r.name.length<=100&&/^[\p{L}\p{M} .,'’\-]+$/u.test(r.name))),'Invalid identity observation');return pick(r,['gameId','teamId','providerId','name','fetchedAt']);});
}
export function publicOfficialReference(r){
  requireValue(r?.gameId===1547577&&r.nbaGameId==='0022600008'&&r.source==='https://www.nba.com/game/0022600008/box-score'&&date(r.verifiedAt)&&date(r.checkedAt)&&['verified','mismatch','unverifiable'].includes(r.status)&&Array.isArray(r.checks)&&r.checks.length===4,'Invalid official reference');
  const expected=new Map([['1626157:stl',0],['1628404:stl',3],['203903:fgm',0],['203903:fga',0]]),seen=new Set();
  const checks=r.checks.map(c=>{const key=`${c.nbaId}:${c.stat}`;requireValue(expected.has(key)&&expected.get(key)===c.expected&&!seen.has(key),'Invalid official comparison');seen.add(key);requireValue([1626157,1628404,203903].includes(c.nbaId)&&(c.providerId===null||(Number.isSafeInteger(c.providerId)&&c.providerId>0))&&['stl','fgm','fga'].includes(c.stat)&&Number.isSafeInteger(c.expected)&&c.expected>=0&&(c.observed===null||(Number.isSafeInteger(c.observed)&&c.observed>=0))&&['verified','mismatch','unverifiable'].includes(c.status),'Invalid official comparison');return pick(c,['nbaId','providerId','stat','expected','observed','status']);});
  return {...pick(r,['gameId','nbaGameId','source','verifiedAt','checkedAt','status']),checks};
}

export function publicParticipationReference(r){
  requireValue(r&&Object.entries(COOPER_DEBUT_REFERENCE).every(([key,value])=>r[key]===value)&&Number.isSafeInteger(r.gameId)&&r.gameId>0&&Number.isSafeInteger(r.observedTeamId)&&r.observedTeamId>0&&r.observedParticipation==='played'&&date(r.checkedAt),'Invalid official participation reference');
  datesInRange(r.gameDateET,r.gameDateET);requireValue(r.gameDateET<COOPER_DEBUT_REFERENCE.firstAppearanceET,'Invalid participation conflict date');
  return pick(r,[...Object.keys(COOPER_DEBUT_REFERENCE),'gameId','gameDateET','observedTeamId','observedParticipation','checkedAt']);
}
