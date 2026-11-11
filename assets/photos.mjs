const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=value=>{try{const u=new URL(value);if(u.protocol==='http:'&&u.hostname==='creativecommons.org')u.protocol='https:';return u.protocol==='https:'?escape(u.href):'';}catch{return '';}};
export function createPlayerPhotos(manifest={}){
 const entries=Object.values(manifest.players||{}).filter(p=>Number.isSafeInteger(p.nbaId)&&/^assets\/player-photos\/[\w-]+\.(?:jpg|png|webp)$/.test(p.path)&&safeUrl(p.source)&&(safeUrl(p.licenseUrl)||p.license==='Public domain'));
 const byId=new Map(entries.map(p=>[p.nbaId,p]));
 return {
  count:entries.length,
  portrait(id,{className=''}={}){
   const p=byId.get(Number(id));if(!p)return '';
   return `<img class="player-photo ${escape(className)}" src="${escape(p.path)}" alt="${escape(p.alt)}" title="${escape(p.author)} · ${escape(p.license)} · photo d’archive" loading="lazy" decoding="async" width="${p.width}" height="${p.height}" onerror="this.hidden=true">`;
  },
  credits(){return `<section class="panel" id="photoCredits"><h3>Crédits photos</h3><p>${entries.length} joueurs illustrés sur ${Number(manifest.scope?.targetCount)||entries.length} ciblés. Sélection éditoriale de photos d’archive sous licence libre, pas un tirage aléatoire. Les maillots peuvent être anciens. Ces photos ont un fond ; elles ne sont pas présentées comme détourées. Les autres joueurs conservent leur affichage habituel.</p><details><summary>Sources, auteurs et licences</summary><ul class="photo-credits">${entries.map(p=>`<li><strong>${escape(p.name)}</strong> · ${escape(p.author)} · <a href="${safeUrl(p.source)}" target="_blank" rel="noopener noreferrer">Source</a> · ${safeUrl(p.licenseUrl)?`<a href="${safeUrl(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(p.license)}</a>`:escape(p.license)}<small>${escape(p.transformations||'Aucune modification locale.')}</small></li>`).join('')}</ul></details></section>`;}
 };
}
export async function loadPlayerPhotos(){
 try{const r=await fetch(new URL('../data/player-photos.json',import.meta.url),{signal:AbortSignal.timeout(5000)});if(!r.ok)return createPlayerPhotos();return createPlayerPhotos(await r.json());}catch{return createPlayerPhotos();}
}
