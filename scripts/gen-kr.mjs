import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const uzPath = path.join(root, 'locales', 'uz.json');
const uz = JSON.parse(fs.readFileSync(uzPath, 'utf8'));

/** Oʻzbek lotin (zamonaviy) → kirill (asosiy qoidalar) */
function latinToKr(input) {
  let s = input;
  const seq = [
    ['Sh', 'Ш'],
    ['sh', 'ш'],
    ['Ch', 'Ч'],
    ['ch', 'ч'],
    ['Yo', 'Ё'],
    ['yo', 'ё'],
    ['Yu', 'Ю'],
    ['yu', 'ю'],
    ['Ya', 'Я'],
    ['ya', 'я'],
    ['Ye', 'Е'],
    ['ye', 'е'],
    ["O'", 'Ў'],
    ["o'", 'ў'],
    ["G'", 'Ғ'],
    ["g'", 'ғ'],
    ['Ng', 'Нг'],
    ['ng', 'нг'],
  ];
  for (const [a, b] of seq) {
    s = s.split(a).join(b);
  }
  const map = {
    a: 'а',
    b: 'б',
    d: 'д',
    e: 'е',
    f: 'ф',
    g: 'г',
    h: 'ҳ',
    i: 'и',
    j: 'ж',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    q: 'қ',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    v: 'в',
    x: 'х',
    y: 'й',
    z: 'з',
    A: 'А',
    B: 'Б',
    D: 'Д',
    E: 'Е',
    F: 'Ф',
    G: 'Г',
    H: 'Ҳ',
    I: 'И',
    J: 'Ж',
    K: 'К',
    L: 'Л',
    M: 'М',
    N: 'Н',
    O: 'О',
    P: 'П',
    Q: 'Қ',
    R: 'Р',
    S: 'С',
    T: 'Т',
    U: 'У',
    V: 'В',
    X: 'Х',
    Y: 'Й',
    Z: 'З',
  };
  let out = '';
  for (const ch of s) {
    out += map[ch] !== undefined ? map[ch] : ch;
  }
  return out;
}

const kr = {};
for (const [k, v] of Object.entries(uz)) {
  kr[k] = latinToKr(v);
}

/** Автоматик таржимада чиққан хатолarni тузатиш */
const fixKr = {
  manager: 'Менеджер',
  noData: 'Маълумот йўқ',
  loginError: 'Логин ёки парол нотўғри',
  parentRegisterFooter: 'Ота-она сифатида рўйхатдан ўтиш',
  paymentAdded: 'Тўлов муваффақиятли қўшилди',
  uzbekCyrillic: 'Ўзбек (Кирилл)',
};

for (const [k, v] of Object.entries(fixKr)) {
  if (kr[k] !== undefined) kr[k] = v;
}

fs.writeFileSync(path.join(root, 'locales', 'kr.json'), JSON.stringify(kr, null, 2), 'utf8');
console.log('kr.json keys:', Object.keys(kr).length);
