// Independently reviewed official debut evidence. Never rewrites provider participation or counters.
import {checkDocumentedParticipationReview} from './highlightly-participation-reviews.mjs';
import {localMatchDay} from './highlightly.mjs';
export const COOPER_DEBUT_REFERENCE=Object.freeze({providerId:76588322,nbaId:1643721,providerTeamId:42,firstAppearanceET:'2026-10-31',articleDate:'2026-11-07',source:'https://www.nba.com/grizzlies/news/grizzlies-sign-richie-saunders-to-two-way-contract'});
// Reviewed NBA box score: Dadiet is explicitly DNP - Coach's Decision, with no
// minutes and zero counters. This exception never applies to another game/player.
export const DADIET_DNP_REFERENCE=Object.freeze({gameId:1547577,nbaGameId:'0022600008',providerId:78180812,nbaId:1642359,teamId:26,dateET:'2026-10-23',source:'https://www.nba.com/game/0022600008/box-score',verifiedAt:'2026-11-13T09:10:15.556Z'});
export function hasVerifiedDidNotPlay(game,providerId,teamId){
 const r=DADIET_DNP_REFERENCE;
 return game.id===r.gameId&&providerId===r.providerId&&teamId===r.teamId&&game.home.id===2&&game.away.id===26&&localMatchDay(game)===r.dateET;
}
export function checkOfficialParticipation(lines,game,checkedAt){
 const line=lines.find(l=>l.providerId===COOPER_DEBUT_REFERENCE.providerId&&l.participation==='played');
 const gameDateET=localMatchDay(game);
 if(!line||gameDateET>=COOPER_DEBUT_REFERENCE.firstAppearanceET)return checkDocumentedParticipationReview(lines,game,checkedAt);
 return {...COOPER_DEBUT_REFERENCE,gameId:game.id,gameDateET,observedTeamId:line.teamId,observedParticipation:'played',checkedAt};
}
