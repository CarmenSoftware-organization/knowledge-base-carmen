const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, '..', 'docx_content.xml');
const outPath = path.join(__dirname, '..', 'docx_text.txt');

const xml = fs.readFileSync(xmlPath, 'utf8');
const textNodes = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
const text = (textNodes || [])
  .map(n => n.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'))
  .join('');
fs.writeFileSync(outPath, text, 'utf8');
console.log('Written to docx_text.txt, length:', text.length);
