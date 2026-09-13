/* Hard BBS UX override. Loaded last and reapplied while the SPA rerenders. */
(() => {
  const svg = code => {
    const spec = {
      C:{name:'U-bar',d:'M58 92V28H202V92',t:[['BASE',130,116],['LEG 1',16,67],['LEG 2',244,67]]},
      I:{name:'Inverted U-bar',d:'M58 28V92H202V28',t:[['BASE',130,116],['LEG 1',16,67],['LEG 2',244,67]]},
      E:{name:'Rectangular stirrup with bent hooks',d:'M82 48L62 28L50 40V94H210V40L198 28L178 48',t:[['WIDTH',130,116],['DEPTH',21,70],['135° HOOKS',130,18]]},
      F:{name:'Closed column tie with bent hooks',d:'M82 48L62 28L50 40V94H210V40L198 28L178 48',t:[['WIDTH',130,116],['DEPTH',21,70],['135° HOOKS',130,18]]}
    }[code];
    if(!spec) return '';
    return `<svg class="bbs-diagram bbs-hard-diagram" viewBox="0 0 260 126" role="img" aria-label="${spec.name}, schematic not to scale"><path class="bbs-diagram-guides" d="M50 102v12M210 102v12M50 109h160"/><path class="bbs-diagram-bar" d="${spec.d}"/>${spec.t.map(([x,a,b])=>`<text x="${a}" y="${b}" text-anchor="middle">${x}</text>`).join('')}</svg>`;
  };
  const patch = () => {
    const root = document.querySelector('.bbs-workspace');
    if(!root) return;
    root.classList.add('bbs-hard-fixed');
    root.querySelectorAll('.bbs-fieldset').forEach(fs => {
      const legend = (fs.querySelector('legend')?.textContent || '').toLowerCase();
      if(legend.includes('review workflow')) fs.remove();
    });
    root.querySelectorAll('.bbs-badge--review,.bbs-result-review,.bbs-export-readiness').forEach(el => el.remove());
    [...root.querySelectorAll('.bbs-table thead th')].forEach((th,i) => {
      if(th.textContent.trim().toLowerCase()==='status'){
        th.remove(); root.querySelectorAll('.bbs-table tbody tr').forEach(tr => tr.children[i]?.remove());
      }
    });
    const dir = root.querySelector('#bbs-direction');
    if(dir){
      const current = dir.value === 'Transverse' ? 'Distribution' : dir.value === 'Longitudinal' ? 'Main' : dir.value;
      dir.innerHTML = '<option value="Main">Main</option><option value="Distribution">Distribution</option>';
      dir.value = current || 'Main';
      const label = dir.closest('.bbs-field')?.querySelector('label');
      if(label) label.firstChild.textContent = 'Bar arrangement';
      const hint = root.querySelector('#bbs-direction-hint');
      if(hint) hint.textContent = dir.value === 'Distribution' ? 'Distribution bars run across the member and are spaced along the main span.' : 'Main bars follow the member span and are distributed across the perpendicular dimension.';
    }
    ['C','I','E','F'].forEach(code => root.querySelectorAll(`.bbs-shape[data-bbs-shape="${code}"] .bbs-diagram,.bbs-result .bbs-drawing .bbs-diagram`).forEach(el => {
      if(el.classList.contains('bbs-hard-diagram')) return;
      const selected = root.querySelector(`.bbs-shape[data-bbs-shape="${code}"][aria-pressed="true"]`);
      if(selected || el.closest('.bbs-shape[data-bbs-shape="'+code+'"]')) el.outerHTML = svg(code);
    }));
    const result = root.querySelector('.bbs-result');
    const heading = result?.querySelector('.bbs-result-heading');
    if(result && heading && !result.dataset.hardCollapsed){
      result.dataset.hardCollapsed='1';
      const nodes=[...result.children].filter(n=>n!==heading);
      if(nodes.length){
        const details=document.createElement('div'); details.className='bbs-hard-details';
        nodes.forEach(n=>details.appendChild(n)); result.appendChild(details); result.classList.add('bbs-hard-collapsed');
        const btn=document.createElement('button'); btn.type='button'; btn.className='bbs-hard-toggle'; btn.innerHTML='Details <span aria-hidden="true">›</span>'; btn.onclick=()=>{const open=result.classList.toggle('bbs-hard-expanded'); result.classList.toggle('bbs-hard-collapsed',!open); btn.innerHTML=open?'Hide <span aria-hidden="true">‹</span>':'Details <span aria-hidden="true">›</span>';}; heading.appendChild(btn);
      }
    }
  };
  const style = document.createElement('style');
  style.textContent = `.bbs-hard-fixed .bbs-badge--review,.bbs-hard-fixed .bbs-result-review,.bbs-hard-fixed .bbs-export-readiness{display:none!important}.bbs-hard-fixed .bbs-result.bbs-hard-collapsed .bbs-hard-details{display:none}.bbs-hard-toggle{margin-left:auto;border:1px solid currentColor;background:none;border-radius:999px;padding:.35rem .7rem;cursor:pointer;font:inherit}.bbs-hard-diagram{display:block;width:100%;height:auto}.bbs-hard-fixed .bbs-schedule tbody tr td:last-child,.bbs-hard-fixed .bbs-schedule thead tr th:last-child{}`;
  document.head.appendChild(style);
  const observer = new MutationObserver(patch);
  const start = () => { if(document.body) observer.observe(document.body,{childList:true,subtree:true}); patch(); let n=0; const timer=setInterval(()=>{patch(); if(++n>60) clearInterval(timer)},200); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  window.addEventListener('hashchange',()=>setTimeout(patch,0));
})();
