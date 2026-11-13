import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../assets/dashboard.css',import.meta.url),'utf8');
const added=css.slice(css.indexOf('/* Larger full-body editions:'));
test('special portraits gain substantial visible height without affecting ordinary profiles',()=>{
 assert.match(added,/body\[data-profile-edition\]:not\(\[data-profile-edition=""\]\) \.player-head \.profile-portrait\{height:500px;max-width:520px;padding:40px 0 0/);
 assert.match(added,/max-height:460px;object-fit:contain;object-position:center bottom/);
 assert.match(added,/height:340px;max-width:360px;padding:30px 0 0/);
 assert.match(added,/max-height:310px/);
 assert.ok(460/295>1.5);assert.ok(310/205>1.5);
});
test('tablet switches to stacked layout, mobile stays single column, images have no new frame',()=>{
 assert.match(added,/@media\(min-width:761px\) and \(max-width:1050px\)/);
 assert.equal((added.match(/grid-template-columns:minmax\(0,1fr\);grid-template-rows:auto auto auto/g)||[]).length,2);
 assert.match(added,/min-width:0;background:transparent;border:0;border-radius:0;overflow:visible/);
 assert.match(added,/\.profile-identity\{min-width:0;overflow-wrap:anywhere/);
 assert.doesNotMatch(added,/object-fit:cover|transform:scale|scale:/);
});
test('Jokic card and Booker car ratios fit complete stage, including narrow phones',()=>{
 // Approved alpha framing: 722x1479 card, 1025x1101 car. Same heights, aspect ratio retained.
 for(const [width,height] of [[722,1479],[1025,1101]])for(const [slotW,slotH] of [[460,460],[520,460],[322,310],[264,310]]){
  const scale=Math.min(slotW/width,slotH/height);assert.ok(width*scale<=slotW+1e-9);assert.ok(height*scale<=slotH+1e-9);
 }
});
test('LeBron media and reduced motion remain intact',()=>{
 assert.match(css,/goat-user-clip\{position:absolute;inset:0;width:100%;height:100%;object-fit:contain/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.goat-user-clip\{display:none!important/);
 assert.match(added,/data-profile-edition="goat"\] \.player-head \.profile-portrait\{height:520px/);
 assert.match(added,/data-profile-edition="goat"\] \.player-head \.profile-portrait\{height:380px/);
 assert.doesNotMatch(added,/animation:|visibility:/);
});
