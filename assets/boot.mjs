import * as core from './core.mjs';
import * as dashboard from './dashboard.mjs';
import {loadPlayerPhotos} from './photos.mjs';
import {loadCurrent} from './loader.mjs';
import {createAppUpdates} from './updates.mjs';
window.AppUpdates=createAppUpdates();
const script = src => new Promise((resolve,reject)=>{
  const element=document.createElement('script'); element.src=src; element.onload=resolve; element.onerror=reject; document.body.append(element);
});
try {
  const response=await fetch(new URL('data/history-v1.json',document.baseURI));
  if(!response.ok) throw new Error('Données historiques indisponibles');
  const history=await response.json();
  if(history.players?.length!==1029 || history.rows?.length!==2867 || history.seasons?.length!==5) throw new Error('Échec de la validation des données historiques');
  window.__DATASET=history;
  window.FantasyCore=core;
  window.FantasyDashboard=dashboard;
  window.CurrentLoad=await loadCurrent({knownIds:history.players.map(p=>p[0])});
  await script('./assets/legacy.js');
  await script('./assets/adapter.js');
  await script('./assets/app.js');
  await script('./assets/companion.js');
  await script('./assets/dashboard.js');
  window.PlayerPhotos=await loadPlayerPhotos();
  await window.startApp();
  await window.AppUpdates.ready();
} catch(error) {
  const view=document.getElementById('view');
  view.innerHTML='<div class="empty"><h2>Impossible de charger les données</h2><p>La première visite nécessite une connexion. Les données déjà mises en cache restent sur cet appareil.</p><button class="btn" onclick="location.reload()">Réessayer</button></div>';
  console.error(error);
}
