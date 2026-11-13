// Targeted offline diagnostic. Never print the key or the decrypted response.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {decryptRecord} from './highlightly-quarantine.mjs';
import {parseBoxScore,statisticNames} from './highlightly.mjs';
export const TARGET_GAME=1547577;
export const TARGET_ARCHIVE='.github/highlightly-quarantine/7537afd6-9ea2-4d96-92cb-fa1880e5338d.json';
export const TARGET_SHA256='dc24e8939e8c9364fa9effebcfab7b6cb3bd729b2cdd5b3d3c1fb9b9bb31bdb5';
const required=[...Object.values(statisticNames),'Total Minutes Played','Total Offensive Rebounds','Total Defensive Rebounds'];
const valid=value=>Number.isSafeInteger(value)&&value>=0;
function valueKind(value){
 if(value===undefined)return 'absent';if(value===null)return 'null';
 if(typeof value==='number')return !Number.isFinite(value)?'non-finite-number':!Number.isInteger(value)?'fractional-number':value<0?'negative-number':'unsafe-integer';
 if(typeof value==='string')return value===''?'empty-string':/^\d+$/.test(value)?'integer-string':'other-string';
 return typeof value;
}
export function inspectCounterFailures(body){
 const failures=[];
 if(!Array.isArray(body)||body.length!==2)throw new Error('Invalid diagnostic envelope');
 for(const team of body){
  if(!Number.isSafeInteger(team?.team?.id)||!Array.isArray(team.boxScores))throw new Error('Invalid diagnostic team');
  for(const row of team.boxScores){
   if(!Number.isSafeInteger(row.player?.id)||!Array.isArray(row.statistics))throw new Error('Invalid diagnostic row');
   if(!row.statistics.length)continue;
   const values=new Map(row.statistics.map(s=>[s.name,s.value]));
   const invalid=required.filter(name=>!valid(values.get(name))).map(field=>({field,kind:valueKind(values.get(field))}));
   if(invalid.length)failures.push({providerId:row.player.id,teamId:team.team.id,invalid,
    requiredPresent:required.filter(name=>values.has(name)).length,
    positiveRequired:required.filter(name=>typeof values.get(name)==='number'&&values.get(name)>0).length,
    presentRequiredAllZero:required.filter(name=>values.has(name)).every(name=>values.get(name)===0),
    minutesZero:values.get('Total Minutes Played')===0});
  }
 }
 return failures;
}
export function auditCapturedResponse(archive,{key,game}){
 if(game?.id!==TARGET_GAME)throw new Error('Wrong diagnostic game');
 const record=decryptRecord(archive,{key});
 if(record.endpoint!==`/box-score/${TARGET_GAME}`||record.status!==200||!record.capture.complete)throw new Error('Wrong or incomplete diagnostic response');
 const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(record.bodyBytes));
 let parserAccepted=false;try{parseBoxScore(body,game);parserAccepted=true;}catch{}
 const counterFailures=inspectCounterFailures(body).map(({providerId,teamId,invalid})=>({providerId,teamId,invalid}));
 return {gameId:TARGET_GAME,fetchedAt:record.fetchedAt,captureComplete:true,parserAccepted,counterFailures};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  globalThis.fetch=async()=>{throw new Error('Network prohibited during offline audit');};
  const key=process.env.HIGHLIGHTLY_QUARANTINE_KEY;delete process.env.HIGHLIGHTLY_QUARANTINE_KEY;
  const bytes=await fs.readFile(TARGET_ARCHIVE);
  if(createHash('sha256').update(bytes).digest('hex')!==TARGET_SHA256)throw new Error('Archive changed');
  const manifest=JSON.parse(await fs.readFile('data/manifest.json','utf8'));
  if(!/^data\/releases\/[a-z0-9.-]+\.json$/.test(manifest.file))throw new Error('Invalid snapshot path');
  const snapshot=JSON.parse(await fs.readFile(manifest.file,'utf8'));
  const report=auditCapturedResponse(JSON.parse(bytes),{key,game:snapshot.games.find(g=>g.id===TARGET_GAME)});
  console.log(JSON.stringify(report));
 }catch{console.error('Offline quarantine audit stopped safely; no provider call or data publication.');process.exitCode=1;}
}
