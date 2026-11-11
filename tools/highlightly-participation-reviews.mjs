// Scoped observations requiring human review, not proof of invalid stats or a global roster rule.
// Official dated evidence was rechecked on 2026-11-11. Intent notices are not final transactions.
import {localMatchDay} from './highlightly.mjs';
const reviewed=[
 {providerId:65958167,reviewedTeamId:39,eventType:'waived',eventDate:'2026-10-19',source:'https://www.nba.com/news/bucks-waive-kevin-porter-jr-finalize-season-opening-roster',games:[[1547583,'2026-10-23'],[1548106,'2026-10-26']]},
 {providerId:65955512,reviewedTeamId:45,eventType:'announced-intent-to-waive',eventDate:'2026-10-21',source:'https://www.nba.com/player/1642396/blake-hinson/bio',games:[[1547585,'2026-10-23'],[1547985,'2026-10-25'],[1548109,'2026-10-26'],[1548366,'2026-10-28']]},
 {providerId:76595117,reviewedTeamId:38,eventType:'announced-intent-to-waive',eventDate:'2026-10-23',source:'https://www.nba.com/player/1642923/otega-oweh',games:[[1547989,'2026-10-25'],[1548107,'2026-10-26']]},
 {providerId:70540097,reviewedTeamId:46,eventType:'waived',eventDate:'2026-10-19',source:'https://www.nba.com/gamenotes/suns.pdf#page=2',games:[[1548107,'2026-10-26']]},
 {providerId:68869952,reviewedTeamId:46,eventType:'waived',eventDate:'2026-10-19',source:'https://www.nba.com/gamenotes/suns.pdf#page=2',games:[[1548107,'2026-10-26']]},
 {providerId:70638032,reviewedTeamId:28,eventType:'waived',eventDate:'2026-10-19',source:'https://www.nba.com/gamenotes/rockets.pdf#page=2',games:[[1548108,'2026-10-26']]},
 {providerId:65965877,reviewedTeamId:32,eventType:'waived',eventDate:'2026-10-19',source:'https://www.nba.com/kings/news/sacramento-kings-waive-adam-flagler',games:[[1548232,'2026-10-27']]}
];
export const DOCUMENTED_PARTICIPATION_REVIEWS=Object.freeze(reviewed.flatMap(({games,...evidence})=>games.map(([gameId,reviewedDateET])=>Object.freeze({...evidence,gameId,reviewedDateET,reviewKind:'documented-roster-event',status:'review-required'}))));
export function checkDocumentedParticipationReview(lines,game,checkedAt){
 for(const evidence of DOCUMENTED_PARTICIPATION_REVIEWS){
  if(evidence.gameId!==game.id)continue;
  const line=lines.find(l=>l.providerId===evidence.providerId&&l.participation==='played');
  if(line)return {...evidence,observedTeamId:line.teamId,observedDateET:localMatchDay(game),observedParticipation:'played',checkedAt};
 }
 return null;
}
