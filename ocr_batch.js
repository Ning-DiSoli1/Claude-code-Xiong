const Tesseract = require('tesseract.js');
const fs = require('fs');

async function ocrPage(pageNum) {
  const imgPath = `c:/Users/宁/Desktop/Myweb/pages/page_${String(pageNum).padStart(2,'0')}.png`;
  console.log(`\n========== Page ${pageNum} ==========`);

  const { data } = await Tesseract.recognize(imgPath, 'chi_sim', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r  OCR: ${Math.round(m.progress * 100)}%`);
      }
    }
  });

  const text = data.text;
  console.log(`\n${text.substring(0, 1500)}`);
  console.log(`(Total chars: ${text.length})`);

  // Save raw text
  fs.writeFileSync(`c:/Users/宁/Desktop/Myweb/pages/page_${String(pageNum).padStart(2,'0')}.txt`, text);
  return text;
}

async function main() {
  const pagesToOcr = process.argv[2] ? [parseInt(process.argv[2])] : [1, 2, 3];
  for (const p of pagesToOcr) {
    await ocrPage(p);
  }
  console.log('\nDone.');
}

main().catch(err => console.error(err));
