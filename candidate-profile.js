const fs = require('node:fs');

// Personal values must stay in an ignored local JSON file, never in source.
function readCandidateProfile(configPath) {
  if (!configPath) {
    throw new Error('Missing candidate profile: pass a private JSON path or set CANDIDATE_CONFIG. See docs/admissions-tools.md.');
  }
  let candidate;
  try {
    candidate = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    throw new Error('Cannot read candidate profile as JSON. No workbook was opened or written.');
  }
  const isText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
  const textFields = ['name', 'ethnicity', 'subjectCombination', 'gender', 'region'];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
      !textFields.every(field => isText(candidate[field])) ||
      !Array.isArray(candidate.subjects) || candidate.subjects.length !== 3 ||
      !candidate.subjects.every(isText) ||
      typeof candidate.totalScore !== 'number' || !Number.isFinite(candidate.totalScore) || candidate.totalScore < 0 ||
      !Number.isSafeInteger(candidate.rank) || candidate.rank < 1) {
    throw new Error('Invalid candidate profile. Complete the fields in candidate.example.json; no workbook was opened or written.');
  }
  return candidate;
}

module.exports = { readCandidateProfile };
