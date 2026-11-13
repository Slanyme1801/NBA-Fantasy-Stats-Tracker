import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createPlayerPhotos} from '../assets/photos.mjs';
const all=JSON.parse(fs.readFileSync(new URL('../data/player-photos.json',import.meta.url)));const patch=Object.fromEntries(Object.entries(all.players).filter(([,p])=>p.provenance==='editorial-source'));const one=Object.values(patch)[0];
const api=p=>createPlayerPhotos({players:{[p.nbaId]:p}});
test('reviewed editorial entries retain uncertain rights, source and complete attribution',()=>{
 const result=createPlayerPhotos({players:patch});assert.equal(result.count,Object.keys(patch).length);assert(result.count>0);
 for(const p of Object.values(patch)){assert(result.portrait(p.nbaId).includes(p.path));assert(result.credits().includes(p.author.replaceAll('&','&amp;')));assert(result.credits().includes('Licence de réutilisation non établie'));assert(result.credits().includes('droits photographiques originaux non établis'));}
 assert.doesNotMatch(result.credits(),/href=""|Creative Commons|libres de droits/);
});
test('editorial admission requires explicit unknown rights and all reviewed metadata',()=>{
 for(const field of ['provenance','rightsVerification','source','originalUrl','author','name','alt','width','height','mime','transparent','sha256','clubAudit','transformations','license']){const p={...one};delete p[field];assert.equal(api(p).count,0,field);}
 for(const change of [{licenseUrl:'https://creativecommons.org/licenses/by/4.0/'},{sourceLicense:'https://example.org/terms'}, {source:'javascript:alert(1)'},{originalUrl:'data:text/plain,hello'},{path:'https://example.org/a.png'},{path:'assets/player-photos/../a.png'},{nbaId:'highlightly:1'},{width:Infinity},{sha256:'bad'},{clubAudit:{status:'civilian-no-club-uniform',date:'2026-11-13'}}])assert.equal(api({...one,...change}).count,0,JSON.stringify(change));
});
test('reviewed bounds preserve full-image proportions without editing or stretching pixels',()=>{
 for(const p of Object.values(patch)){const [x,y,w,h]=p.displayBounds;assert(x>=0&&y>=0&&x+w<=p.width&&y+h<=p.height);assert.match(api(p).portrait(p.nbaId),/preserveAspectRatio="xMidYMax meet"/);}
});
test('complete public catalogue remains accepted',()=>{assert.equal(createPlayerPhotos(all).count,all.scope.coveredCount);});
