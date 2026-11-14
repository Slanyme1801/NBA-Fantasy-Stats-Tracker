// Exercises dashboard events against the real adapter/profile implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../assets/core.mjs';
import * as dashboard from '../assets/dashboard.mjs';
import {fixture,game,line,player,stats} from './fixtures.mjs';
const history=JSON.parse(await fs.readFile(new URL('../data/history-v1.json',import.meta.url),'utf8'));
function sample(mapped=false){
 const d=fixture(),today=new Date().toISOString();d.schemaVersion=2;d.provider='Highlightly';d.positions.entries=[];
 d.players=[{...player(1),nbaId:mapped?2544:null,playerKey:'highlightly:101',name:mapped?'LeBron James':'Same Name'},{...player(2),nbaId:null,playerKey:'highlightly:102',name:'Same Name'},{...player(3),nbaId:null,playerKey:'highlightly:103',name:'No Sample'}];
 d.games=[game(1,today)];d.lines=[{...line(1,1),nbaId:mapped?2544:null,playerKey:'highlightly:101'},{...line(1,2,{stats:stats({ast:15}),teamId:20}),nbaId:null,playerKey:'highlightly:102'},{...line(1,3,{participation:'missing',stats:null,seconds:null}),nbaId:null,playerKey:'highlightly:103'}];return core.validateSeason(d);
}
async function app(data){
 const nodes=new Map(),stored=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',html:'',players:[],textContent:'',type:'text',isConnected:true,classList:{add(){},toggle(){},remove(){}},focus(){},addEventListener(){},setAttribute(){},appendChild(){},closest:()=>node('label'),insertAdjacentHTML(_where,html){this.innerHTML+=html;},get innerHTML(){return this.html;},set innerHTML(html){this.html=html;this.players=[...html.matchAll(/data-player="([^"]+)"/g)].map(m=>({dataset:{player:m[1]}}));},querySelector:selector=>node(id+selector),querySelectorAll(selector){return selector==='[data-board-sort]'?[]:this.players;},matches:()=>true});return nodes.get(id);}
 const win={__DATASET:structuredClone(history),FantasyCore:core,FantasyDashboard:dashboard,CurrentLoad:{data,state:'fresh'},addEventListener(){},dispatchEvent(){},scrollTo(){},scrollY:0,AppUpdates:{render(){}}};
 const context=vm.createContext({window:win,document:{getElementById:node,createElement:()=>node('new'),querySelectorAll:()=>[],activeElement:null,body:{prepend(){}}},navigator:{onLine:true},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},URL,URLSearchParams,Event,location:{href:'https://test.local/project/'},setTimeout,clearTimeout});
 for(const file of ['legacy.js','adapter.js','app.js','companion.js','dashboard.js'])vm.runInContext(await fs.readFile(new URL('../assets/'+file,import.meta.url),'utf8'),context);
 await vm.runInContext('loadMeta()',context);
 const api=async path=>{const r=await win.AppApi(path);assert.ok(r.ok);return r.json();};return {node,win,api,run:code=>vm.runInContext(code,context)};
}
test('provider-only rows remain separate with independent teams, totals and missing samples',()=>{
 const d=sample(),r=dashboard.dashboardRanking(d,{period:'7'});
 assert.deepEqual(r.rows.map(p=>p.id),['highlightly:102','highlightly:101']);assert.equal(r.rows[0].gp,1);assert.equal(r.rows[0].fptsPerGame-r.rows[1].fptsPerGame,20);
 assert.deepEqual(r.rows[0].teams,['SIM']);assert.deepEqual(r.rows[1].teams,['TST']);assert.ok(r.rows.every(p=>p.identityPending));
 assert.equal(dashboard.dashboardRanking(d,{period:'7',position:'PG'}).rows.length,0);
 d.lines.push({...d.lines[0]});assert.equal(dashboard.dashboardRanking(d,{period:'7'}).rows.find(p=>p.id==='highlightly:101').gp,1);
});
test('dashboard player and ranking clicks open provider profiles without fabricated history',async()=>{
 const a=await app(sample());a.run("go('home')");assert.match(a.node('dashboardBody').innerHTML,/Lien avec l’historique NBA en attente/);
 const buttons=a.node('dashboardBody').players;assert.equal(buttons.length,2);
 await buttons.find(b=>b.dataset.player==='highlightly:101').onclick();assert.equal(a.win.FantasySession.capture().playerId,'highlightly:101');assert.match(a.node('currentProfile').innerHTML,/Historique des matchs · 1 enregistrements/);
 const p=await a.api('/api/player/highlightly%3A101');assert.equal(p.summary.total_gp,0);assert.ok(p.seasons.slice(0,-1).every(s=>!s.played&&s.note==='No historical record'));assert.equal(p.seasons.at(-1).gp,1);
 a.run("go('home')");a.node('dashboardRankings').onclick();await a.run('loadBoard()');assert.match(a.node('boardTable').innerHTML,/Lien avec l’historique NBA en attente/);
 await a.node('boardTable').players.find(b=>b.dataset.player==='highlightly:102').onclick();assert.equal(a.win.FantasySession.capture().playerId,'highlightly:102');assert.match(a.node('currentProfile').innerHTML,/Historique des matchs · 1 enregistrements/);
});
test('later NBA mapping enriches one row and old provider links resolve to the same profile',async()=>{
 const before=dashboard.dashboardRanking(sample(),{period:'7'}),data=sample(true),after=dashboard.dashboardRanking(data,{period:'7'});assert.equal(before.rows.length,after.rows.length);
 const mapped=after.rows.find(p=>p.id===2544);assert.equal(mapped.playerKey,'highlightly:101');assert.equal(mapped.identityPending,false);assert.equal(mapped.totalFpts,before.rows.find(p=>p.id==='highlightly:101').totalFpts);
 const a=await app(data);a.run("go('home')");await a.node('dashboardBody').players.find(b=>b.dataset.player==='2544').onclick();assert.equal(a.win.FantasySession.capture().playerId,2544);
 const p=await a.api('/api/player/highlightly%3A101'),numeric=await a.api('/api/player/2544');assert.deepEqual(p,numeric);assert.ok(p.summary.total_gp>0);assert.equal(p.seasons.at(-1).gp,1);
 assert.equal((await a.api('/api/search?q=lebron')).results.filter(p=>p.player_id===2544).length,1);
 a.run("go('board')");a.node('fSeason').value=core.SEASON;a.node('fDashboardPeriod').value='7';await a.run('loadBoard()');assert.equal(a.node('boardTable').players.filter(b=>b.dataset.player==='2544').length,1);
});
