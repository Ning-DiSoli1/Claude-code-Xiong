'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Only reviewed website files are copied. Never publish the repository root.
function buildSite(sourceRoot, outputRoot) {
  const root = fs.realpathSync(sourceRoot);
  const output = path.resolve(outputRoot);
  const files = JSON.parse(fs.readFileSync(path.join(root, 'site-manifest.json'), 'utf8'));
  if (!Array.isArray(files) || !files.length || new Set(files).size !== files.length) {
    throw new Error('Invalid website manifest');
  }
  const allowedPages = new Set(['index.html', 'qiongqi-portfolio.html', 'taotie-portfolio.html',
    'taowu-portfolio.html', 'hundun-portfolio.html', 'updates.html', 'shanhaijing-data.js']);
  for (const file of files) {
    if (typeof file !== 'string' || file.includes('\\') || file.split('/').some(p => !p || p === '.' || p === '..') ||
        (!allowedPages.has(file) && !/^assets\/(qiongqi|taotie|taowu|hundun)\/[^/]+\.(png|jpg|jpeg|webp)$/i.test(file))) {
      throw new Error('Unreviewed website manifest entry');
    }
    const absolute = path.join(root, file);
    // Reject symbolic links at every level, even when their target is inside root.
    let current = root;
    for (const segment of file.split('/')) {
      current = path.join(current, segment);
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symbolic links are not publishable');
    }
    if (!fs.statSync(absolute).isFile()) throw new Error('Manifest entry is not a file');
  }
  for (const file of allowedPages) {
    if (!files.includes(file)) throw new Error('Required website file is missing from manifest');
  }
  // Refuse to overwrite a directory, preserving any existing business material.
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new output directory');
  fs.mkdirSync(output, { recursive: true });
  for (const file of files) {
    const target = path.join(output, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  return files.length;
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const output = path.resolve(process.argv[2] || path.join(root, 'dist'));
    console.log(`Published ${buildSite(root, output)} reviewed files to ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { buildSite };
