import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'lib/translations.ts'), 'utf8');

/** Value after uz:/ru:/en: with ' or " delimiters */
function valAfter(label, block) {
  const re = new RegExp(
    `${label}:\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1`,
    'm'
  );
  const m = re.exec(block);
  if (!m) return null;
  return m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

const uz = {};
const ru = {};
const en = {};
const parts = src.split(/\n  (?=\w+: \{)/);

for (const part of parts) {
  const trimmed = part.trim();
  const head = /^(\w+): \{/.exec(trimmed);
  if (!head) continue;
  const key = head[1];
  const inner = trimmed.slice(head[0].length);
  const vu = valAfter('uz', inner);
  const vr = valAfter('ru', inner);
  const ve = valAfter('en', inner);
  if (vu != null && vr != null && ve != null) {
    uz[key] = vu;
    ru[key] = vr;
    en[key] = ve;
  }
}

const localesDir = path.join(root, 'locales');
fs.mkdirSync(localesDir, { recursive: true });
fs.writeFileSync(path.join(localesDir, 'uz.json'), JSON.stringify(uz, null, 2), 'utf8');
fs.writeFileSync(path.join(localesDir, 'ru.json'), JSON.stringify(ru, null, 2), 'utf8');
fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify(en, null, 2), 'utf8');
console.log('Extracted keys:', Object.keys(uz).length);
console.log('Has payments:', !!uz.payments);
