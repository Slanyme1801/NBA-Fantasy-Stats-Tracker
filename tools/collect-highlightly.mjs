import fs from 'node:fs/promises';
import {readJSON} from './files.mjs';
async function atomicPrivateJSON(file,value){
  const temp=`${file}.${process.pid}.tmp`;
  try{await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(temp,file);}
  finally{await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
import {PROVIDER,datesInRange,makeHighlightlyClient,collectHighlightly} from './highlightly.mjs';
let lock;
try{
  const args=process.argv.slice(2),i=args.indexOf('--config');
  const config=await readJSON(i>=0?args[i+1]:'config/highlightly.example.json');
  if(config.enabled!==true)throw new Error('Highlightly collection is disabled.');
  if(config.provider!==PROVIDER)throw new Error('Invalid provider');
  datesInRange(config.startDate,config.endDate);
  if(!/^\.local\/highlightly-[a-z0-9.-]+\.json$/i.test(config.candidate))throw new Error('Candidate must stay in .local/highlightly-*.json');
  if(!process.env.HIGHLIGHTLY_API_KEY)throw new Error('HIGHLIGHTLY_API_KEY is absent. No connection attempted.');
  await fs.mkdir('.local',{recursive:true,mode:0o700});
  lock=await fs.open('.local/highlightly.lock','wx',0o600);
  // Never initialize/reset a ledger silently: operator must account for diagnostic/other calls.
  const ledger=await readJSON('.local/highlightly-request-ledger.json');
  const client=makeHighlightlyClient({key:process.env.HIGHLIGHTLY_API_KEY,maxRequests:config.maxRequestsPerRun,dailyLimit:config.dailyLimit,intervalMs:config.intervalMs,ledger,saveLedger:value=>atomicPrivateJSON('.local/highlightly-request-ledger.json',value)});
  const result=await collectHighlightly({client,identities:await readJSON(config.identityMap),types:await readJSON(config.gameTypes),startDate:config.startDate,endDate:config.endDate});
  await atomicPrivateJSON(config.candidate,result);
  console.log(`Private Highlightly candidate: ${result.games.length} games, ${result.lines.length} lines. Publication prohibited; no public files changed.`);
}catch{console.error('Highlightly collection stopped. Check private configuration, identity mappings, classifications, quota ledger and provider access. No publication performed.');process.exitCode=1;}
finally{if(lock){await lock.close();await fs.unlink('.local/highlightly.lock');}}
