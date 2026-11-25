// Keep deadlines available in browsers that lack AbortSignal.timeout (including
// older installed mobile web apps). The deadline covers both headers and body.
export async function withRequestTimeout(ms, request) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try { return await request(controller.signal); }
  finally { clearTimeout(timer); }
}
