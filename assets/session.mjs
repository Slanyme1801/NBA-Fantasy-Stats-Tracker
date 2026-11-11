// Tab-local persistence: no shared-device preferences or URL routing changes.
export function createSessionPersistence({win=window,doc=document,storage}={}){
 try{storage??=win.sessionStorage;}catch{}
 const key='nbafs.view.v1:'+new URL('./',doc.baseURI).href;
 let ready=false;
 const save=()=>{
  if(!ready||!storage||!win.FantasySession)return;
  try{storage.setItem(key,JSON.stringify({schema:1,state:win.FantasySession.capture()}));}catch{}
 };
 return {save,async ready(){
  let saved;
  try{saved=JSON.parse(storage?.getItem(key)||'null');}catch{}
  if(saved?.schema===1&&saved.state&&typeof saved.state==='object'){
   try{await win.FantasySession.restore(saved.state);}catch{try{storage?.removeItem(key);}catch{}}
  }
  ready=true;
  win.addEventListener('pagehide',save);
  doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='hidden')save();});
  // Debounced edits also protect tabs suspended without a pagehide event.
  let timer;
  const schedule=()=>{win.clearTimeout(timer);timer=win.setTimeout(save,300);};
  for(const event of ['input','change','click'])doc.addEventListener(event,schedule);
  win.addEventListener('scroll',schedule,{passive:true});
 }};
}
