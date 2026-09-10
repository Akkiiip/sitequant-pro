/* Browser integration checks. Requires Node 22+ and an installed Chromium browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createServer } = require('./dev-server.cjs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) {
  for (let i = 0; i < 100; i++) {
    const value = await check();
    if (value) return value;
    await delay(100);
  }
  throw Error(`Timed out: ${label}`);
}

async function run() {
  const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const browserPath = candidates.find(candidate => fs.existsSync(candidate));
  assert.ok(browserPath, 'Set CHROME_PATH to an installed Chromium browser.');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sitequant-ui-'));
  const profile = path.join(temp, 'profile');
  const downloads = path.join(temp, 'downloads');
  fs.mkdirSync(downloads);
  const screenshots = process.env.SCREENSHOT_DIR;
  if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.SITEQUANT_TEST_URL || `http://127.0.0.1:${server.address().port}`;
  const child = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  let send;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    await until(() => fs.existsSync(portFile), 'browser startup');
    const debugPort = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    const pending = new Map();
    const errors = [];
    let sequence = 0;
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(JSON.stringify(message.params.args));
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id);
        clearTimeout(request.timer);
        pending.delete(message.id);
        if (message.error) request.reject(Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
      }
    });
    send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`Protocol timeout: ${method}`)); }, 10000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const click = async selector => {
      const point = await evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    };
    const route = async page => {
      await evaluate(`location.hash = '#/${page}'`);
      await until(() => evaluate(`document.querySelector('#crumb').textContent === ${JSON.stringify({ overview: 'Overview', projects: 'Projects', bbs: 'BBS', boq: 'BOQ', exports: 'Exports', pricing: 'Subscription', settings: 'Settings' }[page])}`), `route ${page}`);
    };
    const layout = async label => {
      const value = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, main: document.getElementById('view').getBoundingClientRect().width, badge: [...document.querySelector('.sq-topbar').children].every(e => {const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return !r.height || (r.top>=p.top && r.bottom<=p.bottom);}) })`);
      if (value.scroll > value.width + 1) {
        console.log(await evaluate(`JSON.stringify([...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right > innerWidth+1 && !e.closest('.sq-table-scroll')).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})))`));
        await screenshot('layout-failure');
      }
      assert.ok(value.scroll <= value.width + 1, `${label}: horizontal overflow ${JSON.stringify(value)}`);
      assert.ok(value.main > 0, `${label}: missing main area`);
      assert.ok(value.badge, `${label}: topbar child escapes its bounds`);
    };
    const screenshot = async name => {
      if (!screenshots) return;
      const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(path.join(screenshots, name + '.png'), Buffer.from(image.data, 'base64'));
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    await send('Page.navigate', { url: base });
    await until(() => evaluate(`!!document.getElementById('sq-overview-title') && !!window.SiteQuant?.dashboard`), 'overview boot');
    assert.equal(await evaluate(`document.querySelectorAll('.sq-project-table tbody tr').length`), 3);

    for (const [width, height, name] of [[1440, 1050, 'phase1-desktop'], [1280, 1000, 'phase1-desktop-1280'], [1024, 1000, 'phase1-tablet'], [768, 1024, 'phase1-tablet-portrait'], [390, 844, 'phase1-mobile'], [320, 740, 'phase1-small-mobile']]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await route('overview');
      await layout(name);
      await screenshot(name);
      for (const page of ['projects', 'bbs', 'boq', 'exports', 'pricing', 'settings']) {
        await route(page);
        await layout(`${name}/${page}`);
        assert.equal(await evaluate(`document.querySelector('.sq-sidebar [aria-current="page"]').dataset.navPage`), page);
      }
      console.log(`PASS ${name}: all 7 routes, overflow and topbar bounds`);
    }

    await route('overview');
    await click('#sq-menu-toggle');
    assert.equal(await evaluate(`document.getElementById('sq-mobile-menu').open`), true);
    await click('#sq-mobile-menu [href="#/bbs"]');
    await until(() => evaluate(`document.getElementById('crumb').textContent === 'BBS'`), 'mobile navigation');
    assert.equal(await evaluate(`document.getElementById('sq-mobile-menu').open`), false);
    await route('overview');
    await click('[data-new-project]');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal(await evaluate(`document.getElementById('sq-project-dialog').open`), false);
    assert.equal(await evaluate(`document.activeElement.hasAttribute('data-new-project')`), true);
    console.log('PASS mobile navigation, native dialog Escape and focus restoration');

    await evaluate(`document.getElementById('sq-project-filter').value='riverside';document.getElementById('sq-project-filter').dispatchEvent(new Event('change',{bubbles:true}))`);
    assert.equal(await evaluate(`document.querySelectorAll('.sq-project-table tbody tr').length`), 1);
    assert.equal(await evaluate(`document.querySelectorAll('.sq-review-item').length`), 2);
    await click('[data-review="review-1"]');
    assert.equal(await evaluate(`document.getElementById('sq-detail-dialog').open`), true);
    await click('#sq-detail-dialog [data-close-dialog]');
    await click('[data-export-detail="export-1"]');
    assert.ok(await evaluate(`document.getElementById('sq-detail-content').textContent.includes('not a stored file')`));
    await click('#sq-detail-dialog [data-close-dialog]');
    await click('[data-new-project]');
    assert.equal(await evaluate(`document.getElementById('sq-project-form').checkValidity()`), false);
    await evaluate(`const f=document.getElementById('sq-project-form');f.elements.name.value='<b>QA project</b>';f.elements.location.value='Pune';f.elements.block.value='Block B';f.requestSubmit()`);
    assert.equal(await evaluate(`document.getElementById('sq-project-dialog').open`), false);
    assert.equal(await evaluate(`document.querySelector('.sq-project-link strong').textContent`), '<b>QA project</b>');
    assert.equal(await evaluate(`document.querySelector('.sq-project-link strong b')`), null);
    assert.equal(await evaluate(`document.querySelector('.sq-summary-strip strong').textContent.trim()`), '0items');
    await send('Page.reload');
    await until(() => evaluate(`!!document.getElementById('sq-project-filter')`), 'reload');
    assert.equal(await evaluate(`document.querySelectorAll('.sq-project-table tbody tr').length`), 4);
    console.log('PASS project filter, review/export details, validation, safe rendering, empty state and local persistence');

    await require("./bbs-workspace.test.cjs")({evaluate,click,route,send,until,layout,screenshot,downloads});
    assert.deepEqual(errors, [], 'No runtime exceptions or console errors');
    console.log('PASS no console errors');
    console.log(screenshots ? `Screenshots: ${screenshots}` : 'Set SCREENSHOT_DIR to retain rendered screenshots.');
  } finally {
    if (send) await send('Browser.close').catch(() => {});
    if (socket) socket.close();
    child.kill();
    await new Promise(resolve => server.close(resolve));
    console.log(`Isolated test data: ${temp}`);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
