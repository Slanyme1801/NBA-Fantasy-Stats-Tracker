// Read-only health checks. Never contacts the statistics provider or changes quota.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateSeason,collectionFreshness} from '../assets/core.mjs';
import {publicBackfillProgress} from './highlightly-public.mjs';
import {readJSON,published,checksum} from './files.mjs';
export const SITE='https://slanyme1801.github.io/NBA-Fantasy-Stats-Tracker/';
export function healthProblems(snapshot,{now=new Date()}={}){
  validateSeason(snapshot);
  const problems=[],p=snapshot.backfillProgress;
  try{publicBackfillProgress(p);}catch{problems.push('Coverage counters are malformed');}
  if(now.toISOString().slice(0,10)>='2027-07-01')problems.push('Season configuration requires review before collecting a new season');
  if(snapshot.provider!=='Highlightly'||snapshot.connection!=='connected')problems.push('Provider is not connected');
  // A daily inventory, including an empty game day, is the heartbeat. A recent
  // attempt timestamp or the date of the last game is NOT proof of freshness.
  const freshness=collectionFreshness(snapshot,now);
  if(!p||p.inventoryComplete!==true)problems.push('Season inventory is incomplete');
  if(freshness.state==='stale')problems.push(`Inventory heartbeat is stale or invalid (expected ${freshness.expectedDay} or later)`);
  for(const field of ['pendingGames','sourceFailureGames','unmappedGames','unclassifiedGames'])if(!Number.isInteger(p?.[field])||p[field]!==0)problems.push(`Coverage requires attention: ${field}`);
  if(p?.verifiedBoxScores!==snapshot.games.filter(g=>g.statsState==='available').length||p?.verifiedRegularBoxScores!==snapshot.games.filter(g=>g.type==='regular'&&g.statsState==='available').length)problems.push('Coverage counters disagree with verified games');
  if(snapshot.games.some(g=>g.type==='unknown'||g.status==='finished'&&g.statsState!=='available'||g.refreshIssue))problems.push('At least one game is missing or has a refresh issue');
  if(!Number.isFinite(Date.parse(snapshot.updatedAt))||Date.parse(snapshot.updatedAt)>now.getTime()+300000)problems.push('Publication timestamp is invalid or in the future');
  return problems;
}
export async function checkLive(manifest,{fetcher=fetch}={}){
  const get=async path=>{
    const response=await fetcher(new URL(path,SITE),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Published site HTTP ${response.status}`);
    const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>25*1024*1024)throw new Error('Published response is unexpectedly large');return bytes;
  };
  const live=JSON.parse(new TextDecoder().decode(await get('data/manifest.json')));
  if(live.file!==manifest.file||live.sha256!==manifest.sha256||live.updatedAt!==manifest.updatedAt)throw new Error('GitHub Pages is not serving the current data manifest');
  if(!/^data\/releases\/[a-z0-9.-]+\.json$/.test(live.file))throw new Error('Invalid published release path');
  const bytes=await get(live.file);if(checksum(bytes)!==live.sha256)throw new Error('Published release checksum mismatch');
  validateSeason(JSON.parse(new TextDecoder().decode(bytes)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const problems=[];
  try{
    const snapshot=await published(),manifest=await readJSON('data/manifest.json');problems.push(...healthProblems(snapshot));
    const checkpoint=await readJSON('.github/highlightly-backfill.json');validateSeason(checkpoint);
    if(Date.parse(checkpoint.updatedAt)>Date.parse(snapshot.updatedAt))problems.push('A newer retained checkpoint has not been published');
    if(checkpoint.updatedAt===snapshot.updatedAt&&JSON.stringify(checkpoint)!==JSON.stringify(snapshot))problems.push('Equal-timestamp checkpoint differs from publication; manual review required');
    if(process.argv.includes('--live'))await checkLive(manifest);
  }catch(error){problems.push(error.message);}
  const report=problems.length?`Tracker health requires attention:\n${problems.map(p=>`- ${p}`).join('\n')}`:'Tracker health checks passed: current inventory, complete reported coverage and verified data.';
  console.log(report);if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,report+'\n');
  if(problems.length)process.exitCode=1;
}
