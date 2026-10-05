// Explicit manual UI test server. Generates no files in production data/.
import fs from 'node:fs/promises';import path from 'node:path';
import {fixture,game,line} from './fixtures.mjs';import {publishLocal} from '../tools/publish.mjs';
const root=process.cwd(),target=path.join(root,'.local/ui-fixtures');
await fs.mkdir(target,{recursive:true});
for(const file of ['index.html','sw.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'])await fs.copyFile(path.join(root,file),path.join(target,file));
await fs.cp(path.join(root,'assets'),path.join(target,'assets'),{recursive:true});await fs.mkdir(path.join(target,'data'),{recursive:true});await fs.copyFile(path.join(root,'data/history-v1.json'),path.join(target,'data/history-v1.json'));
const date=new Date(),today=date.toISOString(),d=fixture();d.updatedAt=today;d.coverageCheckedAt=today;
d.players.forEach(p=>p.verifiedAt=today);d.positions.importedAt=today;d.positions.entries.forEach(p=>p.observedAt=today);
d.games=Array.from({length:3},(_,i)=>game(i+1,new Date(+date-i*86400000).toISOString()));
d.lines=d.games.flatMap(g=>[1,2,3].map(id=>line(g.id,id)));
d.games.push(game(4,new Date(+date-3*86400000).toISOString()));d.lines.push(line(4,1,{participation:'dnp',stats:null,seconds:null}),line(4,2,{participation:'missing',stats:null,seconds:null}));
await publishLocal(d,{root:target});
const html=await fs.readFile(path.join(target,'index.html'),'utf8');await fs.writeFile(path.join(target,'index.html'),html.replace('<body>','<body><div style="background:#8b1730;color:white;padding:12px;text-align:center">SYNTHETIC TEST FIXTURES ONLY — NOT PRODUCTION DATA</div>'));
process.chdir(target);process.env.PORT='4174';await import('../tools/preview.mjs');
