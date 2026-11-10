// Hosted/local coordinator. Each verified whole-game checkpoint is committed before another API call.
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {readJSON,atomicJSON,published} from './files.mjs';
import {atomicPrivateJSON,readPrivateJSON,privateDirectory,makeDiskCache} from './highlightly-private.mjs';
import {makeHighlightlyClient} from './highlightly.mjs';
import {runSeasonBackfill,validateInventoryState} from './highlightly-backfill.mjs';
import {publicHighlightlySnapshot} from './highlightly-public.mjs';
import {publishLocal} from './publish.mjs';

export const CHECKPOINT='.github/highlightly-backfill.json';
export const INVENTORY='.github/highlightly-inventory.json';
const READY='.local/highlightly-checkpoint-ready.json';
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const optional=async file=>readJSON(file).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
export function publicInventory(state,now=new Date().toISOString()){
  validateInventoryState(state,now);
  const pick=(x,keys)=>Object.fromEntries(keys.filter(k=>x[k]!==undefined).map(k=>[k,x[k]]));
  const projected={...pick(state,['version','provider','season','dayUTC','offset','total','seenIds','complete']),games:state.games.map(g=>({...pick(g,['id','season','league','start','status','type','statsState','provider','finalScores']),classification:null,home:pick(g.home,['id','code']),away:pick(g.away,['id','code'])}))};
  validateInventoryState(projected,now);return projected;
}
export function persistGitCheckpoint(paths,{execute=spawnSync}={}){
  requireValue(paths.length>0&&paths.every(p=>[CHECKPOINT,INVENTORY].includes(p)),'Unapproved durable checkpoint path');
  const git=args=>{const r=execute('git',args,{encoding:'utf8',timeout:120000});if(r.status!==0)throw new Error('Durable Git checkpoint failed; stop before spending another provider call');return r;};
  git(['add','--',...paths]);
  const changed=execute('git',['diff','--cached','--quiet'],{encoding:'utf8'});
  requireValue([0,1].includes(changed.status),'Cannot inspect staged checkpoint');
  if(changed.status===0)return;
  const staged=git(['diff','--cached','--name-only']).stdout.trim().split('\n');
  requireValue(staged.every(p=>paths.includes(p)),'Unexpected staged file; checkpoint refused');
  git(['commit','-m','Save verified Highlightly backfill progress']);
  // Never automatically retry an uncertain push or force-push over another writer.
  git(['push','origin','HEAD:main']);
}
export async function runHostedBackfill({now=()=>Date.now(),clientOverride=null,persist=persistGitCheckpoint,hosted=process.env.GITHUB_ACTIONS==='true'}={}){
  requireValue(hosted,'Hosted GitHub Actions execution required');
  const reservation=await readJSON('.github/highlightly-quota.json');
  requireValue(reservation.dayUTC===new Date(now()).toISOString().slice(0,10)&&reservation.runId===String(process.env.GITHUB_RUN_ID)&&reservation.reservedRequests===90,'Current run does not own the committed quota reservation');
  const authorization=await readPrivateJSON('.local/highlightly-publication.json');
  await privateDirectory('.local');let lock;
  try{
    lock=await fs.open('.local/highlightly.lock','wx',0o600);
    await fs.rm(READY,{force:true});
    const ledger=await readPrivateJSON('.local/highlightly-request-ledger.json');
    const client=clientOverride||makeHighlightlyClient({key:process.env.HIGHLIGHTLY_API_KEY,maxRequests:90,dailyLimit:90,intervalMs:6100,ledger,saveLedger:value=>atomicPrivateJSON('.local/highlightly-request-ledger.json',value),now});
    const result=await runSeasonBackfill({client,cache:makeDiskCache(),now,
      previous:await readPrivateJSON('.local/highlightly-candidate.json'),
      identities:await readPrivateJSON('.local/highlightly-identities.json'),types:await readPrivateJSON('.local/highlightly-game-types.json'),
      schedule:await readJSON('config/highlightly-schedule.verified.json'),inventoryState:await optional(INVENTORY),
      saveState:async state=>{await atomicJSON(INVENTORY,publicInventory(state,new Date(now()).toISOString()));await persist([INVENTORY]);},
      saveProgress:async candidate=>{await fs.rm(READY,{force:true});await atomicPrivateJSON('.local/highlightly-candidate.json',candidate);await atomicJSON(CHECKPOINT,publicHighlightlySnapshot(candidate,authorization));await persist([CHECKPOINT]);await atomicPrivateJSON(READY,{runId:String(process.env.GITHUB_RUN_ID),dayUTC:reservation.dayUTC});}
    });
    console.log(JSON.stringify(result.snapshot.backfillProgress));return result;
  }finally{if(lock){await lock.close();await fs.unlink('.local/highlightly.lock');}}
}
export async function publishCheckpoint({now=()=>Date.now()}={}){
  const ready=await readPrivateJSON(READY);
  requireValue(ready.runId===String(process.env.GITHUB_RUN_ID)&&ready.dayUTC===new Date(now()).toISOString().slice(0,10),'No successfully pushed checkpoint for this run; refuse automatic push retry');
  const checkpoint=await optional(CHECKPOINT);if(!checkpoint)return null;
  const current=await published();
  requireValue(Date.parse(checkpoint.updatedAt)>=Date.parse(current.updatedAt),'Checkpoint is older than current public release');
  for(const game of current.games.filter(g=>g.statsState==='available'))requireValue(checkpoint.games.some(g=>g.id===game.id&&g.statsState==='available'),'Checkpoint would remove an already verified game');
  return publishLocal(checkpoint,{publicationAuthorization:await readPrivateJSON('.local/highlightly-publication.json')});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv[2]==='publish')await publishCheckpoint();else await runHostedBackfill();
  }catch{console.error('Season backfill stopped safely. Retain the committed quota reservation and normalized checkpoint; review workflow stage and coverage before resuming.');process.exitCode=1;}
}
