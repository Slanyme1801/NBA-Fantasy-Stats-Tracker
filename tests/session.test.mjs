import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionPersistence} from '../assets/session.mjs';
function fixture(initial){
 const entries=new Map(),events={},devents={},restored=[];
 const key='nbafs.view.v1:https://example.test/tracker/';
 if(initial)entries.set(key,initial);
 const state={page:'player',playerId:'highlightly:123',controls:[{id:'fTeam',value:'POR'}],scroll:900};
 const win={FantasySession:{capture:()=>state,restore:async s=>restored.push(s)},addEventListener:(e,f)=>events[e]=f,setTimeout:f=>{f();return 1;},clearTimeout(){}};
 const doc={baseURI:'https://example.test/tracker/',visibilityState:'visible',addEventListener:(e,f)=>devents[e]=f};
 const storage={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 return {win,doc,storage,state,restored,events,devents,entries,key};
}
test('reload restores player, filters and scroll before saving new state',async()=>{
 const f=fixture(JSON.stringify({schema:1,state:{page:'board',scroll:300,controls:[{id:'fTeam',value:'POR'}]}}));
 const p=createSessionPersistence(f);p.save();assert.equal(f.restored.length,0);await p.ready();assert.equal(f.restored[0].page,'board');assert.equal(f.restored[0].scroll,300);
 f.events.pagehide();assert.deepEqual(JSON.parse(f.entries.get(f.key)).state,f.state);
});
test('suspended mobile tab saves on hidden visibility and edits',async()=>{const f=fixture();await createSessionPersistence(f).ready();f.doc.visibilityState='hidden';f.devents.visibilitychange();assert.equal(JSON.parse(f.entries.get(f.key)).state.playerId,'highlightly:123');f.devents.change();assert.ok(f.entries.has(f.key));});
test('corrupt or blocked tab storage never prevents startup',async()=>{const f=fixture('{');await createSessionPersistence(f).ready();assert.equal(f.restored.length,0);f.storage.getItem=()=>{throw Error('blocked');};f.storage.setItem=()=>{throw Error('blocked');};const p=createSessionPersistence(f);await p.ready();assert.doesNotThrow(()=>p.save());});
