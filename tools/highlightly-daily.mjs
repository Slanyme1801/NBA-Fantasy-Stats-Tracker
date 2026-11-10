// Scheduler-ready LOCAL runner. It neither installs a schedule nor pushes/deploys.
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {readJSON,published} from './files.mjs';
import {atomicPrivateJSON,privateDirectory,readPrivateJSON} from './highlightly-private.mjs';
import {authorizeHighlightlyPublication,publicHighlightlySnapshot} from './highlightly-public.mjs';
import {datesInRange,PROVIDER} from './highlightly.mjs';
export function dailyCollectionConfig(config,now=new Date()){
  if(config.enabled!==true||config.provider!==PROVIDER)throw new Error('Daily Highlightly runner is disabled');
  if(!Number.isInteger(config.lookbackDays)||config.lookbackDays<1||config.lookbackDays>7)throw new Error('Daily lookback must be 1–7 days');
  if(config.dailyLimit!==90||config.maxRequestsPerRun!==90)throw new Error('Daily runner reserves ten calls: limits must be 90');
  const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const endDate=new Date(Date.parse(localDay)-86400000).toISOString().slice(0,10);
  const startDate=new Date(Date.parse(endDate)-(config.lookbackDays-1)*86400000).toISOString().slice(0,10);datesInRange(startDate,endDate);
  if(!/^\.local\/highlightly-[a-z0-9.-]+\.json$/i.test(config.candidate))throw new Error('Invalid private candidate path');
  return {enabled:true,provider:PROVIDER,startDate,endDate,maxRequestsPerRun:90,dailyLimit:90,intervalMs:6100,identityMap:config.identityMap,gameTypes:config.gameTypes,candidate:config.candidate,refreshFrom:startDate,refreshId:`daily-${now.toISOString().slice(0,10)}`,unmappedPolicy:'skip-game'};
}
export function bootstrapPrivateSnapshot(snapshot,authorization){
  const validated=publicHighlightlySnapshot(snapshot,authorization);
  return {...validated,publicationPolicy:'private-only-rights-unverified'};
}
export async function runDaily(config,{now=new Date(),execute=spawnSync}={}){
  const collection=dailyCollectionConfig(config,now);
  const authorization=(config.publishLocally===true||config.bootstrapFromPublished===true)?authorizeHighlightlyPublication(await readJSON(config.publicationAuthorization)):null;
  await privateDirectory('.local');let lock;
  const report={provider:PROVIDER,attemptedAt:now.toISOString(),startDate:collection.startDate,endDate:collection.endDate,status:'started',deployed:false};
  try{
    lock=await fs.open('.local/highlightly-daily.lock','wx',0o600);
    if(config.bootstrapFromPublished===true){
      const existing=await readPrivateJSON(config.candidate).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
      if(!existing)await atomicPrivateJSON(config.candidate,bootstrapPrivateSnapshot(await published(),authorization));
    }
    await atomicPrivateJSON('.local/highlightly-daily-run.json',collection);
    await atomicPrivateJSON('.local/highlightly-daily-report.json',report);
    const collected=execute(process.execPath,['tools/collect-highlightly.mjs','--config','.local/highlightly-daily-run.json'],{stdio:'ignore',timeout:20*60000});
    if(collected.status!==0)throw new Error('Daily collection stopped; previous public release retained. Review private checkpoint and mappings.');
    report.status='collected-private';
    if(config.publishLocally===true){
      const published=execute(process.execPath,['tools/publish.mjs',config.candidate,'--authorization',config.publicationAuthorization],{stdio:'ignore',timeout:60000});
      if(published.status!==0)throw new Error('Daily local publication failed; inspect authorization and validated candidate.');
      report.status='published-locally';
    }
    await atomicPrivateJSON('.local/highlightly-daily-report.json',report);return report;
  }catch(error){if(lock){report.status='failed';await atomicPrivateJSON('.local/highlightly-daily-report.json',report);}throw error;}
  finally{if(lock){await lock.close();await fs.unlink('.local/highlightly-daily.lock');}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const i=process.argv.indexOf('--config');const result=await runDaily(await readJSON(i>=0?process.argv[i+1]:'config/highlightly-daily.example.json'));console.log(`Daily Highlightly run: ${result.status}. No push, deployment or scheduler installation performed.`);}
  catch{console.error('Daily Highlightly run stopped. Check private configuration, checkpoint, quota and identity/classification sources. No deployment performed.');process.exitCode=1;}
}
