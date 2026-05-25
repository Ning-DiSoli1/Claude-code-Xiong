const Tesseract = require('tesseract.js');

(async () => {
    try {
        // Try without explicit langPath - let it auto-download
        const { data: { text } } = await Tesseract.recognize(
            'C:\\Temp\\ocr_input.jpg',
            'chi_sim',
            {
                logger: m => {
                    console.error('[LOG]', m.status, m.progress || '');
                }
            }
        );
        console.log('=== OCR RESULT ===');
        console.log(text);
        console.log('=== END ===');
    } catch (err) {
        console.error('Error:', err.message);
    }
})();
