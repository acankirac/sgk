'use strict';
// Kural tanımlarının (js/rules.js) kaynak Excel ile birebir tutarlı olduğunu
// ve motorun (js/engine.js) her Excel satırını aynen ürettiğini doğrular.
// Çalıştırma: npm test  (node --test tests/)

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const EXCEL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'excel-rows.json'), 'utf8'));
const RULES = require('../js/rules.js');
const ENGINE = require('../js/engine.js');

function rowByNo(sheetKey, rowNo) {
  const row = EXCEL[sheetKey].rows.find((r) => r.row === rowNo);
  assert.ok(row, `${sheetKey}: Excel'de ${rowNo}. satır yok`);
  return row;
}

function sortedEq(actual, expected, msg) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), msg);
}

/* ------------------------------------------------------------------ */
/* 1) Eşten ve anne-babadan                                            */
/* ------------------------------------------------------------------ */

// Excel hücre metninden statü kodlarını türetir (kurum ailesi + tarih koşulu).
const ES_FAMILIES = [
  { pre: 'SSK', post: 'A', re: /(?<!Tarım )SSK|4\/I-? ?\(a\)/ },
  { pre: 'BK', post: 'B', re: /(?<!Tarım )Bağ-?Kur|4\/I-? ?\(b\)(?! Tarım)/i },
  { pre: 'TBK', post: 'BT', re: /Tarım Bağ|\(b\) Tarım/ },
  { pre: 'BSD', post: 'BSD2', re: /Devir/ },
  { any: 'ES', re: /E(mekli|\.) ?Sandığı/ },
  { any: 'C', re: /4\/I-? ?\(c\)/ },
  { any: 'TSSK', re: /Tarım SSK/ },
  { any: 'BSA', re: /Aktif/ }
];

function deriveEsCodes(statusText, dateText) {
  const codes = [];
  const date = dateText.toLowerCase();
  for (const fam of ES_FAMILIES) {
    if (!fam.re.test(statusText)) continue;
    if (fam.any) { codes.push(fam.any); continue; }
    if (date.includes('önemi yok')) codes.push(fam.pre, fam.post);
    else if (date.includes('öncesi')) codes.push(fam.pre);
    else if (date.includes('sonrası')) codes.push(fam.post);
    else assert.fail(`Tarih hücresi anlaşılamadı: "${dateText}"`);
  }
  assert.ok(codes.length > 0, `Statü hücresi anlaşılamadı: "${statusText}"`);
  return codes;
}

function deriveOnce(text) {
  const t = text.trim();
  if (t === 'Evet') return 'evet';
  if (t === 'Hayır') return 'hayir';
  if (t === 'Evet/Hayır') return 'any';
  if (t === '-' || t === '') return 'na';
  assert.fail(`E sütunu anlaşılamadı: "${text}"`);
}

function deriveEsSonuc(text) {
  const t = text.toLocaleLowerCase('tr');
  if (t.startsWith('iki')) return 'iki';
  if (t.startsWith('tek')) return 'tek';
  assert.fail(`Sonuç hücresi anlaşılamadı: "${text}"`);
}

test('eşten-anne-babadan: her Excel satırı için tam olarak bir kural var', () => {
  const excelRows = EXCEL.esAnneBaba.rows.map((r) => r.row);
  const ruleRows = RULES.esAnneBaba.rules.map((r) => r.row);
  sortedEq(ruleRows, excelRows);
  assert.equal(new Set(ruleRows).size, ruleRows.length, 'satır numaraları tekrar ediyor');
});

test('eşten-anne-babadan: kurallar Excel hücre metinlerinden türetilenle aynı', () => {
  for (const rule of RULES.esAnneBaba.rules) {
    const { cells } = rowByNo('esAnneBaba', rule.row);
    const [esText, esDate, abText, abDate, onceText, sonucText] = cells;
    sortedEq(rule.es, deriveEsCodes(esText, esDate), `satır ${rule.row}: eş statüsü`);
    sortedEq(rule.ab, deriveEsCodes(abText, abDate), `satır ${rule.row}: anne-baba statüsü`);
    assert.equal(rule.once, deriveOnce(onceText), `satır ${rule.row}: E sütunu`);
    assert.equal(rule.sonuc, deriveEsSonuc(sonucText), `satır ${rule.row}: sonuç`);
  }
});

test('eşten-anne-babadan: statü kodları tanımlı ve tekil', () => {
  const codes = RULES.esAnneBaba.status.map((s) => s.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const rule of RULES.esAnneBaba.rules) {
    for (const c of [...rule.es, ...rule.ab]) assert.ok(codes.includes(c), `satır ${rule.row}: bilinmeyen kod ${c}`);
  }
});

test('eşten-anne-babadan: motor her Excel satırını aynen üretiyor', () => {
  for (const rule of RULES.esAnneBaba.rules) {
    const onceValues = rule.once === 'evet' ? ['evet'] : rule.once === 'hayir' ? ['hayir'] : ['evet', 'hayir', null];
    for (const es of rule.es) for (const ab of rule.ab) for (const once of onceValues) {
      const r = ENGINE.evalEsAnneBaba({ es, ab, once });
      assert.equal(r.status, 'ok', `satır ${rule.row} (${es}+${ab}, once=${once}): ${r.status} ${r.reason}`);
      assert.equal(r.sonuc.key, rule.sonuc, `satır ${rule.row} (${es}+${ab}, once=${once})`);
      assert.ok(r.rows.some((m) => m.row === rule.row), `satır ${rule.row} eşleşen satırlar arasında değil`);
    }
  }
});

test('eşten-anne-babadan: hiçbir kombinasyon çelişkili sonuç vermiyor', () => {
  const codes = RULES.esAnneBaba.status.map((s) => s.code);
  let ok = 0, none = 0, needs = 0;
  for (const es of codes) for (const ab of codes) for (const once of ['evet', 'hayir', null]) {
    const r = ENGINE.evalEsAnneBaba({ es, ab, once });
    assert.notEqual(r.status, 'conflict', `${es}+${ab}, once=${once}: çelişki ${r.sonuclar.map((s) => s.key)}`);
    if (r.status === 'ok') ok++; else if (r.status === 'none') none++; else if (r.status === 'needsOnce') needs++;
  }
  console.log(`  eşten-anne-babadan kapsama: ${ok} sonuçlu, ${none} tabloda yok, ${needs} soru bekliyor (${codes.length}x${codes.length}x3)`);
});

test('eşten-anne-babadan: Evet/Hayır sorusu yalnızca gerektiğinde isteniyor', () => {
  // 4/I-(a) eş + Bağ-Kur anne/baba: soru zorunlu
  let r = ENGINE.evalEsAnneBaba({ es: 'A', ab: 'BK', once: null });
  assert.equal(r.status, 'needsOnce');
  assert.equal(ENGINE.evalEsAnneBaba({ es: 'A', ab: 'BK', once: 'evet' }).sonuc.key, 'iki');
  assert.equal(ENGINE.evalEsAnneBaba({ es: 'A', ab: 'BK', once: 'hayir' }).sonuc.key, 'tek');
  // SSK eş + Bağ-Kur anne/baba: soru fark etmez
  r = ENGINE.evalEsAnneBaba({ es: 'SSK', ab: 'BK', once: null });
  assert.equal(r.status, 'ok');
  assert.equal(r.needsOnce, false);
  // Aynı kurum: tabloda yok
  r = ENGINE.evalEsAnneBaba({ es: 'SSK', ab: 'A', once: null });
  assert.equal(r.status, 'none');
  assert.match(r.reason, /SSK \/ 4-a/);
  // 4/I-(b) eş + Banka Sandığı (Devir) anne/baba: tabloda yalnızca Evet var
  r = ENGINE.evalEsAnneBaba({ es: 'B', ab: 'BSD', once: 'hayir' });
  assert.equal(r.status, 'none');
  assert.match(r.reason, /yalnızca "Evet"/);
});

/* ------------------------------------------------------------------ */
/* 2) Anne ve babadan (Tablo-6)                                        */
/* ------------------------------------------------------------------ */

const AB_CODES = [
  { code: 'A', re: /4\/I-? ?\(a\)|(?<!Tarım )SSK/ },
  { code: 'B', re: /4\/I-? ?\(b\)(?!\.4)|(?<!Tarım )Bağ-Kur/ },
  { code: 'BT', re: /\(b\.4\)|Tarım Bağ-? ?Kur/ },
  { code: 'C', re: /4\/I-? ?\(c\)/ },
  { code: 'ES', re: /Emekli Sandığı/ },
  { code: 'TSSK', re: /Tarım SSK/ }
];

function deriveAbCodes(text) {
  const codes = AB_CODES.filter((c) => c.re.test(text)).map((c) => c.code);
  assert.ok(codes.length > 0, `Statü hücresi anlaşılamadı: "${text}"`);
  return codes;
}

function deriveAbTarih(text) {
  const t = text.toLocaleLowerCase('tr').replace(/\s+/g, ' ');
  if (t.includes('önemi yok')) return 'any';
  if (t.includes('ikisi de')) return 'ikisi';
  if (t.includes('biri')) return 'biri';
  if (t.includes('30.9.2008')) return 'sonra';
  assert.fail(`Tarih hücresi anlaşılamadı: "${text}"`);
}

function deriveAbSonuc(text) {
  const t = text.toLocaleLowerCase('tr');
  const donem = t.includes('5.12.2017 tarihi öncesi') ? 'once2017' : t.includes('5.12.2017 tarihinden itibaren') ? 'sonra2017' : undefined;
  let sonuc;
  if (/yüksek aylık tam/.test(t)) sonuc = 'yuksekTamDusukYarim';
  else if (/tercih edilen/.test(t)) sonuc = 'tercihTam';
  else if (/iki tam aylık/.test(t)) sonuc = 'ikiTam';
  else if (/yüksek olan aylık/.test(t)) sonuc = 'yuksekOlan';
  else assert.fail(`Sonuç hücresi anlaşılamadı: "${text}"`);
  return { donem, sonuc };
}

test('anne-babadan: her Excel satırı için tam olarak bir kural var (başlık satırı hariç)', () => {
  const excelRows = EXCEL.anneBaba.rows.filter((r) => r.cells[1]).map((r) => r.row);
  sortedEq(RULES.anneBaba.rules.map((r) => r.row), excelRows);
  const caption = EXCEL.anneBaba.rows.find((r) => !r.cells[1]);
  assert.equal(caption.cells[0].replace(/- /g, ''), RULES.anneBaba.baslik);
});

test('anne-babadan: kurallar Excel hücre metinlerinden türetilenle aynı', () => {
  for (const rule of RULES.anneBaba.rules) {
    const { cells } = rowByNo('anneBaba', rule.row);
    const [tarihText, xText, yText, sonucText] = cells;
    assert.equal(rule.tarih, deriveAbTarih(tarihText), `satır ${rule.row}: tarih`);
    sortedEq(rule.x, deriveAbCodes(xText), `satır ${rule.row}: baba-anne`);
    sortedEq(rule.y, deriveAbCodes(yText), `satır ${rule.row}: anne-baba`);
    const { donem, sonuc } = deriveAbSonuc(sonucText);
    assert.equal(rule.donem, donem, `satır ${rule.row}: dönem`);
    assert.equal(rule.sonuc, sonuc, `satır ${rule.row}: sonuç`);
  }
});

test('anne-babadan: motor her Excel satırını aynen üretiyor (her iki sırayla)', () => {
  const tarihler = RULES.anneBaba.tarih.map((t) => t.code);
  for (const rule of RULES.anneBaba.rules) {
    const tarihValues = rule.tarih === 'any' ? tarihler : [rule.tarih];
    const donemValues = rule.donem ? [rule.donem] : ['once2017', 'sonra2017', null];
    for (const x of rule.x) for (const y of rule.y) for (const tarih of tarihValues) for (const donem of donemValues) {
      for (const [baba, anne] of [[x, y], [y, x]]) {
        const r = ENGINE.evalAnneBaba({ baba, anne, tarih, donem });
        assert.equal(r.status, 'ok', `satır ${rule.row} (${baba}+${anne}, ${tarih}, ${donem}): ${r.status} ${r.reason}`);
        assert.equal(r.sonuc.key, rule.sonuc, `satır ${rule.row} (${baba}+${anne}, ${tarih}, ${donem})`);
        assert.ok(r.rows.some((m) => m.row === rule.row));
      }
    }
  }
});

test('anne-babadan: hiçbir kombinasyon çelişkili sonuç vermiyor', () => {
  const codes = RULES.anneBaba.status.map((s) => s.code);
  let ok = 0, none = 0, needs = 0;
  for (const baba of codes) for (const anne of codes) for (const tarih of ['sonra', 'biri', 'ikisi']) for (const donem of ['once2017', 'sonra2017', null]) {
    const r = ENGINE.evalAnneBaba({ baba, anne, tarih, donem });
    assert.notEqual(r.status, 'conflict', `${baba}+${anne} ${tarih} ${donem}: çelişki`);
    if (r.status === 'ok') ok++; else if (r.status === 'none') none++; else if (r.status === 'needsDonem') needs++;
  }
  console.log(`  anne-babadan kapsama: ${ok} sonuçlu, ${none} tabloda yok, ${needs} dönem bekliyor`);
});

test('anne-babadan: 5.12.2017 dönemi yalnızca Bağ-Kur/Tarım Bağ-Kur çiftlerinde soruluyor', () => {
  let r = ENGINE.evalAnneBaba({ baba: 'B', anne: 'B', tarih: 'ikisi', donem: null });
  assert.equal(r.status, 'needsDonem');
  assert.equal(ENGINE.evalAnneBaba({ baba: 'B', anne: 'B', tarih: 'ikisi', donem: 'once2017' }).sonuc.key, 'yuksekOlan');
  assert.equal(ENGINE.evalAnneBaba({ baba: 'B', anne: 'B', tarih: 'ikisi', donem: 'sonra2017' }).sonuc.key, 'yuksekTamDusukYarim');
  r = ENGINE.evalAnneBaba({ baba: 'A', anne: 'A', tarih: 'ikisi', donem: null });
  assert.equal(r.status, 'ok');
  assert.equal(r.needsDonem, false);
  // Tarım SSK + Emekli Sandığı: 5. ve 6. satırlar birlikte eşleşir, ikisi de "İki tam aylık"
  r = ENGINE.evalAnneBaba({ baba: 'TSSK', anne: 'ES', tarih: 'sonra', donem: null });
  assert.equal(r.sonuc.key, 'ikiTam');
  sortedEq(r.rows.map((m) => m.row), [5, 6]);
});

/* ------------------------------------------------------------------ */
/* 3) Dul eşe, iki eşten                                               */
/* ------------------------------------------------------------------ */

const DUL_CODES = [
  { code: '506', re: /\b506\b/ },
  { code: '1479', re: /\b1479\b/ },
  { code: '2925', re: /\b2925\b/ },
  { code: '2926', re: /\b2926\b/ },
  { code: '5434', re: /\b5434\b/ },
  { code: 'A', re: /4\/I-? ?\(a\)/ },
  { code: 'B', re: /4\/I-? ?\(b\)/ },
  { code: 'BT', re: /\(b\.4\)/ },
  { code: 'C', re: /4\/I-? ?\(c\)/ },
  { code: 'BS', re: /Banka Sandığı/ }
];

function deriveDulCodes(text) {
  const codes = DUL_CODES.filter((c) => c.re.test(text)).map((c) => c.code);
  assert.ok(codes.length > 0, `Kanun hücresi anlaşılamadı: "${text}"`);
  return codes;
}

test('dul eşe: her Excel satırı için tam olarak bir kural var (dipnot satırı hariç)', () => {
  const dataRows = EXCEL.dulEs.rows.filter((r) => r.cells[1]);
  sortedEq(RULES.dulEs.rules.map((r) => r.row), dataRows.map((r) => r.row));
  const noteRow = EXCEL.dulEs.rows.find((r) => !r.cells[1]);
  for (const not of RULES.dulEs.notlar) {
    assert.ok(noteRow.cells[0].includes(not.text), `dipnot ${not.no} Excel metniyle aynı değil`);
  }
});

test('dul eşe: kurallar Excel hücre metinlerinden türetilenle aynı', () => {
  for (const rule of RULES.dulEs.rules) {
    const { cells } = rowByNo('dulEs', rule.row);
    const [ilkText, ikinciText, sonucText] = cells;
    sortedEq(rule.ilk, deriveDulCodes(ilkText), `satır ${rule.row}: ilk eş`);
    sortedEq(rule.ikinci, deriveDulCodes(ikinciText), `satır ${rule.row}: ikinci eş`);
    const st = sonucText.toLocaleLowerCase('tr');
    const expected = st.includes('tercih') ? 'tercih' : st.startsWith('iki') ? 'iki' : null;
    assert.equal(rule.sonuc, expected, `satır ${rule.row}: sonuç`);
  }
});

test('dul eşe: motor her Excel satırını aynen üretiyor ve sıra bağımsız', () => {
  for (const rule of RULES.dulEs.rules) {
    for (const ilk of rule.ilk) for (const ikinci of rule.ikinci) {
      const r1 = ENGINE.evalDulEs({ ilk, ikinci });
      const r2 = ENGINE.evalDulEs({ ilk: ikinci, ikinci: ilk });
      assert.equal(r1.status, 'ok', `satır ${rule.row} (${ilk}+${ikinci}): ${r1.reason}`);
      assert.equal(r1.sonuc.key, rule.sonuc, `satır ${rule.row} (${ilk}+${ikinci})`);
      assert.equal(r2.sonuc && r2.sonuc.key, rule.sonuc, `satır ${rule.row} ters sıra (${ikinci}+${ilk})`);
      assert.equal(r1.sirali, true);
    }
  }
});

test('dul eşe: hiçbir kombinasyon çelişkili sonuç vermiyor', () => {
  const codes = RULES.dulEs.status.map((s) => s.code);
  let ok = 0, none = 0;
  for (const ilk of codes) for (const ikinci of codes) {
    const r = ENGINE.evalDulEs({ ilk, ikinci });
    assert.notEqual(r.status, 'conflict', `${ilk}+${ikinci}: çelişki`);
    if (r.status === 'ok') ok++; else none++;
  }
  console.log(`  dul eşe kapsama: ${ok} sonuçlu, ${none} tabloda yok (${codes.length}x${codes.length})`);
  assert.equal(ENGINE.evalDulEs({ ilk: 'A', ikinci: 'A' }).status, 'none');
  assert.equal(ENGINE.evalDulEs({ ilk: '506', ikinci: 'A' }).sonuc.key, 'tercih');
  assert.equal(ENGINE.evalDulEs({ ilk: 'A', ikinci: '1479' }).sonuc.key, 'iki');
});
