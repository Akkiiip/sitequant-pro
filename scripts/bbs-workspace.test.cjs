/* Phase 2 browser contract. The engineering unit tests remain unchanged. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function testBbs({ evaluate, click, route, send, until, layout, screenshot, downloads }) {
  const set = (key, value) => evaluate(`(() => {const e=document.querySelector('[data-bbs-field="${key}"]');e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const control = (id, value, type = 'change') => evaluate(`(() => {const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true}));})()`);
  const count = () => evaluate(`document.querySelectorAll('[data-bbs-row]').length`);
  const metric = key => evaluate(`document.querySelector('[data-bbs-output="${key}"]')?.textContent.replaceAll(',','')`);
  const error = key => evaluate(`document.getElementById('bbs-${key}-error').textContent`);
  const reload = async () => { await send('Page.reload'); await until(() => evaluate(`!!document.querySelector('#bbs-editor')`), 'BBS reload'); };
  const file = async filename => {
    const output = path.join(downloads, filename);
    await until(() => fs.existsSync(output), `download ${filename}`);
    return fs.readFileSync(output, 'utf8');
  };

  await route('bbs');
  assert.equal(await count(), 4);
  assert.equal(await metric('totalBars'), '2');
  const expectedHeader = 'Bar Mark,Member,Shape,Diameter,No. of Bars,Cutting Length m,Unit Weight kg/m,Total Weight kg,Total Weight tonnes,Formula Version';
  for (const [width, height, name] of [[1440, 1050, 'phase2-desktop'], [1024, 1000, 'phase2-tablet'], [768, 1024, 'phase2-tablet-portrait'], [390, 844, 'phase2-mobile'], [320, 740, 'phase2-small-mobile']]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await evaluate('window.scrollTo(0,0)');
    await layout(name);
    await screenshot(name);
    assert.equal(await evaluate(`getComputedStyle(document.getElementById('bbs-result')).position`), width > 950 ? 'sticky' : 'static');
    await set('spacing', '100');
    assert.equal(await metric('totalBars'), '3');
    await click('[data-bbs-shape="B"]');
    assert.ok(await evaluate(`!!document.getElementById('bbs-ret')`));
    await evaluate(`document.querySelector('[data-bbs-shape="A"]').focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    assert.equal(await evaluate(`document.querySelector('[data-bbs-shape="A"]').getAttribute('aria-pressed')`), 'true');
    await set('spacing', '150');
    await layout(`${name}/after input and keyboard shape change`);
  }
  console.log('PASS BBS desktop/tablet/mobile layout, sticky results, and bounded schedule scrolling');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await evaluate(`window.bbsInputIdentity=document.getElementById('bbs-length')`);
  for (const [key, value] of Object.entries({ mark: 'QA-B01', memberType: 'Beam', description: 'Checked browser test member', material: 'Fe 500', length: '6', breadth: '0.4', depth: '0.6', cover: '30', quantity: '3', dia: '20', spacing: '100' })) await set(key, value);
  assert.equal(await metric('totalBars'), '12');
  assert.equal(await metric('cuttingLengthM'), '5.940');
  assert.equal(await evaluate(`window.bbsInputIdentity===document.getElementById('bbs-length')`), true, 'Inputs must not be replaced on edit');

  for (const [code, engineShape] of [['A', 'STRAIGHT'], ['B', 'L_BAR'], ['C', 'U_BAR'], ['D', 'CRANKED']]) {
    await click(`[data-bbs-shape="${code}"]`);
    assert.equal(await evaluate(`document.querySelector('[data-bbs-shape="${code}"]').getAttribute('aria-pressed')`), 'true');
    assert.equal(await evaluate(`!!document.getElementById('bbs-ret')`), code === 'B');
    assert.equal(await evaluate(`!!document.getElementById('bbs-rise')`), code === 'D');
    if (code === 'B') await set('ret', '500');
    if (code === 'D') { await set('rise', '220'); await set('run', '320'); await set('tail', '180'); }
    const expected = await evaluate(`calculateBbs({memberType:'Beam',mark:'QA-B01',description:'Checked browser test member',material:'Fe 500',lengthMm:6000,breadthMm:400,depthMm:600,coverMm:30,diaMm:20,spacingMm:100,memberQuantity:3,distributionDimensionMm:400,shape:'${engineShape}',hooks:{returnLengthMm:500,crankRiseMm:220,crankRunMm:320,tailMm:180}})`);
    for (const key of ['barsPerMember', 'totalBars', 'cuttingLengthM', 'unitWeightKgPerM', 'totalLengthM', 'totalWeightKg', 'totalWeightTonnes']) assert.equal(Number(await metric(key)), expected.output[key], `${code}/${key} must match the engine`);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.bbs-trace li'),e=>e.textContent)`), expected.trace);
    assert.ok(await evaluate(`document.querySelector('.bbs-engine-metadata').textContent.includes('bbs-v0.2-framework')`));
    assert.ok(await evaluate(`document.querySelector('.bbs-standard-status').textContent.includes('engineering review required')`));
    assert.equal(await evaluate(`document.querySelectorAll('.bbs-dimension-readout > div').length`), Object.keys(expected.input.dimensionsMm).length);
  }
  await screenshot('phase2-cranked-detail');
  await click('[data-bbs-shape="A"]');
  await set('direction', 'Transverse');
  assert.equal(await metric('cuttingLengthM'), '0.340');
  assert.equal(await metric('totalBars'), '180');
  await set('direction', 'Longitudinal');
  console.log('PASS all four shapes, relevant parameters, exact engine outputs/traces, direction mapping and retained input identity');

  const validValues = { mark: 'QA-B01', description: 'Checked browser test member', length: '6', breadth: '0.4', depth: '0.6', cover: '30', spacing: '100', quantity: '3', dia: '20' };
  for (const [key, invalid] of [['mark',''], ['description',''], ['length',''], ['breadth','-1'], ['depth','-0.2'], ['cover','-1'], ['spacing','0'], ['quantity','0'], ['quantity','1.5'], ['quantity','-2'], ['dia','0']]) {
    await set(key, invalid);
    assert.ok(await error(key), `${key} needs an inline error`);
    assert.equal(await evaluate(`document.getElementById('bbs-${key}').getAttribute('aria-invalid')`), 'true');
    assert.equal(await evaluate(`document.getElementById('bbs-export-current').disabled && document.getElementById('bbs-add-item').disabled`), true);
    assert.equal(await metric('totalBars'), undefined, 'Invalid inputs must not expose a stale result');
    await set(key, validValues[key]);
  }
  assert.equal(await evaluate(`SiteQuant.bbsModel.calculate({...SiteQuant.bbsModel.defaults,length:'not-a-number'}).result`), null);
  await click('[data-bbs-shape="B"]'); await set('ret','');
  assert.ok(await error('ret')); await click('[data-bbs-shape="A"]');
  assert.equal(await metric('totalBars'), '12', 'Inactive shape fields must not block calculation');
  await set('length',''); await click('[data-bbs-action="save"]'); await reload();
  assert.equal(await evaluate(`document.getElementById('bbs-length').value`), '');
  assert.equal(await evaluate(`document.getElementById('bbs-export-current').disabled`), true);
  await set('length','6');
  await set('description','Autosaved on immediate reload'); await reload();
  assert.equal(await evaluate(`document.getElementById('bbs-description').value`), 'Autosaved on immediate reload');
  await set('description', validValues.description);
  console.log('PASS empty/nonnumeric/negative/zero/fractional validation, no stale results, shape-aware validation and incomplete draft persistence');

  await click('#bbs-add-item');
  assert.equal(await count(), 5);
  assert.equal(await evaluate(`document.getElementById('bbs-add-item').textContent.trim()`), 'Update BBS item');
  await set('quantity','5');
  const localId = await evaluate(`document.querySelector('.bbs-row--selected').dataset.bbsRow`);
  assert.equal(await evaluate(`document.querySelector('.bbs-row--selected td:nth-child(8)').textContent.trim()`), '12', 'Editor changes cannot silently rewrite scheduled rows');
  await click('#bbs-add-item');
  assert.equal(await count(), 5);
  assert.equal(await evaluate(`document.querySelector('.bbs-row--selected td:nth-child(8)').textContent.trim()`), '20');
  await click('#bbs-export-current');
  const csv = await file('SiteQuant_QA-B01_BBS.csv');
  assert.equal(csv.split('\n')[0], expectedHeader);
  assert.ok(csv.includes('QA-B01,Beam,Straight,20,20,5.94'));
  assert.ok(csv.includes('bbs-v0.2-framework'));
  await click('#bbs-duplicate');
  assert.equal(await count(), 6);
  assert.equal(await evaluate(`document.querySelector('.bbs-row--selected .bbs-mark-link').textContent`), 'QA-B01-2');
  await click('#bbs-delete');
  assert.equal(await evaluate(`document.getElementById('bbs-delete-dialog').open`), true);
  await click('[data-bbs-action="cancel-delete"]'); assert.equal(await count(), 6);
  await click('#bbs-delete'); await click('[data-bbs-action="confirm-delete"]');
  assert.equal(await count(), 5);
  await reload(); assert.equal(await count(), 5);
  assert.equal(await evaluate(`document.getElementById('bbs-quantity').value`), '5');
  console.log('PASS add/update/duplicate/delete/cancel, unchanged scheduled rows until update, current CSV format and reload persistence');

  await control('bbs-filter','local'); assert.equal(await count(), 1);
  await control('bbs-search','nothing-matches','input'); assert.equal(await count(), 0);
  await control('bbs-search','QA-B01','input'); assert.equal(await count(), 1);
  await click('#bbs-select-all');
  await click('#bbs-export-schedule');
  const schedule = await file('SiteQuant_riverside_BBS_schedule.csv');
  assert.equal(schedule.split('\n').length, 2); assert.equal(schedule.split('\n')[0], expectedHeader);
  await control('bbs-filter','sample'); assert.equal(await count(), 0);
  assert.equal(await evaluate(`document.getElementById('bbs-selection-label').textContent`), 'No items selected');
  await control('bbs-search','','input'); assert.equal(await count(), 4);
  await control('bbs-filter','all');
  await control('bbs-sort','mark-desc');
  const marks = await evaluate(`Array.from(document.querySelectorAll('.bbs-mark-link'),e=>e.textContent)`);
  assert.deepEqual(marks, [...marks].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})));
  await control('bbs-sort','weight-desc');
  const weights = await evaluate(`Array.from(document.querySelectorAll('[data-bbs-row]'),e=>Number(e.querySelector('td:nth-child(11)').firstChild.textContent.replaceAll(',','')))`);
  assert.deepEqual(weights, [...weights].sort((a,b)=>b-a));
  await control('bbs-filter','sample');
  const sampleId = await evaluate(`document.querySelector('[data-bbs-row]').dataset.bbsRow`);
  const sampleMark = await evaluate(`document.querySelector('.bbs-mark-link').textContent`);
  await click(`[data-bbs-select="${sampleId}"]`);
  assert.equal(await evaluate(`document.querySelectorAll('.bbs-row--selected').length`), 1);
  await click(`[data-bbs-edit="${sampleId}"]`);
  assert.equal(await evaluate(`document.getElementById('bbs-add-item').textContent.trim()`), 'Add BBS item');
  assert.equal(await evaluate(`document.getElementById('bbs-mark').value`), `${sampleMark}-2`);
  assert.equal(await count(), 4, 'Loading a sample cannot change its scheduled row');
  await click('#bbs-select-all'); await click('#bbs-export-schedule');
  const sample = await file('SAMPLE_SiteQuant_riverside_BBS_schedule.csv');
  assert.equal(sample.split('\n').length, 5);
  await click('#bbs-delete'); await click('[data-bbs-action="confirm-delete"]');
  await reload(); assert.equal(await count(), 1, 'Deleted samples must not reseed on reload');
  console.log('PASS search, source filter, mark/weight sort, visible selection, selected/view CSV exports and sample deletion persistence');

  await click(`[data-bbs-edit="${localId}"]`);
  await click('[data-bbs-action="confirm-replace"]');
  await set('description','Unsaved editor change');
  await click('[data-bbs-action="new"]');
  assert.equal(await evaluate(`document.getElementById('bbs-replace-dialog').open`), true);
  await click('[data-bbs-action="cancel-replace"]');
  assert.equal(await evaluate(`document.getElementById('bbs-description').value`), 'Unsaved editor change');
  await click('[data-bbs-action="new"]'); await click('[data-bbs-action="confirm-replace"]');
  const localProject = await evaluate(`SiteQuant.dashboard.getProjects().find(p=>p.local).id`);
  await control('bbs-project', localProject); assert.equal(await count(), 0);
  await set('mark','LOCAL-01'); await click('#bbs-add-item'); assert.equal(await count(), 1);
  await control('bbs-project','riverside'); assert.equal(await count(), 1);
  assert.equal(await evaluate(`document.querySelector('.bbs-mark-link').textContent`), 'QA-B01');
  // Check that a failed storage write remains visible and never claims persistence.
  await evaluate(`window.originalBbsSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Test quota','QuotaExceededError')}`);
  await click('[data-bbs-action="save"]');
  assert.equal(await evaluate(`document.getElementById('bbs-storage-notice').hidden`), false);
  assert.ok(await evaluate(`document.getElementById('bbs-save-status').textContent.includes('Not saved')`));
  await evaluate(`Storage.prototype.setItem=window.originalBbsSetItem`);
  await click('[data-bbs-action="save"]');
  assert.equal(await evaluate(`document.getElementById('bbs-storage-notice').hidden`), true);
  console.log('PASS safe editor replacement, project isolation and storage-failure feedback');
  const stored = await evaluate(`localStorage.getItem(SiteQuant.bbsModel.storageKey)`);
  await evaluate(`localStorage.setItem(SiteQuant.bbsModel.storageKey,'broken-json')`);
  await reload();
  assert.equal(await evaluate(`document.getElementById('bbs-storage-notice').hidden`), false);
  await click('[data-bbs-action="save"]');
  assert.equal(await evaluate(`localStorage.getItem(SiteQuant.bbsModel.storageKey)`), 'broken-json', 'Unreadable records must not be overwritten');
  await evaluate(`localStorage.setItem(SiteQuant.bbsModel.storageKey,${JSON.stringify(stored)})`);
  await reload();
  assert.equal(await count(), 1);
  console.log('PASS unreadable local records preserved and recoverable without reseeding valid schedules');
};
