// GitHub runner setup. Public durable state contains quota reservation metadata only.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {published,readJSON,atomicJSON} from './files.mjs';
import {atomicPrivateJSON} from './highlightly-private.mjs';
import {bootstrapPrivateSnapshot} from './highlightly-daily.mjs';
import {validateSeason,validateIdentityMap,validateProviderRegistry,migrateHighlightlySeason} from '../assets/core.mjs';
export function reserveDailyBudget(previous,{now=new Date(),runId}){
  const today=now.toISOString().slice(0,10);
  if(now.getUTCHours()===23)throw new Error('Hosted runs must start before 23:00 UTC to avoid crossing the quota day');
  if(!/^\d+$/.test(String(runId)))throw new Error('Invalid workflow run ID');
  if(previous){
    if(previous.version!==1||previous.provider!=='Highlightly'||!/^\d{4}-\d{2}-\d{2}$/.test(previous.dayUTC)||!Number.isFinite(Date.parse(previous.dayUTC))||new Date(previous.dayUTC).toISOString().slice(0,10)!==previous.dayUTC||previous.dayUTC>today||previous.reservedRequests!==90||!/^\d+$/.test(String(previous.runId))||previous.status!=='reserved-before-network'||!Number.isFinite(Date.parse(previous.reservedAt))||new Date(previous.reservedAt).toISOString().slice(0,10)!==previous.dayUTC)throw new Error('Invalid or future durable quota reservation');
    if(previous.dayUTC===today)throw new Error('Today is already reserved; no second Highlightly attempt permitted');
  }
  return {version:1,provider:'Highlightly',dayUTC:today,reservedRequests:90,runId:String(runId),reservedAt:now.toISOString(),status:'reserved-before-network'};
}
export function runnerInputs(snapshot,verifiedIdentities=null){
  validateSeason(snapshot);
  if(snapshot.provider!=='Highlightly'||snapshot.publicationPolicy!=='authorized-public-normalized'||snapshot.publicationAuthorization?.scope!=='normalized-fantasy-stats')throw new Error('An authorized public Highlightly snapshot is required');
  const authorization={provider:'Highlightly',season:'2026-27',publicationAllowed:true,publicDatasetAllowed:true,approvedBy:'repository-owner',publicScope:'normalized-fantasy-stats',confirmedAt:snapshot.publicationAuthorization.confirmedAt,source:'Owner attestation recorded in the validated public snapshot'};
  // Carry only previously verified scheduling metadata, never infer activation from YAML presence.
  if(snapshot.refreshSchedule?.configured===true&&snapshot.refreshSchedule?.verified===true)authorization.refreshSchedule={...snapshot.refreshSchedule,description:'Daily attempt at 09:17 UTC. Verified partial dataset only; GitHub Actions may run late or skip scheduled events.'};
  const candidate=migrateHighlightlySeason(bootstrapPrivateSnapshot(snapshot,authorization));
  const players=[...candidate.players];
  if(verifiedIdentities!==null){
    if(verifiedIdentities?.provider!=='Highlightly'||verifiedIdentities?.season!=='2026-27')throw new Error('Explicit verified Highlightly identity namespace and season required');
    validateIdentityMap(verifiedIdentities);
    const nbaIds=new Map(players.filter(p=>p.nbaId!=null).map(p=>[p.nbaId,p.providerId])),providerIds=new Map(players.map(p=>[p.providerId,p.nbaId]));
    for(const person of verifiedIdentities.players){
      if((nbaIds.has(person.nbaId)&&nbaIds.get(person.nbaId)!==person.providerId)||(providerIds.get(person.providerId)!=null&&providerIds.get(person.providerId)!==person.nbaId))throw new Error('Verified NBA/Highlightly identity collision');
      // Existing pairs keep their original provenance. Names are never used to join identities.
      if(nbaIds.has(person.nbaId))continue;
      const verified={...Object.fromEntries(['nbaId','providerId','name','source','verifiedAt'].map(key=>[key,person[key]])),playerKey:`highlightly:${person.providerId}`};
      const index=players.findIndex(p=>p.providerId===person.providerId);
      if(index>=0)players[index]=verified;else players.push(verified);
      nbaIds.set(person.nbaId,person.providerId);providerIds.set(person.providerId,person.nbaId);
    }
  }
  validateProviderRegistry({provider:'Highlightly',season:'2026-27',players});
  candidate.players=players;
  const byProvider=new Map(players.map(p=>[p.providerId,p]));
  candidate.lines=candidate.lines.map(line=>({...line,playerKey:`highlightly:${line.providerId}`,nbaId:byProvider.get(line.providerId)?.nbaId??null}));
  validateSeason(candidate);
  const verifiedPlayers=players.filter(p=>p.nbaId!=null);validateIdentityMap({season:'2026-27',players:verifiedPlayers});
  return {authorization,candidate,identities:{provider:'Highlightly',season:'2026-27',players:verifiedPlayers},types:{provider:'Highlightly',season:'2026-27',games:candidate.games.filter(g=>g.type!=='unknown').map(g=>({id:g.id,type:g.type,source:g.classification.source,verifiedAt:g.classification.verifiedAt}))}};
}
export function resumeSnapshot(current,checkpoint){
  if(!checkpoint)return current;
  runnerInputs(checkpoint);
  if(Date.parse(checkpoint.updatedAt)<Date.parse(current.updatedAt))return current;
  for(const game of current.games.filter(g=>g.statsState==='available'))if(!checkpoint.games.some(g=>g.id===game.id&&g.statsState==='available'))throw new Error('Checkpoint would remove an already verified game');
  return checkpoint;
}
export async function prepareRunner({runId,now=new Date()}){
  const reservation=await readJSON('.github/highlightly-quota.json');
  if(reservation.dayUTC!==now.toISOString().slice(0,10)||reservation.runId!==String(runId)||reservation.reservedRequests!==90)throw new Error('Current workflow must own the committed UTC reservation');
  const checkpoint=await readJSON('.github/highlightly-backfill.json').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  const verifiedIdentities=await readJSON('config/highlightly-identities.verified.json').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  const {authorization,candidate,identities,types}=runnerInputs(resumeSnapshot(await published(),checkpoint),verifiedIdentities);
  const files={
    '.local/highlightly-publication.json':authorization,'.local/highlightly-candidate.json':candidate,
    '.local/highlightly-identities.json':identities,'.local/highlightly-game-types.json':types,
    '.local/highlightly-request-ledger.json':{provider:'Highlightly',requests:[]},
    '.local/highlightly-actions-config.json':{enabled:true,provider:'Highlightly',lookbackDays:3,dailyLimit:90,maxRequestsPerRun:90,identityMap:'.local/highlightly-identities.json',gameTypes:'.local/highlightly-game-types.json',candidate:'.local/highlightly-candidate.json',publishLocally:true,publicationAuthorization:'.local/highlightly-publication.json',bootstrapFromPublished:false}
  };
  // This command is exclusively for a fresh hosted runner, not the user's private workspace.
  try{await fs.access('.local/highlightly-request-ledger.json');throw new Error('Existing private ledger must not be replaced');}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const [file,value]of Object.entries(files))await atomicPrivateJSON(file,value);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.env.GITHUB_ACTIONS!=='true')throw new Error('Hosted GitHub Actions execution required');
    if(process.argv[2]==='reserve'){
      const prior=await readJSON('.github/highlightly-quota.json').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
      await atomicJSON('.github/highlightly-quota.json',reserveDailyBudget(prior,{runId:process.env.GITHUB_RUN_ID}));
    }else if(process.argv[2]==='prepare')await prepareRunner({runId:process.env.GITHUB_RUN_ID});
    else throw new Error('Unknown runner operation');
  }catch{console.error('Highlightly hosted setup refused. Review reservation, public snapshot and run identity.');process.exitCode=1;}
}
