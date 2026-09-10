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
      const pages = { overview, bbs, boq, pricing };
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
