const fs = require('fs');
const path = require('path');

const projectDir = 'C:/Users/Equipo 1/Documents/APPS/Examen ecogas';
const legacyDir = 'C:/Users/Equipo 1/.gemini/antigravity/scratch/examen-ecogas';
const templatePath = path.join(projectDir, 'index_template.html');

const logoBase64 = fs.existsSync(path.join(projectDir, 'logo-ecogas-opt.png'))
  ? `data:image/png;base64,${fs.readFileSync(path.join(projectDir, 'logo-ecogas-opt.png')).toString('base64')}`
  : '';
const firmaCamposBase64 = fs.existsSync(path.join(projectDir, 'firma_campos_opt.png'))
  ? `data:image/png;base64,${fs.readFileSync(path.join(projectDir, 'firma_campos_opt.png')).toString('base64')}`
  : '';
const firmaAndresBase64 = fs.existsSync(path.join(projectDir, 'firma_andres_opt.png'))
  ? `data:image/png;base64,${fs.readFileSync(path.join(projectDir, 'firma_andres_opt.png')).toString('base64')}`
  : '';

console.log('Logo size:', logoBase64.length);
console.log('Firma Campos (firma campos.jpg) size:', firmaCamposBase64.length);
console.log('Firma Andres size:', firmaAndresBase64.length);

let content = fs.readFileSync(templatePath, 'utf-8');
content = content.replace(/__LOGO_ECOGAS__/g, logoBase64);
content = content.replace(/__FIRMA_ALBERTO__/g, firmaCamposBase64);
content = content.replace(/__FIRMA_ANDRES__/g, firmaAndresBase64);

const targetPath = path.join(projectDir, 'index.html');
fs.writeFileSync(targetPath, content, 'utf-8');

if (fs.existsSync(legacyDir)) {
  fs.writeFileSync(path.join(legacyDir, 'index.html'), content, 'utf-8');
}

console.log('✅ Final index.html successfully compiled at:', targetPath);
console.log('Total file size:', content.length, 'bytes');
