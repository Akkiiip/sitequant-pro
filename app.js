document.addEventListener('DOMContentLoaded', () => {
  const view = document.getElementById('view');
  const crumb = document.getElementById('crumb');
  if (!view || !crumb) return;

  const state = { page:'overview', memberType:'Beam', mark:'B12-01', description:'Bottom main reinforcement', material:'Fe 500D', length:4.2, breadth:.3, depth:.45, cover:25, dia:16, spacing:150, quantity:1, shape:'A', ret:300, rise:150, run:150, tail:150 };
  const shapes = { A:['Straight','Single leg'], B:['L-bar','90° return'], C:['U-bar','Two returns'], D:['Cranked','Offset / crank'] };
  const nav = { overview: 'Overview', projects: 'Projects', bbs: 'BBS', boq: 'BOQ', exports: 'Exports', pricing: 'Subscription', settings: 'Settings' };
  const { icon, escape: html, notify } = window.SiteQuant.ui;
  const fmt = (n,d=2) => Number(n).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});
  const esc = v => /[",\n]/.test(String(v)) ? '"'+String(v).replaceAll('"','""')+'"' : String(v);

  function shapeSvg(k){ const paths={A:'M25 55H195',B:'M45 20V80H180',C:'M45 22V80H175V22',D:'M25 72H65L85 38H155L175 72H195'}; return `<svg viewBox="0 0 220 105" aria-label="${shapes[k][0]}"><path d="${paths[k]}"/></svg>`; }
  function header(ey,title,desc,actions=''){return `<div class="head"><div><small>${ey}</small><h1>${title}</h1><p>${desc}</p></div>${actions}</div>`;}
  function field(label,key,value,suffix=''){return `<label>${label}<span class="input"><input data-k="${key}" type="number" value="${value}">${suffix}</span></label>`;}
  function text(label,key,value){return `<label>${label}<span class="input"><input data-k="${key}" value="${html(value)}"></span></label>`;}
  function select(label,key,opts){return `<label>${label}<span class="input"><select data-k="${key}">${opts.map(o=>`<option ${state[key]===o?'selected':''}>${o}</option>`).join('')}</select></span></label>`;}

  const overview = () => window.SiteQuant.dashboard.render();
  function calc(){if(typeof window.calculateBbs!=='function')throw new Error('Calculation engine did not load.');const key={A:'STRAIGHT',B:'L_BAR',C:'U_BAR',D:'CRANKED'}[state.shape];return window.calculateBbs({memberType:state.memberType,mark:state.mark,description:state.description,material:state.material,lengthMm:state.length*1000,breadthMm:state.breadth*1000,depthMm:state.depth*1000,coverMm:state.cover,diaMm:state.dia,spacingMm:state.spacing,memberQuantity:state.quantity,distributionDimensionMm:state.breadth*1000,shape:key,hooks:{returnLengthMm:state.ret,crankRiseMm:state.rise,crankRunMm:state.run,tailMm:state.tail}});}
  function bbs(){const r=calc();return `<section>${header('CALCULATION WORKSPACE','BBS Builder','Enter the engineering inputs you already know. SiteQuant assembles the schedule around the result.','<button class="primary" id="csv">Export CSV</button>')}<div class="banner"><b>SITEQUANT ENGINE</b><strong>One calculation record for Web + Android</strong><span>Versioned calculation output.</span></div><div class="layout"><article class="panel"><h2>01 · Member details</h2><div class="grid">${select('Member type','memberType',['Beam','Column','Slab','Footing','Wall'])}${text('Bar mark','mark',state.mark)}${text('Description','description',state.description)}${select('Steel grade','material',['Fe 415','Fe 500','Fe 500D','Fe 550'])}</div><hr><h2>02 · Member geometry</h2><div class="grid three">${field('Length','length',state.length,'m')}${field('Breadth','breadth',state.breadth,'m')}${field('Depth','depth',state.depth,'m')}</div><div class="grid two">${field('Clear cover','cover',state.cover,'mm')}${field('Identical members','quantity',state.quantity,'nos')}</div><hr><h2>03 · Reinforcement</h2><div class="grid three">${field('Bar diameter','dia',state.dia,'mm')}${field('Spacing','spacing',state.spacing,'mm')}<label>Direction<span class="input"><select><option>Longitudinal</option><option>Transverse</option></select></span></label></div><hr><h2>04 · Bar shape</h2><div class="shapes">${Object.entries(shapes).map(([k,v])=>`<button class="shape ${state.shape===k?'selected':''}" data-shape="${k}"><i>${k}</i>${shapeSvg(k)}<b>${v[0]}</b><span>${v[1]}</span></button>`).join('')}</div>${state.shape==='B'?`<div class="grid two">${field('Return length','ret',state.ret,'mm')}</div>`:''}${state.shape==='D'?`<div class="grid three">${field('Crank rise','rise',state.rise,'mm')}${field('Crank run','run',state.run,'mm')}${field('Tail','tail',state.tail,'mm')}</div>`:''}<div class="note">ⓘ <span><b>Calculation transparency</b> Production release will show applicable code, bend deductions, hooks and assumptions for this bar.</span></div></article><aside class="result panel"><small>LIVE RESULT</small><h2>${html(state.mark)} · ${html(state.memberType)}</h2><div class="diagram">${shapeSvg(state.shape)}<span>${shapes[state.shape][0]}</span></div><div class="big"><span>Calculated bar quantity</span><b>${r.output.totalBars}</b><small>bars @ ${state.spacing} mm c/c</small></div><div class="metrics"><div>Cutting length<b>${fmt(r.output.cuttingLengthM,3)} m</b></div><div>Unit weight<b>${fmt(r.output.unitWeightKgPerM,3)} kg/m</b></div><div>Total weight<b>${fmt(r.output.totalWeightKg)} kg</b></div><div>Total tonnes<b>${fmt(r.output.totalWeightTonnes,3)} t</b></div></div><details open><summary>Calculation trace</summary><ol>${r.trace.map(x=>`<li>${x}</li>`).join('')}</ol></details><p class="standard">${r.standards.bendingFixing} · ${r.engineVersion}</p></aside></div></section>`;}
  function boq(){return `<section>${header('QUANTITY WORKSPACE','BOQ Workspace','A project register for quantities, units, rates and BBS consumption.','<button class="primary">+ Add item</button>')}<div class="panel"><h2>Riverside Residence · Block A</h2><p>Illustrative workspace — BBS steel quantities will flow here automatically in the production build.</p><table><tr><th>Item</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${[['01.01','RCC M25 concrete','m³','128.40','7,250','9,31,900'],['01.02','TMT reinforcement steel','kg','46,280','72','33,32,160'],['01.03','Centering & shuttering','m²','1,940','410','7,95,400']].map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table></div></section>`;}
  function simple(title, desc) {
    return `<section>${header('WORKSPACE', title, desc)}
      <div class="empty panel"><b>This workspace is being developed.</b>
      <span>Use Overview for project drafts and sample activity, or BBS for the current calculation workflow.</span>
      <p><a class="sq-text-link" href="#/overview">Back to overview →</a></p></div></section>`;
  }
  function pricing(){return `<section class="pricing"><small>SUBSCRIPTION · DRAFT PRICING</small><h1>Charge for capability,<br><em>not complexity.</em></h1><p>Designed around individual engineers, small teams and contractors. Final pricing will be set after usage economics are validated.</p><div class="plans">${[['Free','₹0',['1 project','50 BBS items / month','CSV preview']],['Professional','₹1,499',['10 projects','Unlimited BBS drafts','BOQ workspace','Full CSV export','Android integration']],['Team','₹4,999',['50 projects','5 seats','Shared projects','Advanced exports']]].map((p,i)=>`<article class="pricing-plan ${i===1?'featured':''}"><small>${p[0].toUpperCase()}</small><h3>${i===0?'Try the workflow':i===1?'For independent engineers':'For contractor & QS teams'}</h3><b>${p[1]}</b><span>/ month</span>${p[2].map(x=>`<p>✓ ${x}</p>`).join('')}<button class="${i===1?'primary':'secondary'}">${i?'Choose '+p[0]:'Start free'}</button></article>`).join('')}</div></section>`;}
  function csv(){const r=calc(),o=r.output;const rows=[['Bar Mark','Member','Shape','Diameter','No. of Bars','Cutting Length m','Unit Weight kg/m','Total Weight kg','Total Weight tonnes','Formula Version'],[state.mark,state.memberType,r.input.shapeName,state.dia,o.totalBars,o.cuttingLengthM,o.unitWeightKgPerM,o.totalWeightKg,o.totalWeightTonnes,r.engineVersion]];const blob=new Blob([rows.map(x=>x.map(esc).join(',')).join('\n')],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`SiteQuant_${state.mark}_BBS.csv`;a.click();URL.revokeObjectURL(a.href);}
  function wire() {
    view.querySelectorAll('[data-shape]').forEach(button => {
      button.setAttribute('aria-pressed', String(state.shape === button.dataset.shape));
      button.onclick = () => {
        state.shape = button.dataset.shape;
        render('bbs', false);
        view.querySelector('[data-shape="' + state.shape + '"]')?.focus();
      };
    });
    view.querySelectorAll('[data-k]').forEach(input => {
      input.onchange = () => {
        const key = input.dataset.k;
        const numeric = ['length','breadth','depth','cover','dia','spacing','quantity','ret','rise','run','tail'].includes(key);
        const previous = state[key];
        state[key] = numeric ? Number(input.value) : input.value;
        try { calc(); } catch (error) {
          state[key] = previous;
          input.value = previous;
          input.setCustomValidity(error.message);
          input.reportValidity();
          input.oninput = () => input.setCustomValidity('');
          return;
        }
        render('bbs', false);
        view.querySelector('[data-k="' + key + '"]')?.focus();
      };
    });
    const exportButton = view.querySelector('#csv');
    if (exportButton) exportButton.onclick = () => { csv(); notify('BBS CSV downloaded. Engineering review required.'); };
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
      state.page = Object.hasOwn(nav, page) ? page : 'overview';
      crumb.textContent = nav[state.page];
      document.title = nav[state.page] + ' · SiteQuant Pro';
      view.className = 'sq-main' + (state.page === 'overview' ? '' : ' sq-legacy');
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
