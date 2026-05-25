const Tesseract = require('tesseract.js');
const fs = require('fs');

async function ocrPage(pageNum) {
  const imgPath = `c:/Users/宁/Desktop/Myweb/history_pages/page_${String(pageNum).padStart(2,'0')}.png`;
  console.log(`\n========== OCR Page ${pageNum} ==========`);

  const { data } = await Tesseract.recognize(imgPath, 'chi_sim+eng', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r  OCR: ${Math.round(m.progress * 100)}%`);
      }
    }
  });

  const text = data.text;
  console.log(`\n${text}`);
  console.log(`\n(Total chars: ${text.length})`);

  fs.writeFileSync(`c:/Users/宁/Desktop/Myweb/history_pages/page_${String(pageNum).padStart(2,'0')}.txt`, text);
  return text;
}

async function main() {
  const startPage = parseInt(process.argv[2]) || 1;
  const endPage = parseInt(process.argv[3]) || 6;

  for (let p = startPage; p <= endPage; p++) {
    await ocrPage(p);
  }
  console.log('\n=== Done OCR ===');
}

main().catch(err => console.error(err));
