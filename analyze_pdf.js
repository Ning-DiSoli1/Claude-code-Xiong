const fs = require('fs');
const zlib = require('zlib');

const pdfPath = 'c:/Users/宁/Desktop/Myweb/W02025062408562025目录-物理类_351.pdf';
const pdf = fs.readFileSync(pdfPath);
const pdfStr = pdf.toString('latin1');

console.log('PDF size:', (pdf.length / 1024 / 1024).toFixed(1), 'MB');

// Find all xref sections
const xrefMatches = [...pdfStr.matchAll(/xref[\s\S]*?trailer/g)];
console.log('Number of xref sections:', xrefMatches.length);

// Find startxref offsets
const startxrefMatches = [...pdfStr.matchAll(/startxref\n(\d+)/g)];
const startxrefs = startxrefMatches.map(m => parseInt(m[1]));
console.log('startxref offsets:', startxrefs);

// Read last xref table (most complete)
const lastStartxref = startxrefs[startxrefs.length - 1];
console.log('\nLast xref at offset:', lastStartxref);

const chunk = pdfStr.substring(lastStartxref);
console.log('Chunk around last startxref:');
console.log(chunk.substring(0, 500));

// Find all /Type/Page objects
const pageRefs = [...pdfStr.matchAll(/\/Type\s*\/Page[^s]/g)];
console.log('\n/Type/Page occurrences:', pageRefs.length);

// Find all /Count entries for pages
const countMatches = [...pdfStr.matchAll(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/g)];
countMatches.forEach(m => {
  console.log('Pages Count:', m[1], 'at offset', m.index);
});

// Find /MediaBox entries
const mediaMatches = [...pdfStr.matchAll(/\/MediaBox\s*\[\s*([\d.\s]+)\]/g)];
console.log('\nMediaBox entries:', mediaMatches.length);
if (mediaMatches.length > 0 && mediaMatches.length <= 20) {
  mediaMatches.forEach(m => console.log('  MediaBox:', m[1]));
}

// Try to list objects for each xref section
console.log('\n--- Trying to enumerate pages ---');

// Parse the last xref table
function parseXref(xrefSection) {
  const lines = xrefSection.split('\n').filter(l => l.match(/^\d{10} \d{5} [nf]/));
  return lines.map(line => {
    const offset = parseInt(line.substring(0, 10));
    const gen = parseInt(line.substring(11, 16));
    const type = line[17];
    return { offset, gen, type };
  });
}

// Find all xref sections properly
let xrefIdx = 0;
const allXrefEntries = [];
let pos = 0;
while ((pos = pdfStr.indexOf('xref', pos)) !== -1) {
  xrefIdx++;
  const trailerPos = pdfStr.indexOf('trailer', pos);
  if (trailerPos === -1) break;
  const section = pdfStr.substring(pos + 4, trailerPos);
  const entries = parseXref(section);
  allXrefEntries.push({ index: xrefIdx, count: entries.length, pos, entries });
  pos = trailerPos + 8;
}

console.log('\nXref sections:', allXrefEntries.map(x => ({ index: x.index, count: x.count, pos: x.pos })));

// Try to find all distinct Page objects by their object numbers
// Look for "N 0 obj ... /Type/Page"
const pageObjMatches = [...pdfStr.matchAll(/(\d+) \d+ obj[\s\S]*?\/Type\s*\/Page[^s]/g)];
console.log('\nPage objects found:', pageObjMatches.length);

// Also look for page object references in the pages tree
const kidsMatches = [...pdfStr.matchAll(/\/Kids\s*\[([^\]]*)\]/g)];
console.log('\nKids arrays found:', kidsMatches.length);
kidsMatches.forEach(m => {
  const kids = m[1].trim();
  const refs = kids.match(/(\d+ \d+ R)/g) || [];
  console.log('  Kids count:', refs.length, '-', kids.substring(0, 100));
});

// Find largest /Count for pages
let maxCount = 0;
pdfStr.replace(/\/Count\s+(\d+)/g, (m, n) => {
  const v = parseInt(n);
  if (v > maxCount) maxCount = v;
});
console.log('\nMax /Count value found:', maxCount);
