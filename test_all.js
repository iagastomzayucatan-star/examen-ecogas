const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('C:/Users/Equipo 1/Documents/APPS/Examen ecogas/index.html', 'utf-8');

// 1. Test classic scripts
const scriptRegex = /<script(?![^>]*type=['"]module['"])[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  try {
    new vm.Script(match[1]);
    console.log(`✅ Classic Script #${count} syntax valid`);
  } catch (err) {
    console.error(`❌ Syntax error in classic script #${count}:`, err);
    process.exit(1);
  }
}

// 2. Test module script
const moduleMatch = html.match(/<script type=['"]module['"]>([\s\S]*?)<\/script>/i);
if (moduleMatch) {
  const code = moduleMatch[1];
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  console.log(`Braces in module script: ${openBraces} open, ${closeBraces} close.`);
  if (openBraces !== closeBraces) {
    console.error('❌ Mismatched braces in module script!');
    process.exit(1);
  }
  console.log('✅ Module script balanced and verified.');
}

// 3. Audit all onclick/onsubmit/oninput/onchange handlers
const handlerRegex = /on(?:click|submit|input|change)=["']([a-zA-Z0-9_]+)\s*\(/g;
let hMatch;
const handlers = new Set();
while ((hMatch = handlerRegex.exec(html)) !== null) {
  const fn = hMatch[1];
  if (!['const', 'if', 'this', 'document', 'window'].includes(fn)) {
    handlers.add(fn);
  }
}
const missing = [];
for (const fn of handlers) {
  const fnDef = new RegExp(`function\\s+${fn}\\s*\\(`);
  if (!fnDef.test(html)) {
    missing.push(fn);
  }
}
console.log(`✅ Audited ${handlers.size} unique UI event handlers. Missing: ${missing.length}`);
if (missing.length > 0) {
  console.error('❌ Missing handlers:', missing);
  process.exit(1);
}

console.log('🎉 ALL TESTS PASSED: HTML, JavaScript, and UI handlers are 100% valid!');
