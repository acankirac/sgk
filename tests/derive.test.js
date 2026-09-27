'use strict';
// Kurum + vefat tarihinden statü türetme (js/derive.js) doğrulaması.
// Eşikler tablodaki ifadelerle aynı olmalı: "1.10.2008 öncesi" / "30.9.2008 sonrası"
// / "14.10.2008 sonrası".

const test = require('node:test');
const assert = require('node:assert/strict');

const D = require('../js/derive.js');
const RULES = require('../js/rules.js');

function code(modul, input) {
  const r = D.derive(modul, input);
  assert.ok(r.code, `${modul} ${JSON.stringify(input)}: kod bekleniyordu, ${JSON.stringify(r)} döndü`);
  return r.code;
}

test('tarih doğrulama', () => {
  assert.equal(D.validDate('2008-09-30'), true);
  assert.equal(D.validDate('2008-02-30'), false);
  assert.equal(D.validDate('30.09.2008'), false);
  assert.equal(D.validDate(''), false);
  assert.equal(D.validDate(null), false);
});

test('eşten-anne-babadan: 1.10.2008 eşiği SSK, Bağ-Kur, Tarım Bağ-Kur ve Banka Sandığı (Devir) için', () => {
  assert.equal(code('esAnneBaba', { kurum: 'ssk', tarih: '2008-09-30' }), 'SSK');
  assert.equal(code('esAnneBaba', { kurum: 'ssk', tarih: '2008-10-01' }), 'A');
  assert.equal(code('esAnneBaba', { kurum: 'bagkur', tarih: '2008-09-30' }), 'BK');
  assert.equal(code('esAnneBaba', { kurum: 'bagkur', tarih: '2008-10-01' }), 'B');
  assert.equal(code('esAnneBaba', { kurum: 'tarimbagkur', tarih: '1999-01-01' }), 'TBK');
  assert.equal(code('esAnneBaba', { kurum: 'tarimbagkur', tarih: '2015-06-15' }), 'BT');
  assert.equal(code('esAnneBaba', { kurum: 'banka', devir: true, tarih: '2008-09-30' }), 'BSD');
  assert.equal(code('esAnneBaba', { kurum: 'banka', devir: true, tarih: '2008-10-01' }), 'BSD2');
});

test('eşten-anne-babadan: tarih gerekmeyen kurumlar', () => {
  assert.equal(code('esAnneBaba', { kurum: 'tarimssk' }), 'TSSK');
  assert.equal(code('esAnneBaba', { kurum: 'banka', devir: false }), 'BSA');
});

test('eşten-anne-babadan: Emekli Sandığı 15.10.2008 eşiği ve memuriyet başlangıcı sorusu', () => {
  assert.equal(code('esAnneBaba', { kurum: 'emekli', tarih: '2008-10-14' }), 'ES');
  assert.deepEqual(D.derive('esAnneBaba', { kurum: 'emekli', tarih: '2008-10-15' }), { needs: 'memur' });
  assert.equal(code('esAnneBaba', { kurum: 'emekli', tarih: '2008-10-15', memur: 'once' }), 'ES');
  assert.equal(code('esAnneBaba', { kurum: 'emekli', tarih: '2008-10-15', memur: 'sonra' }), 'C');
});

test('eksik bilgi sırayla isteniyor', () => {
  assert.deepEqual(D.derive('esAnneBaba', {}), { needs: 'kurum' });
  assert.deepEqual(D.derive('esAnneBaba', { kurum: 'ssk' }), { needs: 'tarih' });
  assert.deepEqual(D.derive('esAnneBaba', { kurum: 'ssk', tarih: 'bozuk' }), { needs: 'tarih' });
  assert.deepEqual(D.derive('esAnneBaba', { kurum: 'banka' }), { needs: 'devir' });
  assert.deepEqual(D.derive('esAnneBaba', { kurum: 'banka', devir: true }), { needs: 'tarih' });
});

test('anne-babadan: kurum kodları ve tarih kategorisi', () => {
  assert.equal(code('anneBaba', { kurum: 'ssk', tarih: '2000-01-01' }), 'A');
  assert.equal(code('anneBaba', { kurum: 'ssk', tarih: '2012-01-01' }), 'A');
  assert.equal(code('anneBaba', { kurum: 'bagkur', tarih: '2000-01-01' }), 'B');
  assert.equal(code('anneBaba', { kurum: 'tarimbagkur', tarih: '2000-01-01' }), 'BT');
  assert.equal(code('anneBaba', { kurum: 'tarimssk' }), 'TSSK');
  assert.equal(code('anneBaba', { kurum: 'emekli', tarih: '2000-01-01' }), 'ES');
  assert.equal(code('anneBaba', { kurum: 'emekli', tarih: '2010-01-01', memur: 'sonra' }), 'C');
  assert.deepEqual(D.derive('anneBaba', { kurum: 'banka', devir: false }), { needs: 'kurum' });
  assert.equal(D.kurumlar('anneBaba').some((k) => k.code === 'banka'), false);
  assert.equal(D.kurumlar('esAnneBaba').some((k) => k.code === 'banka'), true);

  assert.equal(D.tarihKategorisi('2010-01-01', '2012-01-01'), 'sonra');
  assert.equal(D.tarihKategorisi('2000-01-01', '2012-01-01'), 'biri');
  assert.equal(D.tarihKategorisi('2012-01-01', '2000-01-01'), 'biri');
  assert.equal(D.tarihKategorisi('2000-01-01', '2008-09-30'), 'ikisi');
  assert.equal(D.tarihKategorisi('2000-01-01', null), null);
});

test('dul eşe: kanun kodları', () => {
  assert.equal(code('dulEs', { kurum: 'ssk', tarih: '2008-09-30' }), '506');
  assert.equal(code('dulEs', { kurum: 'ssk', tarih: '2008-10-01' }), 'A');
  assert.equal(code('dulEs', { kurum: 'bagkur', tarih: '2008-09-30' }), '1479');
  assert.equal(code('dulEs', { kurum: 'bagkur', tarih: '2008-10-01' }), 'B');
  assert.equal(code('dulEs', { kurum: 'tarimbagkur', tarih: '2008-09-30' }), '2926');
  assert.equal(code('dulEs', { kurum: 'tarimbagkur', tarih: '2008-10-01' }), 'BT');
  assert.equal(code('dulEs', { kurum: 'tarimssk' }), '2925');
  assert.equal(code('dulEs', { kurum: 'emekli', tarih: '2008-10-14' }), '5434');
  assert.equal(code('dulEs', { kurum: 'emekli', tarih: '2008-10-15', memur: 'once' }), '5434');
  assert.equal(code('dulEs', { kurum: 'emekli', tarih: '2008-10-15', memur: 'sonra' }), 'C');
  assert.equal(code('dulEs', { kurum: 'banka' }), 'BS');
});

test('türetilen her kod ilgili tablonun statü listesinde var', () => {
  const tarihler = ['2000-01-01', '2008-09-30', '2008-10-01', '2008-10-14', '2008-10-15', '2020-01-01'];
  for (const modul of ['esAnneBaba', 'anneBaba', 'dulEs']) {
    const codes = RULES[modul].status.map((s) => s.code);
    for (const k of D.kurumlar(modul)) {
      for (const tarih of tarihler) for (const memur of ['once', 'sonra']) for (const devir of [true, false]) {
        const r = D.derive(modul, { kurum: k.code, tarih, memur, devir });
        assert.ok(r.code, `${modul} ${k.code} ${tarih}: ${JSON.stringify(r)}`);
        assert.ok(codes.includes(r.code), `${modul} ${k.code} ${tarih}: ${r.code} statü listesinde yok`);
      }
    }
  }
});
