import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

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
  const c=vm.createContext({window:{CurrentLoad:{data:d,state:'fresh'},FantasyCore:{bounds:()=>({start:null,end:'2026-11-10'}),scoringName:()=> 'Test scoring'},__DATASET:{seasons:['2025-26']}},META:{scoring:{}},fmt:String});
  vm.runInContext(source.split("let activePage=")[0],c);return c;
}
test('banner states partial sample and counts actual imported games and players',()=>{
  const c=context();const html=vm.runInContext('statusPanel()',c);
  assert.match(html,/Partial 2026–27 sample/);assert.match(html,/not full-season or league-wide/);
  assert.match(html,/1 imported games · 2 players with imported lines · 2 player game records/);
  assert.match(html,/Minutes are approximate/);assert.doesNotMatch(html,/Last successful collection/);
  assert.match(vm.runInContext('periodOptions()',c),/imported sample/);
});
test('coverage keeps disjoint dates and separates source collection from normalization',()=>{
  const html=vm.runInContext('coverageDetails(currentData)',context());
  assert.match(html,/2026-11-01 through 2026-11-01; 2026-11-09 through 2026-11-09/);
  assert.match(html,/America\/New_York/);
  assert.match(html,/Source fetched: 2026-11-02 12:00:00 UTC through 2026-11-10 12:00:00 UTC/);
  assert.match(html,/Snapshot normalized: 2026-11-10 16:00:00 UTC/);
});
test('missing fetch provenance never substitutes normalization time',()=>{
  const d=fixture();delete d.coverage;
  assert.match(vm.runInContext('coverageDetails(currentData)',context(d)),/Source fetched: Not recorded/);
});
test('schedule is shown only for verified configured metadata and HTML is escaped',()=>{
  for(const refreshSchedule of [undefined,{configured:true,description:'daily'},{verified:true,description:'daily'},{configured:true,verified:true}]){
    const d={...fixture(),refreshSchedule};assert.equal(vm.runInContext('refreshScheduleLabel(currentData)',context(d)),'No automatic refresh configured.');
  }
  const d=fixture();d.refreshSchedule={configured:true,verified:true,description:'Daily <script>alert(1)</script>'};d.scope.timeZone='<img src=x>';
  const html=vm.runInContext('coverageDetails(currentData)',context(d));
  assert.match(html,/Automatic snapshot refresh: Daily &lt;script&gt;/);assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<script>|<img/);
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
  assert.match(html,/Sample AVG/);assert.match(html,/Within the imported sample: 0/);
  assert.match(html,/not a count of all missing league games/);assert.doesNotMatch(html,/League coverage:/);
  assert.match(html,/<th>MIN ≈<\/th>/);assert.match(html,/<td>≈ 30<\/td>/);
});
test('coverage explicitly counts unresolved identity gaps and preserved older boxes',()=>{const d=fixture();d.games[0].refreshIssue={code:'unmapped-players',unmappedPlayerCount:1,preservedPreviousBoxScore:true};const html=vm.runInContext('coverageDetails(currentData)',context(d));assert.match(html,/1 imported games await verified player identities/);assert.match(html,/1 retain an older verified box score/);});
test('top coverage summary explicitly shows complete box scores out of imported finished games',()=>{const d=fixture();d.games=Array.from({length:22},(_,i)=>({id:i+1,status:'finished',type:'regular',statsState:i===0?'available':'missing'}));const html=vm.runInContext('statusPanel()',context(d));assert.match(html,/1 of 22 imported finished games have box scores/);});
