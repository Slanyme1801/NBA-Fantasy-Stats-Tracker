// Synthetic secrets and responses only. No real API, Git, network, or publication.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {hkdfSync,createDecipheriv,createCipheriv,randomBytes} from 'node:crypto';
import {encryptResponse,decryptResponse,decryptRecord,createQuarantineWriter,isQuarantinePath,recoverQuarantinedResponse,makeQuarantineReplayClient,loadQuarantineReplayClient,MAX_QUARANTINE_BYTES} from '../tools/highlightly-quarantine.mjs';
import {makeCachedLoader} from '../tools/highlightly-private.mjs';import {parseMatches} from '../tools/highlightly.mjs';
const key='SYNTHETIC-ONLY-API-KEY-never-real';const fetchedAt='2026-11-12T10:00:00.000Z';
const record=overrides=>({key,endpoint:'/box-score/1',params:{},status:200,fetchedAt,bodyBytes:Buffer.from('{ "exact": true }\n'),...overrides});
const ID='0f7f18c2-5837-41b1-9be6-6a16c049863b',ARCHIVE=`.github/highlightly-quarantine/${ID}.json`;
async function isolated(fn){const cwd=process.cwd(),directory=await fs.mkdtemp(path.join(os.tmpdir(),'synthetic-quarantine-'));try{process.chdir(directory);await fn(directory);}finally{process.chdir(cwd);await fs.rm(directory,{recursive:true,force:true});}}
test('AES-GCM archive preserves exact bytes, randomizes ciphertext, and never stores clear response or key',()=>{
 const args=record({bodyBytes:Buffer.from([0,255,13,10,123,32,0,255])}),a=encryptResponse(args),b=encryptResponse(args);
 assert.deepEqual(decryptResponse(a,{key}),args.bodyBytes);assert.notEqual(a.salt,b.salt);assert.notEqual(a.nonce,b.nonce);assert.notEqual(a.ciphertext,b.ciphertext);assert.equal(a.keyId,b.keyId);
 const json=JSON.stringify(a);assert.equal(json.includes(key),false);assert.equal(json.includes('/box-score/1'),false);assert.equal(json.includes(fetchedAt),false);assert.equal(json.includes('status'),false);assert.equal(json.includes('bodyBytes'),false);assert.equal(json.includes('headers'),false);
 assert.deepEqual(Object.keys(a).sort(),['version','provider','algorithm','keyId','salt','nonce','archiveId','tag','ciphertext'].sort());
});
test('canonical metadata is order-independent but every authenticated field rejects modification',()=>{
 const params={timezone:'America/New_York',offset:0,limit:100,season:2027,league:'NBA'};
 const a=encryptResponse(record({endpoint:'/matches',params}));const reordered=Object.fromEntries(Object.entries(a).reverse());
 assert.deepEqual(decryptResponse(reordered,{key}),record().bodyBytes);assert.deepEqual(Object.keys(decryptRecord(a,{key}).params),['league','limit','offset','season','timezone']);
 for(const mutate of [a=>a.version=2,a=>a.provider='Other',a=>a.algorithm='AES-128-GCM',a=>a.endpoint='/box-score/2',a=>a.params={offset:100},a=>a.status=201,a=>a.fetchedAt='2026-11-12T10:01:00.000Z',a=>a.archiveId='6f021b2c-67cb-48a6-b494-fde379a2e89f',a=>a.keyId='0'.repeat(64),a=>a.salt=Buffer.alloc(32).toString('base64'),a=>a.nonce=Buffer.alloc(12).toString('base64'),a=>a.tag=Buffer.alloc(16).toString('base64'),a=>a.ciphertext=Buffer.alloc(18).toString('base64'),a=>a.raw='LEAK']){const changed=structuredClone(a);mutate(changed);assert.throws(()=>decryptResponse(changed,{key}),/quarantine operation failed/);}
 assert.throws(()=>decryptResponse(a,{key:'WRONG SYNTHETIC KEY'}),/quarantine/);
});
test('key identifier is domain-separated from the salted encryption key',()=>{
 const a=encryptResponse(record());const idMaterial=Buffer.from(hkdfSync('sha256',Buffer.from(key),Buffer.from('nba-highlightly-quarantine/key-id-salt/v1'),Buffer.from('nba-highlightly-quarantine/v1/key-id'),32));
 const encMaterial=Buffer.from(hkdfSync('sha256',Buffer.from(key),Buffer.from(a.salt,'base64'),Buffer.from('nba-highlightly-quarantine/v1/encryption'),32));
 assert.equal(idMaterial.toString('hex'),a.keyId);assert.notDeepEqual(idMaterial,encMaterial);
 const wrong=createDecipheriv('aes-256-gcm',idMaterial,Buffer.from(a.nonce,'base64'));wrong.setAuthTag(Buffer.from(a.tag,'base64'));assert.throws(()=>{wrong.update(Buffer.from(a.ciphertext,'base64'));wrong.final();});
});
test('request metadata accepts only existing Highlightly endpoints and parameter shapes',()=>{
 for(const args of [{endpoint:'https://evil.invalid/?key=secret'},{endpoint:'/players'},{params:{key:'secret'}},{endpoint:'/matches',params:{league:'NBA',season:2027,limit:100,offset:0,timezone:'America/New_York',extra:'secret'}},{status:999},{fetchedAt:'invalid'},{bodyBytes:'not bytes'}])assert.throws(()=>encryptResponse(record(args)));
 assert.throws(()=>encryptResponse(record({bodyBytes:Buffer.alloc(MAX_QUARANTINE_BYTES+1)})));
 const max=encryptResponse(record({bodyBytes:Buffer.alloc(MAX_QUARANTINE_BYTES)}));assert.equal(decryptResponse(max,{key}).length,MAX_QUARANTINE_BYTES);
});
test('writer validates UUID paths, writes once, and awaits persistence before resolving',async()=>isolated(async()=>{
 assert.equal(isQuarantinePath(ARCHIVE),true);for(const bad of ['../'+ARCHIVE,'/'+ARCHIVE,'.github/highlightly-quarantine/../secret.json','.github/highlightly-quarantine/no.json',ARCHIVE+'/extra'])assert.equal(isQuarantinePath(bad),false);
 let release,called=false;const blocker=new Promise(resolve=>{release=resolve;});const writer=createQuarantineWriter({key,idFactory:()=>ID,persist:async paths=>{assert.deepEqual(paths,[ARCHIVE]);assert.ok((await fs.stat(paths[0])).isFile());called=true;await blocker;}});
 let resolved=false;const work=writer(record()).then(value=>{resolved=true;return value;});while(!called)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(resolved,false);release();assert.equal(await work,ARCHIVE);assert.equal((await fs.stat(ARCHIVE)).mode&0o777,0o600);
 const before=await fs.readFile(ARCHIVE);await assert.rejects(writer(record()),/quarantine/);assert.deepEqual(await fs.readFile(ARCHIVE),before);
}));
test('failed push latches writer with no retry or second archive and no secret in the error',async()=>isolated(async()=>{
 let calls=0;const writer=createQuarantineWriter({key,idFactory:()=>ID,persist:async()=>{calls++;throw Error(key);}});
 for(let i=0;i<2;i++)await assert.rejects(writer(record()),e=>e.code==='HIGHLIGHTLY_QUARANTINE'&&!e.message.includes(key));assert.equal(calls,1);assert.equal((await fs.readdir('.github/highlightly-quarantine')).length,1);
}));
test('symlink traversal through archive or private directories is rejected',async()=>isolated(async directory=>{
 await fs.mkdir('elsewhere');await fs.symlink(path.join(directory,'elsewhere'),'.github');const writer=createQuarantineWriter({key,persist:async()=>{throw Error('Must not persist');}});await assert.rejects(writer(record()));assert.deepEqual(await fs.readdir('elsewhere'),[]);
 await fs.unlink('.github');const save=createQuarantineWriter({key,idFactory:()=>ID,persist:async()=>{}});await save(record());await fs.symlink(path.join(directory,'elsewhere'),'.local');await assert.rejects(recoverQuarantinedResponse(ARCHIVE,'.local/output.json',{key}));assert.deepEqual(await fs.readdir('elsewhere'),[]);
 await fs.unlink('.local');await fs.mkdir('.local');await fs.symlink(path.join(directory,'elsewhere'),'.local/nested');await assert.rejects(recoverQuarantinedResponse(ARCHIVE,'.local/nested/output.json',{key}));
}));
test('private recovery preserves invalid UTF-8 and invalid JSON byte-for-byte and never overwrites',async()=>isolated(async()=>{
 const bytes=Buffer.from([255,0,123,98,97,100,10]);const writer=createQuarantineWriter({key,idFactory:()=>ID,persist:async()=>{}});await writer(record({bodyBytes:bytes,status:503}));
 await recoverQuarantinedResponse(ARCHIVE,'.local/recovered.json',{key});assert.deepEqual(await fs.readFile('.local/recovered.json'),bytes);assert.equal((await fs.stat('.local/recovered.json')).mode&0o777,0o600);
 await assert.rejects(recoverQuarantinedResponse(ARCHIVE,'.local/recovered.json',{key}));await assert.rejects(recoverQuarantinedResponse(ARCHIVE,'data/public.json',{key}));
 await fs.symlink(path.basename(ARCHIVE),'.github/highlightly-quarantine/06a2ec6d-2362-422e-98bb-b9471e03fea3.json');await assert.rejects(recoverQuarantinedResponse('.github/highlightly-quarantine/06a2ec6d-2362-422e-98bb-b9471e03fea3.json','.local/link.json',{key}));
}));
test('replay requires exact request, successful HTTP and valid JSON, while normal loader keeps source validation',async()=>{
 const replay=makeQuarantineReplayClient({records:[encryptResponse(record())],key});await assert.rejects(replay('/box-score/2'));assert.deepEqual(await replay('/box-score/1'),{exact:true});await assert.rejects(replay('/box-score/1'));
 for(const overrides of [{status:503},{bodyBytes:Buffer.from('bad JSON')},{bodyBytes:Buffer.from([255])}])await assert.rejects(makeQuarantineReplayClient({records:[encryptResponse(record(overrides))],key})('/box-score/1'));
 const params={league:'NBA',season:2027,timezone:'America/New_York',limit:100,offset:0},client=makeQuarantineReplayClient({records:[encryptResponse(record({endpoint:'/matches',params,bodyBytes:Buffer.from('{"data":[]}')}))],key});
 const load=makeCachedLoader({client,cache:{get:async()=>null,put:async()=>{}},now:()=>Date.parse(fetchedAt)});
 await assert.rejects(load('/matches',params,body=>parseMatches(body),{date:'2026-11-12'}),/Unsupported or restricted/);
});
const cli=fileURLToPath(new URL('../tools/highlightly-quarantine.mjs',import.meta.url));
test('CLI recovery takes key only through environment and async file replay works',async()=>isolated(async()=>{
 const writer=createQuarantineWriter({key,idFactory:()=>ID,persist:async()=>{}});await writer(record());const run=spawnSync(process.execPath,[cli,'recover',ARCHIVE,'.local/cli.json'],{encoding:'utf8',env:{...process.env,HIGHLIGHTLY_QUARANTINE_KEY:key}});assert.equal(run.status,0,run.stderr);assert.equal((run.stdout+run.stderr).includes(key),false);assert.deepEqual(await fs.readFile('.local/cli.json'),record().bodyBytes);
 const replay=await loadQuarantineReplayClient({paths:[ARCHIVE],key});assert.deepEqual(await replay('/box-score/1'),{exact:true});
}));
test('quota headers and capture descriptors stay encrypted with strict key and value allowlists',()=>{
 const quotaHeaders={'x-ratelimit-requests-remaining':'19','x-ratelimit-requests-limit':'100'},capture={complete:false,reason:'stream-incomplete'};
 const archive=encryptResponse(record({quotaHeaders,capture})),opened=decryptRecord(archive,{key});assert.deepEqual(opened.quotaHeaders,quotaHeaders);assert.deepEqual(opened.capture,capture);assert.deepEqual(decryptResponse(archive,{key}),record().bodyBytes);
 const publicJSON=JSON.stringify(archive);assert.equal(publicJSON.includes('ratelimit'),false);assert.equal(publicJSON.includes('stream-incomplete'),false);assert.equal(publicJSON.includes('capture'),false);
 for(const bad of [{authorization:'secret'},{'x-rapidapi-key':'secret'},{'x-ratelimit-requests-limit':100},{'x-ratelimit-requests-limit':'a'.repeat(16385)},null])assert.throws(()=>encryptResponse(record({quotaHeaders:bad})),/quarantine/);
 for(const bad of [{complete:false,reason:null},{complete:true,reason:'stream-incomplete'},{complete:false,reason:'secret'},{complete:true,reason:null,extra:1},null])assert.throws(()=>encryptResponse(record({capture:bad})),/quarantine/);
 assert.deepEqual(decryptRecord(encryptResponse(record()),{key}).capture,{complete:true,reason:null});
});
test('incomplete captures cannot replay even when their captured prefix is valid successful JSON',async()=>{
 for(const reason of ['response-too-large','stream-incomplete']){
  const archive=encryptResponse(record({capture:{complete:false,reason}}));assert.deepEqual(decryptResponse(archive,{key}),record().bodyBytes);await assert.rejects(makeQuarantineReplayClient({records:[archive],key})('/box-score/1'),/quarantine/);
  const changed={...archive,capture:{complete:true,reason:null}};assert.throws(()=>decryptRecord(changed,{key}),/quarantine/);
 }
});
test('writer forwards encrypted quota headers and incomplete capture state',async()=>isolated(async()=>{
 const writer=createQuarantineWriter({key,idFactory:()=>ID,persist:async()=>{}}),capture={complete:false,reason:'response-too-large'},quotaHeaders={'x-ratelimit-requests-remaining':'malformed upstream quota'};
 await writer(record({capture,quotaHeaders,quotaHeadersTruncated:true}));const archive=JSON.parse(await fs.readFile(ARCHIVE,'utf8'));const opened=decryptRecord(archive,{key});assert.deepEqual(opened.capture,capture);assert.deepEqual(opened.quotaHeaders,quotaHeaders);assert.equal(opened.quotaHeadersTruncated,true);await assert.rejects((await loadQuarantineReplayClient({paths:[ARCHIVE],key}))('/box-score/1'));
}));

// Build a historical encrypted v1 payload using only the original five fields.
function archiveWithPayload(payload){
 const archive=encryptResponse(record());archive.nonce=randomBytes(12).toString('base64');
 const encryptionKey=Buffer.from(hkdfSync('sha256',Buffer.from(key),Buffer.from(archive.salt,'base64'),Buffer.from('nba-highlightly-quarantine/v1/encryption'),32));
 const authenticated=Buffer.from(JSON.stringify({version:1,provider:'Highlightly',algorithm:'AES-256-GCM',keyId:archive.keyId,salt:archive.salt,nonce:archive.nonce,archiveId:archive.archiveId}));
 const cipher=createCipheriv('aes-256-gcm',encryptionKey,Buffer.from(archive.nonce,'base64'));cipher.setAAD(authenticated);archive.ciphertext=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(payload))),cipher.final()]).toString('base64');archive.tag=cipher.getAuthTag().toString('base64');return archive;
}
test('legacy v1 five-field payload decrypts as complete without quota metadata',async()=>{
 const payload={endpoint:'/box-score/1',params:{},status:200,fetchedAt,bodyBase64:record().bodyBytes.toString('base64')},archive=archiveWithPayload(payload),opened=decryptRecord(archive,{key});
 assert.deepEqual(opened.capture,{complete:true,reason:null});assert.deepEqual(opened.quotaHeaders,{});assert.equal(opened.quotaHeadersTruncated,false);assert.deepEqual(opened.bodyBytes,record().bodyBytes);assert.deepEqual(await makeQuarantineReplayClient({records:[archive],key})('/box-score/1'),{exact:true});
 for(const extra of [{quotaHeaders:{authorization:'secret'}},{quotaHeadersTruncated:'true'},{capture:{complete:'yes',reason:null}},{unexpected:'secret'}])assert.throws(()=>decryptRecord(archiveWithPayload({...payload,...extra}),{key}),/quarantine/);
});
test('long quota evidence remains encrypted and CLI identifies partial recovery without revealing content',async()=>isolated(async()=>{
 const capture={complete:false,reason:'stream-incomplete'},quotaHeaders={'x-ratelimit-requests-limit':'\u0000'.repeat(16384),'x-ratelimit-requests-remaining':'\u0000'.repeat(16384)};
 const archive=encryptResponse(record({capture,quotaHeaders}));assert.deepEqual(decryptRecord(archive,{key}).quotaHeaders,quotaHeaders);
 await createQuarantineWriter({key,idFactory:()=>ID,persist:async()=>{}})(record({capture}));
 const run=spawnSync(process.execPath,[cli,'recover',ARCHIVE,'.local/partial.json'],{encoding:'utf8',env:{...process.env,HIGHLIGHTLY_QUARANTINE_KEY:key}});assert.equal(run.status,0);assert.match(run.stdout,/Incomplete captured response.*stream-incomplete.*not replayable/);assert.equal(run.stdout.includes('exact'),false);assert.equal(run.stdout.includes(key),false);
}));
