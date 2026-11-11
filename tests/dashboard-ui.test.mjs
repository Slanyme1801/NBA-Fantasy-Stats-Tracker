// Small contract harness, not a browser layout/accessibility substitute.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as dashboard from '../assets/dashboard.mjs';
import * as core from '../assets/core.mjs';
import {fixture,player,line,game} from './fixtures.mjs';
const source=await fs.readFile(new URL('../assets/dashboard.js',import.meta.url),'utf8');
function harness(){
 const d=fixture(),today=new Date().toISOString();d.games=[game(1,today)];d.players=Array.from({length:12},(_,i)=>player(i+1));d.lines=d.players.map(p=>line(1,p.nbaId));
 const nodes=new Map(),buttons=new Map();let opened=null,defaultLoads=0;
 function node(id){if(!nodes.has(id))nodes.set(id,{value:'',html:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},get innerHTML(){return this.html;},set innerHTML(v){this.html=v;},querySelector:selector=>node(selector==='option[value="season_fpts"]'?'averageOption':'hero'),querySelectorAll:()=>[],closest:()=>node('label'),insertAdjacentHTML(_where,html){this.html+=html;}});return nodes.get(id);}
 for(const period of ['night','7','14','30'])buttons.set(period,{dataset:{period},setAttribute(k,v){this[k]=v;}});
 const context={window:{FantasyDashboard:dashboard,CurrentLoad:{state:'fresh'},FantasySession:{capture:()=>({page:'home'}),restore:async s=>context.go(s.page)},scrollTo(){}},currentData:d,META:{scoring:core.DEFAULT_SCORING},C:core,esc:s=>String(s).replaceAll('<','&lt;'),fmt:n=>Number(n).toFixed(1),scoreLabel:()=> 'ESPN default',displayDate:s=>s||'Not recorded',el:node,document:{querySelectorAll:()=>[...buttons.values()]},renderHome(){},renderBoard(){node('fSeason').value='';node('fSort').value='weighted_avg';node('fGp').value='0';node('fDashboardPeriod').value='season';},loadBoard:async()=>defaultLoads++,boardRequest:0,setBoardPositions(){},openPlayer:id=>opened=id};
 context.go=p=>{context.page=p;if(p==='home')context.renderHome();else if(p==='board')context.renderBoard();};
 vm.runInNewContext(source,context);return {context,node,buttons,get defaultLoads(){return defaultLoads;},get opened(){return opened;}};
}
test('home emits top 10, sample/date warnings, accessible period buttons and ranking route',async()=>{
 const h=harness();h.context.renderHome();
 assert.match(h.node('hero').html,/role="group"/);assert.match(h.node('dashboardBody').html,/aria-roledescription="carrousel"/);
 assert.equal((h.node('dashboardBody').html.match(/class="dashboard-player"/g)||[]).length,10);
 assert.match(h.node('dashboardBody').html,/pas un classement complet de la ligue/);
 for(const period of ['7','14','30','night']){
 h.buttons.get(period).onclick();assert.equal(h.buttons.get(period)['aria-pressed'],true);
 h.node('dashboardRankings').onclick();assert.equal(h.context.page,'board');assert.equal(h.node('fDashboardPeriod').value,period);assert.equal(h.node('fSeason').value,core.SEASON);assert.equal(h.node('fSort').value,'season_fpts');assert.equal(h.node('averageOption').textContent,'Moyenne fantasy sur la période');
 assert.match(h.node('boardTable').html,/Synthetic Test/);assert.equal((h.node('boardTable').html.match(/data-player=/g)||[]).length,12);
 h.context.go('home');
 }
});
test('historical rankings delegate unchanged; period selector switches to current season',async()=>{
 const h=harness();h.context.go('board');await h.context.loadBoard();assert.equal(h.defaultLoads,1);
 h.node('fDashboardPeriod').value='7';h.node('fDashboardPeriod').onchange();assert.equal(h.node('fSeason').value,core.SEASON);assert.match(h.node('boardNote').textContent,/UTC/);
 h.node('fSeason').value='2025-26';await h.context.loadBoard();assert.equal(h.defaultLoads,2);
});
test('session snapshot retains selected dashboard period across an app update',async()=>{
 const h=harness();h.context.renderHome();h.buttons.get('14').onclick();const saved=h.context.window.FantasySession.capture();assert.equal(saved.dashboardPeriod,'14');
 h.buttons.get('7').onclick();await h.context.window.FantasySession.restore(saved);assert.equal(h.buttons.get('14')['aria-pressed'],true);
});
test('offline shell includes every dashboard asset and motion has opt-out',async()=>{
 const worker=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');
 for(const asset of ['dashboard.css','dashboard.js','dashboard.mjs'])assert.ok(worker.includes(`'assets/${asset}'`));
 const css=await fs.readFile(new URL('../assets/dashboard.css',import.meta.url),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/animation:none/);assert.match(css,/@media\(max-width:760px\)/);
});

test('direct period selection normalizes historical AVG labels on every ranking load',async()=>{
 for(const period of ['night','7','14','30'])for(const oldSort of ['weighted_avg','simple_avg']){
  const h=harness();h.context.go('board');h.node('fSort').value=oldSort;
  h.node('fDashboardPeriod').value=period;h.node('fDashboardPeriod').onchange();
  assert.equal(h.node('fSort').value,'season_fpts');assert.equal(h.node('averageOption').textContent,'Moyenne fantasy sur la période');
  assert.match(h.node('boardTable').html,/Synthetic Test/);
  // Also covers controls restored without firing their change handler.
  h.node('fSort').value=oldSort;await h.context.loadBoard();assert.equal(h.node('fSort').value,'season_fpts');
  h.node('fSeason').value='2025-26';h.node('fSort').value=oldSort;await h.context.loadBoard();
  assert.equal(h.node('fSort').value,oldSort);assert.equal(h.node('averageOption').textContent,'Moyenne fantasy sur la saison');
 }
});
test('period selection preserves explicit total, games and name sorts',async()=>{
 for(const sort of ['total_fpts','gp','name']){
  const h=harness();h.context.go('board');h.node('fSort').value=sort;h.node('fDashboardPeriod').value='7';h.node('fDashboardPeriod').onchange();
  assert.equal(h.node('fSort').value,sort);
  h.node('fDashboardPeriod').value='season';await h.context.loadBoard();assert.equal(h.node('averageOption').textContent,'Moyenne fantasy sur la saison');
 }
});
test('carousel advances one player, wraps, pauses, resets on period change and leaves complete table',()=>{
 const h=harness();let tick=null,cleared=0;
 h.context.window.setTimeout=(fn,ms)=>{assert.equal(ms,8000);tick=fn;return 1;};
 h.context.window.clearTimeout=()=>{tick=null;cleared++;};
 h.node('dashboardCarousel').isConnected=true;
 h.context.renderHome();assert.equal(h.node('dashboardSlideCount').textContent,'1 / 10');
 assert.equal((h.node('dashboardBody').html.match(/class="dashboard-player"/g)||[]).length,10);
 tick();assert.equal(h.node('dashboardSlideCount').textContent,'2 / 10');
 h.node('dashboardNext').onclick();assert.equal(h.node('dashboardSlideCount').textContent,'3 / 10');assert.ok(tick);
 h.node('dashboardCarousel').onmouseenter();assert.equal(tick,null);
 h.node('dashboardCarousel').onmouseleave();assert.ok(tick);
 h.node('dashboardCarousel').onfocusin();assert.equal(tick,null);
 h.buttons.get('14').onclick();assert.equal(h.node('dashboardSlideCount').textContent,'1 / 10');
 h.node('dashboardPrevious').onclick();assert.equal(h.node('dashboardSlideCount').textContent,'10 / 10');
 assert.ok(cleared>0);
});
test('reduced motion starts paused and detached carousel never advances',()=>{
 const h=harness();let tick=null;
 h.context.window.matchMedia=()=>({matches:true});
 h.context.window.setTimeout=fn=>{tick=fn;return 1;};h.context.window.clearTimeout=()=>{tick=null;};
 h.context.renderHome();assert.equal(tick,null);assert.doesNotMatch(h.node('dashboardBody').html,/dashboardPause/);
 h.node('dashboardNext').onclick();assert.equal(h.node('dashboardSlideCount').textContent,'2 / 10');
});
test('French spotlight separates period average from full dated last-game statline without a pause control',()=>{
 const h=harness();h.context.renderHome();
 const html=h.node('dashboardSlide').html;
 assert.match(html,/MOYENNE FANTASY/);assert.match(html,/Dernier match disponible dans cette période/);assert.match(html,/contre SIM/);assert.match(html,/pas une moyenne/);
 for(const label of ['MIN ≈','PTS','REB','PASSES','INT','CONTRES','BP','TIRS','3 PTS','LF','FANTASY'])assert.ok(html.includes('>'+label+'<'));
 assert.doesNotMatch(h.node('dashboardBody').html,/dashboardPause|Pause slideshow/);
});
test('requested home copy remains exact and mobile shortcut stays explicit',async()=>{
 const app=await fs.readFile(new URL('../assets/app.js',import.meta.url),'utf8');
 assert.ok(app.includes('<h1>Te fait pas SCAM narvalo</h1>'));
 assert.ok(app.includes('<p>Viens cons les stats à jour et historiques des boys pour vérifier ton trade avant de te faire scam.</p>'));
 const h=harness();h.context.renderHome();assert.match(h.node('dashboardSlide').html,/Comparer ce joueur/);assert.match(h.node('dashboardSlide').html,/#dashboardComplete/);
});
