'use strict';
// Yedi modülün soru akışlarını (js/flows.js) tüm cevap kombinasyonlarında dolaşır:
// akış her yolda biter, aynı soruyu iki kez sormaz, sonuç doğrudan hesapla aynıdır,
// dayanak satırları ve notlar tanımlıdır.

const test = require('node:test');
const assert = require('node:assert/strict');

const F = require('../js/flows.js');
const H = require('../js/hukum.js');
const ENGINE = require('../js/engine.js');
const DERIVE = require('../js/derive.js');
const G = require('../js/genelge.js');

const SOURCE_KEYS = new Set(['esAnneBaba', 'anneBaba', 'dulEs', ...Object.keys(G.TABLES)]);

function dayBefore(iso) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Adım türüne göre denenecek cevaplar
function candidates(step, years, numbers) {
  if (step.type === 'choice') return step.options.map((o) => o.code);
  if (step.type === 'year') return years;
  if (step.type === 'date') {
    const out = new Set();
    DERIVE.ESIK_TARIHLERI.filter((d) => Number(d.slice(0, 4)) === step.year).forEach((d) => { out.add(d); out.add(dayBefore(d)); });
    return [...out].filter((d) => Number(d.slice(0, 4)) === step.year);
  }
  if (step.type === 'number') return numbers[step.id];
  throw new Error('bilinmeyen adım ' + step.type);
}

// Akışı derinlemesine dolaşır; her yaprakta check(a, result, steps) çağrılır
function explore(flow, opts, check, filter) {
  let leaves = 0;
  function dfs(a, depth) {
    assert.ok(depth < 40, flow.id + ': akış 40 adımda bitmedi');
    const steps = flow.steps(a);
    const ids = steps.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, flow.id + ': tekrarlanan soru ' + ids);
    const i = F.currentIndex(steps, a);
    if (i === -1) {
      const out = flow.evaluate(a);
      assert.ok(out.cards.length >= 1);
      out.cards.forEach((c) => {
        assert.ok(c.title, flow.id + ': başlıksız kart');
        (c.refs || []).concat(...(c.variants || []).map((v) => v.refs || [])).forEach((f) => {
          assert.ok(SOURCE_KEYS.has(f.key), 'bilinmeyen tablo ' + f.key);
        });
        (c.notes || []).forEach((k) => assert.ok(G.NOTES[k], 'tanımsız not ' + k));
      });
      (out.notes || []).forEach((k) => assert.ok(G.NOTES[k], 'tanımsız not ' + k));
      const facts = F.facts(flow, a);
      assert.ok(facts.length >= 1);
      check(a, out, steps);
      leaves++;
      return;
    }
    const step = steps[i];
    for (const v of candidates(step, opts.years, opts.numbers || {})) {
      if (filter && !filter(step, v, a)) continue;
      dfs(Object.assign({}, a, { [step.id]: v }), depth + 1);
    }
  }
  dfs({}, 0);
  return leaves;
}

function input(prefix, a) { return F.personInput(prefix, a); }
// Sonuç anahtarı; tabloda satır yoksa 'yok'
function keyOf(r) { return r.sonuc ? r.sonuc.key : (r.status === 'none' ? 'yok' : undefined); }

test('eşten ve anne-babadan: 5.12.2017 sonrası akış doğrudan hesapla aynı', () => {
  const flow = F.byId('esAnneBaba');
  const n = explore(flow, { years: [1990, 2008, 2015] }, (a, out) => {
    const es = input('es', a), ab = input('ab', a);
    const xe = DERIVE.derive('esAnneBaba', es).code, xa = DERIVE.derive('esAnneBaba', ab).code;
    if (a.once === 'bilmiyorum') {
      const v = out.cards[0].variants.map((c) => c.key);
      assert.deepEqual(v, ['evet', 'hayir'].map((o) => keyOf(H.esAb2017Sonrasi({ es: xe, ab: xa, once: o }))));
    } else {
      const r = H.esAb2017Sonrasi({ es: xe, ab: xa, once: a.once || null });
      assert.equal(out.cards[0].key, keyOf(r));
    }
    const y = H.yargitayEsAb({ es: DERIVE.statu(es).code, esTarih: es.tarih, ab: DERIVE.statu(ab).code, abTarih: ab.tarih });
    assert.equal(out.cards[1].key, y.sonuc.key);
  }, (step, v) => !(step.id === 'basvuru' && v !== 'sonra2017'));
  console.log(`  eşten-anne-babadan (5.12.2017 sonrası): ${n} yol`);
  assert.ok(n > 1000);
});

test('eşten ve anne-babadan: 5.12.2017 öncesi akış Tablo-9 ile aynı', () => {
  const flow = F.byId('esAnneBaba');
  const n = explore(flow, { years: [1995, 2000, 2001, 2003, 2008, 2015] }, (a, out) => {
    const es = input('es', a), ab = input('ab', a);
    const r = H.esAb2017Oncesi({ es: DERIVE.statu(es).code, esTarih: es.tarih, ab: DERIVE.statu(ab).code, abTarih: ab.tarih, donem2016: a.donem2016 || null, gelirAlti: a.gelirAlti ? a.gelirAlti === 'evet' : null });
    assert.notEqual(r.status, 'needs', 'cevapsız koşul kaldı');
    assert.equal(out.cards[0].key, keyOf(r));
  }, (step, v) => !(step.id === 'basvuru' && v !== 'once2017'));
  console.log(`  eşten-anne-babadan (5.12.2017 öncesi): ${n} yol`);
  assert.ok(n > 1000);
});

test('anne ve babadan: akış Tablo-6 motoruyla aynı', () => {
  const flow = F.byId('anneBaba');
  const n = explore(flow, { years: [1990, 2008, 2015] }, (a, out) => {
    if (a.tur === 'evlatlik') { assert.equal(out.cards[0].tone, 'good'); return; }
    const b = input('baba', a), m = input('anne', a);
    const inp = { baba: DERIVE.derive('anneBaba', b).code, anne: DERIVE.derive('anneBaba', m).code, tarih: DERIVE.tarihKategorisi(b.tarih, m.tarih) };
    if (a.donem === 'bilmiyorum') {
      assert.deepEqual(out.cards[0].variants.map((v) => v.key), ['once2017', 'sonra2017'].map((d) => keyOf(ENGINE.evalAnneBaba({ ...inp, donem: d }))));
    } else {
      assert.equal(out.cards[0].key, keyOf(ENGINE.evalAnneBaba({ ...inp, donem: a.donem || null })));
    }
  });
  console.log(`  anne ve babadan: ${n} yol`);
});

test('iki eşten: akış Tablo-2 motoruyla aynı', () => {
  const flow = F.byId('dulEs');
  const n = explore(flow, { years: [1990, 2008, 2015] }, (a, out) => {
    const r = ENGINE.evalDulEs({ ilk: DERIVE.derive('dulEs', input('ilk', a)).code, ikinci: DERIVE.derive('dulEs', input('ikinci', a)).code });
    assert.equal(out.cards[0].key, keyOf(r));
  });
  console.log(`  iki eşten: ${n} yol`);
});

test('kız çocuğu: akış Tablo-3/4/5 ile aynı ve her koşul cevaplanmış', () => {
  const flow = F.byId('kiz');
  const n = explore(flow, { years: [1995, 1999, 2000, 2001, 2003, 2008, 2015] }, (a, out) => {
    const p = input('eb', a);
    const c = {};
    Object.keys(a).filter((k) => k.startsWith('c.')).forEach((k) => { c[k.slice(2)] = a[k] === 'evet'; });
    const g = { code: DERIVE.statu(p).code, tarih: p.tarih, donem2016: a.donem2016 || null, c };
    const sgk = H.kizHak({ ...g, donem: a.basvuru });
    const yar = H.kizHak({ ...g, donem: 'yargitay' });
    assert.equal(sgk.status, 'ok', 'SGK kartı eksik cevapla bitti');
    assert.equal(yar.status, 'ok', 'Yargıtay kartı eksik cevapla bitti');
    assert.equal(out.cards[0].key, sgk.sonuc.key);
    assert.equal(out.cards[1].key, yar.sonuc.key);
  });
  console.log(`  kız çocuğu: ${n} yol`);
});

test('anne: akış Tablo-7 ile aynı', () => {
  const flow = F.byId('anne');
  const n = explore(flow, { years: [1999, 2001, 2003, 2005, 2008, 2015] }, (a, out) => {
    if (a.ozCocuk === 'hayir') { assert.equal(out.cards[0].key, 'degil'); return; }
    const p = input('co', a);
    const c = {};
    Object.keys(a).filter((k) => k.startsWith('c.')).forEach((k) => { c[k.slice(2)] = a[k] === 'evet'; });
    const r = H.anneHak({ ozCocuk: true, code: DERIVE.statu(p).code, tarih: p.tarih, donem: a.basvuru || 'sonra2017', hizmet: a.hizmet || null, c });
    assert.notEqual(r.status, 'needs');
    assert.equal(out.cards[0].key, keyOf(r));
  });
  console.log(`  anne: ${n} yol`);
});

test('prim şartı: akış Tablo-1 ile aynı', () => {
  const flow = F.byId('prim');
  const n = explore(flow, { years: [1999, 2000, 2001, 2003, 2008, 2015], numbers: { prim: [800, 1080, 1799, 1800, 3600], sigYil: [4, 5] } }, (a, out) => {
    const p = input('si', a);
    const r = H.primSarti({ code: DERIVE.statu(p).code, tarih: p.tarih, aylikAlirken: a.aylikAlirken === 'evet', prim: a.prim, yil: a.sigYil });
    assert.equal(r.status === 'needs', false);
    assert.equal(out.cards[0].key, keyOf(r));
  });
  console.log(`  prim şartı: ${n} yol`);
});

test('dul eş: hak sahipliği ve hisse', () => {
  const flow = F.byId('dulHak');
  const seen = new Set();
  const n = explore(flow, { years: [1990, 2008, 2015] }, (a, out) => { seen.add(out.cards[out.cards.length - 1].title); });
  console.log(`  dul eş: ${n} yol`);
  for (const t of ['Ölüm aylığı hissesi %75.', 'Ölüm aylığı hissesi %50.', 'Ölüm aylığı hissesi %60.', 'Hak sahibi değildir.', 'Şu anda hak sahibi değildir.']) {
    assert.ok(seen.has(t), 'görülmedi: ' + t);
  }
});

test('Geri: bir cevap silinince sonraki cevaplar yeniden sorulur', () => {
  const flow = F.byId('esAnneBaba');
  const a = { basvuru: 'sonra2017', 'es.kurum': 'ssk', 'es.yil': 2010, 'ab.kurum': 'bagkur', 'ab.yil': 2001, once: 'evet' };
  assert.equal(F.currentIndex(flow.steps(a), a), -1);
  a['es.kurum'] = 'tarimssk';
  delete a.once;
  const ids = flow.steps(a).map((s) => s.id);
  assert.deepEqual(ids, ['basvuru', 'es.kurum', 'es.yil', 'ab.kurum', 'ab.yil']);
  assert.equal(flow.evaluate(a).cards[0].key, 'iki');
});
