'use strict';
// Arayüz metinlerinde Excel dışı hukuki yorum, tahmin veya yönlendirme
// bulunmadığını ve sürüm damgasının kaynak dosyayla uyuştuğunu doğrular.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RULES = require('../js/rules.js');
const TEXTS = require('../js/texts.js');
const F = require('../js/flows.js');

const FORBIDDEN = ['madde', 'kanuna göre', 'gereğince', 'hakkınız', 'hak kazanırsınız', 'başvurun', 'muhtemelen', 'tahminen', 'yapay zeka', 'akıllı', '!'];

function collect(obj, out = []) {
  if (typeof obj === 'string') { out.push(obj); }
  else if (Array.isArray(obj)) { obj.forEach((x) => collect(x, out)); }
  else if (obj && typeof obj === 'object') { Object.keys(obj).forEach((k) => { if (typeof obj[k] !== 'function') { collect(obj[k], out); } }); }
  return out;
}

test('sonuç ve açıklama metinlerinde yasak ifade yok', () => {
  const texts = collect(TEXTS).concat(
    collect(RULES.esAnneBaba.sonuc), collect(RULES.anneBaba.sonuc), collect(RULES.dulEs.sonuc),
    collect(F.KOSUL_SORU), collect(F.FLOWS.map((f) => [f.title, f.desc, f.baslik])), collect(require('../js/genelge.js').NOTES)
  );
  assert.ok(texts.length > 20);
  for (const t of texts) {
    const low = t.toLocaleLowerCase('tr');
    for (const f of FORBIDDEN) { assert.ok(!low.includes(f), `"${t}" içinde yasak ifade: ${f}`); }
  }
});

test('her sonuç anahtarının sade açıklaması ve kısa adı var', () => {
  for (const key of ['esAnneBaba', 'anneBaba', 'dulEs']) {
    for (const k of Object.keys(RULES[key].sonuc)) {
      assert.ok(TEXTS.PLAIN[key][k], `${key}.${k} için PLAIN yok`);
      assert.ok(TEXTS.SHORT[key][k], `${key}.${k} için SHORT yok`);
    }
    assert.ok(TEXTS.TITLES[key]);
  }
});

test('sürüm damgası kaynak Excel ile uyuşuyor', () => {
  const root = path.join(__dirname, '..');
  const excel = JSON.parse(fs.readFileSync(path.join(root, 'data', 'excel-rows.json'), 'utf8'));
  const xls = fs.readFileSync(path.join(root, 'data', excel.meta.dosya));
  const sha = crypto.createHash('sha256').update(xls).digest('hex').slice(0, 8);
  assert.equal(excel.meta.sha256, sha, 'Excel değişmiş; npm run extract çalıştırın');
  const rows = ['esAnneBaba', 'anneBaba', 'dulEs'].reduce((n, k) => n + excel[k].rows.length, 0);
  assert.equal(excel.meta.satirSayisi, rows);
  const js = fs.readFileSync(path.join(root, 'js', 'excel-rows.js'), 'utf8');
  assert.ok(js.includes('"sha256": "' + sha + '"'), 'js/excel-rows.js güncel değil; npm run extract çalıştırın');
});
