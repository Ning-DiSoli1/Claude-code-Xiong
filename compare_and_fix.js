const XLSX = require('xlsx');
const fs = require('fs');

// Read XLSX data
const wb = XLSX.readFile('123/2026.xlsx');
const ws = wb.Sheets['Sheet1'];
const xlsxData = XLSX.utils.sheet_to_json(ws, {header: 1});

console.log('=== Current XLSX Structure ===');
console.log('Total rows:', xlsxData.length);

// Analyze each section
let currentSection = '';
const sections = {};

for (let i = 0; i < xlsxData.length; i++) {
  const row = xlsxData[i];
  if (row[0] && typeof row[0] === 'string' && row[0].includes('历史类-本科提前批B段-')) {
    currentSection = row[0].replace('历史类-本科提前批B段-', '');
    sections[currentSection] = { start: i, header: i + 1, schools: [] };
    console.log(`\nSection: ${currentSection} (row ${i})`);
  }
}

// Extract school data
for (const [section, info] of Object.entries(sections)) {
  for (let i = info.header + 1; i < xlsxData.length; i++) {
    const row = xlsxData[i];
    if (!row[0] || row[0] === '') break;
    if (typeof row[0] === 'string' && row[0].includes('历史类-')) break;
    info.schools.push(row);
  }
  console.log(`${section}: ${info.schools.length} rows`);
}

// Now parse OCR text to extract PDF data
// Read OCR text files
const ocrTexts = {};
for (let p = 1; p <= 6; p++) {
  const txt = fs.readFileSync(`history_pages/page_${String(p).padStart(2,'0')}.txt`, 'utf8');
  ocrTexts[p] = txt;
}

// The PDF layout has 本科提前批B段 across pages 1-6
// Page 1 right column: 普通类 (start)
// Page 2 left column: 普通类 (continued)
// Page 2 right column: 普通类 (continued)
// Page 3 left column: 普通类 (end) → 航海类 → 高校专项计划
// Page 3 right column: 高校专项计划 (continued)
// Page 4: 高校专项计划 (continued)
// Page 5: 高校专项计划 (end) → 高水平运动队
// Page 6: 高水平运动队 (continued) → 本科提前批C段

// Let's extract all "计划" numbers from the PDF OCR that are blank/0
// High-level athletes section typically has blank or 0 计划数

console.log('\n=== Analyzing 高水平运动员 section ===');

// From the PDF, the 高水平运动队 section has many universities
// Let's compile a list from OCR pages 5-6

const highLevelAthletesFromPDF = [];

// Parse page 5 OCR for 高水平运动队 entries
// The section starts after "高 水 平 运动 队" marker
const page5Text = ocrTexts[5];
const page6Text = ocrTexts[6];

// Extract school codes and names from the PDF text
// Pattern: 4-digit code followed by university name
function extractSchoolsFromText(text, section) {
  const results = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // Match school codes (4 digits) followed by university name
    const schoolMatch = lines[i].match(/(\d{4})\s+(.+?)(?:（|\(|∣|\s+\d|\s*$)/);
    if (schoolMatch && schoolMatch[1].length === 4 && parseInt(schoolMatch[1]) >= 100) {
      const code = schoolMatch[1];
      const namePart = schoolMatch[2].trim();

      // Skip non-school lines
      if (namePart.includes('代码') || namePart.includes('院校') || namePart.length < 4) continue;

      // Look for major info in next line(s)
      const majorLines = [];
      for (let j = 1; j <= 5; j++) {
        if (i + j < lines.length) {
          const nextLine = lines[i + j].trim();
          if (nextLine.match(/^\d{3}\s/) || nextLine.includes('不限') || nextLine.includes('思想政治')) {
            majorLines.push(nextLine);
          } else if (nextLine.match(/^\d{4}\s/)) {
            break; // Next school
          }
        }
      }

      results.push({
        code,
        name: namePart,
        section,
        majors: majorLines
      });
    }
  }
  return results;
}

// Let's take a more manual approach given OCR quality issues
// Compile known universities from the 高水平运动队 section

console.log('\n--- OCR Text around 高水平运动队 ---');
// Find the section in page 5
const hlaIndex5 = page5Text.indexOf('高 水 平 运动');
const hlaIndex6 = page6Text.indexOf('高 水 平 运动');

if (hlaIndex5 >= 0) {
  console.log('Page 5 high-level athletes section:');
  console.log(page5Text.substring(hlaIndex5, hlaIndex5 + 3000));
}

if (hlaIndex6 >= 0) {
  console.log('\nPage 6 high-level athletes section:');
  console.log(page6Text.substring(0, Math.min(2000, page6Text.length)));
} else {
  // The section might continue from page 5 to page 6
  console.log('Page 6 (continuing from page 5):');
  console.log(page6Text.substring(0, 3000));
}

// Now let's also look at the structure more carefully
// The key issue: 计划数 (planned enrollment) column in PDF

console.log('\n=== Checking Specific XLSX Entries ===');

// Check 高水平运动员 entries
for (let i = 144; i < xlsxData.length; i++) {
  const row = xlsxData[i];
  console.log(`Row ${i}: ${JSON.stringify(row)}`);
}

// The plan for high-level athletes - where 计划数 is blank in PDF
// This should be 0 in XLSX, which is already the case

// Now let's verify the other sections match the PDF data
// Specifically check 计划人数 values

console.log('\n=== Verifying 普通类 计划数据 ===');
for (let i = 2; i < 59; i++) {
  const row = xlsxData[i];
  if (row[0] && row[0] !== '') {
    console.log(`Row ${i}: ${row[0].substring(0,60)} | 计划=${row[2]} | 录取=${row[3]}`);
  }
}

console.log('\n=== Verifying 航海类 计划数据 ===');
for (let i = 62; i < 65; i++) {
  const row = xlsxData[i];
  if (row[0] && row[0] !== '') {
    console.log(`Row ${i}: ${row[0].substring(0,60)} | 计划=${row[2]} | 录取=${row[3]}`);
  }
}

console.log('\n=== Verifying 高校专项计划 计划数据 ===');
for (let i = 68; i < 143; i++) {
  const row = xlsxData[i];
  if (row[0] && row[0] !== '') {
    console.log(`Row ${i}: ${row[0].substring(0,60)} | 计划=${row[2]} | 录取=${row[3]}`);
  }
}
