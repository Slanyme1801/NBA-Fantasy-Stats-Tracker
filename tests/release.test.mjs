import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('collector CLI is disabled by default and requires a key when enabled',async()=>{
  const disabled=spawnSync(process.execPath,['tools/collect.mjs'],{encoding:'utf8'});assert.equal(disabled.status,1);assert.match(disabled.stderr,/disabled/);
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'nba-cli-test-'));
  try{const config=JSON.parse(await fs.readFile('config/collector.example.json','utf8'));config.enabled=true;const file=path.join(directory,'config.json');await fs.writeFile(file,JSON.stringify(config));const missing=spawnSync(process.execPath,['tools/collect.mjs','--config',file],{encoding:'utf8',env:{...process.env,API_SPORTS_KEY:''}});assert.equal(missing.status,1);assert.match(missing.stderr,/absent.*No connection attempted/);}finally{await fs.rm(directory,{recursive:true});}
});
test('public shell uses relative URLs, existing assets and no global fetch replacement',async()=>{const html=await fs.readFile('index.html','utf8');for(const [,url] of html.matchAll(/(?:src|href)="(.*?)"/g)){assert.ok(url.startsWith('./'));await fs.access(url);}for(const name of await fs.readdir('assets')){const source=await fs.readFile('assets/'+name,'utf8');assert.doesNotMatch(source,/window\.fetch\s*=/);assert.doesNotMatch(source,/x-apisports-key/);}const release=JSON.parse(await fs.readFile('data/manifest.json','utf8'));const data=JSON.parse(await fs.readFile(release.file,'utf8'));assert.equal(data.connection,'not-connected');assert.deepEqual(data.lines,[]);assert.deepEqual(data.players,[]);});
test('Pages build excludes local data and developer files while retaining public resources',async()=>{
  const config=await fs.readFile('_config.yml','utf8');
  const excluded=[...config.matchAll(/^  - (.+)$/gm)].map(match=>match[1]);
  for(const item of ['.local','.env','.env.*','config','docs','tests','tools','node_modules','package.json'])assert.ok(excluded.includes(item),item+' must stay outside the Pages artifact');
  for(const item of ['assets','data','index.html','sw.js','manifest.webmanifest'])assert.ok(!excluded.includes(item),item+' must remain public');
  const html=await fs.readFile('index.html','utf8');
  for(const [,url] of html.matchAll(/(?:src|href)="(.*?)"/g))assert.ok(!excluded.includes(url.replace(/^\.\//,'').split('/')[0]));
});
