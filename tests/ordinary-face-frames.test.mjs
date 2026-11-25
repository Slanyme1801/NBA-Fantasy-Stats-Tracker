import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createPlayerPhotos} from '../assets/photos.mjs';
const source=await fs.readFile(new URL('../assets/courtside.js',import.meta.url),'utf8');
const map=source.slice(source.indexOf('const ordinaryFaceFrames={'),source.indexOf('function framedSpotlightPortrait('));
const frames=vm.runInNewContext(map+'ordinaryFaceFrames');
const manifest=JSON.parse(await fs.readFile(new URL('../data/player-photos.json',import.meta.url),'utf8'));
const specials=[2544,201142,201935,203507,201566,201565,203110,203081,1626164,1628369,201939,203999,203954,1628983,1630166];
test('face-only masks use existing registered image coordinates and exclude special images',()=>{
 assert.equal(Object.keys(frames).length,34);
 assert.ok(frames[202331]&&frames[1641709]&&frames[1630183]);
 assert.ok(specials.every(id=>!frames[id]));
 const photos=createPlayerPhotos(manifest);assert.ok(photos.count>=271);
 for(const [id,[x,y,w,h,path]] of Object.entries(frames)){
  const reg=manifest.players[id];
  assert.ok(photos.portrait(id),id);
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=reg.width+0.01&&y+h<=reg.height+0.01,id);
  assert.match(path,/^M[0-9. ,LQZ]+$/);
  assert.ok(w*h<reg.width*reg.height*0.6,id);
 }
});

test('Kon Knueppel box score route renders the approved face while keeping its provider ID',()=>{
 const start=source.indexOf('const spotlightAliases=');
 const end=source.indexOf('function editorialSlide',start);
 const k='highlightly:75924692';
 const sandbox={
   window:{__DATASET:{players:[]},PlayerPhotos:createPlayerPhotos(manifest)},
   currentData:{players:[]},normalized:s=>s.toLowerCase(),logo:()=>'',esc:s=>s,
   portraitFraming:{1642851:[manifest.players[1642851].path,'Kon Knueppel',1024,1024,[0,0,1024,1024]]},
   artId:p=>p.player_id
 };
 const {html,wrong,same}=vm.runInNewContext(source.slice(start,end)+
   `const route={id:${JSON.stringify(k)},name:'Kon Knueppel'};
    ({html:framedSpotlightPortrait(route,'CHA','profile'),wrong:spotlightArtId({...route,name:'Another player'}),same:route.id})`,sandbox);
 assert.equal(same,k);
 assert.equal(wrong,k);
 assert.match(html,/clip-path="url\(#cs-face-profile-1642851\)"/);
 assert.match(html,/1642851-user\.png/);
});
