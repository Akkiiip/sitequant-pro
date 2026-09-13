/* Deterministic BBS presentation layer. */
(() => {
  let lastRoot = null;
  let busy = false;

  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const svg = (code) => {
    const specs = {
      C: { label:'U-bar', d:'M58 92V28H202V92', text:[['BASE',130,114],['LEG 1',16,66],['LEG 2',244,66]] },
      I: { label:'Inverted U-bar', d:'M58 28V92H202V28', text:[['BASE',130,114],['LEG 1',16,66],['LEG 2',244,66]] },
      E: { label:'Rectangular stirrup with bent hooks', d:'M82 47L62 27L50 40V94H210V40L198 27L178 47', text:[['WIDTH',130,115],['DEPTH',20,69],['135° HOOKS',130,19]] },
      F: { label:'Closed column tie with bent hooks', d:'M82 47L62 27L50 40V94H210V40L198 27L178 47', text:[['WIDTH',130,115],['DEPTH',20,69],['135° HOOKS',130,19]] }
    }[code];
    if (!specs) return '';
    return `<svg class="bbs-diagram bbs-direct-diagram" viewBox="0 0 260 125" role="img" aria-label="${esc(specs.label)}, schematic not to scale"><path class="bbs-diagram-guides" d="M50 101v13M210 101v13M50 108h160"/><path class="bbs-diagram-bar" d="${specs.d}"/>${specs.text.map(([t,x,y])=>`<text x="${x}" y="${y}" text-anchor="middle">${t}</text>`).join('')}</svg>`;
  };

  function removeReviewWorkflow(root) {
    root.querySelectorAll('.bbs-fieldset').forEach(fs => { if ((fs.querySelector('legend')?.textContent || '').trim().toLowerCase() === '02 review workflow') fs.remove(); });
    root.querySelectorAll('.bbs-badge--review').forEach(el => el.remove());
    const headers = [...root.querySelectorAll('.bbs-table thead th')];
    const i = headers.findIndex(h => h.textContent.trim().toLowerCase() === 'status');
    if (i >= 0) { headers[i].remove(); root.querySelectorAll('.bbs-table tbody tr').forEach(row => row.children[i]?.remove()); }
  }

  function normalizeDirection(root) {
    const select = root.querySelector('#bbs-direction');
    if (!select) return;
    const current = select.value === 'Transverse' ? 'Distribution' : select.value === 'Longitudinal' ? 'Main' : select.value;
    select.innerHTML = '<option value="Main">Main</option><option value="Distribution">Distribution</option>';
    select.value = current || 'Main';
    const label = select.closest('.bbs-field')?.querySelector('label');
    if (label) label.firstChild.textContent = 'Bar arrangement';
    const hint = root.querySelector('#bbs-direction-hint');
    if (hint) hint.textContent = select.value === 'Distribution' ? 'Distribution bars run across the member and are spaced along the main span.' : 'Main bars follow the member span and are distributed across the perpendicular dimension.';
  }

  function collapseResult(root) {
    const result = root.querySelector('.bbs-result');
    if (!result) return;
    const heading = result.querySelector('.bbs-result-heading');
    if (!heading) return;
    if (result.dataset.directCollapsed !== '1') {
      result.dataset.directCollapsed = '1';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'bbs-result-toggle bbs-direct-toggle'; button.setAttribute('aria-expanded','false');
      button.innerHTML = '<span>Details</span><span aria-hidden="true">›</span>';
      heading.appendChild(button);
      const details = document.createElement('div'); details.className = 'bbs-result-details bbs-direct-details';
      [...result.children].filter(n => n !== heading).forEach(n => details.appendChild(n));
      result.appendChild(details); result.classList.add('bbs-result--collapsed');
      button.addEventListener('click', () => { const open=!result.classList.contains('bbs-result--expanded'); result.classList.toggle('bbs-result--expanded',open); result.classList.toggle('bbs-result--collapsed',!open); button.setAttribute('aria-expanded',String(open)); button.innerHTML=`<span>${open?'Hide':'Details'}</span><span aria-hidden="true">${open?'‹':'›'}</span>`; });
    }
  }

  function shapeDiagrams(root) {
    ['C','I','E','F'].forEach(code => root.querySelectorAll(`.bbs-shape[data-bbs-shape="${code}"] .bbs-diagram`).forEach(old => { if (!old.classList.contains('bbs-direct-diagram')) old.outerHTML = svg(code); }));
    const selected = root.querySelector('.bbs-shape[aria-pressed="true"]')?.dataset.bbsShape;
    const resultDiagram = root.querySelector('#bbs-result .bbs-drawing .bbs-diagram');
    if (resultDiagram && ['C','I','E','F'].includes(selected) && !resultDiagram.classList.contains('bbs-direct-diagram')) resultDiagram.outerHTML = svg(selected);
  }

  function staleCopy(root) {
    root.querySelectorAll('*').forEach(el => { if (el.children.length) return; if (el.textContent.includes('max(6d, 65 mm)')) el.textContent = el.textContent.replaceAll('max(6d, 65 mm)','max(10d, 75 mm)'); if (el.textContent.includes('6d,65')) el.textContent=el.textContent.replaceAll('6d,65','10d,75'); });
  }

  function needsWork(root) {
    const review = root.querySelector('.bbs-fieldset legend') && [...root.querySelectorAll('.bbs-fieldset legend')].some(x => (x.textContent||'').toLowerCase().includes('review workflow'));
    const oldDiagram = root.querySelector('.bbs-shape[data-bbs-shape="C"] .bbs-diagram:not(.bbs-direct-diagram),.bbs-shape[data-bbs-shape="I"] .bbs-diagram:not(.bbs-direct-diagram),.bbs-shape[data-bbs-shape="E"] .bbs-diagram:not(.bbs-direct-diagram),.bbs-shape[data-bbs-shape="F"] .bbs-diagram:not(.bbs-direct-diagram)');
    const result = root.querySelector('.bbs-result:not([data-direct-collapsed="1"])');
    const direction = root.querySelector('#bbs-direction option[value="Longitudinal"],#bbs-direction option[value="Transverse"]');
    const stale = root.textContent.includes('max(6d, 65 mm)');
    return !!(review || oldDiagram || result || direction || stale);
  }

  function apply() {
    if (busy) return;
    const root = document.querySelector('.bbs-workspace');
    if (!root || !needsWork(root)) return;
    busy = true;
    try { removeReviewWorkflow(root); normalizeDirection(root); shapeDiagrams(root); collapseResult(root); staleCopy(root); lastRoot = root; } finally { busy=false; }
  }

  const observer = new MutationObserver(() => { const root=document.querySelector('.bbs-workspace'); if (root && (root!==lastRoot || needsWork(root))) setTimeout(apply,0); });
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{lastRoot=null;setTimeout(apply,0);});
  window.addEventListener('popstate',()=>{lastRoot=null;setTimeout(apply,0);});
  setTimeout(apply,0);
})();