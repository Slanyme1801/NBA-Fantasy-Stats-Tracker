import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createPlayerPhotos,loadPlayerPhotos} from '../assets/photos.mjs';
const manifest=JSON.parse(await fs.readFile(new URL('../data/player-photos.json',import.meta.url),'utf8'));
test('photo catalogue never substitutes an unknown/provider identity and keeps credits',()=>{
 const api=createPlayerPhotos(manifest);assert.equal(api.count,manifest.scope.coveredCount);assert.ok(api.count>0&&api.count<=manifest.scope.targetCount);assert.equal(api.portrait('highlightly:101'),'');assert.equal(api.portrait(99999999),'');
 const p=Object.values(manifest.players)[0];assert.ok(api.portrait(p.nbaId).includes(p.path));assert.ok(api.credits().includes(p.author));assert.match(api.credits(),/pas un tirage aléatoire/);
});
test('all listed photo assets exist and malformed external paths are rejected',async()=>{
 for(const p of Object.values(manifest.players))assert.ok((await fs.stat(new URL('../'+p.path,import.meta.url))).size>0);
 const api=createPlayerPhotos({players:{1:{nbaId:1,path:'https://tracker.test/a.jpg',source:'https://commons.wikimedia.org',licenseUrl:'https://creativecommons.org'}}});assert.equal(api.count,0);
});
test('header retains original logo intact, accessible home link and matching background',async()=>{
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8'),css=await fs.readFile(new URL('../assets/style.css',import.meta.url),'utf8');
 assert.match(html,/aria-label="NBA Fantasy Stats, accueil"/);assert.match(html,/src="\.\/assets\/brand\/lebron-nba-original.webp" alt=""/);assert.match(css,/background:#1f4294/);
 const bytes=await fs.readFile(new URL('../assets/brand/lebron-nba-original.webp',import.meta.url));assert.equal(bytes.length,51943);
});

test('photo catalogue refresh bypasses stale HTTP caches without breaking fallback',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async(url,options)=>{assert.ok(url.searchParams.has('refresh'));assert.equal(options.cache,'no-store');return {ok:true,json:async()=>manifest};};assert.equal((await loadPlayerPhotos()).count,manifest.scope.coveredCount);
 globalThis.fetch=async()=>{throw new Error('offline');};assert.equal((await loadPlayerPhotos()).count,0);
 }finally{globalThis.fetch=original;}
});

test('transparent PNGs are flagged without inventing rights certification',async()=>{
 const api=createPlayerPhotos(manifest),cutouts=Object.values(manifest.players).filter(p=>p.transparent);
 assert.equal(cutouts.length,10);assert.match(api.credits(),/10 images sont des PNG/);assert.match(api.credits(),/usage non commercial uniquement/);assert.match(api.credits(),/droits photographiques originaux non audités/);
 for(const p of cutouts){const bytes=await fs.readFile(new URL('../'+p.path,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.match(api.portrait(p.nbaId),/photo-transparent/);}
});

test('profile portraits have one centered responsive slot for every image format',async()=>{
 const css=await fs.readFile(new URL('../assets/dashboard.css',import.meta.url),'utf8');
 const js=await fs.readFile(new URL('../assets/companion.js',import.meta.url),'utf8');
 assert.match(js,/class="profile-portrait"/);assert.match(js,/class="profile-identity"/);
 assert.match(css,/\.player-head\{align-items:center/);
 assert.match(css,/object-fit:contain;object-position:center/);
 assert.match(css,/@media\(max-width:420px\)/);
});
