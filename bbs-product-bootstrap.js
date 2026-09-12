/* SiteQuant Pro BBS bootstrap bridge.
 * The router renders .bbs-workspace after the deferred page scripts have executed.
 * The product UX layer must not be loaded until that workspace exists.
 */
(() => {
  const PRODUCT_FILE = 'bbs-product-ux.js';
  const loadedRoots = new WeakSet();
  let loading = false;

  const root = () => document.querySelector('.bbs-workspace');

  const patchVisibleCopy = () => {
    const host = root();
    if (!host) return;
    host.querySelectorAll('*').forEach((el) => {
      if (el.children.length) return;
      if (el.textContent.includes('max(6d, 65 mm)')) {
        el.textContent = el.textContent.replaceAll('max(6d, 65 mm)', 'max(10d, 75 mm)');
      }
      if (el.textContent.includes('6d,65')) {
        el.textContent = el.textContent.replaceAll('6d,65', '10d,75');
      }
    });
  };

  const loadProductLayer = () => {
    const host = root();
    if (!host || loadedRoots.has(host) || loading) return false;
    loadedRoots.add(host);
    loading = true;
    const script = document.createElement('script');
    script.src = `${PRODUCT_FILE}?v=4&route=${Date.now()}`;
    script.onload = () => {
      loading = false;
      patchVisibleCopy();
    };
    script.onerror = () => {
      loading = false;
      loadedRoots.delete(host);
      console.error('SiteQuant BBS product layer failed to load');
    };
    document.head.appendChild(script);
    return true;
  };

  const tick = () => {
    loadProductLayer();
    patchVisibleCopy();
  };

  const routeObserver = new MutationObserver(tick);
  routeObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => window.setTimeout(tick, 0));
  window.addEventListener('popstate', () => window.setTimeout(tick, 0));
  tick();
})();
