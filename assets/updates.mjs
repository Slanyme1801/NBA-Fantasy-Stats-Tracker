export const editorBusy=(element,touched)=>!!element?.matches?.('input,select,textarea,[contenteditable="true"]')&&touched.has(element);
export function readDraft(storage,key,scope,now=Date.now()){
  try{const item=JSON.parse(storage.getItem(key));return item?.schema===1&&item.scope===scope&&now-item.at>=0&&now-item.at<30*60*1000?item:null;}catch{return null;}
}
export function workerVersion(worker,timeout=2000){
  return new Promise(resolve=>{
    if(!worker){resolve(null);return;}const channel=new MessageChannel();
    const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);};
    const timer=setTimeout(()=>finish(null),timeout);
    channel.port1.onmessage=event=>finish(typeof event.data?.version==='string'?event.data.version:null);
    try{worker.postMessage({type:'GET_APP_VERSION'},[channel.port2]);}catch{finish(null);}
  });
}
export function createAppUpdates({win=window,doc=document,nav=navigator,storage,now=Date.now}={}){
  try{storage??=win.sessionStorage;}catch{}
  const scope=new URL('./',doc.baseURI).href,key='nbafs.update.draft:'+scope,guard='nbafs.update.reload:'+scope,touched=new WeakSet();
  let registration,ready=false,lastAction=0,lastCheck=0,checking=false,pending=null,active=nav.serviceWorker?.controller,reloading=false,pumpTimer=null,status='Preparing offline access.',version=null;
  function render(){
    const detail=doc.getElementById('appVersionStatus');if(detail)detail.textContent=status+(version?' · '+version.slice(0,16):'');
    let banner=doc.getElementById('appUpdateNotice');
    if(!banner){banner=doc.createElement('aside');banner.id='appUpdateNotice';banner.className='app-update-notice';banner.setAttribute('role','status');doc.body.append(banner);}
    banner.hidden=!pending;
    if(pending){banner.textContent=status;const button=doc.createElement('button');button.className='btn';button.textContent='Update now';button.onclick=()=>pump(true);banner.append(button);}
  }
  const setStatus=text=>{status=text;win.PWA_STATUS=text;render();win.dispatchEvent(new Event('pwa-status'));};
  function later(){if(pumpTimer!==null)return;pumpTimer=win.setTimeout(()=>{pumpTimer=null;pump();},1000);}
  function save(target){
    if(!win.FantasySession||!storage)throw new Error('Draft storage unavailable');
    const snapshot=JSON.stringify({schema:1,scope,version:target,at:now(),state:win.FantasySession.capture()});
    storage.setItem(key,snapshot);if(storage.getItem(key)!==snapshot)throw new Error('Draft not retained');
  }
  async function pump(force=false){
    if(!pending||!ready||reloading||pending.activating)return;
    if(doc.visibilityState==='hidden'||(!force&&(editorBusy(doc.activeElement,touched)||now()-lastAction<5000))){setStatus('Update ready. Your current work will be kept when editing is finished.');later();return;}
    try{if(!pending.worker&&storage?.getItem(guard)===pending.version){pending=null;setStatus('Application updated.');return;}save(pending.version);}
    catch{setStatus('Update ready. Draft storage is unavailable; keep this tab until your work is finished.');return;}
    if(pending.worker){const worker=pending.worker;pending={version:pending.version,activating:true};worker.postMessage({type:'ACTIVATE_APP_UPDATE',version:pending.version});setStatus('Applying application update…');return;}
    try{storage.setItem(guard,pending.version);}catch{setStatus('Update ready. Automatic reload is unavailable in this browser.');return;}
    reloading=true;win.location.reload();
  }
  async function waiting(worker){
    const next=await workerVersion(worker);if(!next||worker!==registration?.waiting)return;
    pending={version:next,worker};setStatus('Application update downloaded.');pump();
  }
  async function controllerChanged(){
    const controller=nav.serviceWorker.controller;if(!controller||controller===active)return;
    const hadController=!!active;active=controller;version=await workerVersion(controller);if(!version)return;
    if(!hadController){setStatus('Offline app cache ready.');return;}
    pending={version,worker:null};setStatus('Application update ready.');pump();
  }
  async function check(force=false){
    if(!registration||checking||nav.onLine===false||doc.visibilityState==='hidden'||(!force&&now()-lastCheck<30000))return;
    checking=true;lastCheck=now();
    try{await registration.update();if(registration.waiting)await waiting(registration.waiting);else if(!pending)setStatus('Application is up to date.');}
    catch{if(!pending)setStatus('Update check unavailable. The saved application remains usable.');}
    finally{checking=false;}
  }
  doc.addEventListener('input',event=>{touched.add(event.target);lastAction=now();},true);
  doc.addEventListener('change',event=>{touched.add(event.target);lastAction=now();},true);
  for(const event of ['pointerdown','keydown'])doc.addEventListener(event,()=>{lastAction=now();},true);
  doc.addEventListener('focusout',later,true);
  for(const event of ['focus','pageshow','online'])win.addEventListener(event,()=>{check();pump();});
  doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible'){check();pump();}});
  win.addEventListener('nba:view',render);
  if(nav.serviceWorker&&win.location.protocol.startsWith('http')){
    nav.serviceWorker.addEventListener('controllerchange',controllerChanged);
    nav.serviceWorker.register(new URL('sw.js',scope).href,{updateViaCache:'none'}).then(async reg=>{
      registration=reg;
      const observe=worker=>{if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&reg.waiting)waiting(reg.waiting);});};
      reg.addEventListener('updatefound',()=>observe(reg.installing));observe(reg.installing);
      if(reg.waiting)await waiting(reg.waiting);version=await workerVersion(nav.serviceWorker.controller);
      if(!pending)setStatus('Offline app cache ready.');await check(true);
    }).catch(()=>setStatus('Offline app cache unavailable in this browser.'));
    win.setInterval(()=>check(),5*60*1000);
  }else setStatus('Automatic updates are unavailable in this browser.');
  return {check:()=>check(true),updateNow:()=>pump(true),render,async ready(){
    const draft=readDraft(storage,key,scope,now());
    if(draft){try{await win.FantasySession.restore(draft.state);storage.removeItem(key);}catch{setStatus('Your saved view could not be restored. Its draft has been retained.');return;}}
    ready=true;render();pump();
  }};
}
