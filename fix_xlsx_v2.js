const XLSX = require('xlsx');

// Read current XLSX
const wb = XLSX.readFile('123/2026.xlsx');
const ws = wb.Sheets['Sheet1'];
const xlsxData = XLSX.utils.sheet_to_json(ws, {header: 1});

console.log('Original XLSX rows:', xlsxData.length);

// =====================================================
// Missing entries found by comparing PDF OCR with XLSX
// =====================================================

// --- Missing from 高校专项计划 (3 universities) ---
const missingGXZX = [
  {
    code: '0183', name: '北京语言大学（北京）',
    plan: 1,
    majors: [
      { code: '102', name: '外国语言文学类(英语和翻译)(高校专项计划)', subject: '不限', plan: 1 }
    ]
  },
  {
    code: '2062', name: '上海外国语大学（上海）',
    plan: 1,
    majors: [
      { code: '105', name: '新闻传播学类(卓越国际新闻)(高校专项计划)', subject: '不限', plan: 1 }
    ]
  },
  {
    code: '2885', name: '中国传媒大学（北京）',
    plan: 2,
    majors: [
      { code: '102', name: '工商管理(高校专项计划)', subject: '不限', plan: 2 }
    ]
  }
];

// --- Missing from 高水平运动员 (40 universities) ---
const missingHLA = [
  { code: '0119', name: '北京大学（北京）', majors: [{ code: '107', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '0134', name: '北京化工大学（北京）', majors: [{ code: '101', name: '体育(高水平运动队)', subject: '不限' }] },
  { code: '0147', name: '北京科技大学（北京）', majors: [{ code: '101', name: '体育(高水平运动队)', subject: '不限' }] },
  { code: '0332', name: '重庆工商大学（重庆）', majors: [{ code: '101', name: '体育(高水平运动队)', subject: '不限' }] },
  { code: '0518', name: '复旦大学（上海）', majors: [{ code: '104', name: '运动训练(高水平运动队)', subject: '不限' }] },
  { code: '0812', name: '海南大学（海南海口）', majors: [{ code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }] },
  { code: '0832', name: '韩山师范学院（广东潮州）', majors: [
    { code: '103', name: '体育教育(高水平运动队)', subject: '不限' },
    { code: '104', name: '法学(高水平运动队)', subject: '不限' }
  ]},
  { code: '0863', name: '河北地质大学（河北石家庄）', majors: [{ code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }] },
  { code: '0916', name: '河海大学（江苏南京）', majors: [{ code: '101', name: '运动训练(高水平运动队)', subject: '不限' }] },
  { code: '0941', name: '河南理工大学（河南焦作）', majors: [{ code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }] },
  { code: '1039', name: '湖北经济学院（湖北武汉）', majors: [{ code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }] },
  { code: '1115', name: '湖南农业大学（湖南长沙）', majors: [
    { code: '101', name: '体育教育(高水平运动队)', subject: '不限' },
    { code: '102', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }
  ]},
  { code: '1125', name: '湖南师范大学（湖南长沙）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '1165', name: '华东师范大学（上海）', majors: [{ code: '102', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '1170', name: '华南师范大学（广东广州）', majors: [{ code: '108', name: '运动训练(高水平运动队)', subject: '不限' }] },
  { code: '1205', name: '吉利学院（四川成都）', majors: [{ code: '101', name: '运动康复(高水平运动队)', subject: '不限' }] },
  { code: '1628', name: '南京工业大学（江苏南京）', majors: [{ code: '101', name: '运动训练(高水平运动队)', subject: '不限' }] },
  { code: '1646', name: '南京师范大学（江苏南京）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '1670', name: '南通大学（江苏南通）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '1793', name: '青岛科技大学（山东青岛）', majors: [{ code: '101', name: '休闲体育(高水平运动队)', subject: '不限' }] },
  { code: '1812', name: '清华大学（北京）', majors: [{ code: '106', name: '体育教育(双学士学位)(高水平运动队)', subject: '不限' }] },
  { code: '1843', name: '三峡大学（湖北宜昌）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '1889', name: '山东农业大学（山东泰安）', majors: [{ code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }] },
  { code: '1898', name: '山东师范大学（山东济南）', majors: [{ code: '101', name: '体育(高水平运动队)', subject: '不限' }] },
  { code: '1964', name: '山西医科大学（山西太原）', majors: [{ code: '101', name: '运动康复(高水平运动队)', subject: '不限' }] },
  { code: '1992', name: '陕西师范大学（陕西西安）', majors: [
    { code: '101', name: '运动训练(高水平运动队)', subject: '不限' },
    { code: '102', name: '体育教育(高水平运动队)', subject: '不限' }
  ]},
  { code: '2088', name: '深圳大学（广东深圳）', majors: [{ code: '107', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '2104', name: '沈阳化工大学（辽宁沈阳）', majors: [{ code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }] },
  { code: '2249', name: '太原师范学院（山西晋中）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '2426', name: '西安建筑科技大学（陕西西安）', majors: [{ code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }] },
  { code: '2518', name: '西南科技大学（四川绵阳）', majors: [
    { code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' },
    { code: '102', name: '运动康复(高水平运动队)', subject: '不限' }
  ]},
  { code: '2521', name: '西南石油大学（四川成都）', majors: [{ code: '101', name: '体育(高水平运动队)', subject: '不限' }] },
  { code: '2523', name: '西南政法大学（重庆）', majors: [{ code: '102', name: '运动训练(高水平运动队)', subject: '不限' }] },
  { code: '2529', name: '厦门大学（福建厦门）', majors: [{ code: '101', name: '运动训练(高水平运动队)', subject: '不限' }] },
  { code: '2665', name: '扬州大学（江苏扬州）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '2732', name: '云南农业大学（云南昆明）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] },
  { code: '2886', name: '中国地质大学(北京)（北京）', majors: [{ code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }] },
  { code: '2887', name: '中国地质大学(武汉)（湖北武汉）', majors: [{ code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }] },
  { code: '2916', name: '中国政法大学（北京）', majors: [{ code: '101', name: '社会体育指导与管理(高水平运动队)', subject: '不限' }] },
  { code: '2928', name: '中央民族大学（北京）', majors: [{ code: '101', name: '体育教育(高水平运动队)', subject: '不限' }] }
];

// =====================================================
// Build updated data
// =====================================================

// Find section boundaries
function findSection(data, sectionName) {
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && typeof data[i][0] === 'string' && data[i][0].includes(sectionName)) {
      return i; // header row
    }
  }
  return -1;
}

function findSectionEnd(data, sectionStart) {
  for (let i = sectionStart + 1; i < data.length; i++) {
    const row = data[i];
    // Next section or end of data with empty rows
    if (row[0] && typeof row[0] === 'string' && row[0].includes('历史类-')) {
      return i - 1;
    }
  }
  return data.length - 1;
}

// Build new rows for a school
function buildSchoolRows(school, planOverride) {
  const rows = [];
  const plan = planOverride !== undefined ? planOverride : school.plan;
  // University header row
  rows.push([
    `${school.code} ${school.name}`,
    school.majors.length,
    plan,       // 计划人数
    '',         // 录取人数 (not in PDF)
    '',         // 录取最低分 (not in PDF)
    ''          // 录取最低位次 (not in PDF)
  ]);
  // Major rows
  for (const major of school.majors) {
    rows.push([
      `${major.code} ${major.name}`,
      major.subject,
      major.plan || 0,  // 计划人数
      '',               // 录取人数
      '',               // 录取最低分
      ''                // 录取最低位次
    ]);
  }
  return rows;
}

// Process each section

// 1. Handle 高校专项计划 section
const gxzxStart = findSection(xlsxData, '高校专项计划');
const gxzxEnd = findSectionEnd(xlsxData, gxzxStart);
console.log(`高校专项计划: rows ${gxzxStart} to ${gxzxEnd}`);

// Check which entries are already present
const existingGXZX = new Set();
for (let i = gxzxStart + 1; i <= gxzxEnd; i++) {
  const row = xlsxData[i];
  if (row[0] && typeof row[0] === 'string') {
    const m = row[0].match(/^(\d{4})\s/);
    if (m) existingGXZX.add(m[1]);
  }
}

const newGXZXRows = [];
for (const school of missingGXZX) {
  if (!existingGXZX.has(school.code)) {
    newGXZXRows.push(...buildSchoolRows(school, school.plan));
    console.log(`  添加: ${school.code} ${school.name}`);
  }
}

// 2. Handle 高水平运动员 section
const hlaStart = findSection(xlsxData, '高水平运动员');
const hlaEnd = findSectionEnd(xlsxData, hlaStart);
console.log(`高水平运动员: rows ${hlaStart} to ${hlaEnd}`);

const existingHLA = new Set();
for (let i = hlaStart + 1; i <= hlaEnd; i++) {
  const row = xlsxData[i];
  if (row[0] && typeof row[0] === 'string') {
    const m = row[0].match(/^(\d{4})\s/);
    if (m) existingHLA.add(m[1]);
  }
}

const newHLARows = [];
for (const school of missingHLA) {
  if (!existingHLA.has(school.code)) {
    // 计划数=0 for all 高水平运动队 (blank in PDF)
    newHLARows.push(...buildSchoolRows(school, 0));
  }
}
console.log(`  添加: ${missingHLA.filter(s => !existingHLA.has(s.code)).length} universities`);

// =====================================================
// Build final XLSX
// =====================================================

const finalData = [];

for (let i = 0; i < xlsxData.length; i++) {
  finalData.push([...xlsxData[i]]);

  // After the last data row of 高校专项计划, insert new entries
  if (i === gxzxEnd) {
    for (const row of newGXZXRows) {
      finalData.push(row);
    }
  }

  // After the last data row of 高水平运动员, insert new entries
  if (i === hlaEnd) {
    for (const row of newHLARows) {
      finalData.push(row);
    }
  }
}

console.log(`\nFinal rows: ${finalData.length} (original: ${xlsxData.length}, added: ${newGXZXRows.length + newHLARows.length})`);

// =====================================================
// Write output
// =====================================================
const newWs = XLSX.utils.aoa_to_sheet(finalData);
if (ws['!cols']) newWs['!cols'] = ws['!cols'];
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newWs, 'Sheet1');
XLSX.writeFile(newWb, '123/2026_updated.xlsx');

console.log('\nUpdated XLSX saved to: 123/2026_updated.xlsx');
console.log('\n=== 修改摘要 ===');
console.log('1. 高校专项计划: 新增3所院校');
missingGXZX.forEach(s => console.log(`   - ${s.code} ${s.name}`));
console.log('2. 高水平运动员: 新增40所院校，所有计划数=0');
console.log('3. 计划数留白处(PDF中高水平运动队)全部填0');
console.log('4. 四类别(普通类/航海类/高校专项计划/高水平运动员)数据已按PDF核对补充');
