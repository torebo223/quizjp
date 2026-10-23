// 問題データと地図データを1つの index.html にまとめるビルドスクリプト
// 使い方: node tools/build.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const muni = JSON.parse(read('data/municipalities.geojson'));
const pref = JSON.parse(read('data/prefectures.geojson'));

// 投影: 経度は北緯36度での縮みを考慮した正距円筒図法。地図の左上が (東経122度, 北緯46度)
const K = 40, C = Math.cos(36 * Math.PI / 180);
const f1 = v => { const s = v.toFixed(1); return s.endsWith('.0') ? s.slice(0, -2) : s; };
const px = (lon, lat) => [f1((lon - 122) * K * C), f1((46 - lat) * K)];
function toPath(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.map(p => p.map(r => {
    let s = '', last = '', n = 0;
    r.forEach(c => { const [x, y] = px(c[0], c[1]); const t = x + ',' + y; if (t === last) return; last = t; s += (n++ ? 'L' : 'M') + t; });
    return n > 2 ? s + 'Z' : '';
  }).join('')).join('');
}
function inRing(pt, r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (((yi > pt[1]) != (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) ins = !ins;
  }
  return ins;
}
function inGeom(pt, g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.some(p => inRing(pt, p[0]) && !p.slice(1).some(h => inRing(pt, h)));
}

const PREF_NAMES = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
const CATEGORIES = ['特産品', '建造物', 'オブジェクト', 'アニメ'];

const M = muni.features.filter(f => f.geometry).map(f => ({ p: f.properties.pref, n: f.properties.name, g: f.geometry }));
const P = PREF_NAMES.map(n => {
  const f = pref.features.find(f => f.properties.pref === n);
  if (!f) throw new Error('都道府県の地図データがありません: ' + n);
  return f.geometry;
});

// questions.tsv の列: 分類, 名前, 都道府県, 市, 緯度, 経度, 市のヒント, メモ
const errors = [];
const Q = read('data/questions.tsv').trim().split('\n').map((line, i) => {
  const cols = line.split('\t');
  const where = `questions.tsv ${i + 1}行目`;
  if (cols.length !== 8) { errors.push(`${where}: 列の数が ${cols.length}（8列必要）`); return null; }
  const [cat, name, prefName, city, lat, lon, hint, memo] = cols;
  if (!CATEGORIES.includes(cat)) errors.push(`${where}: 分類「${cat}」が不明`);
  const pi = PREF_NAMES.indexOf(prefName);
  if (pi < 0) { errors.push(`${where}: 都道府県「${prefName}」が不明`); return null; }
  const mi = M.findIndex(m => m.p === prefName && m.n === city);
  if (mi < 0) { errors.push(`${where}: ${prefName}に「${city}」が見つからない`); return null; }
  const pt = [+lon, +lat];
  if (!inGeom(pt, M[mi].g)) errors.push(`${where}: 「${name}」の座標が${city}の範囲外`);
  return [cat, name, pi, mi, city, +lat, +lon, hint, memo];
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const data =
  'const PREF_NAMES=' + JSON.stringify(PREF_NAMES) + ';\n' +
  'const PREFS=' + JSON.stringify(P.map(toPath)) + ';\n' +
  'const MUNIS=' + JSON.stringify(M.map(m => [PREF_NAMES.indexOf(m.p), m.n, toPath(m.g)])) + ';\n' +
  'const Q=' + JSON.stringify(Q) + ';\n';

const html =
  '<!doctype html>\n<html lang="ja">\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  read('src/head.html') + '<script>\n' + data + read('src/game.js') + '</script>\n';
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(`index.html を書き出しました（${Q.length}問、${(html.length / 1024).toFixed(0)}KB）`);
