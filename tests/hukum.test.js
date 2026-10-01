'use strict';
// Makale tablolarının kodlanmış kurallarını (js/hukum.js) kaynak tablo metinleriyle
// (js/genelge.js) ve sınır tarihleriyle doğrular.

const test = require('node:test');
const assert = require('node:assert/strict');

const G = require('../js/genelge.js');
const H = require('../js/hukum.js');
const RULES = require('../js/rules.js');
const ENGINE = require('../js/engine.js');

const T = G.TABLES;

test('tablo satır sayıları kaynakla aynı', () => {
  const beklenen = { t1: 10, t3: 11, t4: 2, t5: 2, t7: 11, t8: 10, t9: 30 };
  for (const [k, n] of Object.entries(beklenen)) {
    assert.equal(T[k].rows.length, n, `${k} satır sayısı`);
    T[k].rows.forEach((r, i) => {
      assert.equal(r.row, i + 1);
      assert.equal(r.cells.length, T[k].header.length, `${k} satır ${r.row} hücre sayısı`);
      r.cells.forEach((c) => assert.ok(c && c.trim(), `${k} satır ${r.row} boş hücre`));
    });
  }
});

/* ---------------- Tablo-9: kurallar tablo metniyle aynı ---------------- */

function statusCodes(text) {
  const t = text.replace(/\s+/g, ' ');
  const out = new Set();
  if (/4\/I-\s?\(a\)/.test(t)) out.add('4A');
  if (/4\/I-\s?\(b\)(?!\s*Tarım)/.test(t.replace(/\(b\.4\)/g, ''))) out.add('4B');
  if (/\(b\.4\)/.test(t)) out.add('4B4');
  if (/4\/I-\s?\(?c\)?/.test(t)) out.add('4C');
  if (/5434/.test(t)) out.add('ES');
  if (/(^|[^m] )SSK|^SSK/.test(t) && !/Tarım SSK/.test(t)) out.add('SSK');
  if (/Bağ-Kur/.test(t) && !/Tarım Bağ-Kur/.test(t)) out.add('BK');
  if (/2925/.test(t)) out.add('TSSK');
  if (/2926/.test(t)) out.add('TBK');
  return [...out].sort();
}

function dateKind(text) {
  if (/Farketmez/.test(text)) return 'any';
  if (/1\.10\.1972/.test(text)) return 'A72';
  if (/4\.10\.2000–7\.8\.2001/.test(text)) return 'B';
  if (/30\.0?9\.2008 sonrası/.test(text)) return 'post';
  if (/1\.10\.2008 öncesi/.test(text)) return 'pre';
  throw new Error('Tarih anlaşılamadı: ' + text);
}

function resultKind(text) {
  if (/brüt asgari/.test(text)) return 'gelir';
  if (/^Tercih/.test(text)) return 'tercih';
  if (/^Fazla/.test(text)) return 'fazla';
  if (/^İki/.test(text)) return 'iki';
  if (/^Tek/.test(text)) return 'tek';
  throw new Error('Sonuç anlaşılamadı: ' + text);
}

test('Tablo-9 kuralları tablo hücrelerinden türetilenle aynı', () => {
  assert.equal(H.T9.length, T.t9.rows.length);
  for (const rule of H.T9) {
    const cells = T.t9.rows[rule.row - 1].cells;
    assert.deepEqual([...rule.es[0]].sort(), statusCodes(cells[0]), `satır ${rule.row} eş statüsü`);
    assert.equal(rule.es[1], dateKind(cells[1]), `satır ${rule.row} eş tarihi`);
    assert.deepEqual([...rule.ab[0]].sort(), statusCodes(cells[2]), `satır ${rule.row} anne-baba statüsü`);
    assert.equal(rule.ab[1], dateKind(cells[3]), `satır ${rule.row} anne-baba tarihi`);
    assert.equal(rule.s, resultKind(cells[4]), `satır ${rule.row} sonuç`);
  }
});

const KODLAR = ['SSK', '4A', 'BK', '4B', 'TBK', '4B4', 'TSSK', 'ES', '4C'];
const TARIHLER = ['1980-01-01', '2000-10-03', '2000-10-04', '2001-08-07', '2001-08-08', '2003-08-01', '2003-08-02', '2008-09-30', '2008-10-01', '2012-01-01'];
function gecerli(code, t) {
  if (['SSK', 'BK', 'TBK'].includes(code)) return t < '2008-10-01';
  if (['4A', '4B', '4B4'].includes(code)) return t >= '2008-10-01';
  if (code === '4C') return t >= '2008-10-15';
  return true;
}

test('Tablo-9 hiçbir girdide çelişkili satırlara düşmüyor', () => {
  let eslesen = 0;
  for (const es of KODLAR) for (const esT of TARIHLER) for (const ab of KODLAR) for (const abT of TARIHLER) {
    if (!gecerli(es, esT) || !gecerli(ab, abT)) continue;
    const rows = H.t9Rows(es, esT, ab, abT);
    const kinds = new Set(rows.map((r) => r.s));
    assert.ok(kinds.size <= 1, `${es} ${esT} / ${ab} ${abT}: ${[...kinds]}`);
    if (rows.length) eslesen++;
  }
  assert.ok(eslesen > 100);
});

test('Tablo-9 dipnot ve gelir koşulları', () => {
  // satır 13: SSK eş + 1995 Bağ-Kur anne/baba
  let r = H.esAb2017Oncesi({ es: 'SSK', esTarih: '2005-01-01', ab: 'BK', abTarih: '1995-01-01' });
  assert.deepEqual(r.needs, ['donem2016']);
  r = H.esAb2017Oncesi({ es: 'SSK', esTarih: '2005-01-01', ab: 'BK', abTarih: '1995-01-01', donem2016: 'sonra' });
  assert.equal(r.sonuc.key, 'iki');
  r = H.esAb2017Oncesi({ es: 'SSK', esTarih: '2005-01-01', ab: 'BK', abTarih: '1995-01-01', donem2016: 'once', gelirAlti: true });
  assert.equal(r.sonuc.key, 'iki');
  r = H.esAb2017Oncesi({ es: 'SSK', esTarih: '2005-01-01', ab: 'BK', abTarih: '1995-01-01', donem2016: 'once', gelirAlti: false });
  assert.equal(r.sonuc.key, 'yalnizEs');
  // satır 14: B dönemi
  assert.equal(H.esAb2017Oncesi({ es: 'SSK', esTarih: '2005-01-01', ab: 'BK', abTarih: '2005-01-01' }).sonuc.key, 'iki');
  // satır 3 + dipnot 47
  r = H.esAb2017Oncesi({ es: 'BK', esTarih: '2005-01-01', ab: 'BK', abTarih: '1990-01-01' });
  assert.equal(r.status, 'ok'); // aynı statü: Tablo-8 önce gelir
  assert.equal(r.refs[0].key, 't8');
  // satır 4 / dipnot 48: anne-baba 4/I-(b.4) ise iki aylık (satır 10)
  assert.equal(H.esAb2017Oncesi({ es: 'BK', esTarih: '2005-01-01', ab: '4B', abTarih: '2010-01-01' }).sonuc.key, 'tercih');
  assert.equal(H.esAb2017Oncesi({ es: 'BK', esTarih: '2005-01-01', ab: '4B4', abTarih: '2010-01-01' }).sonuc.key, 'iki');
  // satır 25 / 26
  assert.equal(H.esAb2017Oncesi({ es: 'ES', esTarih: '2010-01-01', ab: 'TBK', abTarih: '1999-01-01' }).sonuc.key, 'tek');
  assert.equal(H.esAb2017Oncesi({ es: 'ES', esTarih: '2010-01-01', ab: 'TBK', abTarih: '2005-01-01' }).sonuc.key, 'iki');
});

/* ---------------- Tablo-8 ve 5.12.2017 sonrası uygulama ---------------- */

test('Tablo-8: aynı statüde tercih ettiği/yüksek aylık', () => {
  const adlar = { SSK: /^SSK/, TSSK: /^Tarım SSK/, BK: /^Bağ-Kur/, TBK: /^Tarım Bağ-Kur/, ES: /5434/, '4A': /\(a\)/, '4B': /\(b\)$/, '4B4': /\(b\.4\)/, '4C': /\(c\)/, BSA: /Banka/, BSD: /Banka/ };
  for (const [code, row] of Object.entries(H.T8_ROW)) {
    const r = H.ayniStatu(code, code);
    assert.equal(r.sonuc.key, 'tercihYuksek');
    assert.equal(r.refs[0].row, row);
    assert.match(T.t8.rows[row - 1].cells[0], adlar[code], `${code} -> satır ${row}`);
  }
  assert.equal(H.ayniStatu('SSK', '4A'), null);
});

test('Excel tablosunda aynı statü çifti yok; Tablo-8 ile çakışmıyor', () => {
  for (const rule of RULES.esAnneBaba.rules) {
    for (const es of rule.es) for (const ab of rule.ab) {
      assert.notEqual(H.EXCEL_TO_KANUN[es], H.EXCEL_TO_KANUN[ab], `satır ${rule.row}: ${es}/${ab}`);
    }
  }
});

test('5.12.2017 sonrası: Tablo-8 dışındaki her kombinasyon motorla aynı', () => {
  const codes = RULES.esAnneBaba.status.map((s) => s.code);
  for (const es of codes) for (const ab of codes) for (const once of ['evet', 'hayir', null]) {
    const r = H.esAb2017Sonrasi({ es, ab, once });
    if (H.EXCEL_TO_KANUN[es] === H.EXCEL_TO_KANUN[ab]) { assert.equal(r.refs[0].key, 't8'); continue; }
    const e = ENGINE.evalEsAnneBaba({ es, ab, once });
    assert.equal(r.status === 'needs' ? 'needsOnce' : r.status, e.status);
    assert.equal(r.sonuc && r.sonuc.key, e.sonuc && e.sonuc.key);
  }
});

/* ---------------- Yargıtay ilkesi ---------------- */

test('Yargıtay ilkesi', () => {
  const y = (es, esT, ab, abT) => H.yargitayEsAb({ es, esTarih: esT, ab, abTarih: abT }).sonuc.key;
  assert.equal(y('4A', '2010-01-01', 'BK', '2001-01-01'), 'iki');      // biri 2008 öncesi, statü farklı
  assert.equal(y('4A', '2010-01-01', '4B', '2012-01-01'), 'tercih');   // ikisi de sonra
  assert.equal(y('ES', '2010-01-01', '4B', '2012-01-01'), 'iki');      // 5434 istisnası
  assert.equal(y('ES', '2010-01-01', '4C', '2012-01-01'), 'tercih');   // 4/c istisna dışında
  assert.equal(y('SSK', '2000-01-01', 'SSK', '2001-01-01'), 'yok');    // aynı statü
});

/* ---------------- Tablo-1: prim şartı ---------------- */

test('Tablo-1: prim şartı ve sınırlar', () => {
  const p = (code, tarih, prim, yil, aylik) => H.primSarti({ code, tarih, prim, yil, aylikAlirken: aylik });
  assert.equal(p('4A', '2015-01-01', 1800).sonuc.key, 'var');
  assert.equal(p('4A', '2015-01-01', 1799).needs, 'yil');
  assert.equal(p('4A', '2015-01-01', 900, 5).sonuc.key, 'var');
  assert.equal(p('4A', '2015-01-01', 899).sonuc.key, 'yokPrim');
  assert.equal(p('4B', '2015-01-01', 1799).sonuc.key, 'yokPrim');       // 4/b için alternatif yok
  assert.equal(p('ES', '1990-01-01', 3600).sonuc.key, 'var');
  assert.equal(p('ES', '1990-01-01', 1800).sonuc.key, 'var5510');
  assert.equal(p('ES', '1990-01-01', 1799).sonuc.key, 'yokPrim');
  assert.equal(p('BK', '2000-10-03', 1080).refs[0].row, 5);
  assert.equal(p('BK', '2000-10-03', 1080).sonuc.key, 'var');
  assert.equal(p('BK', '2000-10-04', 1080).sonuc.key, 'yokPrim');       // B dönemi 1800
  assert.equal(p('BK', '2000-10-04', 1080).refs[0].row, 6);
  assert.equal(p('TBK', '2001-08-08', 1080).refs[0].row, 7);
  assert.equal(p('BSA', '2005-01-01', 1000, 5).refs[0].row, 9);
  assert.equal(p('BSD', '2010-01-01', 1000, 5).refs[0].row, 10);
  assert.equal(p('TSSK', null, 1800).refs[0].row, 4);
  assert.equal(p('SSK', '2000-01-01', 1000, 5).sonuc.key, 'var');
  assert.equal(p('SSK', '2000-01-01', 0, 0, true).sonuc.key, 'var');    // aylık alırken ölüm
});

/* ---------------- Tablo-3/4/5: kız çocuğu ---------------- */

test('Tablo-3/4/5: kız çocuğu kural eşleşmesi', () => {
  const k = (code, tarih, donem, d16) => H.kizKural(code, tarih, donem, d16);
  assert.equal(k('4A', '2012-01-01', 'once2017').refs[0].row, 1);
  assert.equal(k('SSK', '2000-01-01', 'once2017').refs[0].row, 2);
  assert.equal(k('ES', '2000-01-01', 'once2017').refs[0].row, 3);
  assert.equal(k('BK', '1999-01-01', 'once2017').needs, 'donem2016');
  assert.equal(k('BK', '1999-01-01', 'once2017', 'once').refs[0].row, 4);
  assert.equal(k('BK', '1999-01-01', 'once2017', 'sonra').refs[0].row, 5);
  assert.equal(k('BK', '2005-01-01', 'once2017').refs[0].row, 6);
  assert.equal(k('TBK', '2002-01-01', 'once2017').refs[0].row, 7);
  assert.equal(k('TBK', '2004-01-01', 'once2017').refs[0].row, 8);
  assert.equal(k('TSSK', '1999-09-07', 'once2017').refs[0].row, 9);
  assert.equal(k('TSSK', '1999-09-08', 'once2017').refs[0].row, 10);
  assert.equal(k('BSA', null, 'once2017').refs[0].row, 11);
  assert.equal(k('ES', null, 'sonra2017').refs[0].row, 2);
  assert.equal(k('BK', '1990-01-01', 'sonra2017').refs[0].row, 1);
  assert.equal(k('ES', null, 'yargitay').refs[0].key, 't5');
});

test('kız çocuğu: koşul değerlendirmesi ve malul istisnası', () => {
  const c = { evli: false, calisma: false, asliAylik: false };
  assert.equal(H.kizHak({ code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c }).hak, true);
  assert.equal(H.kizHak({ code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c: { ...c, calisma: true } }).hak, false);
  // evli ama %60 malul: 5510 kapsamında hak sahibi
  let r = H.kizHak({ code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c: { ...c, evli: true } });
  assert.deepEqual(r.needs, ['malul']);
  assert.equal(H.kizHak({ code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c: { ...c, evli: true, malul: true } }).hak, true);
  // Yargıtay tablosunda malul istisnası uygulanmaz
  assert.equal(H.kizHak({ code: '4A', tarih: '2012-01-01', donem: 'yargitay', c: { ...c, evli: true, malul: true } }).hak, false);
  // 5434: memur olmamak
  r = H.kizHak({ code: 'ES', tarih: '2000-01-01', donem: 'sonra2017', c: { evli: false, memur: true, memurAylik: false } });
  assert.equal(r.hak, false);
  // Bağ-Kur 1.10.2016 öncesi: gelir şartı
  r = H.kizHak({ code: 'BK', tarih: '1999-01-01', donem: 'once2017', donem2016: 'once', c: { evli: false, gelirBrutUstu: true } });
  assert.equal(r.hak, false);
  r = H.kizHak({ code: 'BK', tarih: '1999-01-01', donem: 'yargitay', c: { evli: false, gelirBrutUstu: true, calisma: false, asliAylik: false } });
  assert.equal(r.hak, true);
});

/* ---------------- Tablo-7: anne ---------------- */

test('Tablo-7: anne kural eşleşmesi ve koşullar', () => {
  const k = (code, tarih, donem, hizmet) => H.anneKural(code, tarih, donem, hizmet);
  assert.equal(k('4A', '2012-01-01', 'sonra2017').refs[0].row, 1);
  assert.equal(k('SSK', '2003-08-05', 'once2017').refs[0].row, 2);
  assert.equal(k('SSK', '2003-08-05', 'sonra2017').refs[0].row, 3);
  assert.equal(k('SSK', '2003-08-06', 'once2017').refs[0].row, 4);
  assert.equal(k('SSK', '2003-08-06', 'sonra2017').refs[0].row, 5);
  assert.equal(k('ES', null, 'sonra2017', '10+').refs[0].row, 6);
  assert.equal(k('ES', null, 'sonra2017', '5-10').refs[0].row, 7);
  assert.ok(k('ES', null, 'sonra2017', '5-').none);
  assert.equal(k('BK', '1999-01-01', 'once2017').refs[0].row, 8);
  assert.equal(k('TBK', '1999-01-01', 'sonra2017').refs[0].row, 9);
  assert.equal(k('BK', '2005-01-01', 'once2017').refs[0].row, 10);
  assert.ok(k('BK', '2005-01-01', 'once2017').keys.includes('hisse'));
  assert.equal(k('BK', '2005-01-01', 'sonra2017').refs[0].row, 11);
  assert.ok(k('TSSK', null, 'sonra2017').none);
  assert.ok(k('BSA', null, 'sonra2017').none);

  const tam = { anneAylik: false, gelirNetAlti: true, yas65: false, artanHisse: true };
  assert.equal(H.anneHak({ ozCocuk: true, code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c: tam }).hak, true);
  assert.equal(H.anneHak({ ozCocuk: true, code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c: { ...tam, artanHisse: false } }).hak, false);
  // 65 yaş üstü: artan hisse aranmaz
  assert.equal(H.anneHak({ ozCocuk: true, code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c: { anneAylik: false, gelirNetAlti: true, yas65: true } }).hak, true);
  assert.equal(H.anneHak({ ozCocuk: false, code: '4A', tarih: '2012-01-01', donem: 'sonra2017', c: tam }).hak, false);
});

test('kullanılan her hüküm notu tanımlı', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = ['hukum.js', 'flows.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');
  const used = new Set();
  for (const m of src.matchAll(/notes:\s*\[([^\]]*)\]/g)) { for (const k of m[1].matchAll(/'([a-zA-Z0-9]+)'/g)) used.add(k[1]); }
  for (const m of src.matchAll(/notes\.push\('([a-zA-Z0-9]+)'\)/g)) used.add(m[1]);
  for (const m of src.matchAll(/fn: '([a-zA-Z0-9]+)'/g)) used.add(m[1]);
  assert.ok(used.size > 15);
  for (const k of used) assert.ok(G.NOTES[k], `not tanımlı değil: ${k}`);
});
