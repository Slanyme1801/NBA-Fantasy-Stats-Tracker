import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../assets/courtside.js',import.meta.url),'utf8');
const resolver=source.slice(source.indexOf('function buildPortraitLinks()'),source.indexOf('function framedSpotlightPortrait('));
const normalize=source.slice(source.indexOf('function normalized('),source.indexOf('function distance('));
const official=(nbaId,name)=>({nbaId,name}),pending=(providerId,name)=>({providerId,name,nbaId:null});
function resolve({id,history=[[1628369,'Jayson Tatum']],players=[official(1628369,'Jayson Tatum'),pending(164,'Jayson Tatum')],name='Jayson Tatum'}){
 const sandbox={window:{__DATASET:{players:history}},currentData:{players},C:{playerKeyFor:p=>'highlightly:'+p.providerId},portraitFraming:{1628369:[],1630166:[]},spotlightAliases:{},artId:p=>p.player_id};
 return vm.runInNewContext(normalize+resolver+`spotlightArtId(${JSON.stringify({id,name})})`,sandbox);
}
test('pending Tatum route gets the approved photograph and edition without rewriting its route key',()=>{
 const route='highlightly:164';assert.equal(resolve({id:route}),1628369);assert.equal(resolve({id:route,name:'Another person'}),route);
});
test('pending art links require unique agreement and never change the Voldemort profile',()=>{
 const route='highlightly:164';
 assert.equal(resolve({id:route,history:[[1628369,'Jayson Tatum'],[42,'Jayson Tatum']]}),route);
 assert.equal(resolve({id:route,players:[pending(164,'Jayson Tatum'),official(19,'Jayson Tatum')]}),route);
 assert.equal(resolve({id:route,players:[pending(164,'Jayson Tatum'),pending(42,'Jayson Tatum'),official(1628369,'Jayson Tatum')]}),route);
 assert.equal(resolve({id:'highlightly:275',name:'Deni Avdija',history:[[1630166,'Deni Avdija']],players:[official(1630166,'Deni Avdija'),pending(275,'Deni Avdija')]}),'highlightly:275');
});
