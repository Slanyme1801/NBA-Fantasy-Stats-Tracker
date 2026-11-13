import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const js=fs.readFileSync(new URL('../assets/companion.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../assets/dashboard.css',import.meta.url),'utf8');
const ctx=vm.createContext({esc:s=>String(s).replaceAll('"','&quot;')});vm.runInContext(js.slice(js.indexOf('function profileThemeFor'),js.indexOf('function setProfileTheme'))+js.slice(js.indexOf('// Small ordinary-profile accents;'),js.indexOf('renderPlayer=function(){')),ctx);
test('ordinary profile centers identity and adds a club mark after the position',()=>{
 let html='',sub='',className='';const head={classList:{add:s=>className=s},querySelector:s=>s==='.sub'?{insertAdjacentHTML:(_,s)=>sub=s}:null,insertAdjacentHTML:(_,s)=>html=s};
 ctx.decorateOrdinaryProfile(head,{player_id:1630595,last_team:'DET',team_basis:'latest-verified-import'});assert.equal(className,'ordinary-profile');assert.match(sub,/1610612765\/primary\/L\/logo.svg/);assert.match(sub,/équipe du dernier match disponible/);assert.doesNotMatch(sub,/club actuel|équipe actuelle/);assert.equal(html,'');assert.doesNotMatch(js,/ordinaryCourtMarkup|ordinary-court/);
});
test('specials and Voldemort get no ordinary decoration',()=>{
 const head={classList:{add(){throw Error('must not decorate');}}};for(const player_id of [2544,1630166,201939,203110,201142,203999])ctx.decorateOrdinaryProfile(head,{player_id});
});
test('club identity is whitelist-based and never silently borrows a historical club',()=>{
 for(const player of [{last_team:'DET',team_basis:'historical'},{last_team:'DET'},{last_team:'UNKNOWN',team_basis:'latest-verified-import'},{last_team:'<svg>',team_basis:'latest-verified-import'}])assert.equal(ctx.ordinaryClubBadge(player),'');
 assert.match(ctx.ordinaryClubBadge({last_team:'GS',team_basis:'latest-verified-import'}),/assets\/club-logos\/gsw.svg/);assert.match(ctx.ordinaryClubBadge({last_team:'SA',team_basis:'latest-verified-import'}),/1610612759/);assert.match(ctx.ordinaryClubBadge({last_team:'DET',team_basis:'latest-verified-import'}),/onerror="this.hidden=true"/);
});
test('portrait and identity are centered as one adjacent group, with stacked narrow mobile',()=>{
 assert.match(css,/\.player-head\.ordinary-profile\{display:flex;justify-content:center;align-items:center;flex-wrap:nowrap;gap:24px/);
 assert.match(css,/\.ordinary-profile \.profile-identity\{flex:0 1 auto;min-width:0;max-width:calc\(100% - 184px\);text-align:left/);
 assert.match(css,/@media\(max-width:420px\)\{\.player-head\.ordinary-profile\{flex-direction:column/);
 assert.match(css,/width:32px;height:32px;object-fit:contain/);
 assert.doesNotMatch(css,/ordinary-court/);
 assert.match(js,/if\(renderMinimalAvdija\(CURRENT.player_id\)\)return/);
});
