const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

// Approximate reference prices for demo data generation
const STOCK_BASE = {
  AAPL: 195, GOOGL: 178, MSFT: 425, AMZN: 185, TSLA: 245,
  NVDA: 950, META: 510, NFLX: 680, AMD: 155, INTC: 38,
  BABA: 82, SPY: 530,
};

// This optional server belongs to the stock demo. Keep its home page, but never
// expose the repository root, local settings, source tools, or other projects' data.
const PUBLIC_FILES = new Set([
  '/index.html', '/qiongqi-portfolio.html', '/taotie-portfolio.html',
  '/taowu-portfolio.html', '/hundun-portfolio.html', '/updates.html',
  '/shanhaijing-data.js', '/stock.html', '/ppt.html',
  '/gesture-particles.html', '/tech-dashboard.html',
]);
const STATIC_ROOT = fs.realpathSync(__dirname);

function serveStatic(req, res) {
  const notFound = () => {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(req.url.split(/[?#]/, 1)[0]);
  } catch {
    notFound();
    return;
  }
  // Check before normalization so encoded dot segments cannot change directories.
  if (!pathname.startsWith('/') || pathname.startsWith('//') ||
      /[\\\0]/.test(pathname) ||
      pathname.split('/').some(segment => segment === '.' || segment === '..')) {
    notFound();
    return;
  }
  if (pathname === '/') pathname = '/stock.html';
  const isAsset = /^\/assets\/(?:[^/.][^/]*\/)*[^/.][^/]*\.(?:png|jpe?g|webp|gif|avif)$/i.test(pathname);
  if (!PUBLIC_FILES.has(pathname) && !isAsset) {
    notFound();
    return;
  }

  const filePath = path.join(STATIC_ROOT, pathname);
  fs.realpath(filePath, (resolveError, realPath) => {
    if (resolveError || !realPath.startsWith(STATIC_ROOT + path.sep) || realPath !== filePath) {
      notFound();
      return;
    }
    fs.stat(realPath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        notFound();
        return;
      }
      fs.readFile(realPath, (readError, data) => {
        if (readError) {
          notFound();
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(realPath).toLowerCase()] || 'application/octet-stream',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(req.method === 'HEAD' ? undefined : data);
      });
    });
  });
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const maxBytes = 2 * 1024 * 1024;
    let deadline, settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error) reject(error);
      else resolve(result);
    };
    const request = https.get(url, { headers }, (res) => {
      const chunks = [];
      let bytes = 0;
      res.on('error', error => finish(error));
      res.on('aborted', () => finish(new Error('Upstream response aborted')));
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          const error = new Error('Upstream response exceeds size limit');
          finish(error);
          res.destroy();
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => finish(null, {
        status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('error', error => finish(error));
    // A wall-clock deadline also bounds DNS/connect delays and slow streaming.
    deadline = setTimeout(() => {
      const error = new Error('Upstream request timed out');
      finish(error);
      request.destroy();
    }, 10000);
  });
}

async function getYahooCookieAndCrumb() {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const headers = { 'User-Agent': ua, 'Accept': '*/*' };

  const consentRes = await httpsGet('https://fc.yahoo.com/', headers);
  let cookie = '';
  const setCookie = consentRes.headers['set-cookie'];
  if (setCookie) cookie = setCookie.map(c => c.split(';')[0]).join('; ');

  const crumbHeaders = { ...headers };
  if (cookie) crumbHeaders['Cookie'] = cookie;

  const crumbRes = await httpsGet('https://query2.finance.yahoo.com/v1/test/getcrumb', crumbHeaders);
  const crumb = crumbRes.body.trim();

  if (crumbRes.headers['set-cookie']) {
    cookie += '; ' + crumbRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
  }

  return { cookie, crumb };
}

let cachedAuth = null, authExpiry = 0;
async function getAuth() {
  if (cachedAuth && Date.now() < authExpiry) return cachedAuth;
  const auth = await getYahooCookieAndCrumb();
  cachedAuth = auth;
  authExpiry = Date.now() + 30 * 60 * 1000;
  return auth;
}

function generateDemoData(symbol, range) {
  const DAYS = { '1mo': 22, '3mo': 66, '6mo': 130, '1y': 252, '2y': 504 };
  const days = DAYS[range] || 66;
  const base = STOCK_BASE[symbol] || 100 + ((symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 300);
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rng = mulberry32(seed * 1000 + days);
  const trend = rng() * 0.6 - 0.3;
  const volatility = base * (0.01 + rng() * 0.025);

  const ohlc = [];
  const vols = [];
  const dates = [];
  let price = base * (0.7 + rng() * 0.6);

  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dailyVol = volatility * 1.5;
    const change = (rng() - 0.5) * dailyVol + trend * (dailyVol * 0.3);
    const open = price;
    const close = price + change;
    const wick = dailyVol * rng() * 0.8;
    const high = Math.max(open, close) + Math.abs(wick * rng());
    const low = Math.min(open, close) - Math.abs(wick * (1 - rng()));

    ohlc.push([
      +open.toFixed(2),
      +close.toFixed(2),
      +low.toFixed(2),
      +high.toFixed(2),
    ]);
    vols.push([ohlc.length - 1, Math.floor(5e6 + rng() * 50e6)]);
    dates.push(d.toISOString().slice(0, 10));
    price = close;
  }

  // Determine interval string
  const intervalMap = { '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1d', '2y': '1wk' };

  return {
    isDemo: true,
    ohlc,
    vols,
    dates,
    meta: {
      symbol,
      previousClose: ohlc.length > 1 ? ohlc[ohlc.length - 2][1] : ohlc[0][0],
      regularMarketDayHigh: Math.max(...ohlc.slice(-5).map(o => o[3])),
      regularMarketDayLow: Math.min(...ohlc.slice(-5).map(o => o[2])),
      regularMarketVolume: vols[vols.length - 1] ? vols[vols.length - 1][1] : 0,
    },
  };
}

async function fetchYahoo(symbol, range, interval) {
  const { cookie, crumb } = await getAuth();
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const apiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&crumb=${encodeURIComponent(crumb)}`;
  const headers = { 'User-Agent': ua, 'Accept': '*/*' };
  if (cookie) headers['Cookie'] = cookie;

  const result = await httpsGet(apiUrl, headers);
  if (result.status !== 200) throw new Error(`Yahoo returned ${result.status}`);
  return JSON.parse(result.body);
}

function parseYahooData(raw) {
  const result = raw.chart.result[0];
  if (!result) throw new Error('No data');
  const meta = result.meta;
  const quotes = result.indicators.quote[0];
  const timestamps = result.timestamp;

  const ohlc = [];
  const vols = [];
  const dates = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quotes.open[i], high = quotes.high[i];
    const low = quotes.low[i], close = quotes.close[i];
    const volume = quotes.volume[i];
    if (open === null || high === null || low === null || close === null) continue;
    ohlc.push([+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)]);
    vols.push([i, volume || 0]);
    dates.push(new Date(timestamps[i] * 1000).toISOString().slice(0, 10));
  }
  return { isDemo: false, ohlc, vols, dates, meta };
}

async function proxyStockAPI(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { Allow: 'GET', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }
  const query = new URL(req.url, 'http://localhost').searchParams;
  const scalar = (key, fallback) => {
    const values = query.getAll(key);
    return values.length === 0 ? fallback : values.length === 1 ? values[0] : null;
  };
  const rawSymbol = scalar('symbol', 'AAPL');
  const range = scalar('range', '1mo');
  const interval = scalar('interval', '1d');
  const allowedRanges = new Set(['1mo', '3mo', '6mo', '1y', '2y']);
  const allowedIntervals = new Set(['1m', '2m', '5m', '15m', '30m', '60m', '90m',
    '1h', '1d', '5d', '1wk', '1mo', '3mo']);
  // Reject repeated or invalid parameters before any string operations or
  // upstream requests so malformed requests cannot crash the server.
  if (typeof rawSymbol !== 'string' || !/^[a-z0-9^][a-z0-9.^=-]{0,19}$/i.test(rawSymbol) ||
      typeof range !== 'string' || !allowedRanges.has(range) ||
      typeof interval !== 'string' || !allowedIntervals.has(interval)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid stock query' }));
    return;
  }
  const symbol = rawSymbol.toUpperCase();

  // Try Yahoo Finance first
  try {
    const raw = await fetchYahoo(symbol, range, interval);
    const data = parseYahooData(raw);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
    return;
  } catch (e) {
    console.log(`Yahoo Finance failed for ${symbol}: ${e.message}, using demo data`);
  }

  // Fallback to demo data
  const data = generateDemoData(symbol, range);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url.split('?', 1)[0] === '/api/stock') {
      proxyStockAPI(req, res).catch(() => {
        if (res.destroyed || res.writableEnded) return;
        if (res.headersSent) {
          res.destroy();
          return;
        }
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Stock service unavailable' }));
      });
    } else {
      serveStatic(req, res);
    }
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Stock chart available. Demo data will be used if Yahoo Finance is unreachable.');
  });
}

module.exports = { createServer };
