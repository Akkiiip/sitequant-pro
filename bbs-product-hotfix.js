/* Small post-render corrections for the product workflow layer. */
(() => {
  const root=()=>document.querySelector('.bbs-workspace');
  const model=()=>window.SiteQuant?.bbsModel;
  const syncLinkGeometry=()=>{
    const r=root(),m=model();if(!r||!m)return;
    const pid=r.querySelector('#bbs-project')?.value;if(!pid)return;
    const w=m.workspace(pid),d=w?.draft;if(!d||!['E','F'].includes(d.shape))return;
    const s=JSON.parse(localStorage.getItem('sitequant.bbs-product.v1')||'{"projects":{}}'),p=s.projects?.[pid],k=`${pid}::${d.mark||'__draft__'}`,flags=p?.fabrication?.[k]||{};
    const autoW=Math.max(1,Number(d.breadth||0)*1000-2*Number(d.cover||0)),autoD=Math.max(1,Number(d.depth||0)*1000-2*Number(d.cover||0));
    if(!flags.widthEdited)d.stirrupWidth=String(autoW);
    if(!flags.depthEdited)d.stirrupDepth=String(autoD);
    const a=r.querySelector('#bbs-stirrupWidth'),b=r.querySelector('#bbs-stirrupDepth');
    if(a&&!flags.widthEdited)a.value=d.stirrupWidth;
    if(b&&!flags.depthEdited)b.value=d.stirrupDepth;
  };
  document.addEventListener('change',e=>{
    if(e.target.matches('#bbs-length,#bbs-breadth,#bbs-depth,#bbs-cover,#bbs-memberType'))setTimeout(syncLinkGeometry,0);
  },true);
  const mo=new MutationObserver(()=>setTimeout(syncLinkGeometry,0));
  const boot=()=>{const v=document.querySelector('#view');if(v)mo.observe(v,{childList:true,subtree:true});syncLinkGeometry();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
