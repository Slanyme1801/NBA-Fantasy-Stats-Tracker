// Offline publication repair: no provider requests, no decryption, no quota writes.
import {pathToFileURL} from 'node:url';
import {readJSON,published} from './files.mjs';
import {runnerInputs} from './highlightly-actions.mjs';
import {healthProblems} from './tracker-health.mjs';
import {validateSeason} from '../assets/core.mjs';
import {publishLocal} from './publish.mjs';
export function recoveryCandidate(current,checkpoint,{now=new Date()}={}){
  validateSeason(current);validateSeason(checkpoint);
  if(current.provider!=='Highlightly'||checkpoint.provider!=='Highlightly'||checkpoint.season!==current.season)throw new Error('Checkpoint provider/season mismatch');
  const newer=Date.parse(checkpoint.updatedAt)-Date.parse(current.updatedAt);
  if(newer<=0)return null; // Equal-timestamp differences require review, never overwrite.
  if(healthProblems(checkpoint,{now}).length)throw new Error('Retained checkpoint is not complete and current; review it without resetting quota');
  const players=new Map(checkpoint.players.map(p=>[p.providerId,p]));
  for(const p of current.players){const retained=players.get(p.providerId);if(!retained||(p.nbaId!=null&&retained.nbaId!==p.nbaId))throw new Error('Recovery would remove/change a verified identity');}
  for(const g of current.games.filter(g=>g.statsState==='available')){
    const next=checkpoint.games.find(x=>x.id===g.id);
    if(!next||next.statsState!=='available'||next.home.id!==g.home.id||next.away.id!==g.away.id||next.start!==g.start||next.type!==g.type)throw new Error('Recovery would regress a verified game');
    if(g.boxScoreCheckedAt&&(!next.boxScoreCheckedAt||Date.parse(next.boxScoreCheckedAt)<Date.parse(g.boxScoreCheckedAt)))throw new Error('Recovery would regress a box-score check');
    const ids=new Set(checkpoint.lines.filter(l=>l.gameId===g.id).map(l=>l.providerId));
    if(current.lines.filter(l=>l.gameId===g.id).some(l=>!ids.has(l.providerId)))throw new Error('Recovery would remove verified player lines');
  }
  const {authorization}=runnerInputs(checkpoint);
  return {checkpoint,authorization};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.env.GITHUB_ACTIONS!=='true')throw new Error('Hosted recovery required');
    const current=await published(),checkpoint=await readJSON('.github/highlightly-backfill.json');
    const selected=recoveryCandidate(current,checkpoint);
    if(selected){await publishLocal(selected.checkpoint,{publicationAuthorization:selected.authorization});console.log('A strictly newer complete verified checkpoint was selected for publication, without a provider call.');}
    else console.log('No strictly newer checkpoint: data left unchanged.');
  }catch(error){console.error(error.message);process.exitCode=1;}
}
