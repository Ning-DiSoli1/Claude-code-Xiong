const fs = require('fs');
const zlib = require('zlib');
const sharp = require('sharp');

const pdfPath = 'c:/Users/宁/Desktop/Myweb/W02025062408562025目录-物理类_351.pdf';
const pdf = fs.readFileSync(pdfPath);
const latin1 = pdf.toString('latin1');

// Extract all 37 page images
// Image objects for pages: 6, 10, 14, 18, ..., 150
const imageObjNums = [];
for (let i = 6; i <= 150; i += 4) {
  imageObjNums.push(i);
}

console.log('Extracting all 37 page images...');

async function extractAll() {
  for (let idx = 0; idx < imageObjNums.length; idx++) {
    const objNum = imageObjNums[idx];
    const pageNum = idx + 1;

    // Find the image object
    const imgPattern = new RegExp(`${objNum} \\d+ obj[\\s\\S]*?stream\\n([\\s\\S]*?)endstream`);
    const imgMatch = latin1.match(imgPattern);

    if (!imgMatch) {
      console.log(`Page ${pageNum}: Image obj ${objNum} stream not found`);
      continue;
    }

    // Get image parameters from header
    const headerPattern = new RegExp(`${objNum} \\d+ obj([\\s\\S]*?)stream`);
    const headerMatch = latin1.match(headerPattern);
    const header = headerMatch ? headerMatch[1] : '';

    // Parse width, height, colorspace
    const wMatch = header.match(/\/Width\s+(\d+)/);
    const hMatch = header.match(/\/Height\s+(\d+)/);
    const csMatch = header.match(/\/ColorSpace\s*\/Device(\w+)/);

    const width = wMatch ? parseInt(wMatch[1]) : 0;
    const height = hMatch ? parseInt(hMatch[1]) : 0;
    const channels = (csMatch && csMatch[1] === 'RGB') ? 3 : 1;

    const streamData = Buffer.from(imgMatch[1], 'latin1');

    try {
      const decompressed = zlib.inflateSync(streamData);
      console.log(`Page ${pageNum}: ${width}x${height}, ${channels}ch, raw=${decompressed.length}B, expected=${width*height*channels}B`);

      // Save small version for OCR (50% of original)
      await sharp(decompressed, {
        raw: { width, height, channels }
      })
      .resize({ width: Math.round(width * 0.5) })
      .png()
      .toFile(`c:/Users/宁/Desktop/Myweb/pages/page_${String(pageNum).padStart(2,'0')}.png`);

    } catch (err) {
      console.log(`Page ${pageNum}: Error - ${err.message}`);
    }
  }
  console.log('Done extracting all pages.');
}

const fs2 = require('fs');
if (!fs2.existsSync('c:/Users/宁/Desktop/Myweb/pages')) {
  fs2.mkdirSync('c:/Users/宁/Desktop/Myweb/pages');
}
extractAll().catch(err => console.error(err));
