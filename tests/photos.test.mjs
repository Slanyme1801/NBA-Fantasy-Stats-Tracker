import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createPlayerPhotos} from '../assets/photos.mjs';
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
