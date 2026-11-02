'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSite } = require('../scripts/build-site');
const manifest = require('../site-manifest.json');

function fixture(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'site-publication-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, 'source');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'site-manifest.json'), JSON.stringify(manifest));
  for (const file of manifest) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), `fixture for ${file}`);
  }
  return { temporary, root, output: path.join(temporary, 'output') };
}

test('publication copies all reviewed files and excludes unrelated sensitive material', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'fill_form.js'), 'private fixture');
  fs.writeFileSync(path.join(f.root, 'candidate.local.json'), '{"private":true}');
  assert.equal(buildSite(f.root, f.output), manifest.length);
  for (const file of manifest) assert.deepEqual(fs.readFileSync(path.join(f.output, file)), fs.readFileSync(path.join(f.root, file)));
  assert.equal(fs.existsSync(path.join(f.output, 'fill_form.js')), false);
  assert.equal(fs.existsSync(path.join(f.output, 'candidate.local.json')), false);
  assert.throws(() => buildSite(f.root, f.output), /already exists/);
});

test('missing asset fails before creating partial publication', t => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, manifest.at(-1)));
  assert.throws(() => buildSite(f.root, f.output));
  assert.equal(fs.existsSync(f.output), false);
});

test('manifest cannot expose scripts or traverse paths', t => {
  const f = fixture(t);
  for (const entry of ['fill_form.js', '../secret', '/secret', 'assets/qiongqi/../secret.png']) {
    fs.writeFileSync(path.join(f.root, 'site-manifest.json'), JSON.stringify([...manifest, entry]));
    assert.throws(() => buildSite(f.root, f.output), /Unreviewed/);
    assert.equal(fs.existsSync(f.output), false);
  }
});

test('symlink cannot expose a file outside the publication source', t => {
  const f = fixture(t);
  const target = path.join(f.temporary, 'private');
  fs.writeFileSync(target, 'private fixture');
  fs.unlinkSync(path.join(f.root, 'index.html'));
  fs.symlinkSync(target, path.join(f.root, 'index.html'));
  assert.throws(() => buildSite(f.root, f.output), /Symbolic links/);
});
