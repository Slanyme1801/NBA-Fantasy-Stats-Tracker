import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateSeason} from '../assets/core.mjs';
import {readJSON,atomicJSON,checksum,published} from './files.mjs';
// Publication here only means selecting local static JSON. It never pushes/deploys.
export async function publishLocal(candidate,{root='.',knownIds=[]}={}) {
  validateSeason(candidate,knownIds);
  const bytes=Buffer.from(JSON.stringify(candidate)+'\n'),sha256=checksum(bytes);
  const file=`data/releases/2026-27-${sha256.slice(0,16)}.json`;
  await fs.mkdir(path.join(root,'data/releases'),{recursive:true});
  const location=path.join(root,file);
  try {await fs.writeFile(location,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;if(checksum(await fs.readFile(location))!==sha256)throw new Error('Immutable release conflict');}
  const manifest={schemaVersion:1,season:'2026-27',file,sha256,updatedAt:candidate.updatedAt};
  let old;
  try {old=await readJSON(path.join(root,'data/manifest.json'));await published(root);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(old) await atomicJSON(path.join(root,'data/manifest.previous.json'),old);
  await atomicJSON(path.join(root,'data/manifest.json'),manifest);
  return manifest;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    if(!process.argv[2])throw new Error('Usage: node tools/publish.mjs .local/candidate.json (local files only)');
    const history=await readJSON('data/history-v1.json');
    const result=await publishLocal(await readJSON(process.argv[2]),{knownIds:history.players.map(p=>p[0])});
    console.log(`Local data manifest selected: ${result.file}. No deployment performed.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
