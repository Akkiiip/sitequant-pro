/* Export semantics: make CSV shape labels human-readable and preserve U/inverted-U identity. */
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
          C: 'U-bar (C)',
          I: 'Inverted U-bar (I)',
          D: 'Bent-up / cranked bar (D)',
          E: 'Rectangular stirrup / link (E)',
          F: 'Closed column link / tie (F)',
          G: 'Circular ring (G)'
        };
        assessment.result.input.originalShapeCode = originalShape;
        assessment.result.input.exportShapeLabel = labels[originalShape] || assessment.result.input.shapeName || originalShape;
        if (['C', 'I'].includes(originalShape)) {
          assessment.result.input.exportShapeGeometry = originalShape === 'I'
            ? 'Inverted U: Base + Leg 1 + Leg 2'
            : 'U: Base + Leg 1 + Leg 2';
        }
      }
      return assessment;
    };
    model.__exportShapeEnhanced = true;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
