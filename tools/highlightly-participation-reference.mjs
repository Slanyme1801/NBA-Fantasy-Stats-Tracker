// Independently reviewed official debut evidence. Never rewrites provider participation or counters.
import {checkDocumentedParticipationReview} from './highlightly-participation-reviews.mjs';
import {localMatchDay} from './highlightly.mjs';
export const COOPER_DEBUT_REFERENCE=Object.freeze({providerId:76588322,nbaId:1643721,providerTeamId:42,firstAppearanceET:'2026-10-31',articleDate:'2026-11-07',source:'https://www.nba.com/grizzlies/news/grizzlies-sign-richie-saunders-to-two-way-contract'});
export function checkOfficialParticipation(lines,game,checkedAt){
 const line=lines.find(l=>l.providerId===COOPER_DEBUT_REFERENCE.providerId&&l.participation==='played');
 const gameDateET=localMatchDay(game);
 if(!line||gameDateET>=COOPER_DEBUT_REFERENCE.firstAppearanceET)return checkDocumentedParticipationReview(lines,game,checkedAt);
 return {...COOPER_DEBUT_REFERENCE,gameId:game.id,gameDateET,observedTeamId:line.teamId,observedParticipation:'played',checkedAt};
}
