/*
 * SiteQuant Pro BBS stable presentation layer.
 *
 * Previous attempts used several MutationObserver/DOM patch layers that fought
 * the SPA renderer. bbs-workspace keeps a reference to bbsView, so the reliable
 * fix is to change that view contract before the first route render.
 */
(() => {
  const view = window.SiteQuant?.bbsView;
  if (!view || view.__stableBbsUx) return;

  const originalRender = view.render;
  const originalResult = view.result;
  const originalScheduleRows = view.scheduleRows;
  const originalBadge = view.badge;

  view.badge = (text, modifier = '') => {
    if (String(modifier).toLowerCase() === 'review') return '';
    if (String(text).trim().toLowerCase() === 'review required') return '';
    return originalBadge(text, modifier);
  };

  view.render = (...args) => {
    let html = originalRender(...args);

    // Review is a downstream engineering process, not a mandatory calculation input.
    html = html.replace(/<fieldset class="bbs-fieldset"><legend><span>02<\/span> Review workflow<\/legend>[\s\S]*?<\/fieldset>\s*/, '');

    // Keep Longitudinal/Transverse as backward-compatible internal values,
    // while presenting the engineering terminology used by the BBS workflow.
    html = html.replace(/(<label[^>]*for="bbs-direction"[^>]*>)([^<]*)/i, '$1Bar arrangement');
    html = html.replace(/>Longitudinal</g, '>Main<');
    html = html.replace(/>Transverse</g, '>Distribution<');
    html = html.replace(/max\(6d, 65 mm\)/g, 'max(10d, 75 mm)');
    html = html.replace(/6d,65/g, '10d,75');
    html = html.replace('Calculated records. Every item still requires engineering review.', 'Calculated records. Verify before construction issue.');
    return html;
  };

  view.result = (assessment, input, traceOpen = true) => {
    let html = originalResult(assessment, input, traceOpen);

    // Remove old always-on review/export panels from the calculation card.
    html = html.replace(/<div class="bbs-result-review">[\s\S]*?<\/div>/g, '');
    html = html.replace(/<div class="bbs-export-readiness">[\s\S]*?<\/div>/g, '');
    html = html.replace(/<p class="bbs-standard-status">[\s\S]*?<\/p>/g, '');
    html = html.replace(/max\(6d, 65 mm\)/g, 'max(10d, 75 mm)');

    // Keep the calculation headline visible and put its detail payload behind Details.
    const headingStart = html.indexOf('<div class="bbs-result-heading">');
    if (headingStart >= 0) {
      const headingEnd = html.indexOf('</div>', headingStart);
      if (headingEnd >= 0) {
        const heading = html.slice(headingStart, headingEnd + 6);
        const body = html.slice(headingEnd + 6).trim();
        if (body && !body.includes('bbs-result-details')) {
          html = `${heading}<details class="bbs-result-details"><summary><span>Details</span><span aria-hidden="true">›</span></summary><div class="bbs-result-details-body">${body}</div></details>`;
        }
      }
    }
    return html;
  };

  view.scheduleRows = (...args) => {
    let html = originalScheduleRows(...args);
    html = html.replace(/>Longitudinal</g, '>Main<').replace(/>Transverse</g, '>Distribution<');
    html = html.replace(/Longitudinal<\/small>/g, 'Main</small>').replace(/Transverse<\/small>/g, 'Distribution</small>');
    return html;
  };

  const style = document.createElement('style');
  style.id = 'bbs-stable-ux-style';
  style.textContent = `
    .bbs-result-details{margin-top:1rem;border-top:1px solid var(--sq-border,#d9e0e7)}
    .bbs-result-details>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.8rem 0;cursor:pointer;font-weight:650}
    .bbs-result-details>summary::-webkit-details-marker{display:none}
    .bbs-result-details>summary span:last-child{font-size:1.25rem;line-height:1;transition:transform .15s ease}
    .bbs-result-details[open]>summary span:last-child{transform:rotate(90deg)}
    .bbs-result-details-body{padding:0 0 1rem}
    .bbs-schedule thead th:last-child,.bbs-schedule tbody td:last-child{display:none}
  `;
  document.head.appendChild(style);
  view.__stableBbsUx = true;
})();
