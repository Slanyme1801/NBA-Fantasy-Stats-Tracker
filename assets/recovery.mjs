// Recovery lives outside the offline shell. Never erase user data or other apps.
export async function releaseAppWorker(serviceWorker,scope){
  if(!serviceWorker?.getRegistration)return {supported:false,released:false};
  const registration=await serviceWorker.getRegistration(scope);
  if(!registration)return {supported:true,released:false};
  if(registration.scope!==scope)throw new Error('La portée de cette application ne correspond pas. Aucune modification effectuée.');
  const released=await registration.unregister();
  if(!released)throw new Error('Safari n’a pas libéré cette application. Aucune donnée effacée.');
  return {supported:true,released:true};
}
export function bounded(promise,ms=12000){
  let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Safari ne répond pas au système hors ligne. Aucune donnée personnelle effacée.')),ms);})]).finally(()=>clearTimeout(timer));
}
