import {readJSON,atomicJSON,published} from './files.mjs';
import {validatePositions,validateSeason} from '../assets/core.mjs';
try {
  const [input,candidate]=process.argv.slice(2);
  if(!input) throw new Error('Usage: node tools/import-positions.mjs positions.json [existing-candidate.json]');
  const data=candidate?await readJSON(candidate):await published(),history=await readJSON('data/history-v1.json');
  const knownIds=history.players.map(p=>p[0]);
  data.positions=validatePositions(await readJSON(input),new Set([...knownIds,...data.players.map(p=>p.nbaId)]));
  validateSeason(data,knownIds);
  await atomicJSON('.local/positions-candidate.json',data);
  console.log(`Verified ${data.positions.entries.length} ESPN entries. Full replacement snapshot saved to .local/positions-candidate.json; not published.`);
}catch(error){console.error(error.message);process.exitCode=1;}
