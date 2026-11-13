// One reviewed game recovered entirely from its retained encrypted response.
// No provider client, raw export, quota change, or automatic push retry.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {decryptRecord} from './highlightly-quarantine.mjs';
import {TARGET_GAME,TARGET_ARCHIVE,TARGET_SHA256} from './highlightly-quarantine-audit.mjs';
import {parseBoxScore,normalizeBoxScore,providerPlayers,localMatchDay} from './highlightly.mjs';
import {checkOfficialReference} from './highlightly-reference.mjs';
import {checkOfficialParticipation,DADIET_DNP_REFERENCE} from './highlightly-participation-reference.mjs';
import {runnerInputs} from './highlightly-actions.mjs';
import {publicHighlightlySnapshot} from './highlightly-public.mjs';
import {published,readJSON,atomicJSON} from './files.mjs';
import {publishLocal} from './publish.mjs';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
export function checkSynchronizedCheckpoint(current,checkpoint){
 check(JSON.stringify(checkpoint)===JSON.stringify(current),'Unpublished checkpoint differs; preserve it and review before recovery');
}
export function recoverReviewedGame(current,{body,fetchedAt,now=new Date().toISOString(),verifiedIdentities=null}){
 check(Number.isFinite(Date.parse(now))&&Number.isFinite(Date.parse(fetchedAt))&&Date.parse(now)>=Date.parse(fetchedAt)&&Date.parse(now)>=Date.parse(current.updatedAt),'Invalid recovery chronology');
 const {candidate,authorization,identities}=runnerInputs(current,verifiedIdentities);
 const game=candidate.games.find(g=>g.id===TARGET_GAME);
 check(game?.statsState==='missing'&&game.refreshIssue?.sourceErrorCode==='counter-invalid'&&!candidate.lines.some(l=>l.gameId===TARGET_GAME),'Only the reviewed missing game may be recovered');
 const parsed=parseBoxScore(body,game);
 check(!checkOfficialParticipation(parsed,game,now),'Official participation conflict');
 check(checkOfficialReference(body,game,identities,now)?.status==='verified','Official counter reference conflict');
 const players=new Map(candidate.players.map(p=>[p.providerId,p]));
 for(const person of providerPlayers(body,game,candidate.players,now))players.set(person.providerId,person);
 candidate.players=[...players.values()];
 const lines=normalizeBoxScore(body,game,candidate.players,now);
 const dadiet=lines.find(l=>l.providerId===DADIET_DNP_REFERENCE.providerId);
 check(dadiet?.nbaId===DADIET_DNP_REFERENCE.nbaId&&dadiet.participation==='dnp'&&dadiet.stats===null&&dadiet.seconds===null,'Reviewed DNP was not preserved');
 candidate.lines.push(...lines);game.statsState='available';game.boxScoreCheckedAt=fetchedAt;delete game.refreshIssue;
 candidate.updatedAt=now;
 const day=localMatchDay(game);candidate.coverage=[...(candidate.coverage||[]),{startDate:day,endDate:day,normalizedAt:now,requests:[{fetchedAt}]}];
 if(candidate.backfillProgress){
  const regular=candidate.games.filter(g=>g.type==='regular'&&g.status==='finished'),available=regular.filter(g=>g.statsState==='available');
  Object.assign(candidate.backfillProgress,{verifiedRegularBoxScores:available.length,verifiedBoxScores:candidate.games.filter(g=>g.statsState==='available').length,pendingGames:regular.length-available.length,sourceFailureGames:candidate.games.filter(g=>g.refreshIssue?.code==='source-data-error').length,unmappedGames:candidate.games.filter(g=>g.refreshIssue?.code==='unmapped-players').length});
 }
 const result=publicHighlightlySnapshot(candidate,authorization),key=l=>`${l.gameId}:${l.providerId}`;
 const recovered=new Map(result.lines.map(l=>[key(l),l]));
 for(const old of current.lines)check(JSON.stringify(recovered.get(key(old)))===JSON.stringify(old),'Existing line changed during targeted recovery');
 for(const old of current.games.filter(g=>g.id!==TARGET_GAME))check(JSON.stringify(result.games.find(g=>g.id===old.id))===JSON.stringify(old),'Unrelated game changed during targeted recovery');
 return {snapshot:result,authorization,addedLines:lines.length};
}
export async function recoverHostedGame(){
 check(process.env.GITHUB_ACTIONS==='true','Hosted recovery required');
 globalThis.fetch=async()=>{throw new Error('Provider network prohibited during recovery');};
 const current=await published();
 if(current.games.find(g=>g.id===TARGET_GAME)?.statsState==='available'){console.log('Reviewed game already published; no changes.');return null;}
 checkSynchronizedCheckpoint(current,await readJSON('.github/highlightly-backfill.json'));
 const quotaBefore=await fs.readFile('.github/highlightly-quota.json');
 const bytes=await fs.readFile(TARGET_ARCHIVE);
 check(createHash('sha256').update(bytes).digest('hex')===TARGET_SHA256,'Archive changed');
 const key=process.env.HIGHLIGHTLY_QUARANTINE_KEY;delete process.env.HIGHLIGHTLY_QUARANTINE_KEY;
 const record=decryptRecord(JSON.parse(bytes),{key});
 check(record.endpoint===`/box-score/${TARGET_GAME}`&&record.status===200&&record.capture.complete,'Wrong or incomplete recovery response');
 const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(record.bodyBytes));
 const result=recoverReviewedGame(current,{body,fetchedAt:record.fetchedAt,verifiedIdentities:await readJSON('config/highlightly-identities.verified.json')});
 const manifest=await publishLocal(result.snapshot,{publicationAuthorization:result.authorization});
 await atomicJSON('.github/highlightly-backfill.json',result.snapshot);
 check((await fs.readFile('.github/highlightly-quota.json')).equals(quotaBefore),'Quota changed during offline recovery');
 console.log(JSON.stringify({offlineRecovery:true,gameId:TARGET_GAME,addedGames:1,addedLines:result.addedLines,availableGames:result.snapshot.games.filter(g=>g.statsState==='available').length,manifest:manifest.file,providerCalls:0}));
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await recoverHostedGame();}catch{console.error('Offline recovery stopped safely; no provider request or raw response export. Review before any retry.');process.exitCode=1;}
}
