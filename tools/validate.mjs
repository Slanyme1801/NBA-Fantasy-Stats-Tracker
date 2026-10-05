import fs from 'node:fs/promises';
import {validateSeason} from '../assets/core.mjs';
import {readJSON,published,checksum} from './files.mjs';
try {
  const history=await readJSON('data/history-v1.json');
  const bytes=await fs.readFile('data/history-v1.json');
  const expected=await readJSON('data/history-integrity.json');
  if(checksum(bytes)!==expected.sha256||history.players.length!==1029||history.rows.length!==2867)throw new Error('Historical archive changed');
  const current=validateSeason(await published(),history.players.map(p=>p[0]));
  console.log(`Historical archive preserved: 1029 players / 2867 rows / 5 seasons. ${history.validation.problem_count} pre-existing rounding warnings retained.`);
  console.log(`2026-27 valid: ${current.connection}, ${current.games.length} games, ${current.lines.length} lines, ${current.positions.entries.length} ESPN entries.`);
}catch(error){console.error(error.message);process.exitCode=1;}
