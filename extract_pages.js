const fs = require('fs');
const zlib = require('zlib');

const pdfPath = 'c:/Users/宁/Desktop/Myweb/W02025062408562025目录-物理类_351.pdf';
const pdf = fs.readFileSync(pdfPath);

// Find all page objects and their image streams
// Page objects: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52
// Actually from kids: 4 0 R, 8 0 R, etc.

// Map object numbers to their byte offsets
const objOffsets = {};
const regex = /(\d+) (\d+) obj/g;
let match;
while ((match = regex.exec(pdf.toString('latin1'))) !== null) {
  objOffsets[parseInt(match[1])] = match.index;
}

// Also map objects more precisely by scanning
const latin1 = pdf.toString('latin1');

// For each page object (4, 8, 12, ..., 148), find the image stream
const pageObjNums = [];
for (let i = 4; i <= 148; i += 4) {
  pageObjNums.push(i);
}

console.log('Looking for page objects:', pageObjNums.join(', '));

// Find all "N 0 obj" entries and their content
// We need to find the image XObject for each page
// Format: /KSPX1 N 0 R (where N is the image object number)
// Then the image object: N 0 obj << /Type/XObject/Subtype/Image ... >> stream ... endstream

// Let's find all image objects
const imageObjPattern = /(\d+) \d+ obj\s*<<[^>]*\/Type\s*\/XObject\s*\/Subtype\s*\/Image[^>]*>>/g;
const imageObjs = [];
while ((match = imageObjPattern.exec(latin1)) !== null) {
  imageObjs.push(parseInt(match[1]));
}
console.log('Image objects found:', imageObjs.length, '-', imageObjs.join(', '));

// For each page, find its image reference
const pageImageMap = {};
for (const pageNum of pageObjNums) {
  // Find this page object
  const pagePattern = new RegExp(`${pageNum} \\d+ obj[\\s\\S]*?/Type\\s*/Page[^s][\\s\\S]*?endobj`);
  const pageMatch = latin1.match(pagePattern);
  if (pageMatch) {
    // Find the XObject reference in the page
    const xobjMatch = pageMatch[0].match(/\/(\w+)\s+(\d+) \d+ R.*?\/Subtype\s*\/Image/);
    if (!xobjMatch) {
      // Try another pattern
      const xobjMatch2 = pageMatch[0].match(/\/XObject\s*<<\s*\/(\w+)\s+(\d+)/);
      if (xobjMatch2) {
        pageImageMap[pageNum] = parseInt(xobjMatch2[2]);
      }
    } else {
      pageImageMap[pageNum] = parseInt(xobjMatch[2]);
    }
  }
}

console.log('Page -> Image mapping:');
for (const [page, img] of Object.entries(pageImageMap)) {
  console.log(`  Page obj ${page} -> Image obj ${img}`);
}

// Now extract the first image for OCR testing
if (Object.keys(pageImageMap).length > 0) {
  const firstPage = pageObjNums[0];
  const firstImageObj = pageImageMap[firstPage];
  console.log(`\nExtracting first image: obj ${firstImageObj} for page ${firstPage}`);

  // Find the image stream
  const imgPattern = new RegExp(`${firstImageObj} \\d+ obj[\\s\\S]*?stream\\n([\\s\\S]*?)endstream`);
  const imgMatch = latin1.match(imgPattern);

  if (imgMatch) {
    // Also get the image parameters
    const headerPattern = new RegExp(`${firstImageObj} \\d+ obj([\\s\\S]*?)stream`);
    const headerMatch = latin1.match(headerPattern);
    console.log('Header:', headerMatch ? headerMatch[1].substring(0, 300) : 'not found');

    // Extract the stream data
    // Convert from latin1 to bytes
    const streamData = Buffer.from(imgMatch[1], 'latin1');
    console.log('Stream data size:', streamData.length, 'bytes');

    try {
      const decompressed = zlib.inflateSync(streamData);
      console.log('Decompressed size:', decompressed.length, 'bytes');
      console.log('Expected size (4898*6599):', 4898 * 6599);

      // Save raw data for inspection
      fs.writeFileSync('c:/Users/宁/Desktop/Myweb/page1_raw.bin', decompressed);

      // Convert to PNG using sharp
      const sharp = require('sharp');
      sharp(decompressed, {
        raw: {
          width: 4898,
          height: 6599,
          channels: 1
        }
      })
      .png()
      .toFile('c:/Users/宁/Desktop/Myweb/page1.png')
      .then(() => console.log('Saved page1.png'))
      .catch(err => console.error('Error saving PNG:', err.message));
    } catch (err) {
      console.error('Error:', err.message);
    }
  } else {
    console.log('Could not find image stream for obj', firstImageObj);
    // Show context around this object
    const idx = latin1.indexOf(`${firstImageObj} 0 obj`);
    if (idx >= 0) {
      console.log('Context:', latin1.substring(idx, idx + 500));
    }
  }
}
