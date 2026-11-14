// Reconcile only an explicitly rejected push caused by unrelated presentation edits.
// An uncertain transport failure must never trigger a retry or another provider call.
import {spawnSync} from 'node:child_process';
export const presentationOnly = p => ['assets/dashboard.css','assets/dashboard.js','data/player-photos.json'].includes(p) || /^assets\/(player-photos|club-logos|brand)\/[a-zA-Z0-9._/-]+$/.test(p);
export function pushCheckpointSafely({execute=spawnSync}={}) {
  const run=args=>execute('git',args,{encoding:'utf8',timeout:120000});
  const checked=args=>{const r=run(args);if(r.status!==0)throw Object.assign(new Error('Git checkpoint reconciliation stopped'),{code:'CHECKPOINT_RECONCILIATION_FAILED'});return r;};
  const push=()=>run(['push','--porcelain','origin','HEAD:main']);
  const first=push();
  if(first.status===0)return;
  // Match Git's per-ref porcelain status, not free-form remote messages.
  const lines=String(first.stdout||'').split('\n');
  const rejected=first.status===1 && lines.some(line=>/^!\t[^\t]+:refs\/heads\/main\t\[rejected\] \((fetch first|non-fast-forward)\)$/.test(line));
  if(!rejected)throw Object.assign(new Error('Durable Git checkpoint push failed; stop before spending another provider call'),{code:'CHECKPOINT_PUSH_UNCERTAIN'});
  checked(['fetch','--no-tags','origin','refs/heads/main:refs/remotes/origin/main']);
  const base=checked(['merge-base','HEAD','origin/main']).stdout.trim();
  if(!/^[a-f0-9]{40,64}$/.test(base))throw new Error('Invalid checkpoint merge base');
  const remotePaths=checked(['diff','--name-only',`${base}..origin/main`]).stdout.trim().split('\n').filter(Boolean);
  if(!remotePaths.length || !remotePaths.every(presentationOnly))throw Object.assign(new Error('Concurrent non-presentation changes require review; quota stays reserved'),{code:'CHECKPOINT_CONCURRENT_DATA'});
  // No force/reset/rebase. Git must merge cleanly; conflicts stop the run.
  checked(['merge','--no-edit','origin/main']);
  const last=push();
  if(last.status!==0)throw Object.assign(new Error('Checkpoint retry stopped; quota stays reserved'),{code:'CHECKPOINT_RETRY_FAILED'});
}

// Called by the reservation and normalized-publication steps, never by a provider retry.
import {pathToFileURL} from 'node:url';
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.env.GITHUB_ACTIONS!=='true')throw new Error('Hosted runner required');pushCheckpointSafely();}
 catch(error){console.error(/^CHECKPOINT_[A-Z_]+$/.test(error.code||'')?error.code:'CHECKPOINT_PUSH_REFUSED');process.exitCode=1;}
}
