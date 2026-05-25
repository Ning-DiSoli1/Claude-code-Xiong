const fs = require('fs');
const pdf = require('pdf-parse-fork');

const dataBuffer = fs.readFileSync('123/W02025062408572025目录-历史类 (1)_10.pdf');

pdf(dataBuffer).then(data => {
  console.log('Pages:', data.numpages);
  console.log('=== Full text ===');
  console.log(data.text);
}).catch(err => console.error('Error:', err));
