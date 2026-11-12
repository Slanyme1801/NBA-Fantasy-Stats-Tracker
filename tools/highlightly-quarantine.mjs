// Encrypted exact-response quarantine. Linux directory handles prevent symlink traversal.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {createCipheriv,createDecipheriv,hkdfSync,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const MAX_QUARANTINE_BYTES=8*1024*1024;
// Two 16-KiB header strings can expand sixfold when JSON-escaped.
const MAX_ENVELOPE_BYTES=4*Math.ceil(MAX_QUARANTINE_BYTES/3)+256*1024;
const ROOT='.github/highlightly-quarantine';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ENC_DOMAIN='nba-highlightly-quarantine/v1/encryption';
const ID_DOMAIN='nba-highlightly-quarantine/v1/key-id';
const ID_SALT=Buffer.from('nba-highlightly-quarantine/key-id-salt/v1');
const envelopeKeys=['version','provider','algorithm','keyId','salt','nonce','archiveId','tag','ciphertext'];
const error=()=>Object.assign(new Error('Highlightly quarantine operation failed; stop and review encrypted evidence.'),{code:'HIGHLIGHTLY_QUARANTINE'});
const check=condition=>{if(!condition)throw error();};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const canonical=value=>JSON.stringify(value);
const keyBytes=key=>{check(typeof key==='string'&&key.length>0&&key.length<=8192);return Buffer.from(key,'utf8');};
const keyId=key=>Buffer.from(hkdfSync('sha256',keyBytes(key),ID_SALT,Buffer.from(ID_DOMAIN),32)).toString('hex');
const encryptionKey=(key,salt)=>Buffer.from(hkdfSync('sha256',keyBytes(key),salt,Buffer.from(ENC_DOMAIN),32));
function request(endpoint,params){
 check(plain(params));
 const keys=Object.keys(params).sort();
 if(endpoint==='/matches'){
  check(['league,limit,offset,season,timezone','date,league,limit,offset,season,timezone'].includes(keys.join(','))&&params.league==='NBA'&&params.season===2027&&params.timezone==='America/New_York'&&params.limit===100&&Number.isSafeInteger(params.offset)&&params.offset>=0);
  if(Object.hasOwn(params,'date'))check(typeof params.date==='string'&&/^\d{4}-\d\d-\d\d$/.test(params.date)&&Number.isFinite(Date.parse(params.date))&&new Date(params.date).toISOString().slice(0,10)===params.date&&params.date>='2026-07-01'&&params.date<='2027-06-30');
 }else check(typeof endpoint==='string'&&/^\/box-score\/[1-9]\d*$/.test(endpoint)&&Number.isSafeInteger(Number(endpoint.slice(11)))&&keys.length===0);
 return Object.fromEntries(keys.map(k=>[k,params[k]]));
}
function metadata(record){
 const params=request(record.endpoint,record.params);
 check(Number.isInteger(record.status)&&record.status>=100&&record.status<=599&&typeof record.fetchedAt==='string'&&/^\d{4}-\d\d-\d\dT.*Z$/.test(record.fetchedAt)&&Number.isFinite(Date.parse(record.fetchedAt)));
 const quota=record.quotaHeaders===undefined?{}:record.quotaHeaders;
 check(plain(quota)&&Object.keys(quota).every(k=>['x-ratelimit-requests-limit','x-ratelimit-requests-remaining'].includes(k)&&typeof quota[k]==='string'&&quota[k].length<=16384));
 const quotaHeaders=Object.fromEntries(Object.keys(quota).sort().map(k=>[k,quota[k]]));
 const quotaHeadersTruncated=record.quotaHeadersTruncated===undefined?false:record.quotaHeadersTruncated;check(typeof quotaHeadersTruncated==='boolean');
 const capture=record.capture===undefined?{complete:true,reason:null}:record.capture;
 check(plain(capture)&&Object.keys(capture).length===2&&Object.hasOwn(capture,'complete')&&Object.hasOwn(capture,'reason')&&(capture.complete===true&&capture.reason===null||capture.complete===false&&['response-too-large','stream-incomplete'].includes(capture.reason)));
 return {endpoint:record.endpoint,params,status:record.status,fetchedAt:record.fetchedAt,quotaHeaders,quotaHeadersTruncated,capture:{complete:capture.complete,reason:capture.reason}};
}
function aad(record){
 check(record.version===1&&record.provider==='Highlightly'&&record.algorithm==='AES-256-GCM'&&typeof record.keyId==='string'&&/^[a-f0-9]{64}$/.test(record.keyId)&&UUID.test(record.archiveId));
 decode(record.salt,32);decode(record.nonce,12);
 return Buffer.from(canonical({version:1,provider:'Highlightly',algorithm:'AES-256-GCM',keyId:record.keyId,salt:record.salt,nonce:record.nonce,archiveId:record.archiveId}));
}
function decode(text,size,max=MAX_QUARANTINE_BYTES){
 check(typeof text==='string'&&text.length<=4*Math.ceil((size??max)/3)&&!/[^A-Za-z0-9+/=]/.test(text));
 const bytes=Buffer.from(text,'base64');check(bytes.toString('base64')===text&&(size===undefined?bytes.length<=max:bytes.length===size));return bytes;
}
export function isQuarantinePath(path){
 if(typeof path!=='string'||!path.startsWith(`${ROOT}/`))return false;
 const file=path.slice(ROOT.length+1);return file.endsWith('.json')&&UUID.test(file.slice(0,-5));
}
export function encryptResponse({key,endpoint,params={},status,fetchedAt,bodyBytes,quotaHeaders,quotaHeadersTruncated,capture,archiveId=randomUUID()}){
 try{
  check(bodyBytes instanceof Uint8Array&&bodyBytes.byteLength<=MAX_QUARANTINE_BYTES);
  const salt=randomBytes(32),nonce=randomBytes(12);
  const record={version:1,provider:'Highlightly',algorithm:'AES-256-GCM',keyId:keyId(key),salt:salt.toString('base64'),nonce:nonce.toString('base64'),archiveId};
  const plaintext=Buffer.from(canonical({...metadata({endpoint,params,status,fetchedAt,quotaHeaders,quotaHeadersTruncated,capture}),bodyBase64:Buffer.from(bodyBytes).toString('base64')}));check(plaintext.length<=MAX_ENVELOPE_BYTES);
  const cipher=createCipheriv('aes-256-gcm',encryptionKey(key,salt),nonce,{authTagLength:16});cipher.setAAD(aad(record));
  const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  return {...record,tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')};
 }catch{throw error();}
}
export function decryptRecord(record,{key}){
 try{
  check(plain(record)&&Object.keys(record).length===envelopeKeys.length&&envelopeKeys.every(k=>Object.hasOwn(record,k)));
  const associated=aad(record),expected=Buffer.from(keyId(key),'hex');check(timingSafeEqual(expected,Buffer.from(record.keyId,'hex')));
  const salt=decode(record.salt,32),nonce=decode(record.nonce,12),tag=decode(record.tag,16),ciphertext=decode(record.ciphertext,undefined,MAX_ENVELOPE_BYTES);
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey(key,salt),nonce,{authTagLength:16});decipher.setAAD(associated);decipher.setAuthTag(tag);
  const plaintext=Buffer.concat([decipher.update(ciphertext),decipher.final()]);check(plaintext.length<=MAX_ENVELOPE_BYTES);
  const payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plaintext));check(plain(payload)&&Object.keys(payload).every(k=>['endpoint','params','status','fetchedAt','bodyBase64','quotaHeaders','quotaHeadersTruncated','capture'].includes(k))&&['endpoint','params','status','fetchedAt','bodyBase64'].every(k=>Object.hasOwn(payload,k)));
  return {...metadata(payload),bodyBytes:decode(payload.bodyBase64)};
 }catch{throw error();}
}
export function decryptResponse(record,{key}){return decryptRecord(record,{key}).bodyBytes;}
// Anchor each path component to its opened directory. O_NOFOLLOW rejects symlinks at every step.
async function parentHandle(relative,{create=false}={}){
 const parts=relative.split('/');check(parts.every(p=>p&&p!=='.'&&p!=='..'&&!p.includes('\\')));
 let handle=await fs.open(process.cwd(),constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);
 try{
  for(const part of parts.slice(0,-1)){
   const next=`/proc/self/fd/${handle.fd}/${part}`;
   if(create)await fs.mkdir(next,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});
   const opened=await fs.open(next,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);await handle.close();handle=opened;
  }
  return {handle,file:`/proc/self/fd/${handle.fd}/${parts.at(-1)}`};
 }catch(e){await handle.close();throw e;}
}
async function writeExclusive(relative,bytes){
 const parent=await parentHandle(relative,{create:true});let file;
 try{file=await fs.open(parent.file,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);await file.writeFile(bytes);await file.sync();await file.close();file=null;await parent.handle.sync();}
 finally{if(file)await file.close();await parent.handle.close();}
}
async function readArchive(relative){
 check(isQuarantinePath(relative));const parent=await parentHandle(relative);let file;
 try{file=await fs.open(parent.file,constants.O_RDONLY|constants.O_NOFOLLOW);const stat=await file.stat();check(stat.isFile()&&stat.size<=4*Math.ceil(MAX_ENVELOPE_BYTES/3)+4096);const archive=JSON.parse(await file.readFile('utf8'));check(relative===`${ROOT}/${archive.archiveId}.json`);return archive;}
 finally{if(file)await file.close();await parent.handle.close();}
}
export function createQuarantineWriter({key,persist,now=()=>Date.now(),idFactory=randomUUID}){
 keyBytes(key);check(typeof persist==='function');let failed=false,busy=false;
 return async({endpoint,params={},status,fetchedAt,bodyBytes,quotaHeaders,quotaHeadersTruncated,capture})=>{
  if(failed||busy){failed=true;throw error();}busy=true;
  try{
   const archive=encryptResponse({key,endpoint,params,status,fetchedAt:fetchedAt??new Date(now()).toISOString(),bodyBytes,quotaHeaders,quotaHeadersTruncated,capture,archiveId:idFactory()});
   const path=`${ROOT}/${archive.archiveId}.json`;check(isQuarantinePath(path));await writeExclusive(path,Buffer.from(canonical(archive)+'\n'));await persist([path]);return path;
  }catch{failed=true;throw error();}finally{busy=false;}
 };
}
export function makeQuarantineReplayClient({records,key}){
 check(Array.isArray(records));
 const available=records.map(archive=>{const record=decryptRecord(archive,{key});return {record,body:record.bodyBytes,requestKey:canonical({endpoint:record.endpoint,params:request(record.endpoint,record.params)})};});
 return async(endpoint,params={})=>{
  try{
   const match=canonical({endpoint,params:request(endpoint,params)}),entry=available.find(e=>e.requestKey===match&&e.record.status>=200&&e.record.status<300&&e.record.capture.complete&&!e.used);
   check(entry);entry.used=true;
   // Recovery preserves invalid bytes; only replay of valid JSON is permitted.
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(entry.body));
  }catch{throw error();}
 };
}
export async function loadQuarantineReplayClient({paths,key}){
 try{check(Array.isArray(paths));const records=[];for(const path of paths)records.push(await readArchive(path));return makeQuarantineReplayClient({records,key});}catch{throw error();}
}
export async function recoverQuarantinedRecord(archivePath,outputPath,{key}){
 try{
  check(typeof outputPath==='string'&&/^\.local\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.json$/.test(outputPath));
  const decrypted=decryptRecord(await readArchive(archivePath),{key});await writeExclusive(outputPath,decrypted.bodyBytes);return {path:outputPath,capture:decrypted.capture};
 }catch{throw error();}
}
export async function recoverQuarantinedResponse(archivePath,outputPath,{key}){return (await recoverQuarantinedRecord(archivePath,outputPath,{key})).path;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  check(process.argv.length===5&&process.argv[2]==='recover');
  const recovered=await recoverQuarantinedRecord(process.argv[3],process.argv[4],{key:process.env.HIGHLIGHTLY_QUARANTINE_KEY||process.env.HIGHLIGHTLY_API_KEY});
  console.log(recovered.capture.complete?'Complete captured response recovered to the private output file.':`Incomplete captured response recovered privately (${recovered.capture.reason}); not replayable.`);
 }catch{console.error('Quarantine recovery failed. Check the archive and matching key privately.');process.exitCode=1;}
}
