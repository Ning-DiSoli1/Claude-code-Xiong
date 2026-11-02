const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { readCandidateProfile } = require('../candidate-profile');

const root = path.resolve(__dirname, '..');
const synthetic = {
  name: 'TEST_NAME', ethnicity: 'TEST_ETHNICITY', subjectCombination: 'TEST_SUBJECTS',
  gender: 'TEST_GENDER', region: 'TEST_REGION', subjects: ['TEST_A', 'TEST_B', 'TEST_C'],
  totalScore: 123.5, rank: 678
};

function withConfig(contents, callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'candidate-test-'));
  const configPath = path.join(dir, 'candidate.private.json');
  fs.writeFileSync(configPath, contents);
  try { return callback(configPath); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function harness(script, configPath, viaEnv = false) {
  const stats = { loads: 0, reads: 0, writes: 0 };
  const workbook = { Sheets: {
    '考生基本信息': {}, '普通批招生计划总计280165人': {}, '本科普通批次表': {}, 'QZY数据': {}, 'Sheet1': {}
  } };
  const rows = [[], []];
  const xlsx = {
    readFile: () => { stats.reads++; return workbook; },
    writeFile: () => { stats.writes++; },
    utils: {
      sheet_to_json: sheet => sheet === workbook.Sheets.Sheet1 ? rows : [],
      book_new: () => ({ Sheets: {} }),
      aoa_to_sheet: data => data,
      book_append_sheet: (book, sheet, name) => { book.Sheets[name] = sheet; }
    }
  };
  const context = {
    require: name => {
      if (name === './candidate-profile') return { readCandidateProfile };
      if (name === 'xlsx') { stats.loads++; return xlsx; }
      throw new Error('Unexpected dependency: ' + name);
    },
    process: { argv: ['node', script, viaEnv ? undefined : configPath], env: viaEnv ? { CANDIDATE_CONFIG: configPath } : {} },
    console: { log() {} }
  };
  return {
    stats, workbook, rows,
    run: () => vm.runInNewContext(fs.readFileSync(path.join(root, script), 'utf8'), context, { filename: script })
  };
}

for (const script of ['fill_form.js', 'fill_volunteer_table.js']) {
  test(script + ' rejects missing, malformed and incomplete profiles before loading a workbook', () => {
    const missing = harness(script);
    assert.throws(missing.run, /Missing candidate profile/);
    assert.deepEqual(missing.stats, { loads: 0, reads: 0, writes: 0 });
    for (const contents of ['{broken', '{}', 'null', JSON.stringify({ ...synthetic, rank: 0 }), JSON.stringify({ ...synthetic, totalScore: '123' })]) {
      withConfig(contents, configPath => {
        const h = harness(script, configPath);
        assert.throws(h.run, /candidate profile/);
        assert.deepEqual(h.stats, { loads: 0, reads: 0, writes: 0 });
      });
    }
  });
}

test('blank example is deliberately not a usable personal profile', () => {
  assert.throws(() => readCandidateProfile(path.join(root, 'candidate.example.json')), /Invalid candidate profile/);
});

test('fill_form injects every personal cell from explicit JSON', () => {
  withConfig(JSON.stringify(synthetic), configPath => {
    const h = harness('fill_form.js', configPath);
    h.run();
    const sheet = h.workbook.Sheets['考生基本信息'];
    const expected = {
      B2: synthetic.name, D2: synthetic.ethnicity, F2: synthetic.subjectCombination,
      B3: synthetic.gender, F3: synthetic.region, B9: synthetic.subjects[0],
      B10: synthetic.subjects[1], B11: synthetic.subjects[2], B13: synthetic.totalScore, D13: synthetic.rank
    };
    for (const [cell, value] of Object.entries(expected)) assert.equal(sheet[cell].v, value, cell);
    assert.equal(h.stats.reads, 1);
    assert.equal(h.stats.writes, 1);
  });
});

test('fill_volunteer_table injects header and all repeated score/rank cells from env-selected JSON', () => {
  withConfig(JSON.stringify(synthetic), configPath => {
    const h = harness('fill_volunteer_table.js', configPath, true);
    h.run();
    for (const value of [synthetic.name, synthetic.gender, synthetic.ethnicity, synthetic.subjectCombination, String(synthetic.totalScore), String(synthetic.rank)]) {
      assert.ok(h.rows[1][0].includes(value));
    }
    assert.equal(h.rows[1][7], String(synthetic.totalScore));
    assert.equal(h.rows[1][8], String(synthetic.rank));
    assert.equal(h.rows[1][9], String(synthetic.totalScore));
    assert.equal(h.rows[1][10], String(synthetic.rank));
    assert.equal(h.stats.reads, 2);
    assert.equal(h.stats.writes, 1);
  });
});
