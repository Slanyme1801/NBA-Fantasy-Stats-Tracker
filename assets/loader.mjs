import {emptySeason,validateSeason} from './core.mjs';
const CACHE = 'nbafs-verified-v2';
export async function loadCurrent({fetcher=fetch,cacheStorage=globalThis.caches,base=document.baseURI,knownIds=[]}={}) {
  const key=new URL('data/last-verified',base).href;
  let cache;
  try { cache=await cacheStorage?.open(CACHE); } catch {}
  try {
    const manifestResponse=await fetcher(new URL('data/manifest.json',base),{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!manifestResponse.ok) throw new Error(`Manifest HTTP ${manifestResponse.status}`);
    const manifest=await manifestResponse.json();
    if(manifest.schemaVersion!==1 || !/^data\/releases\/[a-z0-9.-]+\.json$/.test(manifest.file) || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('Invalid data manifest');
    const response=await fetcher(new URL(manifest.file,base),{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw new Error(`Data HTTP ${response.status}`);
    const bytes=await response.arrayBuffer();
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(hash!==manifest.sha256) throw new Error('Data checksum mismatch');
    const data=validateSeason(JSON.parse(new TextDecoder().decode(bytes)),knownIds);
    if(manifest.updatedAt!==data.updatedAt) throw new Error('Data timestamp mismatch');
    try { await cache?.put(key,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}})); } catch {}
    return {data,state:'fresh',error:null};
  } catch(error) {
    try {
      const response=await cache?.match(key);
      if(response) return {data:validateSeason(await response.json(),knownIds),state:'cached',error:String(error.message)};
    } catch {}
    return {data:emptySeason(),state:'unavailable',error:String(error.message)};
  }
}
