import * as core from './core.mjs';
import {rosterClubFor} from './rosters.mjs';
import * as dashboard from './dashboard.mjs';
import {loadPlayerPhotos} from './photos.mjs';
import {loadCurrent} from './loader.mjs';
import {reconcilePlayerAliases} from './player-aliases.mjs';
import {createSessionPersistence} from './session.mjs';
import {createAppUpdates} from './updates.mjs';
import {withRequestTimeout} from './request-timeout.mjs';
window.AppUpdates=createAppUpdates();
const script = src => new Promise((resolve,reject)=>{
  const element=document.createElement('script'); element.src=src; element.onload=resolve; element.onerror=reject; document.body.append(element);
});
try {
  const pendingPhotos=loadPlayerPhotos();
  const history=await withRequestTimeout(10000,async signal=>{
    const response=await fetch(new URL('data/history-v1.json',document.baseURI),{signal});
    if(!response.ok) throw new Error('Données historiques indisponibles');
    return response.json();
  });
  if(history.players?.length!==1029 || history.rows?.length!==2867 || history.seasons?.length!==5) throw new Error('Échec de la validation des données historiques');
  window.__DATASET=history;
  window.FantasyCore=core;
  window.CurrentRoster={clubFor:player=>rosterClubFor(player,core.SEASON,window.CurrentLoad?.data?.players||[])};
  window.FantasyDashboard=dashboard;
  const load=await loadCurrent({knownIds:history.players.map(p=>p[0])});
  const {data,aliases,issues}=reconcilePlayerAliases(load.data);
  window.CurrentLoad={...load,data,aliases,identityIssues:issues};
  await script('./assets/legacy.js');
  await script('./assets/adapter.js');
  await script('./assets/app.js');
  await script('./assets/companion.js');
  await script('./assets/dashboard.js');
  await script('./assets/courtside.js');
  window.PlayerPhotos=await pendingPhotos;
  await window.startApp();
  await createSessionPersistence().ready();
  await window.Courtside.initialRoute();
  await window.AppUpdates.ready();
} catch(error) {
  const view=document.getElementById('view');
  view.innerHTML='<div class="empty"><h2>Impossible de charger les données</h2><p>La première visite nécessite une connexion. Les données déjà mises en cache restent sur cet appareil.</p><button class="btn" onclick="location.reload()">Réessayer</button> <a href="./reparer.html">Réparer l’affichage</a></div>';
  console.error(error);
}

