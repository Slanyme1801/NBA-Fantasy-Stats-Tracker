(function(){
  const historical=window.LegacyApi, core=window.FantasyCore, data=window.CurrentLoad.data;
  const response=body=>({ok:true,json:async()=>body});
  const historicalIds=new Set(window.__DATASET.players.map(p=>p[0]));
  const eligibility=id=>data.positions.entries.find(p=>p.nbaId===id);
  const norm=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const weights=async()=> (await (await historical('/api/scoring')).json()).scoring;
  const seasonRow=(id,w)=>{
    const a=core.aggregate(data,id,{weights:w});
    const teamIds=[...new Set(data.lines.filter(r=>r.nbaId===id).map(r=>r.teamId))];
    const teams=[...new Map(data.games.flatMap(g=>[g.home,g.away]).map(t=>[t.id,t.code])).entries()].filter(([id])=>teamIds.includes(id)).map(([,code])=>code);
    return {season:core.SEASON,played:a.gp>0,gp:a.gp,...a.averages,min:a.minutes,fpts_per_game:a.fptsPerGame,total_fpts:a.totalFpts,team:teams.join('/'),teams_label:teams.join('/'),team_count:teams.length,exact:true,note:data.connection==='not-connected'?'Not connected':'No complete regular-season games',aggregate:a};
  };
  window.AppApi=async function(path,options){
    const url=new URL(path,'https://local.invalid');
    if(url.pathname==='/api/scoring'&&options?.method==='PUT') {
      const w=JSON.parse(options.body).weights;
      core.validateWeights(w);
    }
    if(url.pathname==='/api/meta') {
      const meta=await (await historical(path,options)).json();
      return response({...meta,players:new Set([...historicalIds,...data.players.map(p=>p.nbaId)]).size,teams:[...new Set([...meta.teams,...data.games.flatMap(g=>[g.home.code,g.away.code])])].sort(),seasons:[...meta.seasons,core.SEASON],rows_per_season:{...meta.rows_per_season,[core.SEASON]:data.players.length},current:data,scoring_name:core.scoringName(meta.scoring)});
    }
    if(url.pathname.startsWith('/api/player/')){
      const id=Number(url.pathname.split('/').pop());
      let p;
      if(historicalIds.has(id))p=await (await historical(path,options)).json();
      else {
        const person=data.players.find(p=>p.nbaId===id);if(!person) return historical(path,options);
        p={player_id:id,full_name:person.name,position:null,last_team:null,summary:{simple_avg:null,weighted_avg:null,total_fpts:null,total_gp:0,seasons_played:0,best_season:null},seasons:window.__DATASET.seasons.map(season=>({season,played:false,note:'No historical record'})),scoring:await weights()};
      }
      p.seasons.push(seasonRow(id,p.scoring));p.eligibility=eligibility(id);return response(p);
    }
    if(url.pathname==='/api/search') {
      const results=(await (await historical(path,options)).json()).results;
      const q=norm(url.searchParams.get('q')||'');
      if(q)for(const p of data.players.filter(p=>!historicalIds.has(p.nbaId)&&norm(p.name).includes(q)))results.push({player_id:p.nbaId,full_name:p.name,position:eligibility(p.nbaId)?.positions.join('/'),last_team:null});
      return response({results:results.slice(0,12)});
    }
    if(url.pathname==='/api/leaderboard') {
      const season=url.searchParams.get('season');
      if(season===core.SEASON){
        const w=await weights(),min=Number(url.searchParams.get('min_gp')||0),pos=url.searchParams.get('position'),team=url.searchParams.get('team');
        const rows=data.players.map(p=>{const r=seasonRow(p.nbaId,w);return {player_id:p.nbaId,full_name:p.name,position:eligibility(p.nbaId)?.positions.join('/')||null,team:r.team,season_fpts:r.fpts_per_game,season_gp:r.gp,total_gp:r.gp,total_fpts:r.total_fpts,simple_avg:r.fpts_per_game,weighted_avg:r.fpts_per_game};})
          .filter(r=>r.season_gp>0&&r.season_gp>=min&&(!pos||r.position?.split('/').includes(pos))&&(!team||r.team.split('/').includes(team)));
        const key={gp:'season_gp',name:'full_name'}[url.searchParams.get('sort')]||url.searchParams.get('sort')||'season_fpts';
        rows.sort((a,b)=>key==='full_name'?a[key].localeCompare(b[key]):(b[key]??0)-(a[key]??0));
        return response({results:rows.slice(0,150).map((r,i)=>({...r,rank:i+1}))});
      }
      const result=await (await historical(path,options)).json();
      if(season)for(const r of result.results){const p=await (await historical('/api/player/'+r.player_id)).json();const selected=p.seasons.find(s=>s.season===season);r.total_fpts=selected?.total_fpts??null;r.team=selected?.team??null;}
      return response(result);
    }
    return historical(path,options);
  };
})();
