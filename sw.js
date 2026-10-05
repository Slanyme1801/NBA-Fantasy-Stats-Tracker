const SHELL='nbafs-shell-v2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./icon-maskable-512.png','./assets/style.css','./assets/companion.css','./assets/core.mjs','./assets/loader.mjs','./assets/boot.mjs','./assets/legacy.js','./assets/adapter.js','./assets/app.js','./assets/companion.js','./data/history-v1.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys(),legacy=keys.includes('nbafs-shell-v1');
  await Promise.all(keys.filter(key=>key.startsWith('nbafs-')&&key!==SHELL&&key!=='nbafs-verified-v2').map(key=>caches.delete(key)));
  await self.clients.claim();
  // One-time v1 migration: the old cache-first page cannot listen for an update.
  if(legacy)for(const client of await self.clients.matchAll({type:'window'}))if(client.url.startsWith(self.registration.scope))await client.navigate(client.url);
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const relative=url.pathname.slice(scope.pathname.length);
  // Only the application loader validates and retains current JSON snapshots.
  if(relative.startsWith('data/')&&relative!=='data/history-v1.json')return;
  if(!ASSETS.map(x=>x.replace(/^\.\//,'')).includes(relative)&&request.mode!=='navigate')return;
  event.respondWith((async()=>{
    const cache=await caches.open(SHELL);
    try{
      const response=await fetch(request,{cache:'no-cache',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error('Unsuccessful shell response');
      await cache.put(request,response.clone());return response;
    }catch{
      const cached=await cache.match(request)||(request.mode==='navigate'?await cache.match(new URL('index.html',scope).href):null);
      return cached||new Response('Offline: first visit needs a connection',{status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
