// One reviewed NBA final box. It uses existing tracker identity keys, not
// provider-supplied box-score counters, and does not call Highlightly.
export const OFFICIAL_SACGSW=Object.freeze({
  gameId:1589809,nbaGameId:'0022600062',
  source:'https://statsdmz.nba.com/pdfs/20261125/20261125_SACGSW.pdf',
});
export const isReviewedSacGsw=game=>game?.id===OFFICIAL_SACGSW.gameId&&game.statsState==='available'&&game.boxScoreSource===OFFICIAL_SACGSW.source;
