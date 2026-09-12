/* Export semantics: make BBS CSV shape fields explicit and preserve U/inverted-U identity. */
(() => {
  const boot = () => {
    const model = window.SiteQuant?.bbsModel;
    if (!model || model.__exportShapeEnhanced) return;
    const originalCalculate = model.calculate.bind(model);
    model.calculate = input => {
      const assessment = originalCalculate(input);
      if (assessment?.result?.input) {
        const originalShape = String(input?.shape || assessment.result.input.shape || '');
        const labels = {
          A: 'Straight bar (A)',
          B: 'L-bar (B)',
          C: 'U-bar (C) — Base + Leg 1 + Leg 2',
          I: 'Inverted U-bar (I) — Base + Leg 1 + Leg 2',
          D: 'Bent-up / cranked bar (D)',
          E: 'Rectangular stirrup / link (E)',
          F: 'Closed column link / tie (F)',
          G: 'Circular ring (G)'
        };
        const exportLabel = labels[originalShape] || assessment.result.input.shapeName || originalShape;
        assessment.result.input.originalShapeCode = originalShape;
        assessment.result.input.exportShapeLabel = exportLabel;
        assessment.result.input.shapeName = exportLabel;
      }
      return assessment;
    };
    model.__exportShapeEnhanced = true;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
