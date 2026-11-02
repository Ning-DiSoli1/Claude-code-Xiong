const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test, before, after } = require('node:test');
const { createServer } = require('../server');
const { SHANHAIJING_BEASTS, BEAST_CHAPTERS } = require('../shanhaijing-data');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const server = createServer();
let port, assetDir, outsideDir;
const assetsExisted = fs.existsSync(path.join(root, 'assets'));

before(async () => {
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  assetDir = fs.mkdtempSync(path.join(root, 'assets', 'audit-test-'));
  outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xiong-audit-'));
  fs.writeFileSync(path.join(assetDir, '中文.png'), 'SAFE_ASSET_CANARY');
  fs.writeFileSync(path.join(outsideDir, 'private.png'), 'PRIVATE_OUTSIDE_CANARY');
  fs.symlinkSync(path.join(outsideDir, 'private.png'), path.join(assetDir, 'outside.png'));
  fs.symlinkSync(path.join(root, 'server.js'), path.join(assetDir, 'source.png'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(assetDir, { recursive: true, force: true });
  fs.rmSync(outsideDir, { recursive: true, force: true });
  if (!assetsExisted) {
    try { fs.rmdirSync(path.join(root, 'assets')); } catch {}
  }
});

function request(requestPath, method = 'GET', requestPort = port) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: requestPort, path: requestPath, method }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('Local test request timed out')));
    req.end();
  });
}

function sourceFunction(name) {
  const match = html.match(new RegExp('function ' + name + '\\([^]*?\\n\\}'));
  assert.ok(match, name + ' must exist');
  return match[0];
}

test('safe pages, query strings and encoded asset names remain available', async () => {
  assert.equal((await request('/')).body, fs.readFileSync(path.join(root, 'stock.html'), 'utf8'));
  for (const filename of ['index.html', 'qiongqi-portfolio.html', 'taotie-portfolio.html',
    'taowu-portfolio.html', 'hundun-portfolio.html', 'updates.html', 'shanhaijing-data.js',
    'stock.html', 'ppt.html', 'gesture-particles.html', 'tech-dashboard.html']) {
    assert.equal((await request('/' + filename + '?audit=1')).status, 200, filename);
  }
  const assetPath = '/assets/' + path.basename(assetDir) + '/' + encodeURIComponent('中文.png');
  const asset = await request(assetPath);
  assert.equal(asset.body, 'SAFE_ASSET_CANARY');
  assert.equal(asset.headers['content-type'], 'image/png');
  assert.equal(asset.headers['x-content-type-options'], 'nosniff');
  const head = await request(assetPath, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});

test('source, personal-data tools, reports, hidden paths and traversal are refused', async () => {
  for (const requestPath of ['/server.js', '/package.json', '/fill_form.js', '/.git/config',
    '/' + encodeURIComponent('安全漏洞检测报告.html'), '/pages/page_01.txt',
    '/../index.html', '/assets/../../server.js', '/assets/%2e%2e/server.js',
    '/assets/%252e%252e/server.js', '/assets/%5c..%5cserver.js', '/%00index.html',
    '/%ZZ', '//index.html']) {
    const response = await request(requestPath);
    assert.equal(response.status, 404, requestPath);
    assert.equal(response.body, 'Not Found', requestPath);
  }
  assert.equal((await request('/index.html', 'POST')).status, 405);
});

test('asset symlinks cannot expose outside files or private source inside the repository', async () => {
  for (const name of ['outside.png', 'source.png']) {
    const response = await request('/assets/' + path.basename(assetDir) + '/' + name);
    assert.equal(response.status, 404, name);
    assert.equal(response.body, 'Not Found');
  }
});

test('user HTML stays literal while reviewed knowledge-base formatting still works', () => {
  const elements = [];
  const context = {
    document: { createElement() { return { style: {} }; } },
    chatMessages: { appendChild(element) { elements.push(element); }, scrollHeight: 1 },
  };
  vm.createContext(context);
  vm.runInContext(sourceFunction('addMsg'), context);
  const payload = '<img src=x onerror="window.auditInjection=true">\n<strong>plain text</strong>';
  context.addMsg(payload, 'user');
  assert.equal(elements[0].textContent, payload);
  assert.equal(elements[0].innerHTML, undefined);
  assert.equal(elements[0].style.whiteSpace, 'pre-wrap');
  context.addMsg('<strong>穷奇</strong>\n已审核的本地资料', 'ai');
  assert.equal(elements[1].innerHTML, '<strong>穷奇</strong><br>已审核的本地资料');
});

test('every beast has a navigable chapter and knowledge replies use real data counts', () => {
  const grouped = BEAST_CHAPTERS.flatMap(ch => ch.beasts);
  assert.equal(grouped.length, SHANHAIJING_BEASTS.length);
  for (const beast of SHANHAIJING_BEASTS) {
    assert.equal(grouped.filter(b => b === beast).length, 1, beast.name);
  }
  const context = { SHANHAIJING_BEASTS, BEAST_CHAPTERS };
  vm.createContext(context);
  const knowledge = html.match(/const knowledge = \{[^]*?\n\};/)[0];
  vm.runInContext([knowledge, sourceFunction('searchBeasts'), sourceFunction('formatBeastResult'),
    sourceFunction('getResponse')].join('\n'), context);
  const reply = context.getResponse('介绍山海经');
  assert.ok(reply.includes('已收录' + SHANHAIJING_BEASTS.length + '条'));
  assert.ok(!reply.includes('100+'));
  assert.ok(context.getResponse('九尾狐').includes('#chapter-'));
  assert.ok(!html.includes('filterEncyclopedia'));
  assert.ok(BEAST_CHAPTERS.some(ch => ch.beasts.some(b => b.name === '梼杌')));
  for (const beast of SHANHAIJING_BEASTS.filter(b => b.page)) {
    assert.ok(fs.existsSync(path.join(root, beast.page)), beast.page);
  }
});

test('malformed stock queries are rejected before network access and the server stays alive', async () => {
  const https = require('node:https');
  const originalGet = https.get;
  let upstreamCalls = 0;
  https.get = () => { upstreamCalls++; throw new Error('Tests must not call external services'); };
  try {
    for (const query of ['symbol=A&symbol=B', 'range=1mo&range=2y', 'interval=1d&interval=1wk',
      'symbol=', 'symbol=' + 'A'.repeat(21), 'symbol=A%0AB', 'symbol=../secret',
      'range=unbounded', 'range=', 'interval=invalid', 'interval=']) {
      const response = await request('/api/stock?' + query);
      assert.equal(response.status, 400, query);
      assert.deepEqual(JSON.parse(response.body), { error: 'Invalid stock query' });
    }
    assert.equal((await request('/api/stock', 'POST')).status, 405);
    assert.equal((await request('/api/stock-extra?symbol=A')).status, 404);
    assert.equal((await request('/api/stock/?symbol=A')).status, 404);
    assert.equal((await request('/index.html')).status, 200);
    assert.equal(upstreamCalls, 0);
  } finally {
    https.get = originalGet;
  }
});

test('unexpected async stock failures return a safe 502 and do not terminate serving', async () => {
  const context = { require, __dirname: root, module: { exports: {} }, Buffer, setTimeout, clearTimeout, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'server.js'), 'utf8') +
    '\nproxyStockAPI = async function() { throw new Error("PRIVATE_INTERNAL_ERROR"); };', context);
  const failureServer = context.module.exports.createServer();
  await new Promise(resolve => failureServer.listen(0, '127.0.0.1', resolve));
  try {
    const failurePort = failureServer.address().port;
    const response = await request('/api/stock', 'GET', failurePort);
    assert.equal(response.status, 502);
    assert.deepEqual(JSON.parse(response.body), { error: 'Stock service unavailable' });
    assert.ok(!response.body.includes('PRIVATE_INTERNAL_ERROR'));
    assert.equal((await request('/index.html', 'GET', failurePort)).status, 200);
  } finally {
    await new Promise(resolve => failureServer.close(resolve));
  }
});

test('upstream reads retain normal replies and bound size and elapsed time without network access', async () => {
  const { EventEmitter } = require('node:events');
  const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8').match(/function httpsGet\([^]*?\n\}/)[0];
  function fixture() {
    const req = new EventEmitter();
    const res = new EventEmitter();
    req.destroy = () => { req.destroyed = true; };
    res.destroy = () => { res.destroyed = true; };
    res.statusCode = 200;
    res.headers = {};
    let onResponse, deadline, timeoutMs, cleared = false;
    const context = {
      Buffer,
      https: { get(_url, _options, callback) { onResponse = callback; return req; } },
      setTimeout(callback, ms) { deadline = callback; timeoutMs = ms; return 1; },
      clearTimeout() { cleared = true; },
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return {
      req, res, get: context.httpsGet,
      respond() { onResponse(res); },
      expire() { deadline(); },
      timeoutMs: () => timeoutMs,
      wasCleared: () => cleared,
    };
  }
  const normal = fixture();
  const body = normal.get('https://example.invalid/', {});
  normal.respond();
  normal.res.emit('data', Buffer.from('OK'));
  normal.res.emit('end');
  assert.equal((await body).body, 'OK');
  assert.equal(normal.wasCleared(), true);

  const oversized = fixture();
  const tooLarge = oversized.get('https://example.invalid/', {});
  oversized.respond();
  oversized.res.emit('data', Buffer.alloc(2 * 1024 * 1024 + 1));
  await assert.rejects(tooLarge, /size limit/);
  assert.equal(oversized.req.destroyed, true);
  assert.equal(oversized.res.destroyed, true);

  const timed = fixture();
  const timedOut = timed.get('https://example.invalid/', {});
  assert.equal(timed.timeoutMs(), 10000);
  timed.expire();
  await assert.rejects(timedOut, /timed out/);
  assert.equal(timed.req.destroyed, true);
});
