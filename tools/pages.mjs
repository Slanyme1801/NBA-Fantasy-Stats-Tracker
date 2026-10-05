import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export function renderWorker(source,version){
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(version))throw new Error('Invalid application version');
  return source.replace(/^---\r?\nlayout: null\r?\n---\r?\n/,'').replaceAll('{{ site.github.build_revision }}',version);
}
export async function localVersion(root='.'){
  const files=['index.html','sw.js','manifest.webmanifest',...(await fs.readdir(path.join(root,'assets'))).sort().map(name=>'assets/'+name)];
  const hash=createHash('sha256');for(const file of files)hash.update(file).update(await fs.readFile(path.join(root,file)));
  return 'local-'+hash.digest('hex').slice(0,16);
}
