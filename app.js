document.addEventListener('DOMContentLoaded', () => {
  const view = document.getElementById('view');
  const crumb = document.getElementById('crumb');
  if (!view || !crumb) return;

  const state = { page: 'overview' };
  const nav = { overview: 'Overview', projects: 'Projects', bbs: 'BBS', boq: 'BOQ', exports: 'Exports', pricing: 'Subscription', settings: 'Settings' };
  const { icon, escape: html, notify } = window.SiteQuant.ui;

  function header(ey,title,desc,actions=''){return `<div class="head"><div><small>${ey}</small><h1>${title}</h1><p>${desc}</p></div>${actions}</div>`;}

  const overview = () => window.SiteQuant.dashboard.render();
  const bbs = () => window.SiteQuant.bbs.render();
  function boq(){return `<section>${header('QUANTITY WORKSPACE','BOQ Workspace','A project register for quantities, units, rates and BBS consumption.','<button class="primary">+ Add item</button>')}<div class="panel"><h2>Riverside Residence · Block A</h2><p>Illustrative workspace — BBS steel quantities will flow here automatically in the production build.</p><table><tr><th>Item</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${[['01.01','RCC M25 concrete','m³','128.40','7,250','9,31,900'],['01.02','TMT reinforcement steel','kg','46,280','72','33,32,160'],['01.03','Centering & shuttering','m²','1,940','410','7,95,400']].map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table></div></section>`;}
  function simple(title, desc) {
    return `<section>${header('WORKSPACE', title, desc)}
      <div class="empty panel"><b>This workspace is being developed.</b>
      <span>Use Overview for project drafts and sample activity, or BBS for the current calculation workflow.</span>
      <p><a class="sq-text-link" href="#/overview">Back to overview →</a></p></div></section>`;
  }
  function projects(){const rows=window.SiteQuant.dashboard.getProjects();return `<section>${header('PROJECT REGISTER','Projects','Browser-local project context. No cloud synchronization.')}<div class="panel"><div class="sq-table-scroll" role="region" aria-label="Project register" tabindex="0"><table><tr><th>Project</th><th>Location</th><th>Structure</th><th>Members</th><th>BBS items</th><th>Steel quantity</th><th>Review</th><th>Last updated</th><th>Actions</th></tr>${rows.map((p,index)=>`<tr><td><b>${html(p.name)}</b></td><td>${html(p.location||'—')}</td><td>${html(p.block||'—')}</td><td>${index? '—':'4 sample'}</td><td>${index?'—':'4'}</td><td>${index?'—':'773.71 kg sample'}</td><td>${index?'Draft':'Needs review'}</td><td>${html(p.updated||'Browser-local')}</td><td><a class="sq-text-link" href="#/bbs">Open BBS</a> · <a class="sq-text-link" href="#/boq">BOQ</a> · <a class="sq-text-link" href="#/exports">Exports</a></td></tr>`).join('')}</table></div><p class="sq-notice">Quantities shown for seeded sample projects are sample context. Local project totals become available as calculated BBS rows are added.</p></div></section>`;}
  function exportsPage(){const id=window.SiteQuant.dashboard.getSelectedProjectId()==='all'?'riverside':window.SiteQuant.dashboard.getSelectedProjectId(),m=window.SiteQuant.bbsModel,types=['Detailed','Summary','Diameter','Member','Shape','Family','Cutting'],history=m.exportsFor(id);return `<section>${header('EXPORT WORKSPACE','Exports','Generated from current browser-local calculated BBS rows. Files are regenerated on download.')}<div class="panel"><table><tr><th>Export</th><th>Project</th><th>Records</th><th>Generated</th><th>Format</th><th>Status</th><th>Action</th></tr>${types.map(type=>`<tr><td>${type} CSV</td><td>${html(id)}</td><td>${m.analysis(id).rows.length}</td><td>On download</td><td>CSV</td><td>Available</td><td><button class="sq-text-link" data-export-type="${type}" data-export-project="${id}">Download</button></td></tr>`).join('')}${history.map(x=>`<tr><td>${x.type} CSV</td><td>${html(x.projectId)}</td><td>${x.records}</td><td>${html(x.generated)}</td><td>CSV</td><td>Generated</td><td><button class="sq-text-link" data-export-type="${x.type}" data-export-project="${html(x.projectId)}">Download</button></td></tr>`).join('')}</table><p class="sq-notice">Export history is browser-local metadata; CSV binaries are regenerated from current data and are not server-stored.</p></div></section>`;}
  function settings(){return `<section>${header('WORKSPACE SETTINGS','Engineering settings','Browser-local defaults for the BBS workspace. They do not certify calculations or synchronize to an account.')}<div class="panel"><div class="grid three"><label>Units<div class="input"><select><option>Metric (mm, m, kg)</option></select></div></label><label>Default steel grade<div class="input"><select><option>Fe 500D</option><option>Fe 500</option></select></div></label><label>Default cover<div class="input"><input value="25" inputmode="decimal"><span>mm</span></div></label><label>Default spacing<div class="input"><input value="150" inputmode="decimal"><span>mm c/c</span></div></label><label>Default wastage allowance<div class="input"><input value="0" inputmode="decimal"><span>%</span></div></label><label>Calculation framework<div class="input"><input value="bbs-v0.3-framework" readonly></div></label></div><p class="sq-notice">Engineering review required. Wastage optimization, approval workflows and account synchronization are not implemented.</p></div></section>`;}
  function pricing(){return `<section class="pricing"><small>SUBSCRIPTION · DRAFT PRICING</small><h1>Charge for capability,<br><em>not complexity.</em></h1><p>Designed around individual engineers, small teams and contractors. Final pricing will be set after usage economics are validated.</p><div class="plans">${[['Free','₹0',['1 project','50 BBS items / month','CSV preview']],['Professional','₹1,499',['10 projects','Unlimited BBS drafts','BOQ workspace','Full CSV export','Android integration']],['Team','₹4,999',['50 projects','5 seats','Shared projects','Advanced exports']]].map((p,i)=>`<article class="pricing-plan ${i===1?'featured':''}"><small>${p[0].toUpperCase()}</small><h3>${i===0?'Try the workflow':i===1?'For independent engineers':'For contractor & QS teams'}</h3><b>${p[1]}</b><span>/ month</span>${p[2].map(x=>`<p>✓ ${x}</p>`).join('')}<button class="${i===1?'primary':'secondary'}">${i?'Choose '+p[0]:'Start free'}</button></article>`).join('')}</div></section>`;}
  function wire() {
    if (state.page === 'bbs') {
      window.SiteQuant.bbs.mount(view.querySelector('.bbs-workspace'));
      return;
    }
    // Keep the retained BOQ table usable within the responsive shell.
    view.querySelectorAll('table').forEach(table => {
      if (table.closest('.sq-table-scroll')) return;
      const region = document.createElement('div');
      region.className = 'sq-table-scroll';
      region.tabIndex = 0;
      region.setAttribute('role', 'region');
      region.setAttribute('aria-label', 'Quantity table');
      table.before(region);
      region.append(table);
    });
  }
  function showError(error) {
    view.innerHTML = `<section class="sq-surface sq-empty-state"><h1>Workspace unavailable</h1><p>${html(error.message || error)}</p><button class="sq-button sq-button--secondary" data-reload>Reload workspace</button></section>`;
    view.querySelector('[data-reload]').onclick = () => location.reload();
    console.error('SiteQuant boot error', error);
  }
  function render(page = 'overview', focus = true) {
    try {
      window.SiteQuant.bbs.unmount();
      state.page = Object.hasOwn(nav, page) ? page : 'overview';
      crumb.textContent = nav[state.page];
      document.title = nav[state.page] + ' · SiteQuant Pro';
      view.className = 'sq-main' + (['overview', 'bbs'].includes(state.page) ? '' : ' sq-legacy');
      const pages = { overview, projects, bbs, boq, exports: exportsPage, pricing, settings };
      view.innerHTML = pages[state.page] ? pages[state.page]() : simple(nav[state.page], 'Project records and controls for your engineering workspace.');
      document.querySelectorAll('[data-nav-page]').forEach(link => {
        if (link.dataset.navPage === state.page) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      wire();
      if (focus) {
        view.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      }
    } catch (error) { showError(error); }
  }

  function navigation() {
    const group = (title, keys) => `<div class="sq-nav-group"><p class="sq-nav-heading">${title}</p>${keys.map(key => `<a class="sq-nav-link" href="#/${key}" data-nav-page="${key}">${icon(key)}<span>${nav[key]}</span></a>`).join('')}</div>`;
    const markup = group('WORKSPACE', ['overview', 'projects', 'bbs', 'boq', 'exports']) + group('ACCOUNT', ['pricing', 'settings']);
    document.querySelectorAll('.sq-nav-list').forEach(navElement => { navElement.innerHTML = markup; });
    document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
    const menu = document.getElementById('sq-mobile-menu');
    document.getElementById('sq-menu-toggle').onclick = () => menu.showModal();
    matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches && menu.open) menu.close(); });
    document.addEventListener('click', event => {
      const close = event.target.closest('[data-close-dialog]');
      if (close) close.closest('dialog').close();
      const routeButton = event.target.closest('[data-page]');
      if (routeButton) location.hash = '#/' + routeButton.dataset.page;
      const link = event.target.closest('a[href^="#/"]');
      if (link) document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
      if (routeButton?.dataset.exportType) { const m=window.SiteQuant.bbsModel, rows=m.exportData(routeButton.dataset.exportProject,routeButton.dataset.exportType); window.SiteQuant.ui.downloadCsv(rows,`SiteQuant_${routeButton.dataset.exportProject}_${routeButton.dataset.exportType}.csv`);m.recordExport(routeButton.dataset.exportProject,routeButton.dataset.exportType,rows.length-5); notify('CSV generated from current browser-local BBS data.'); }
    });
    window.addEventListener('hashchange', () => {
      if (location.hash === '#view') return;
      render(location.hash.replace(/^#\//, '') || 'overview');
    });
  }
  navigation();
  window.SiteQuant.dashboard.init(() => {
    if (state.page !== 'overview') location.hash = '#/overview';
    else render('overview', false);
  });
  render(location.hash.replace(/^#\//, '') || 'overview', false);
});
