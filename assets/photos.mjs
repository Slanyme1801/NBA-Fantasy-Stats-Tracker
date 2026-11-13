const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=value=>{try{const u=new URL(value);if(u.protocol==='http:'&&u.hostname==='creativecommons.org')u.protocol='https:';return u.protocol==='https:'?escape(u.href):'';}catch{return '';}};
export function createPlayerPhotos(manifest={}){
 const entries=Object.values(manifest.players||{}).filter(p=>Number.isSafeInteger(p.nbaId)&&/^assets\/player-photos\/[\w-]+\.(?:jpg|png|webp)$/.test(p.path)&&((p.provenance==='user-provided'&&!p.source&&!p.licenseUrl)||(safeUrl(p.source)&&(safeUrl(p.licenseUrl)||p.license==='Public domain'))));
 const byId=new Map(entries.map(p=>[p.nbaId,p]));
 return {
  count:entries.length,
  portrait(id,{className=''}={}){
   const p=byId.get(Number(id));if(!p)return '';
   const b=p.displayBounds;
   if(Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]>=0&&b[1]>=0&&b[2]>0&&b[3]>0&&b[0]+b[2]<=p.width&&b[1]+b[3]<=p.height){
     return `<svg class="player-photo photo-transparent photo-bounded ${escape(className)}" viewBox="${b.join(' ')}" width="${b[2]}" height="${b[3]}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${escape(p.alt)}"><title>${escape(p.author)} · ${escape(p.license)}</title><image href="${escape(p.path)}" width="${p.width}" height="${p.height}" onerror="this.closest('svg').style.display='none'"></image></svg>`;
   }
   return `<img class="player-photo ${p.transparent===true?'photo-transparent ':''}${escape(className)}" src="${escape(p.path)}" alt="${escape(p.alt)}" title="${escape(p.author)} · ${escape(p.license)} · ${p.provenance==='user-provided'?'image fournie par l’utilisateur':'photo d’archive'}" loading="lazy" decoding="async" width="${p.width}" height="${p.height}" onerror="this.hidden=true">`;
  },
  credits(){return `<section class="panel" id="photoCredits"><h3>Crédits photos</h3><p>${entries.length} joueurs illustrés sur ${Number(manifest.scope?.targetCount)||entries.length} ciblés. Sélection éditoriale de photos d’archive, pas un tirage aléatoire. Photos en tenue civile ou avec le club actuel, vérifiées au 11 novembre 2026. Les autres portraits sont temporairement masqués pendant leur remplacement. ${entries.filter(p=>p.transparent===true).length} images sont des PNG à fond transparent ; les autres photos ont un fond. Les joueurs sans photo conservent leur affichage habituel. Les licences et restrictions dépendent de chaque source.</p><details><summary>Sources, auteurs et licences</summary><ul class="photo-credits">${entries.map(p=>`<li><strong>${escape(p.name)}</strong> · ${escape(p.author)} · ${safeUrl(p.source)?`<a href="${safeUrl(p.source)}" target="_blank" rel="noopener noreferrer">Source</a>`:'Image fournie par l’utilisateur'} · ${safeUrl(p.licenseUrl)?`<a href="${safeUrl(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(p.license)}</a>`:escape(p.license)}<small>${escape(p.transformations||'Aucune modification locale.')}</small>${p.rightsStatus?`<small>${escape(p.rightsStatus)}</small>`:''}${p.sourceLicense?`<small><a href="${safeUrl(p.sourceLicense)}" target="_blank" rel="noopener noreferrer">Conditions déclarées par la source</a> · usage non commercial uniquement</small>`:''}</li>`).join('')}</ul></details></section>`;}
 };
}
export async function loadPlayerPhotos(){
 try{const url=new URL('../data/player-photos.json',import.meta.url);url.searchParams.set('refresh',String(Date.now()));const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!r.ok)return createPlayerPhotos();return createPlayerPhotos(await r.json());}catch{return createPlayerPhotos();}
}
