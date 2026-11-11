import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {playerKeyFor} from '../assets/core.mjs';

const source=readFileSync(new URL('../assets/companion.js',import.meta.url),'utf8');
function fixture(){return {
  provider:'Highlightly',connection:'connected',updatedAt:'2026-11-10T16:00:00Z',
  scope:{completeSeason:false,startDate:'2026-11-01',endDate:'2026-11-09',timeZone:'America/New_York'},
  coverage:[{startDate:'2026-11-01',endDate:'2026-11-01',requests:[{fetchedAt:'2026-11-02T12:00:00Z'}]},
    {startDate:'2026-11-09',endDate:'2026-11-09',requests:[{fetchedAt:'2026-11-10T12:00:00Z'}]}],
  minutesPrecision:'rounded-whole-minute',games:[{id:1,type:'regular',start:'2026-11-09T22:00:00Z',home:{id:1,code:'AAA'},away:{id:2,code:'BBB'}}],
  lines:[{nbaId:3,gameId:1,teamId:1,seconds:1800,stats:{}},{nbaId:4,gameId:1,seconds:null,stats:{}}],positions:{entries:[],importedAt:null}
};}
function context(d=fixture()){
  const c=vm.createContext({window:{CurrentLoad:{data:d,state:'fresh'},PlayerIdentity:{matches:(row,id)=>row.nbaId===id},FantasyCore:{playerKeyFor,bounds:()=>({start:null,end:'2026-11-10'}),scoringName:()=> 'Test scoring'},__DATASET:{seasons:['2025-26']}},META:{scoring:{}},fmt:String});
  vm.runInContext(readFileSync(new URL('../assets/app.js',import.meta.url),'utf8').split('const uiFr=')[1].split('const statLabelFr=')[0].replace(/^/, 'const uiFr='),c);
  vm.runInContext(source.split("let activePage=")[0],c);return c;
}
test('banner states partial sample and counts actual matchs importés and players',()=>{
  const c=context();const html=vm.runInContext('statusPanel()',c);
  assert.match(html,/Échantillon partiel 2026–27/);assert.match(html,/ni la saison ni toute la ligue/);
  assert.match(html,/1 matchs importés · 2 joueurs avec des statistiques importées · 2 lignes de statistiques individuelles/);
  assert.match(html,/Les minutes sont approximatives/);assert.doesNotMatch(html,/Last successful collection/);
  assert.match(vm.runInContext('periodOptions()',c),/échantillon importé/);
});
test('coverage keeps disjoint dates and separates source collection from normalization',()=>{
  const html=vm.runInContext('coverageDetails(currentData)',context());
  assert.match(html,/2026-11-01 au 2026-11-01; 2026-11-09 au 2026-11-09/);
  assert.match(html,/America\/New_York/);
  assert.match(html,/Source récupérée : 2026-11-02 12:00:00 UTC au 2026-11-10 12:00:00 UTC/);
  assert.match(html,/Données normalisées : 2026-11-10 16:00:00 UTC/);
});
test('missing fetch provenance never substitutes normalization time',()=>{
  const d=fixture();delete d.coverage;
  assert.match(vm.runInContext('coverageDetails(currentData)',context(d)),/Source récupérée : Non renseigné/);
});
test('schedule is shown only for verified configured metadata and HTML is escaped',()=>{
  for(const refreshSchedule of [undefined,{configured:true,description:'daily'},{verified:true,description:'daily'},{configured:true,verified:true}]){
    const d={...fixture(),refreshSchedule};assert.equal(vm.runInContext('refreshScheduleLabel(currentData)',context(d)),'Aucune actualisation automatique configurée.');
  }
  const d=fixture();d.refreshSchedule={configured:true,verified:true,description:'Daily <script>alert(1)</script>'};d.scope.timeZone='<img src=x>';
  const html=vm.runInContext('coverageDetails(currentData)',context(d));
  assert.match(html,/Actualisation automatique des données : Daily &lt;script&gt;/);assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<script>|<img/);
});
test('profile labels sample averages, scoped missing-game counts and rounded minutes',()=>{
  const d=fixture(),c=context(d),nodes={};
  Object.assign(c,{CURRENT:{player_id:3,seasons:[]},el:id=>nodes[id]??=( {innerHTML:''}),renderSimilar:()=>{}});
  c.window.FantasyCore.aggregate=()=>({gp:1,dnp:0,missing:0,uncollectedGames:0,period:{days:7,start:'2026-11-04',end:'2026-11-10'},fptsPerGame:5});
  c.window.FantasyCore.fantasyPoints=()=>5;
  c.aggregateTable=()=>'';
  vm.runInContext(source.slice(source.indexOf('function renderCurrentProfile(){'),source.indexOf('function renderSimilar(){')),c);
  vm.runInContext('renderCurrentProfile()',c);
  const html=nodes.currentProfile.innerHTML;
  assert.match(html,/Moyenne de l’échantillon/);assert.match(html,/Dans l’échantillon importé : 0/);
  assert.match(html,/Ce nombre n’inclut pas tous les matchs manquants de la ligue/);assert.doesNotMatch(html,/League coverage:/);
  assert.match(html,/<th>MIN ≈<\/th>/);assert.match(html,/<td>≈ 30<\/td>/);
});
test('coverage distinguishes previously deferred box scores from NBA identity links',()=>{const d=fixture();d.games[0].refreshIssue={code:'unmapped-players',unmappedPlayerCount:1,preservedPreviousBoxScore:true};const html=vm.runInContext('coverageDetails(currentData)',context(d));assert.match(html,/1 feuilles de match différées attendent leur import par identifiant fournisseur/);assert.match(html,/1 conservent une ancienne feuille vérifiée/);assert.match(html,/La liaison NBA n’est pas nécessaire/);assert.doesNotMatch(html,/await verified player identities/);});
test('top coverage summary explicitly shows complete box scores out of imported finished games',()=>{const d=fixture();d.games=Array.from({length:22},(_,i)=>({id:i+1,status:'finished',type:'regular',statsState:i===0?'available':'missing'}));const html=vm.runInContext('statusPanel()',context(d));assert.match(html,/1 sur 22 matchs terminés importés disposent d’une feuille de statistiques/);});

test('pending NBA links count provider records separately without implying missing stats or games',()=>{
  const d=fixture();d.lines=[{providerId:101,nbaId:null},{providerId:101,nbaId:null},{providerId:102,nbaId:42},{nbaId:43}];
  const html=vm.runInContext('coverageDetails(currentData)',context(d));
  assert.match(html,/1 matchs importés · 3 joueurs avec des statistiques importées · 4 lignes de statistiques individuelles/);
  assert.match(html,/2 lignes de joueur attendent une liaison à l’historique NBA ; les statistiques disponibles sont incluses/);
  assert.match(html,/Cela ne modifie pas la couverture des matchs/);assert.doesNotMatch(html,/previously deferred/);
  d.lines=d.lines.map((r,i)=>({...r,nbaId:i+100}));
  assert.doesNotMatch(vm.runInContext('coverageDetails(currentData)',context(d)),/liaison à l’historique NBA/);
});
