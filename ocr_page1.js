const sharp = require('sharp');
const Tesseract = require('tesseract.js');

async function ocr() {
  console.log('Resizing page 1 for faster OCR...');
  await sharp('c:/Users/宁/Desktop/Myweb/page1.png')
    .resize({ width: 1224 }) // 25% of 4898
    .png()
    .toFile('c:/Users/宁/Desktop/Myweb/page1_small.png');

  console.log('Running OCR on page 1 (small)...');
  const { data } = await Tesseract.recognize(
    'c:/Users/宁/Desktop/Myweb/page1_small.png',
    'chi_sim+eng',
    {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rOCR progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    }
  );
  console.log('\n\nOCR Result:');
  console.log(data.text);
}

ocr().catch(err => console.error('Error:', err));
