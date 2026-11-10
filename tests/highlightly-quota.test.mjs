import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHighlightlyClient,PROVIDER} from '../tools/highlightly.mjs';
const midnight=Date.parse('2026-11-10T00:00:00Z');
function setup({ledger={provider:PROVIDER,requests:[]},time=midnight,fetcher,...options}={}){
  let clock=time,calls=0,saved;const saves=[];
  const client=makeHighlightlyClient({key:'SYNTHETIC',ledger,now:()=>clock,sleep:async ms=>{clock+=ms;},saveLedger:async value=>{saved=structuredClone(value);saves.push(saved);},fetcher:async(...args)=>{calls++;assert.ok(saved,'Reservation must be durable before fetch');return fetcher?fetcher(...args):new Response('{}');},...options});
  return {client,ledger,saves,get calls(){return calls;},setTime:t=>{clock=t;}};
}
test('legacy migration retains today and drops yesterday at UTC midnight',async()=>{
  const s=setup({ledger:{provider:PROVIDER,requests:[midnight-1,midnight]},dailyLimit:2});await s.client('/box-score/1');assert.equal(s.ledger.dayUTC,'2026-11-10');assert.equal(s.ledger.requests.length,2);await assert.rejects(s.client('/box-score/1'),/budget/);assert.equal(s.calls,1);
});
test('future and malformed legacy or UTC ledgers fail closed',()=>{
  for(const ledger of [
    {requests:[midnight+1]}, {requests:['0']}, {requests:[NaN]}, {requests:[],blocked:true},
    {dayUTC:'2026-11-11',requests:[]}, {dayUTC:'2026-02-30',requests:[]},
    {dayUTC:'2026-11-10',requests:[midnight-1]}, {dayUTC:'2026-11-10',requests:[],serverRemaining:-1}
  ])assert.throws(()=>setup({ledger:{provider:PROVIDER,...ledger}}),/ledger/);
});
test('external consumption and reserve survive restart; reset at UTC midnight',async()=>{
  const s=setup({fetcher:async()=>new Response('{}',{headers:{'x-ratelimit-requests-limit':'100','x-ratelimit-requests-remaining':'10'}})});
  await s.client('/box-score/1');assert.equal(s.ledger.requests.length,90);
  const r=setup({ledger:structuredClone(s.saves.at(-1)),time:midnight+10000});await assert.rejects(r.client('/box-score/1'),/budget/);assert.equal(r.calls,0);
  r.setTime(midnight+86400000);await r.client('/box-score/1');assert.equal(r.ledger.requests.length,1);assert.equal(r.ledger.serverRemaining,undefined);
});
test('zero and malformed quota headers durably block even after restart',async()=>{
  for(const value of ['0','oops','-1','9007199254740992','101']){
    const s=setup({fetcher:async()=>new Response('{}',{headers:{'x-ratelimit-requests-limit':'100','x-ratelimit-requests-remaining':value}})});
    if(value==='0')await s.client('/box-score/1');else await assert.rejects(s.client('/box-score/1'),/quota header/);
    const r=setup({ledger:structuredClone(s.saves.at(-1)),time:midnight+10000});await assert.rejects(r.client('/box-score/1'),/budget/);assert.equal(r.calls,0);
    r.setTime(midnight+86400000);await r.client('/box-score/1');
  }
});
test('lower server limit is enforced even without remaining header',async()=>{
  const s=setup({fetcher:async()=>new Response('{}',{headers:{'x-ratelimit-requests-limit':'1'}})});await s.client('/box-score/1');await assert.rejects(s.client('/box-score/1'),/budget/);assert.equal(s.calls,1);
});
test('stale increasing server remaining cannot replenish budget',async()=>{
  const s=setup({dailyLimit:100,fetcher:async()=>new Response('{}',{headers:{'x-ratelimit-requests-limit':'100','x-ratelimit-requests-remaining':'2'}})});
  await s.client('/box-score/1');await s.client('/box-score/1');assert.equal(s.ledger.serverRemaining,1);await s.client('/box-score/1');await assert.rejects(s.client('/box-score/1'),/budget/);assert.equal(s.calls,3);
});
test('429 and timeouts are counted and never automatically retried',async()=>{
  for(const timeout of [false,true]){
    const s=setup({fetcher:async()=>{if(timeout)throw Error('synthetic timeout');return new Response('{}',{status:429});}});await assert.rejects(s.client('/box-score/1'),/no automatic retry/);assert.equal(s.calls,1);assert.equal(s.ledger.requests.length,1);
    if(!timeout){const r=setup({ledger:structuredClone(s.saves.at(-1))});await assert.rejects(r.client('/box-score/1'),/budget/);}
  }
});
test('response crossing midnight blocks uncertain new-day quota durably',async()=>{
  const s=setup({time:midnight+86400000-1,fetcher:async()=>{s.setTime(midnight+86400000);return new Response('{}',{headers:{'x-ratelimit-requests-limit':'100','x-ratelimit-requests-remaining':'99'}});}});
  await assert.rejects(s.client('/box-score/1'),/day changed/);assert.equal(s.ledger.dayUTC,'2026-11-11');assert.equal(s.ledger.blocked,true);
  const r=setup({ledger:structuredClone(s.saves.at(-1)),time:midnight+86400000});await assert.rejects(r.client('/box-score/1'),/budget/);assert.equal(r.calls,0);
});
test('failed persistence prevents network and further requests',async()=>{
  const s=setup({saveLedger:async()=>{throw Error('synthetic disk error');}});await assert.rejects(s.client('/box-score/1'),/persistence failed/);await assert.rejects(s.client('/box-score/1'),/persistence failed/);assert.equal(s.calls,0);
});
test('default reserve stops after 90; max daily limit 100',async()=>{
  const s=setup({maxRequests:100});for(let i=0;i<90;i++)await s.client('/box-score/1');await assert.rejects(s.client('/box-score/1'),/budget/);assert.equal(s.calls,90);
  assert.throws(()=>setup({dailyLimit:101}),/limits/);
});
test('restart pacing retains latest legacy timestamp across midnight migration',async()=>{
  let waited=0;
  const s=setup({ledger:{provider:PROVIDER,requests:[midnight-1]},sleep:async ms=>{waited=ms;s.setTime(midnight+ms);}});
  await s.client('/box-score/1');assert.equal(waited,6099);assert.equal(s.ledger.requests.length,1);
});
test('timeout crossing midnight also persists an uncertain-day block',async()=>{
  const s=setup({time:midnight+86400000-1,fetcher:async()=>{s.setTime(midnight+86400000);throw Error('synthetic timeout');}});
  await assert.rejects(s.client('/box-score/1'),/no automatic retry/);assert.equal(s.saves.at(-1).blocked,true);assert.equal(s.saves.at(-1).dayUTC,'2026-11-11');assert.equal(s.calls,1);
});
test('season inventory permits omitted date but rejects invalid date and extra parameters',async()=>{
  let calls=0;const client=makeHighlightlyClient({key:'SYNTHETIC',ledger:{provider:'Highlightly',requests:[]},saveLedger:async()=>{},sleep:async()=>{},fetcher:async url=>{calls++;assert.equal(url.searchParams.has('date'),false);return {ok:true,headers:new Headers(),json:async()=>({data:[],plan:{tier:'BASIC',message:'All data available with current plan.'},pagination:{totalCount:0,offset:0,limit:100}})};}});
  const params={league:'NBA',season:2027,timezone:'America/New_York',limit:100,offset:0};await client('/matches',params);assert.equal(calls,1);
  await assert.rejects(client('/matches',{...params,date:'invalid'}));await assert.rejects(client('/matches',{...params,unexpected:true}));assert.equal(calls,1);
});
