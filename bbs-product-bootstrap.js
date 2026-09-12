/* SiteQuant Pro BBS bootstrap bridge.
 * The router renders .bbs-workspace after the deferred page scripts have executed.
 * The product UX layer therefore needs a second chance after the route exists.
 * This bridge is intentionally tiny: it never owns engineering maths or markup.
 */
(() => {
  const PRODUCT_SRC = 'bbs-product-ux.js?v=3';
  let armed = false;
  let attempts = 0;

  const visibleBbs = () => document.querySelector('.bbs-workspace');

  const patchVisibleCopy = () => {
    const root = visibleBbs();
    if (!root) return;
    root.querySelectorAll('*').forEach((el) => {
      if (el.children.length === 0 && el.textContent.includes('max(6d, 65 mm)')) {
        el.textContent = el.textContent.replaceAll('max(6d, 65 mm)', 'max(10d, 75 mm)');
      }
      if (el.children.length === 0 && el.textContent.includes('6d,65')) {
        el.textContent = el.textContent.replaceAll('6d,65', '10d,75');
      }
    });
  };

  const launchProductLayer = () => {
    if (armed) return true;
    if (!visibleBbs()) return false;
    armed = true;
    const existing = [...document.scripts].some((s) => s.src.includes('/bbs-product-ux.js?v=3'));
    if (!existing) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = PRODUCT_SRC;
      script.onload = patchVisibleCopy;
      document.head.appendChild(script);
    } else {
      patchVisibleCopy();
    }
    return true;
  };

  const tick = () => {
    attempts += 1;
    if (launchProductLayer()) return;
    if (attempts < 80) window.setTimeout(tick, 150);
  };

  const routeObserver = new MutationObserver(() => {
    if (!armed) launchProductLayer();
    patchVisibleCopy();
  });

  routeObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    armed = false;
    attempts = 0;
    window.setTimeout(tick, 0);
  });
  window.addEventListener('popstate', () => {
    armed = false;
    attempts = 0;
    window.setTimeout(tick, 0);
  });
  tick();
})();
