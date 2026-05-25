const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Approximate reference prices for demo data generation
const STOCK_BASE = {
  AAPL: 195, GOOGL: 178, MSFT: 425, AMZN: 185, TSLA: 245,
  NVDA: 950, META: 510, NFLX: 680, AMD: 155, INTC: 38,
  BABA: 82, SPY: 530,
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/stock.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
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
  const apiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&crumb=${crumb}`;
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
  const parsed = url.parse(req.url, true);
  const symbol = (parsed.query.symbol || 'AAPL').toUpperCase();
  const range = parsed.query.range || '1mo';
  const interval = parsed.query.interval || '1d';

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

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/stock')) {
    proxyStockAPI(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Stock chart available. Demo data will be used if Yahoo Finance is unreachable.');
});
