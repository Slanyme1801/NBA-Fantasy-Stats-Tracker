import fs from 'node:fs/promises';
import {readJSON,atomicJSON,published} from './files.mjs';
import {makeClient,collectSeason} from './provider.mjs';
const args=process.argv.slice(2),index=args.indexOf('--config');
const file=index>=0?args[index+1]:'config/collector.example.json';
let lock;
try {
  const config=await readJSON(file);
  if(!config.enabled) throw new Error('Collection is disabled. Review a local configuration before enabling a manual run.');
  if(config.season!==2026||config.league!=='standard'||!Number.isInteger(config.correctionDays)||config.correctionDays<1||config.correctionDays>30||!Number.isInteger(config.maxRequestsPerRun)||config.maxRequestsPerRun<1||config.maxRequestsPerRun>100||!Number.isInteger(config.dailyLimit)||config.dailyLimit<1||config.dailyLimit>100||!(config.intervalMs>=6100)) throw new Error('Invalid scope or free-tier limits');
  if(!process.env.API_SPORTS_KEY) throw new Error('API_SPORTS_KEY is absent. No connection attempted.');
  if(!/^\.local\/[a-z0-9.-]+\.json$/i.test(config.candidate)) throw new Error('Candidate must stay in .local/');
  await fs.mkdir('.local',{recursive:true});
  lock=await fs.open('.local/collector.lock','wx');
  const ledger=await readJSON('.local/request-ledger.json').catch(e=>{if(e.code==='ENOENT')return {day:'',requests:0};throw e;});
  const client=makeClient({key:process.env.API_SPORTS_KEY,intervalMs:config.intervalMs,maxRequests:config.maxRequestsPerRun,dailyLimit:config.dailyLimit,ledger,saveLedger:value=>atomicJSON('.local/request-ledger.json',value)});
  const history=await readJSON('data/history-v1.json');
  const result=await collectSeason({client,previous:await published(),identities:await readJSON(config.identityMap),types:await readJSON(config.gameTypes),correctionDays:config.correctionDays,knownIds:history.players.map(p=>p[0])});
  await atomicJSON(config.candidate,result);
  console.log(`Validated local candidate: ${result.games.length} games, ${result.lines.length} player lines; ${result.games.filter(g=>g.type==='unknown').length} unclassified games excluded. No publication or deployment performed.`);
} catch(error){console.error(error.message);process.exitCode=1;}
finally {if(lock){await lock.close();await fs.unlink('.local/collector.lock');}}
