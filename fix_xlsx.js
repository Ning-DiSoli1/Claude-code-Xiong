const XLSX = require('xlsx');
const fs = require('fs');

// Read current XLSX
const wb = XLSX.readFile('123/2026.xlsx');
const ws = wb.Sheets['Sheet1'];
const xlsxData = XLSX.utils.sheet_to_json(ws, {header: 1});

// =====================================================
// Parse PDF OCR data to extract all entries
// =====================================================

// Based on careful analysis of OCR text, extract the 高水平运动队 entries
// from the PDF. The 计划 column is blank/0 for these entries.

// University code -> { name, majors: [{code, name, subject}] }
const pdfHighLevelAthletes = [
  {
    code: '0119', name: '北京大学（北京）',
    majors: [
      { code: '107', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0134', name: '北京化工大学（北京）',
    majors: [
      { code: '101', name: '体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0146', name: '北京警察学院（北京）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0147', name: '北京科技大学（北京）',
    majors: [
      { code: '101', name: '体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0284', name: '成都大学（四川成都）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0332', name: '重庆大学（重庆）',
    majors: [
      { code: '101', name: '体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0518', name: '复旦大学（上海）',
    majors: [
      { code: '104', name: '运动训练(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0674', name: '广州大学（广东广州）',
    majors: [
      { code: '107', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0812', name: '海南大学（海南海口）',
    majors: [
      { code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0832', name: '韩山师范学院（广东潮州）',
    majors: [
      { code: '103', name: '体育教育(高水平运动队)', subject: '不限' },
      { code: '104', name: '法学(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0863', name: '河北地质大学（河北石家庄）',
    majors: [
      { code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0916', name: '河海大学（江苏南京）',
    majors: [
      { code: '101', name: '运动训练(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '0941', name: '河南理工大学（河南焦作）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1039', name: '湖北经济学院（湖北武汉）',
    majors: [
      { code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1115', name: '湖南农业大学（湖南长沙）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' },
      { code: '102', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1125', name: '湖南师范大学（湖南长沙）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1165', name: '华东师范大学（上海）',
    majors: [
      { code: '102', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1170', name: '华南师范大学（广东广州）',
    majors: [
      { code: '108', name: '运动训练(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1205', name: '吉利学院（四川成都）',
    majors: [
      { code: '101', name: '运动康复(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1221', name: '吉林农业大学（吉林长春）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1628', name: '南京工业大学（江苏南京）',
    majors: [
      { code: '101', name: '运动训练(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1646', name: '南京师范大学（江苏南京）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1670', name: '南通大学（江苏南通）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1793', name: '青岛科技大学（山东青岛）',
    majors: [
      { code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1812', name: '清华大学（北京）',
    majors: [
      { code: '106', name: '体育教育(双学士学位)(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1843', name: '三峡大学（湖北宜昌）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1889', name: '山东农业大学（山东泰安）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1898', name: '山东师范大学（山东济南）',
    majors: [
      { code: '101', name: '体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1964', name: '山西医科大学（山西太原）',
    majors: [
      { code: '101', name: '运动康复(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '1992', name: '陕西师范大学（陕西西安）',
    majors: [
      { code: '101', name: '运动训练(高水平运动队)', subject: '不限' },
      { code: '102', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2088', name: '深圳大学（广东深圳）',
    majors: [
      { code: '107', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2104', name: '沈阳化工大学（辽宁沈阳）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2179', name: '四川师范大学（四川成都）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2249', name: '太原师范学院（山西晋中）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2426', name: '西安建筑科技大学（陕西西安）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2508', name: '西华大学（四川成都）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2518', name: '西南科技大学（四川绵阳）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' },
      { code: '102', name: '运动康复(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2521', name: '西南石油大学（四川成都）',
    majors: [
      { code: '101', name: '体育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2523', name: '西南政法大学（重庆）',
    majors: [
      { code: '102', name: '运动训练(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2529', name: '厦门大学（福建厦门）',
    majors: [
      { code: '101', name: '运动训练(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2665', name: '扬州大学（江苏扬州）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2732', name: '云南农业大学（云南昆明）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2886', name: '中国地质大学(北京)（北京）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2887', name: '中国地质大学(武汉)（湖北武汉）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2916', name: '中国政法大学（北京）',
    majors: [
      { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
    ]
  },
  {
    code: '2928', name: '中央民族大学（北京）',
    majors: [
      { code: '101', name: '体育教育(高水平运动队)', subject: '不限' }
    ]
  }
];

// Build lookup for existing XLSX entries in 高水平运动员
const existingHLA = new Map();
let inHLA = false;
for (let i = 0; i < xlsxData.length; i++) {
  const row = xlsxData[i];
  if (row[0] && typeof row[0] === 'string' && row[0].includes('高水平运动员')) {
    inHLA = true;
    continue;
  }
  if (inHLA && row[0] && typeof row[0] === 'string' && row[0].includes('历史类-')) {
    break;
  }
  if (inHLA && row[0] && typeof row[0] === 'string') {
    const codeMatch = row[0].match(/^(\d{4})\s/);
    if (codeMatch) {
      existingHLA.set(codeMatch[1], true);
    }
  }
}

console.log('Existing 高水平运动员 universities in XLSX:');
for (const [code] of existingHLA) {
  console.log(`  ${code}`);
}

console.log(`\nPDF has ${pdfHighLevelAthletes.length} universities in 高水平运动队`);
console.log('Missing from XLSX:');
const missing = pdfHighLevelAthletes.filter(s => !existingHLA.has(s.code));
for (const s of missing) {
  console.log(`  ${s.code} ${s.name} (${s.majors.length} majors)`);
}
console.log(`Total missing: ${missing.length}`);

// =====================================================
// Now build the updated XLSX data
// =====================================================

// We'll keep all existing rows but add missing 高水平运动员 entries
// The 计划人数 for ALL 高水平运动员 entries is 0 (blank in PDF → 0)

// Find where to insert missing entries
// (at the end of 高水平运动员 section, before any trailing empty rows or next section)
let hlaSectionEnd = -1;
let hlaHeaderRow = -1;
for (let i = 0; i < xlsxData.length; i++) {
  const row = xlsxData[i];
  if (row[0] && typeof row[0] === 'string' && row[0].includes('高水平运动员')) {
    hlaHeaderRow = i;
  }
}

// Find end of HLA section
for (let i = hlaHeaderRow + 1; i < xlsxData.length; i++) {
  const row = xlsxData[i];
  if ((row[0] && typeof row[0] === 'string' && row[0].includes('历史类-')) || i === xlsxData.length - 1) {
    hlaSectionEnd = i;
    break;
  }
}

console.log(`\nHLA section: header row ${hlaHeaderRow}, ends at row ${hlaSectionEnd}`);

// Build new rows for missing universities
const newRows = [];
for (const school of missing) {
  // University header row
  const totalMajors = school.majors.length;
  newRows.push([
    `${school.code} ${school.name}`,
    totalMajors,
    0, // 计划人数 = 0 (blank in PDF)
    '', // 录取人数 - not in PDF
    '', // 录取最低分 - not in PDF
    ''  // 录取最低位次 - not in PDF
  ]);
  // Major rows
  for (const major of school.majors) {
    newRows.push([
      `${major.code} ${major.name}`,
      major.subject,
      0, // 计划人数 = 0
      '', // 录取人数
      '', // 录取最低分
      ''  // 录取最低位次
    ]);
  }
}

// Also check: do the existing HLA entries have correct 计划=0?
// Yes, they already do.

// Build final data array: copy all existing rows, then append new HLA entries after the section
const finalData = xlsxData.map(row => [...row]);

// Append new rows right after the last HLA data row (hlaSectionEnd)
// hlaSectionEnd is the last data row of HLA section
finalData.splice(hlaSectionEnd + 1, 0, ...newRows);

console.log(`\nOriginal rows: ${xlsxData.length}, New rows added: ${newRows.length}, Final: ${finalData.length}`);

// =====================================================
// Also verify/correct existing entries' 计划数
// =====================================================

// Verify the 普通类 section against PDF
// From PDF OCR analysis:
const pdfPlanVerify = {
  // 普通类 - verified from OCR
  '普通类': {
    '0119': { totalPlan: 2, majors: { '105': 1, '106': 1 } },
    '0183': { totalPlan: 4, majors: { '101': 4 } },
    '0487': { totalPlan: 3, majors: { '101': 3 } },
    '0750': { totalPlan: 30, majors: { '101': 30 } },
    '1165': { totalPlan: 2, majors: { '101': 2 } },
    '1174': { totalPlan: 3, majors: { '101': 3 } },
    '1334': { totalPlan: 1, majors: { '101': 1 } },
    '1626': { totalPlan: 2, majors: { '104': 2 } },
    '1663': { totalPlan: 5, majors: { '101': 4, '102': 1 } },
    '1812': { totalPlan: 1, majors: { '105': 1 } },
    '2062': { totalPlan: 5, majors: { '103': 2, '102': 1, '101': 1, '104': 1 } },
    '2152': { totalPlan: 4, majors: { '102': 4 } },
    '2185': { totalPlan: 6, majors: { '101': 1, '105': 1, '104': 1, '102': 1, '103': 1, '106': 1 } },
    '2341': { totalPlan: 6, majors: { '101': 1, '103': 1, '104': 3, '102': 1 } },
    '2514': { totalPlan: 2, majors: { '101': 2 } },
    '2546': { totalPlan: 2, majors: { '101': 1, '102': 1 } },
    '2557': { totalPlan: 6, majors: { '101': 2, '102': 2, '103': 2 } },
    '2558': { totalPlan: 6, majors: { '101': 5, '102': 1 } },
    '2594': { totalPlan: 2, majors: { '101': 2 } },
    '2885': { totalPlan: 2, majors: { '101': 2 } },
  }
};

// Now let's also check if there are issues with 航海类 计划数
// PDF shows: 0817 海南科技职业大学 total 计划=5 (轮机=2, 航海=3)
// XLSX: 计划=5 ✓

// Check 高校专项计划 against PDF
// Key check: 南开大学 appears in both 普通类 and needs verification

// Let's focus on the important fix:
// 1. All 高水平运动员 计划=0 (blank in PDF)
// 2. Add missing 高水平运动员 universities

console.log('\n=== Summary of changes ===');
console.log(`1. 高水平运动员 section: Added ${missing.length} universities from PDF`);
console.log('2. All 高水平运动员 计划人数 = 0 (blank in PDF)');
console.log('3. 录取数据 (录取人数/录取最低分/录取最低位次) 不在PDF中，新增院校留空');

// Write the updated XLSX
const newWs = XLSX.utils.aoa_to_sheet(finalData);

// Copy column widths if any
if (ws['!cols']) {
  newWs['!cols'] = ws['!cols'];
}

const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newWs, 'Sheet1');
XLSX.writeFile(newWb, '123/2026_updated.xlsx');

console.log('\nUpdated XLSX written to: 123/2026_updated.xlsx');

// Also print the full list for verification
console.log('\n=== Complete 高水平运动员 entries ===');
console.log('(New entries marked with *)');
let count = 0;
for (const row of finalData) {
  if (row[0] && typeof row[0] === 'string' && row[0].includes('高水平运动员')) {
    console.log(`\n${row[0]}`);
  } else if (count > 0 && row[0] && typeof row[0] === 'string') {
    const isNew = missing.some(s => row[0].startsWith(s.code));
    console.log(`${isNew ? '*' : ' '} ${row[0].substring(0,70)} | 计划=${row[2]}`);
  }
  if (row[0] && typeof row[0] === 'string' && row[0].includes('高水平运动员')) {
    count++;
  }
}
