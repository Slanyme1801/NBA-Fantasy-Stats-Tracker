import {emptySeason,validateSeason} from './core.mjs';
import {withRequestTimeout} from './request-timeout.mjs';
// Never overwrite schema-1 fallback data used by an older installed app.
const CACHE = 'nbafs-verified-v3', LEGACY_CACHE = 'nbafs-verified-v2';
export async function loadCurrent({fetcher=fetch,cacheStorage=globalThis.caches,base=document.baseURI,knownIds=[]}={}) {
  const key=new URL('data/last-verified',base).href;
  let cache;
  try { cache=await cacheStorage?.open(CACHE); } catch {}
  try {
    const manifest=await withRequestTimeout(8000,async signal=>{
      const response=await fetcher(new URL('data/manifest.json',base),{cache:'no-store',signal});
      if(!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
      return response.json();
    });
    if(manifest.schemaVersion!==1 || !/^data\/releases\/[a-z0-9.-]+\.json$/.test(manifest.file) || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('Invalid data manifest');
    const bytes=await withRequestTimeout(8000,async signal=>{
      const response=await fetcher(new URL(manifest.file,base),{cache:'no-store',signal});
      if(!response.ok) throw new Error(`Data HTTP ${response.status}`);
      return response.arrayBuffer();
    });
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(hash!==manifest.sha256) throw new Error('Data checksum mismatch');
    const data=validateSeason(JSON.parse(new TextDecoder().decode(bytes)),knownIds);
    if(manifest.updatedAt!==data.updatedAt) throw new Error('Data timestamp mismatch');
    try { await cache?.put(key,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}})); } catch {}
    return {data,state:'fresh',error:null};
  } catch(error) {
    for(const name of [CACHE,LEGACY_CACHE]) {
      try {
        const stored=name===CACHE?cache:await cacheStorage?.open(LEGACY_CACHE);
        const response=await stored?.match(key);
        if(response) return {data:validateSeason(await response.json(),knownIds),state:'cached',error:String(error.message)};
      } catch {}
    }
    return {data:emptySeason(),state:'unavailable',error:String(error.message)};
  }
}
