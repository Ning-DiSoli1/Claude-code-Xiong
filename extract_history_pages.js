const fs = require('fs');
const zlib = require('zlib');
const sharp = require('sharp');

const pdfPath = '123/W02025062408572025目录-历史类 (1)_10.pdf';
const pdf = fs.readFileSync(pdfPath);
const latin1 = pdf.toString('latin1');

// Image objects for pages 1-6: 6, 10, 14, 18, 22, 26
const imageObjNums = [6, 10, 14, 18, 22, 26];

const outDir = 'c:/Users/宁/Desktop/Myweb/history_pages';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

async function extractAll() {
  for (let idx = 0; idx < imageObjNums.length; idx++) {
    const objNum = imageObjNums[idx];
    const pageNum = idx + 1;

    const imgPattern = new RegExp(`${objNum} \\d+ obj[\\s\\S]*?stream\\n([\\s\\S]*?)endstream`);
    const imgMatch = latin1.match(imgPattern);

    if (!imgMatch) {
      console.log(`Page ${pageNum}: Image obj ${objNum} stream not found`);
      continue;
    }

    const headerPattern = new RegExp(`${objNum} \\d+ obj([\\s\\S]*?)stream`);
    const headerMatch = latin1.match(headerPattern);
    const header = headerMatch ? headerMatch[1] : '';

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

      // Save at 2x for better OCR quality
      await sharp(decompressed, {
        raw: { width, height, channels }
      })
      .resize({ width: width * 2, height: height * 2, kernel: 'lanczos2' })
      .png()
      .toFile(`${outDir}/page_${String(pageNum).padStart(2,'0')}.png`);

      console.log(`  -> Saved page_${String(pageNum).padStart(2,'0')}.png`);
    } catch (err) {
      console.log(`Page ${pageNum}: Error - ${err.message}`);
    }
  }
  console.log('Done extracting all history pages.');
}

extractAll().catch(err => console.error(err));
