---
layout: null
---
// Pages makes this script byte-different on every published commit.
const VERSION='{{ site.github.build_revision }}';
const PREFIX='nbafs-shell-v3:'+self.registration.scope+':',SHELL=PREFIX+VERSION;
const ASSETS=['','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','icon-maskable-512.png','assets/style.css','assets/companion.css','assets/core.mjs','assets/loader.mjs','assets/boot.mjs','assets/legacy.js','assets/adapter.js','assets/app.js','assets/companion.js','assets/updates.mjs','data/history-v1.json'];
const address=relative=>new URL(relative,self.registration.scope).href;
async function fetchRelease(relative){
  const url=new URL(relative||'index.html',self.registration.scope);url.searchParams.set('app-version',VERSION);
  const response=await fetch(url,{cache:'reload',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Incomplete application release');return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(SHELL);
  try{for(let i=0;i<ASSETS.length;i+=4)await Promise.all(ASSETS.slice(i,i+4).map(async relative=>cache.put(address(relative),await fetchRelease(relative))));}
  catch(error){await caches.delete(SHELL);throw error;}
  // Old pages cannot save drafts. Prepare their next navigation without forcing
  // an open legacy page to reload and lose its unsaved input.
  if((await caches.keys()).some(key=>key==='nbafs-shell-v1'||key==='nbafs-shell-v2'))await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys(),previous=keys.filter(key=>key.startsWith(PREFIX)&&key!==SHELL).at(-1);
  await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==SHELL&&key!==previous).map(key=>caches.delete(key)));
  for(const key of ['nbafs-shell-v1','nbafs-shell-v2','nbafs-data-v1']){
    if(!keys.includes(key))continue;const cache=await caches.open(key);
    for(const request of await cache.keys())if(request.url.startsWith(self.registration.scope))await cache.delete(request);
    if(!(await cache.keys()).length)await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='GET_APP_VERSION')event.ports?.[0]?.postMessage({version:VERSION});
  if(event.data?.type==='ACTIVATE_APP_UPDATE'&&event.data.version===VERSION&&event.source?.url?.startsWith(self.registration.scope))event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const relative=url.pathname.slice(scope.pathname.length);if(!ASSETS.includes(relative))return;
  // One complete application generation; current data has its own validator.
  event.respondWith((async()=>{
    const cache=await caches.open(SHELL),cached=await cache.match(address(relative));if(cached)return cached;
    try{const response=await fetchRelease(relative);await cache.put(address(relative),response.clone());return response;}
    catch{return new Response('Offline: this application release is not available',{status:503,headers:{'Content-Type':'text/plain'}});}
  })());
});
