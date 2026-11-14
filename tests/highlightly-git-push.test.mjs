import test from 'node:test';
import assert from 'node:assert/strict';
import {pushCheckpointSafely,presentationOnly} from '../tools/highlightly-git-push.mjs';
const rejection='!\tHEAD:refs/heads/main\t[rejected] (fetch first)\n';
const base='a'.repeat(40);
function mock({first={status:1,stdout:rejection},paths='assets/dashboard.css\n',merge=0,last=0}={}) {
 const calls=[];let pushes=0;
 return {calls,execute:(_,args)=>{calls.push(args);if(args[0]==='push')return ++pushes===1?first:{status:last};if(args[0]==='merge-base')return {status:0,stdout:base};if(args[0]==='diff')return {status:0,stdout:paths};if(args[0]==='merge')return {status:merge};return {status:0,stdout:''};}};
}
test('successful push needs no fetch or retry',()=>{const m=mock({first:{status:0}});pushCheckpointSafely(m);assert.equal(m.calls.length,1);});
test('explicit stale main rejection reconciles unrelated presentation only once',()=>{const m=mock();pushCheckpointSafely(m);assert.deepEqual(m.calls.map(c=>c[0]),['push','fetch','merge-base','diff','merge','push']);assert.equal(m.calls.flat().includes('--force'),false);});
test('uncertain push never retries, including forged stderr',()=>{for(const first of [{status:null,stdout:rejection},{status:1,stderr:rejection},{status:128},{status:1,stdout:'remote: '+rejection}]){const m=mock({first});assert.throws(()=>pushCheckpointSafely(m),{code:'CHECKPOINT_PUSH_UNCERTAIN'});assert.equal(m.calls.length,1);}});
test('concurrent quota, data or executable collector changes stop',()=>{for(const paths of ['.github/highlightly-quota.json','data/manifest.json','tools/highlightly.mjs','assets/core.mjs','config/highlightly-identities.verified.json']){const m=mock({paths});assert.throws(()=>pushCheckpointSafely(m),{code:'CHECKPOINT_CONCURRENT_DATA'});assert.equal(m.calls.some(c=>c[0]==='merge'),false);}});
test('merge conflict and second push failure stop without further retry',()=>{for(const opts of [{merge:1},{last:1}]){const m=mock(opts);assert.throws(()=>pushCheckpointSafely(m));assert.ok(m.calls.filter(c=>c[0]==='push').length<=2);}});
test('allowlist excludes arbitrary data and path traversal',()=>{assert.equal(presentationOnly('data/player-photos.json'),true);assert.equal(presentationOnly('.github/highlightly-quarantine/file'),false);});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('real isolated Git race preserves both writers without another provider call',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'git-checkpoint-race-'));
 const git=(cwd,args)=>{const r=spawnSync('git',args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r;};
 try{
  git(root,['init','--bare','origin.git']);git(root,['clone','origin.git','runner']);
  const runner=path.join(root,'runner'),ui=path.join(root,'ui');
  for(const dir of [runner]){git(dir,['config','user.email','test@example.invalid']);git(dir,['config','user.name','Synthetic Test']);}
  await fs.mkdir(path.join(runner,'assets'));await fs.writeFile(path.join(runner,'assets/dashboard.css'),'base');git(runner,['add','.']);git(runner,['commit','-m','base']);git(runner,['branch','-M','main']);git(runner,['push','-u','origin','main']);
  git(root,['clone','--branch','main','origin.git','ui']);git(ui,['config','user.email','test@example.invalid']);git(ui,['config','user.name','Synthetic Test']);
  await fs.mkdir(path.join(runner,'.github'));await fs.writeFile(path.join(runner,'.github/checkpoint'),'encrypted synthetic');git(runner,['add','.']);git(runner,['commit','-m','checkpoint']);
  await fs.writeFile(path.join(ui,'assets/dashboard.css'),'updated');git(ui,['add','.']);git(ui,['commit','-m','ui']);git(ui,['push','origin','main']);
  pushCheckpointSafely({execute:(cmd,args,opts)=>spawnSync(cmd,args,{...opts,cwd:runner})});
  assert.equal(await fs.readFile(path.join(runner,'assets/dashboard.css'),'utf8'),'updated');
  assert.equal(git(root,['--git-dir=origin.git','show','main:.github/checkpoint']).stdout,'encrypted synthetic');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('workflow uses the same safe push for reservation and final publication',async()=>{
 const workflow=await fs.readFile('.github/workflows/highlightly-daily.yml','utf8');
 assert.equal(workflow.split('node tools/highlightly-git-push.mjs').length-1,2);
 assert.doesNotMatch(workflow,/git push/);
 assert.ok(workflow.indexOf('node tools/highlightly-git-push.mjs')<workflow.indexOf('Reconstruct private inputs'));
});
