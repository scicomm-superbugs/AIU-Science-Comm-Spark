const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, 'src', 'defaultContent.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

function stripBadTags(str) {
  if (typeof str !== 'string') return str;
  let cleaned = str.replace(/<span\b[^>]*>(.*?)<\/span>/gi, '$1');
  cleaned = cleaned.replace(/<font\b[^>]*>(.*?)<\/font>/gi, '$1');
  cleaned = cleaned.replace(/\s*style="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*class="[^"]*"/gi, '');
  cleaned = cleaned.trim();
  return cleaned;
}

function cleanObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      res[k] = stripBadTags(v);
    } else {
      res[k] = cleanObject(v);
    }
  }
  return res;
}

const cleanedContent = cleanObject(content);
cleanedContent.updatedAt = Date.now();

fs.writeFileSync(contentPath, JSON.stringify(cleanedContent, null, 2));
console.log('Cleaned defaultContent.json successfully!');
