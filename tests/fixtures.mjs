// SYNTHETIC TEST DATA ONLY. Never imported by the public app or collector CLI.
import {emptySeason,COUNTERS} from '../assets/core.mjs';
export const now='2026-11-15T12:00:00.000Z';
export const stats=(extra={})=>({...Object.fromEntries(COUNTERS.map(k=>[k,0])),pts:20,fgm:7,fga:14,fg3m:2,fg3a:6,ftm:4,fta:5,reb:6,ast:5,stl:1,blk:1,tov:2,...extra});
export const player=(nbaId=1)=>({nbaId,providerId:100+nbaId,name:`Synthetic Test ${nbaId}`,source:'TEST fixture identity',verifiedAt:now});
export const game=(id=1,start='2026-11-15T01:00:00.000Z',extra={})=>({id,start,season:'2026-27',league:'standard',type:'regular',status:'finished',classification:{source:'TEST fixture type',verifiedAt:now},home:{id:10,code:'TST'},away:{id:20,code:'SIM'},statsState:'available',...extra});
export const line=(gameId=1,nbaId=1,extra={})=>({gameId,nbaId,providerId:100+nbaId,teamId:10,participation:'played',seconds:1800,stats:stats(),comment:null,updatedAt:now,...extra});
export function fixture(){return {...emptySeason(),connection:'connected',updatedAt:now,coverageCheckedAt:now,players:[player(1),player(2),player(3)],games:[game()],lines:[line(1,1),line(1,2),line(1,3)],positions:{season:'2026-27',source:'ESPN TEST fixture',importedAt:now,entries:[{nbaId:1,espnId:201,positions:['PG','SG'],source:'TEST ESPN manual',observedAt:now},{nbaId:2,espnId:202,positions:['SG','SF'],source:'TEST ESPN manual',observedAt:now},{nbaId:3,espnId:203,positions:['C'],source:'TEST ESPN manual',observedAt:now}]}};}
export const rawGame=()=>({id:1,season:2026,league:'standard',date:{start:'2026-11-15T01:00:00Z'},stage:2,status:{short:3},teams:{home:{id:10,code:'TST'},visitors:{id:20,code:'SIM'}}});
export const rawLine=()=>({player:{id:101},team:{id:10},game:{id:1},min:'30:00',points:20,fgm:7,fga:14,tpm:2,tpa:6,ftm:4,fta:5,totReb:6,assists:5,steals:1,blocks:1,turnovers:2,comment:null});
