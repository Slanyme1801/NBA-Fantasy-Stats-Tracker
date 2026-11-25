import test from 'node:test';
import assert from 'node:assert/strict';
import {withRequestTimeout} from '../assets/request-timeout.mjs';
test('request deadlines do not depend on AbortSignal.timeout',async()=>{
  const native=AbortSignal.timeout;
  try{
    AbortSignal.timeout=undefined;
    assert.equal(await withRequestTimeout(40,async signal=>{assert.equal(signal.aborted,false);return 'ok';}),'ok');
    await assert.rejects(withRequestTimeout(10,signal=>new Promise((_,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    })),{name:'AbortError'});
  }finally{AbortSignal.timeout=native;}
});
