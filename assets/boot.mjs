import * as core from './core.mjs';
import {loadCurrent} from './loader.mjs';
import {createAppUpdates} from './updates.mjs';
window.AppUpdates=createAppUpdates();
const script = src => new Promise((resolve,reject)=>{
  const element=document.createElement('script'); element.src=src; element.onload=resolve; element.onerror=reject; document.body.append(element);
});
try {
  const response=await fetch(new URL('data/history-v1.json',document.baseURI));
  if(!response.ok) throw new Error('Historical data unavailable');
  const history=await response.json();
  if(history.players?.length!==1029 || history.rows?.length!==2867 || history.seasons?.length!==5) throw new Error('Historical data validation failed');
  window.__DATASET=history;
  window.FantasyCore=core;
  window.CurrentLoad=await loadCurrent({knownIds:history.players.map(p=>p[0])});
  await script('./assets/legacy.js');
  await script('./assets/adapter.js');
  await script('./assets/app.js');
  await script('./assets/companion.js');
  await window.startApp();
  await window.AppUpdates.ready();
} catch(error) {
  const view=document.getElementById('view');
  view.innerHTML='<div class="empty"><h2>Data could not be loaded</h2><p>The first visit needs a connection. Previously cached data remains on this device.</p><button class="btn" onclick="location.reload()">Retry</button></div>';
  console.error(error);
}
