const { readCandidateProfile } = require('./candidate-profile');
const candidate = readCandidateProfile(process.argv[2] || process.env.CANDIDATE_CONFIG);
const XLSX = require('xlsx');

// Read workbook
const wb = XLSX.readFile('2026志愿填报样表（V4.0） (1).xlsx');

// ==================== STEP 1: Fill 考生基本信息 ====================
const infoSheet = wb.Sheets['考生基本信息'];

infoSheet['B2'] = { t: 's', v: candidate.name };
infoSheet['D2'] = { t: 's', v: candidate.ethnicity };
infoSheet['F2'] = { t: 's', v: candidate.subjectCombination };
infoSheet['B3'] = { t: 's', v: candidate.gender };
infoSheet['F3'] = { t: 's', v: candidate.region };
infoSheet['B9'] = { t: 's', v: candidate.subjects[0] };
infoSheet['B10'] = { t: 's', v: candidate.subjects[1] };
infoSheet['B11'] = { t: 's', v: candidate.subjects[2] };
infoSheet['B13'] = { t: 'n', v: candidate.totalScore };
infoSheet['D13'] = { t: 'n', v: candidate.rank };

// ==================== STEP 2: Filter all compatible entries ====================
const planSheet = wb.Sheets['普通批招生计划总计280165人'];
const planData = XLSX.utils.sheet_to_json(planSheet, {header: 1});

const compatible = ['不限', '化学', '化学和地理', '地理'];

let allEntries = [];
planData.slice(2).forEach(row => {
  const batch = row[3] || '';
  const subjectReq = row[14] || '';
  const preferred = row[1] || '';

  if (preferred !== '物理') return;
  if (batch.includes('提前批') || batch.includes('高职')) return;
  if (!compatible.includes(subjectReq)) return;

  allEntries.push({
    preferred: row[1],
    code: row[2],
    batch: batch,
    nature: row[4],
    schoolCode: String(row[5] || ''),
    schoolName: row[6],
    schoolFull: row[7],
    province: row[8],
    city: row[9],
    examType: row[10],
    majorCode: String(row[11] || ''),
    majorName: row[12],
    majorFull: row[13],
    subjectReq: row[14],
    planCount: parseInt(row[15]) || 0,
    language: row[16],
    duration: row[17],
    tuition: row[18]
  });
});

console.log('Total compatible entries:', allEntries.length);

// ==================== STEP 3: Define volunteer tiers ====================
const tier985 = ['四川大学', '重庆大学', '中南大学', '湖南大学', '东北大学', '东北大学秦皇岛分校', '大连理工大学', '大连理工大学(盘锦校区)', '兰州大学', '西北农林科技大学', '中国海洋大学', '中央民族大学', '中国农业大学'];
const tierStrong211 = ['西南交通大学', '西安电子科技大学', '武汉理工大学', '河海大学', '苏州大学', '暨南大学', '西南财经大学', '中南财经政法大学', '华中师范大学', '陕西师范大学', '中国矿业大学', '中国矿业大学(北京)', '中国地质大学(武汉)', '中国地质大学(北京)', '华中农业大学', '南京农业大学', '北京林业大学', '东北师范大学', '华南师范大学', '湖南师范大学'];
const tierAvg211 = ['贵州大学', '海南大学', '广西大学', '云南大学', '南昌大学', '福州大学', '郑州大学', '合肥工业大学', '合肥工业大学(宣城校区)', '西南大学', '西南大学(荣昌校区)', '长安大学', '太原理工大学', '江南大学', '安徽大学', '辽宁大学'];
const tierWeak211 = ['石河子大学', '新疆大学', '宁夏大学', '青海大学', '内蒙古大学', '西藏大学', '延边大学', '东北农业大学', '东北林业大学'];
const tierGoodProvincial = ['贵州医科大学', '遵义医科大学', '北方民族大学', '西北民族大学', '中南民族大学', '西南民族大学', '大连民族大学', '贵州师范大学', '贵州财经大学', '贵州民族大学', '贵州中医药大学', '贵州理工学院', '上海应用技术大学', '福建理工大学', '江苏科技大学', '天津城建大学', '天津商业大学'];
const tierLocal = ['贵阳学院', '遵义师范学院', '铜仁学院', '安顺学院', '凯里学院', '六盘水师范学院', '黔南民族师范学院', '兴义民族师范学院', '贵州师范学院', '贵州商学院', '贵州工程应用技术学院', '茅台学院', '贵阳康养职业大学', '贵州交通职业大学'];
const tierIndependent = ['贵州中医药大学时珍学院', '贵阳信息科技学院', '贵阳人文科技学院', '遵义医科大学医学与科技学院', '贵州黔南经济学院', '贵州黔南科技学院', '贵州医科大学神奇民族医药学院', '贵州轻工职业大学'];

function getTierCategory(schoolName) {
  if (tier985.includes(schoolName)) return '985';
  if (tierStrong211.includes(schoolName)) return '强211';
  if (tierAvg211.includes(schoolName)) return '211';
  if (tierWeak211.includes(schoolName)) return '偏远211';
  if (tierGoodProvincial.includes(schoolName)) return '省重点';
  if (tierLocal.includes(schoolName)) return '本地公办';
  if (tierIndependent.includes(schoolName)) return '独立学院';
  return '其他';
}

// Build school lookup
const schoolMap = {};
allEntries.forEach(e => {
  if (!schoolMap[e.schoolName]) schoolMap[e.schoolName] = [];
  schoolMap[e.schoolName].push(e);
});

function selectFromTier(tierList, preferMajorKeywords = [], excludeMajorKeywords = [], maxPerSchool = 5) {
  let selected = [];
  tierList.forEach(schoolName => {
    const entries = schoolMap[schoolName];
    if (!entries) return;

    let candidates = [...entries];

    // Deduplicate by major name
    const seenMajors = new Set();
    candidates = candidates.filter(e => {
      if (seenMajors.has(e.majorName)) return false;
      seenMajors.add(e.majorName);
      return true;
    });

    // Sort by preference
    candidates.sort((a, b) => {
      const aPref = (preferMajorKeywords.some(k => a.majorName.includes(k)) || a.majorName.includes('预科')) ? 1 : 0;
      const bPref = (preferMajorKeywords.some(k => b.majorName.includes(k)) || b.majorName.includes('预科')) ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
      return b.planCount - a.planCount;
    });

    candidates = candidates.filter(e => !excludeMajorKeywords.some(k => e.majorName.includes(k)));
    selected.push(...candidates.slice(0, maxPerSchool));
  });
  return selected;
}

// ==================== STEP 4: Build volunteer list ====================
// 冲 (Reach) ~rank 8000-16000: 20 slots
// 稳 (Match) ~rank 14000-25000: 36 slots
// 保 (Safety) ~rank 20000-45000: 40 slots
// Total: 96 slots

let rushVols = [];   // 冲
let matchVols = [];  // 稳
let safeVols = [];   // 保

// ===== 冲 (Reach): target 20 slots =====
// 少数民族预科 at 985/强211 - lower admission bar
['北京邮电大学', '北京林业大学', '大连理工大学', '长安大学', '湖南大学', '中央民族大学', '中国地质大学(北京)', '中国矿业大学(北京)'].forEach(name => {
  const entries = schoolMap[name] || [];
  const prep = entries.filter(e => e.majorName.includes('预科'));
  rushVols.push(...prep.slice(0, 1));
});

// 985分校 - slightly lower bar
rushVols.push(...selectFromTier(['东北大学秦皇岛分校', '大连理工大学(盘锦校区)'],
  ['计算机', '电气', '自动化', '电子信息', '机械'], [], 1));

// Strong 211 hot majors
rushVols.push(...selectFromTier(['西南交通大学', '武汉理工大学', '河海大学', '合肥工业大学'],
  ['计算机', '电气', '自动化', '电子信息', '软件', '人工智能', '机械', '交通运输'],
  [], 1));

// Average 211 popular majors
rushVols.push(...selectFromTier(['贵州大学', '海南大学', '广西大学', '云南大学', '南昌大学', '福州大学', '西南大学', '长安大学'],
  ['计算机', '电气', '电子信息', '自动化', '软件', '数据', '人工智能', '法学', '临床医学'],
  [], 2));

rushVols = rushVols.slice(0, 20);
console.log('冲:', rushVols.length);

// ===== 稳 (Match): target 36 slots =====
// 贵州大学 broad selection
matchVols.push(...selectFromTier(['贵州大学'],
  ['计算机', '电气', '电子信息', '机械', '土木', '材料', '化工', '药学', '数学', '化学', '大数据', '测绘', '环境', '食品', '农业', '测控'],
  [], 10));

// 西南大学(荣昌校区)
matchVols.push(...selectFromTier(['西南大学(荣昌校区)'],
  ['计算机', '动物医学', '水产', '食品', '信息'], [], 3));

// Weaker 211 schools - good match for this rank
matchVols.push(...selectFromTier(['石河子大学', '新疆大学', '宁夏大学', '青海大学', '内蒙古大学', '延边大学', '东北农业大学', '东北林业大学'],
  ['计算机', '电气', '电子信息', '机械', '土木', '化工', '药学', '临床', '软件', '自动化', '数据', '测绘'],
  [], 2));

// 少数民族预科
['北京建筑大学', '上海海事大学', '天津理工大学', '北京中医药大学'].forEach(name => {
  const entries = schoolMap[name] || [];
  const prep = entries.filter(e => e.majorName.includes('预科'));
  matchVols.push(...prep.slice(0, 1));
});

// Ethnic universities (Miao minority - favorable policies, good match)
matchVols.push(...selectFromTier(['北方民族大学', '西北民族大学', '中南民族大学', '西南民族大学', '大连民族大学'],
  ['计算机', '电气', '电子信息', '软件', '自动化', '机械', '数据', '法学', '会计', '预科'],
  [], 3));

// 贵州医科大学+遵义医科大学 (good provincial)
matchVols.push(...selectFromTier(['贵州医科大学', '遵义医科大学'],
  ['临床', '口腔', '麻醉', '药学', '医学影像', '预防医学'],
  ['护理', '助产'], 2));

matchVols = matchVols.slice(0, 36);
console.log('稳:', matchVols.length);

// ===== 保 (Safety): target 40 slots =====
// Guizhou provincial key universities
safeVols.push(...selectFromTier(['贵州师范大学', '贵州财经大学', '贵州民族大学', '贵州中医药大学', '贵州理工学院', '贵阳学院'],
  ['计算机', '软件', '数学', '统计', '会计', '财务管理', '法学', '英语', '大数据', '人工智能',
   '化学', '药学', '中药', '土木', '机械', '电气'],
  [], 3));

// More local Guizhou universities
safeVols.push(...selectFromTier(['遵义师范学院', '铜仁学院', '安顺学院', '凯里学院', '六盘水师范学院',
  '黔南民族师范学院', '兴义民族师范学院', '贵州师范学院', '贵州商学院', '贵州工程应用技术学院'],
  ['计算机', '数学', '化学', '物理', '地理', '汉语言', '英语', '会计', '大数据', '学前教育'],
  [], 2));

// Good provincial universities out-of-province
safeVols.push(...selectFromTier(['上海应用技术大学', '福建理工大学', '江苏科技大学', '天津城建大学', '天津商业大学'],
  ['计算机', '电气', '机械', '土木', '化工', '软件', '数据', '环境'],
  [], 2));

// Independent colleges
safeVols.push(...selectFromTier(['贵州中医药大学时珍学院', '贵阳信息科技学院', '贵阳人文科技学院',
  '遵义医科大学医学与科技学院', '贵州黔南经济学院', '贵州黔南科技学院', '贵州医科大学神奇民族医药学院'],
  ['临床', '护理', '药学', '计算机', '会计', '财务管理', '法学'],
  [], 2));

// Special schools
safeVols.push(...selectFromTier(['茅台学院', '贵阳康养职业大学', '贵州交通职业大学', '铜仁职业技术大学', '贵州警察学院'],
  [], [], 2));

safeVols = safeVols.slice(0, 40);
console.log('保:', safeVols.length);

// Combine
let volunteers = [...rushVols, ...matchVols, ...safeVols];
console.log('Total:', volunteers.length, '(冲' + rushVols.length + '/稳' + matchVols.length + '/保' + safeVols.length + ')');

// ==================== STEP 5: Fill 本科普通批次表 ====================
const batchSheet = wb.Sheets['本科普通批次表'];

// Fill slots: left 1-48 (xlsx rows 6-53), right 49-96 (xlsx rows 6-53)
function fillSlot(slotNum, entry) {
  // Determine row (1-indexed xlsx row)
  // Slot 1 -> row 6, Slot 48 -> row 53
  // Slot 49 -> row 6 (right side), Slot 96 -> row 53 (right side)
  let row, colPrefix;
  if (slotNum <= 48) {
    row = 5 + slotNum; // xlsx row number
    colPrefix = ['A','B','C','D','E','F','G','H','I'];
  } else {
    row = 5 + (slotNum - 48);
    colPrefix = ['M','N','O','P','Q','R','S','T','U'];
  }

  const schoolCodeName = entry.schoolCode + entry.schoolName;
  const values = [
    slotNum,                    // 志愿号
    schoolCodeName,             // 院校代码及名称
    entry.schoolName,           // 院校名称
    entry.schoolCode,           // 院校代码
    entry.majorCode,            // 专业代码
    entry.schoolCode + '-' + entry.majorCode, // 院校代码-专业代码
    entry.majorName,            // 专业名称
    entry.subjectReq,           // 选科要求
    entry.planCount             // 26年招生计划
  ];

  values.forEach((v, i) => {
    const cellRef = colPrefix[i] + row;
    const cellType = (typeof v === 'number') ? 'n' : 's';
    batchSheet[cellRef] = { t: cellType, v: v };
  });
}

// Fill all volunteers
volunteers.slice(0, 96).forEach((entry, idx) => {
  fillSlot(idx + 1, entry);
});

console.log('Filled', Math.min(volunteers.length, 96), 'slots in 本科普通批次表');

// ==================== STEP 6: Fill QZY数据 with all compatible entries ====================
const qzySheet = wb.Sheets['QZY数据'];
qzySheet['A1'] = { t: 's', v: '序号' };
qzySheet['B1'] = { t: 's', v: '首选科目' };
qzySheet['C1'] = { t: 's', v: '院校代码' };
qzySheet['D1'] = { t: 's', v: '院校名称' };
qzySheet['E1'] = { t: 's', v: '省份' };
qzySheet['F1'] = { t: 's', v: '专业代码' };
qzySheet['G1'] = { t: 's', v: '专业名称' };
qzySheet['H1'] = { t: 's', v: '再选科目要求' };
qzySheet['I1'] = { t: 's', v: '计划人数' };
qzySheet['J1'] = { t: 's', v: '学制' };
qzySheet['K1'] = { t: 's', v: '学费' };
qzySheet['L1'] = { t: 's', v: '性质' };
qzySheet['M1'] = { t: 's', v: '推荐档次' };

allEntries.forEach((entry, idx) => {
  const row = idx + 2;
  qzySheet['A' + row] = { t: 'n', v: idx + 1 };
  qzySheet['B' + row] = { t: 's', v: entry.preferred };
  qzySheet['C' + row] = { t: 's', v: entry.schoolCode };
  qzySheet['D' + row] = { t: 's', v: entry.schoolName };
  qzySheet['E' + row] = { t: 's', v: entry.city };
  qzySheet['F' + row] = { t: 's', v: entry.majorCode };
  qzySheet['G' + row] = { t: 's', v: entry.majorName };
  qzySheet['H' + row] = { t: 's', v: entry.subjectReq };
  qzySheet['I' + row] = { t: 'n', v: entry.planCount };
  qzySheet['J' + row] = { t: 's', v: entry.duration };
  qzySheet['K' + row] = { t: 'n', v: entry.tuition || 0 };
  qzySheet['L' + row] = { t: 's', v: entry.nature };
  qzySheet['M' + row] = { t: 's', v: getTierCategory(entry.schoolName) };
});

console.log('Filled QZY数据 with', allEntries.length, 'entries');

// ==================== STEP 7: Save ====================
const outPath = '2026志愿填报_已填充.xlsx';
XLSX.writeFile(wb, outPath);
console.log('Saved to:', outPath);
console.log('Done!');
