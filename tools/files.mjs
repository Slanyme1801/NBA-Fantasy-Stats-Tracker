import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const readJSON=async file=>JSON.parse(await fs.readFile(file,'utf8'));
export async function atomicJSON(file,value) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temp=`${file}.${process.pid}.tmp`;
  await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n');
  await fs.rename(temp,file);
}
export const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function published(root='.') {
  const manifest=await readJSON(path.join(root,'data/manifest.json'));
  if(!/^data\/releases\/[a-z0-9.-]+\.json$/.test(manifest.file)) throw new Error('Invalid release path');
  const bytes=await fs.readFile(path.join(root,manifest.file));
  if(checksum(bytes)!==manifest.sha256) throw new Error('Release checksum mismatch');
  return JSON.parse(bytes);
}
