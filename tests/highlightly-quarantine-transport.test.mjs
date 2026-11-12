// Synthetic responses only. No network, provider key, remote Git write, or real user data.
import test from 'node:test';import assert from 'node:assert/strict';
import {makeHighlightlyClient,MAX_HIGHLIGHTLY_RESPONSE_BYTES,parseBoxScore} from '../tools/highlightly.mjs';
import {makeCachedLoader} from '../tools/highlightly-private.mjs';
const initial=Date.parse('2026-11-12T12:00:00.000Z');
function setup({fetcher,archiveResponse,saveLedger,...rest}={}){
 let time=initial,calls=0;const events=[],ledger={provider:'Highlightly',requests:[]};
 const client=makeHighlightlyClient({key:'SYNTHETIC-TEST-KEY-NOT-A-CREDENTIAL',ledger,now:()=>time,sleep:async ms=>{time+=ms;},saveLedger:async value=>{events.push('ledger');await saveLedger?.(value);},fetcher:async(...args)=>{events.push('fetch');calls++;return fetcher?fetcher(...args):new Response('{}');},archiveResponse:archiveResponse?async record=>{events.push('archive:start');await archiveResponse(record);events.push('archive:done');}:null,...rest});
 return {client,events,ledger,get calls(){return calls;}};
}
test('complete bytes archive is awaited before server quota persistence and the next request',async()=>{
 const records=[];const s=setup({archiveResponse:async r=>{await new Promise(resolve=>setTimeout(resolve,1));records.push(r);},fetcher:async()=>new Response(' {"untouched": true} \n',{headers:{'x-ratelimit-requests-remaining':'99'}})});
 await s.client('/box-score/1');await s.client('/box-score/2');
 assert.deepEqual(s.events,['ledger','fetch','archive:start','archive:done','ledger','ledger','fetch','archive:start','archive:done','ledger']);
 assert.equal(records[0].bodyBytes.toString(),' {"untouched": true} \n');assert.equal(records[0].status,200);assert.equal(records[0].endpoint,'/box-score/1');assert.deepEqual(records[0].params,{});assert.equal(Object.hasOwn(records[0],'headers'),false);assert.equal(records[0].quotaHeaders['x-ratelimit-requests-remaining'],'99');
});
test('HTTP error and malformed JSON bodies remain complete and archive before rejection',async()=>{
 for(const [status,body]of [[429,'{"error":"SYNTHETIC quota"}'],[503,'<html>synthetic server failure</html>'],[200,'{ invalid JSON \n']]){
  const records=[];const s=setup({archiveResponse:async r=>records.push(r),fetcher:async()=>new Response(body,{status})});
  await assert.rejects(s.client('/box-score/1'),/HTTP request failed|Invalid Highlightly JSON/);assert.equal(records.length,1);assert.equal(records[0].status,status);assert.equal(records[0].bodyBytes.toString(),body);assert.equal(s.calls,1);
 }
});
test('byte preservation does not normalize invalid UTF-8 or JSON whitespace',async()=>{
 const bytes=Buffer.from([0xff,0xfe,0x7b,0x0a,0x20]),saved=[];
 const s=setup({archiveResponse:async r=>saved.push(r.bodyBytes),fetcher:async()=>new Response(bytes)});
 await assert.rejects(s.client('/box-score/1'),/Invalid Highlightly JSON/);assert.deepEqual(saved[0],bytes);
});
test('archive failure prevents validation and every subsequent network request, without leaking callback text',async()=>{
 const s=setup({archiveResponse:async()=>{throw Error('SYNTHETIC SECRET must not escape');},fetcher:async()=>new Response('{ malformed')});
 await assert.rejects(s.client('/box-score/1'),e=>/archive failed/.test(e.message)&&!e.message.includes('SECRET'));
 await assert.rejects(s.client('/box-score/2'),/no further requests/);assert.equal(s.calls,1);
});
test('response archives before invalid quota headers or failed post-response ledger saves',async()=>{
 for(const badHeader of [false,true]){
  let saves=0,archived=0;const s=setup({archiveResponse:async()=>archived++,saveLedger:async()=>{if(++saves>1&&!badHeader)throw Error('save failed');},fetcher:async()=>new Response('{"complete":true}',{headers:{'x-ratelimit-requests-remaining':badHeader?'invalid':'90'}})});
  await assert.rejects(s.client('/box-score/1'),/quota header|ledger persistence/);assert.equal(archived,1);assert.equal(s.calls,1);
 }
});
test('calendar envelope archive precedes pagination validation',async()=>{
 let archived;const body='{"data":[],"malformed":"synthetic pagination"}';const s=setup({archiveResponse:async r=>{archived=r;},fetcher:async()=>new Response(body)});
 await assert.rejects(s.client('/matches',{league:'NBA',season:2027,timezone:'America/New_York',offset:0,limit:100}),/envelope|pagination/);assert.equal(archived.bodyBytes.toString(),body);
});
test('invalid source box is archived and privately cached before domain validation',async()=>{
 const stored=new Map(),records=[];const s=setup({archiveResponse:async r=>records.push(r),fetcher:async()=>new Response('[]')});
 const load=makeCachedLoader({client:s.client,cache:{get:async key=>stored.get(key),put:async(key,value)=>stored.set(key,value)},now:()=>initial});
 await assert.rejects(load('/box-score/1',{},body=>parseBoxScore(body,{id:1}),{date:'2026-11-01'}),/two box-score teams/);assert.equal(records.length,1);assert.equal(stored.size,1);assert.deepEqual([...stored.values()][0].body,[]);
});
test('budget refusal makes no fetch and no new archive, retaining previously archived body',async()=>{
 const records=[];const s=setup({maxRequests:1,archiveResponse:async r=>records.push(r)});await s.client('/box-score/1');await assert.rejects(s.client('/box-score/2'),e=>e.code==='HIGHLIGHTLY_BUDGET');assert.equal(s.calls,1);assert.equal(records.length,1);
});
test('oversized and incomplete response stops bounded reader archives only an explicitly incomplete bounded prefix',async()=>{
 for(const response of [new Response(Buffer.alloc(MAX_HIGHLIGHTLY_RESPONSE_BYTES+1,65)),new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1,2,3]));controller.error(Error('SYNTHETIC truncated body'));}}))]){
  const records=[];const s=setup({archiveResponse:async record=>records.push(record),fetcher:async()=>response});await assert.rejects(s.client('/box-score/1'),/Incomplete or oversized/);await assert.rejects(s.client('/box-score/2'),/no further requests/);assert.equal(records.length,1);assert.equal(records[0].capture.complete,false);assert.ok(records[0].bodyBytes.length<=MAX_HIGHLIGHTLY_RESPONSE_BYTES);assert.equal(s.calls,1);
 }
});
