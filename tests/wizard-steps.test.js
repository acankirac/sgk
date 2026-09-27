'use strict';
// Adım adım modun mantığı (js/wizard-steps.js): soru sırası deterministik,
// üretilen motor girdisi tablodaki statü kodlarından oluşur ve sonuç, aynı
// kodlarla hızlı girişten alınan sonuçla birebir aynıdır.

const test = require('node:test');
const assert = require('node:assert/strict');

const RULES = require('../js/rules.js');
const ENGINE = require('../js/engine.js');
const DERIVE = require('../js/derive.js');
const STEPS = require('../js/wizard-steps.js');

const MODULES = ['esAnneBaba', 'anneBaba', 'dulEs'];
const YEARS = [1990, 2008, 2015];
const DAYS_2008 = ['2008-09-30', '2008-10-01', '2008-10-14', '2008-10-15'];

// Verilen tercihlerle sihirbazı baştan sona "oynatır"; cevap nesnesini ve soru sırasını döndürür.
function play(modul, choose) {
  const a = {};
  const asked = [];
  for (let guard = 0; guard < 30; guard++) {
    const steps = STEPS.allSteps(modul, a);
    const idx = STEPS.currentIndex(steps, a);
    if (idx === -1) { return { answers: a, steps, asked }; }
    const step = steps[idx];
    assert.ok(!asked.includes(step.id), `${modul}: ${step.id} sorusu iki kez soruldu`);
    asked.push(step.id);
    const value = choose(step, a);
    assert.ok(value != null, `${modul}: ${step.id} için cevap üretilemedi`);
    if (step.type === 'choice') {
      assert.ok(step.options.some((o) => o.code === value), `${modul}: ${step.id} için ${value} seçeneklerde yok`);
    }
    a[step.id] = value;
  }
  assert.fail(`${modul}: sihirbaz 30 adımda bitmedi`);
}

function chooser(prefs) {
  return (step) => {
    const id = step.id;
    if (id.endsWith('.kurum')) { return prefs.kurum[id.split('.')[0]]; }
    if (id.endsWith('.yil')) { return prefs.yil[id.split('.')[0]]; }
    if (id.endsWith('.gun')) { return prefs.gun[id.split('.')[0]]; }
    if (id.endsWith('.memur')) { return prefs.memur; }
    if (id.endsWith('.devir')) { return prefs.devir; }
    if (id === 'once') { return prefs.once; }
    if (id === 'donem') { return prefs.donem; }
    return null;
  };
}

function statusCodes(modul) { return RULES[modul].status.map((s) => s.code); }

test('her kombinasyonda sihirbaz biter, kodlar tabloda ve sonuç hızlı girişle aynı', () => {
  let cases = 0;
  for (const modul of MODULES) {
    const persons = STEPS.PERSONS[modul];
    const kurumlar = DERIVE.kurumlar(modul).map((k) => k.code);
    for (const k0 of kurumlar) for (const k1 of kurumlar) {
      for (const y0 of YEARS) for (const y1 of YEARS) {
        const days0 = y0 === 2008 ? DAYS_2008 : [null];
        const days1 = y1 === 2008 ? DAYS_2008 : [null];
        for (const d0 of days0) for (const d1 of days1) for (const memur of ['once', 'sonra']) for (const devir of ['evet', 'hayir']) {
          for (const once of ['evet', 'hayir']) for (const donem of ['once2017', 'sonra2017']) {
            const prefs = {
              kurum: { [persons[0].prefix]: k0, [persons[1].prefix]: k1 },
              yil: { [persons[0].prefix]: y0, [persons[1].prefix]: y1 },
              gun: { [persons[0].prefix]: d0, [persons[1].prefix]: d1 },
              memur, devir, once, donem
            };
            const { answers, asked } = play(modul, chooser(prefs));
            const out = STEPS.finalEvaluate(modul, answers);
            assert.equal(out.dual, false);
            const codes = statusCodes(modul);
            Object.keys(out.input).forEach((key) => {
              if (['es', 'ab', 'baba', 'anne', 'ilk', 'ikinci'].includes(key)) {
                assert.ok(codes.includes(out.input[key]), `${modul}: ${key}=${out.input[key]} tabloda yok`);
              }
            });
            // Hızlı girişle aynı sonuç
            const direct = STEPS.runEngine(modul, out.input);
            assert.equal(out.res.status, direct.status);
            assert.equal(out.res.sonuc && out.res.sonuc.key, direct.sonuc && direct.sonuc.key);
            // Ortak soru yalnızca gerektiğinde soruldu
            assert.equal(asked.includes('once'), !!direct.needsOnce, `${modul}: once sorusu ${asked.includes('once') ? 'soruldu' : 'sorulmadı'} ama needsOnce=${direct.needsOnce}`);
            assert.equal(asked.includes('donem'), !!direct.needsDonem);
            // 2008 dışı yıllarda gün sorulmaz; 2008'de sorulur
            for (const p of persons) {
              const askedYear = asked.includes(p.prefix + '.yil');
              const askedDay = asked.includes(p.prefix + '.gun');
              if (askedYear) { assert.equal(askedDay, prefs.yil[p.prefix] === 2008); }
              else { assert.equal(askedDay, false); }
            }
            cases++;
          }
        }
      }
    }
  }
  console.log(`  sihirbaz: ${cases} kombinasyon oynatıldı`);
});

test('tarih gerekmeyen kurumlarda yıl sorulmaz', () => {
  const { asked } = play('esAnneBaba', chooser({ kurum: { es: 'tarimssk', ab: 'banka' }, yil: {}, gun: {}, memur: 'once', devir: 'hayir', once: 'evet', donem: 'once2017' }));
  assert.deepEqual(asked, ['es.kurum', 'ab.kurum', 'ab.devir']);
  const { asked: asked2 } = play('dulEs', chooser({ kurum: { ilk: 'banka', ikinci: 'tarimssk' }, yil: {}, gun: {}, memur: 'once', devir: 'evet', once: 'evet', donem: 'once2017' }));
  assert.deepEqual(asked2, ['ilk.kurum', 'ikinci.kurum']);
});

test('Emekli Sandığı: memuriyet başlangıcı yalnızca 15.10.2008 sonrası vefatta sorulur', () => {
  const before = play('esAnneBaba', chooser({ kurum: { es: 'emekli', ab: 'tarimssk' }, yil: { es: 2008 }, gun: { es: '2008-10-14' }, memur: 'sonra', devir: 'hayir', once: 'evet', donem: 'once2017' }));
  assert.deepEqual(before.asked, ['es.kurum', 'es.yil', 'es.gun', 'ab.kurum']);
  assert.equal(before.steps.length, 4);
  const after = play('esAnneBaba', chooser({ kurum: { es: 'emekli', ab: 'tarimssk' }, yil: { es: 2008 }, gun: { es: '2008-10-15' }, memur: 'sonra', devir: 'hayir', once: 'evet', donem: 'once2017' }));
  assert.deepEqual(after.asked, ['es.kurum', 'es.yil', 'es.gun', 'es.memur', 'ab.kurum']);
  assert.equal(STEPS.finalEvaluate('esAnneBaba', after.answers).input.es, 'C');
});

test('Bilmiyorum: iki olasılık, her biri hızlı girişle aynı', () => {
  const { answers, asked } = play('esAnneBaba', chooser({ kurum: { es: 'ssk', ab: 'bagkur' }, yil: { es: 2010, ab: 2001 }, gun: {}, memur: 'once', devir: 'hayir', once: 'bilmiyorum', donem: 'once2017' }));
  assert.ok(asked.includes('once'));
  const out = STEPS.finalEvaluate('esAnneBaba', answers);
  assert.equal(out.dual, true);
  assert.equal(out.variants.length, 2);
  assert.equal(out.variants[0].res.sonuc.key, ENGINE.evalEsAnneBaba({ es: 'A', ab: 'BK', once: 'evet' }).sonuc.key);
  assert.equal(out.variants[1].res.sonuc.key, ENGINE.evalEsAnneBaba({ es: 'A', ab: 'BK', once: 'hayir' }).sonuc.key);
  assert.equal(out.input.once, null);

  const ab = play('anneBaba', chooser({ kurum: { baba: 'bagkur', anne: 'bagkur' }, yil: { baba: 1995, anne: 2003 }, gun: {}, memur: 'once', devir: 'hayir', once: 'evet', donem: 'bilmiyorum' }));
  const out2 = STEPS.finalEvaluate('anneBaba', ab.answers);
  assert.equal(out2.dual, true);
  assert.deepEqual(out2.variants.map((v) => v.res.rows[0].row), [9, 10]);
});

test('Geri: bir cevap silinince sonraki cevaplar da geçersizleşir (yeniden sorulur)', () => {
  const { answers, steps } = play('esAnneBaba', chooser({ kurum: { es: 'ssk', ab: 'bagkur' }, yil: { es: 2010, ab: 2001 }, gun: {}, memur: 'once', devir: 'hayir', once: 'evet', donem: 'once2017' }));
  assert.equal(STEPS.currentIndex(steps, answers), -1);
  // Eşin kurumunu değiştir: Tarım SSK -> yıl sorusu düşer, once sorusu düşer
  delete answers['es.yil'];
  answers['es.kurum'] = 'tarimssk';
  const steps2 = STEPS.allSteps('esAnneBaba', answers);
  assert.deepEqual(steps2.map((s) => s.id), ['es.kurum', 'ab.kurum', 'ab.yil']);
  assert.equal(STEPS.currentIndex(steps2, answers), -1);
  assert.equal(STEPS.finalEvaluate('esAnneBaba', answers).res.sonuc.key, 'iki');
});
