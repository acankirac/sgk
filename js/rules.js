// Excel tablolarının kodlanmış hali.
// Her kural, kaynak Excel'deki satır numarasına (row) bağlıdır; ham hücre
// metinleri js/excel-rows.js içinden okunur, burada yalnızca eşleştirme
// mantığı tutulur. tests/engine.test.js bu kuralların Excel ile tutarlı
// olduğunu doğrular.
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1) Eşten ve anne-babadan (sayfa: "eşten-anne -babadan")             */
  /* ------------------------------------------------------------------ */

  // Statü kodları. Excel'de statü ile ölüm tarihi birlikte anlam taşır;
  // bu yüzden her seçenek "kurum + tarih koşulu" olarak tek kod altında.
  var ES_STATUS = [
    { code: 'SSK', kurum: 'SSK / 4-a', label: 'SSK (506)', tarih: 'ölüm 1.10.2008 öncesi', excel: 'SSK' },
    { code: 'A', kurum: 'SSK / 4-a', label: '5510 4/I-(a)', tarih: 'ölüm 30.9.2008 sonrası', excel: '4/I-(a)' },
    { code: 'BK', kurum: 'Bağ-Kur / 4-b', label: 'Bağ-Kur (1479)', tarih: 'ölüm 1.10.2008 öncesi', excel: 'BağKur' },
    { code: 'B', kurum: 'Bağ-Kur / 4-b', label: '5510 4/I-(b)', tarih: 'ölüm 30.9.2008 sonrası', excel: '4/I-(b)' },
    { code: 'ES', kurum: 'Emekli Sandığı / 4-c', label: 'Emekli Sandığı (5434)', tarih: 'ölüm tarihi fark etmez', excel: 'Emekli Sandığı' },
    { code: 'C', kurum: 'Emekli Sandığı / 4-c', label: '5510 4/I-(c)', tarih: 'ölüm 14.10.2008 sonrası', excel: '4/I-(c)' },
    { code: 'TSSK', kurum: 'Tarım', label: 'Tarım SSK (2925)', tarih: 'ölüm tarihi fark etmez', excel: 'Tarım SSK' },
    { code: 'TBK', kurum: 'Tarım', label: 'Tarım Bağ-Kur (2926)', tarih: 'ölüm 1.10.2008 öncesi', excel: 'Tarım Bağkur' },
    { code: 'BT', kurum: 'Tarım', label: '5510 4/I-(b) Tarım', tarih: 'ölüm 30.9.2008 sonrası', excel: '4/I-(b) Tarım' },
    { code: 'BSA', kurum: 'Banka Sandığı', label: 'Banka Sandığı (Aktif)', tarih: 'ölüm tarihi fark etmez', excel: 'B. Sandığı (Aktif)' },
    { code: 'BSD', kurum: 'Banka Sandığı', label: 'Banka Sandığı (Devir)', tarih: 'ölüm 1.10.2008 öncesi', excel: 'B. Sandığı (Devir)' },
    { code: 'BSD2', kurum: 'Banka Sandığı', label: 'Banka Sandığı (Devir)', tarih: 'ölüm 30.9.2008 sonrası', excel: 'B. Sandığı (Devir)' }
  ];

  // Sık kullanılan kod grupları
  var TBK_BT = ['TBK', 'BT'];             // "Tarım Bağkur-4/I (b) Tarım" (tarih önemsiz)
  var BSD_ALL = ['BSD', 'BSD2'];          // "B. Sandığı (Devir)" (tarih önemsiz)
  var SSK_A = ['SSK', 'A'];               // "SSK-4/I-(a)"
  var BK_B = ['BK', 'B'];                 // "BağKur-4/I (b)"
  var ES_C = ['ES', 'C'];                 // "Emekli Sandığı-4/I (c)"
  var TARIM_BANKA = ['TSSK', 'TBK', 'BT', 'BSA', 'BSD', 'BSD2']; // "Tarım SSK- Tarım Bağkur-4/I (b) Tarım B.Sand. (Aktif-Devir)"
  var TBK_BT_BANKA = ['TBK', 'BT', 'BSA', 'BSD', 'BSD2'];       // "Tarım Bağkur- 4/I-(b) Tarım- B. Sandığı (Aktif-Devir)"

  // once: E sütunu ("Anne-babadan 1.10.2008 öncesi aylık bağlanmış mı?")
  //   'any'   -> Evet/Hayır fark etmez
  //   'na'    -> "-" (soru bu satır için uygulanmaz)
  //   'evet'  -> yalnızca Evet ise
  //   'hayir' -> yalnızca Hayır ise
  // sonuc: 'iki' (İki aylık) | 'tek' (Tek aylık)
  var ES_RULES = [
    { row: 2, es: ['SSK'], ab: ['BK', 'B', 'ES', 'C', 'TSSK', 'TBK', 'BT', 'BSA'], once: 'any', sonuc: 'iki' },
    { row: 3, es: ['A'], ab: ['BK'], once: 'evet', sonuc: 'iki' },
    { row: 4, es: ['A'], ab: ['BK'], once: 'hayir', sonuc: 'tek' },
    { row: 5, es: ['A'], ab: ['B'], once: 'na', sonuc: 'tek' },
    { row: 6, es: ['A'], ab: ['ES'], once: 'any', sonuc: 'iki' },
    { row: 7, es: ['A'], ab: ['C'], once: 'na', sonuc: 'tek' },
    { row: 8, es: ['A'], ab: TBK_BT, once: 'any', sonuc: 'tek' },
    { row: 9, es: ['A'], ab: ['TSSK'], once: 'any', sonuc: 'iki' },
    { row: 10, es: ['A'], ab: ['BSA'], once: 'any', sonuc: 'iki' },
    { row: 11, es: ['BK'], ab: SSK_A, once: 'any', sonuc: 'iki' },
    { row: 12, es: ['B'], ab: ['SSK'], once: 'evet', sonuc: 'iki' },
    { row: 13, es: ['B'], ab: ['SSK'], once: 'hayir', sonuc: 'tek' },
    { row: 14, es: ['B'], ab: ['A'], once: 'na', sonuc: 'tek' },
    { row: 15, es: ['ES'], ab: SSK_A, once: 'any', sonuc: 'iki' },
    { row: 16, es: ['C'], ab: ['SSK'], once: 'evet', sonuc: 'iki' },
    { row: 17, es: ['C'], ab: ['SSK'], once: 'hayir', sonuc: 'tek' },
    { row: 18, es: ['C'], ab: ['A'], once: 'na', sonuc: 'tek' },
    { row: 19, es: ['TSSK'], ab: SSK_A, once: 'any', sonuc: 'iki' },
    { row: 20, es: ['TBK'], ab: SSK_A, once: 'any', sonuc: 'iki' },
    { row: 21, es: ['BT'], ab: ['A'], once: 'na', sonuc: 'tek' },
    { row: 22, es: ['BSA'], ab: SSK_A, once: 'any', sonuc: 'iki' },
    { row: 23, es: ['BK'], ab: ES_C, once: 'any', sonuc: 'iki' },
    { row: 24, es: ['BK'], ab: ['TSSK'], once: 'any', sonuc: 'iki' },
    { row: 25, es: ['BK'], ab: TBK_BT, once: 'any', sonuc: 'iki' },
    { row: 26, es: ['BK'], ab: ['BSA'], once: 'any', sonuc: 'iki' },
    { row: 27, es: ['BK'], ab: BSD_ALL, once: 'any', sonuc: 'iki' },
    { row: 28, es: ['B'], ab: ['ES'], once: 'any', sonuc: 'iki' },
    { row: 29, es: ['B'], ab: ['C'], once: 'na', sonuc: 'tek' },
    { row: 30, es: ['B'], ab: ['TSSK'], once: 'any', sonuc: 'iki' },
    { row: 31, es: ['B'], ab: TBK_BT, once: 'na', sonuc: 'tek' },
    { row: 32, es: ['B'], ab: ['BSA'], once: 'any', sonuc: 'iki' },
    { row: 33, es: ['B'], ab: ['BSD'], once: 'evet', sonuc: 'iki' },
    { row: 34, es: ['ES'], ab: BK_B, once: 'any', sonuc: 'iki' },
    { row: 35, es: ['C'], ab: ['B'], once: 'na', sonuc: 'tek' },
    { row: 36, es: ['C'], ab: ['BK'], once: 'evet', sonuc: 'iki' },
    { row: 37, es: ['C'], ab: ['BK'], once: 'hayir', sonuc: 'tek' },
    { row: 38, es: ['TSSK'], ab: BK_B, once: 'any', sonuc: 'iki' },
    { row: 39, es: ['TBK'], ab: BK_B, once: 'any', sonuc: 'iki' },
    { row: 40, es: ['BT'], ab: ['B'], once: 'na', sonuc: 'tek' },
    { row: 41, es: ['BSA'], ab: BK_B, once: 'any', sonuc: 'iki' },
    { row: 42, es: ['BSD'], ab: BK_B, once: 'any', sonuc: 'iki' },
    { row: 43, es: ['ES'], ab: TARIM_BANKA, once: 'any', sonuc: 'iki' },
    { row: 44, es: TARIM_BANKA, ab: ['ES'], once: 'any', sonuc: 'iki' },
    { row: 45, es: ['C'], ab: ['TSSK'], once: 'any', sonuc: 'iki' },
    { row: 46, es: ['C'], ab: TBK_BT, once: 'any', sonuc: 'tek' },
    { row: 47, es: ['C'], ab: ['BSA'], once: 'any', sonuc: 'iki' },
    { row: 48, es: ['C'], ab: ['BSD'], once: 'evet', sonuc: 'iki' },
    { row: 49, es: ['BSA'], ab: ['C'], once: 'na', sonuc: 'iki' },
    { row: 50, es: ['BSD'], ab: ['C'], once: 'na', sonuc: 'iki' },
    { row: 51, es: ['TSSK'], ab: ['C'], once: 'na', sonuc: 'iki' },
    { row: 52, es: ['TBK'], ab: ['C'], once: 'na', sonuc: 'iki' },
    { row: 53, es: ['BT'], ab: ['C'], once: 'na', sonuc: 'tek' },
    { row: 54, es: ['TSSK'], ab: TBK_BT_BANKA, once: 'any', sonuc: 'iki' },
    { row: 55, es: TBK_BT_BANKA, ab: ['TSSK'], once: 'any', sonuc: 'iki' },
    { row: 56, es: TBK_BT, ab: ['BSA'], once: 'any', sonuc: 'iki' },
    { row: 57, es: ['TBK'], ab: BSD_ALL, once: 'na', sonuc: 'iki' },
    { row: 58, es: ['BT'], ab: ['BSD2'], once: 'na', sonuc: 'tek' },
    { row: 59, es: ['BSA'], ab: TBK_BT, once: 'any', sonuc: 'iki' },
    { row: 60, es: ['BSD'], ab: TBK_BT, once: 'any', sonuc: 'iki' },
    { row: 61, es: ['BSD2'], ab: ['BT'], once: 'na', sonuc: 'tek' }
  ];

  var ES_SONUC = {
    iki: { key: 'iki', title: 'İki aylık bağlanır.', tone: 'good' },
    tek: { key: 'tek', title: 'Tek aylık bağlanır.', tone: 'warn' }
  };

  /* ------------------------------------------------------------------ */
  /* 2) Anne ve babadan (sayfa: "anne-babadan", Tablo-6)                 */
  /* ------------------------------------------------------------------ */

  var AB_STATUS = [
    { code: 'A', label: 'SSK / 5510 4/I-(a)', excel: '5510, 4/I-(a) veya SSK' },
    { code: 'B', label: 'Bağ-Kur / 5510 4/I-(b)', excel: '5510, 4/I-(b) veya Bağ-Kur' },
    { code: 'BT', label: 'Tarım Bağ-Kur / 5510 4/I-(b.4)', excel: '5510, 4/I-(b.4) veya Tarım Bağ-Kur' },
    { code: 'C', label: '5510 4/I-(c)', excel: '5510, 4/I-(c)' },
    { code: 'ES', label: 'Emekli Sandığı (5434)', excel: 'Emekli Sandığı (5434)' },
    { code: 'TSSK', label: 'Tarım SSK (2925)', excel: '2925 Tarım SSK' }
  ];

  var AB_TARIH = [
    { code: 'sonra', label: 'Her ikisi de 30.9.2008 sonrası', excel: 'Ölüm 30.9.2008 Sonrası' },
    { code: 'biri', label: 'Biri 1.10.2008 öncesi, diğeri sonrası', excel: 'Ölümlerden biri 1 Ekim 2008 öncesi' },
    { code: 'ikisi', label: 'Her ikisi de 1.10.2008 öncesi', excel: 'Ölümlerden ikisi de 1 Ekim 2008 öncesi' }
  ];

  var AB_DONEM = [
    { code: 'once2017', label: '5.12.2017 öncesi' },
    { code: 'sonra2017', label: '5.12.2017 ve sonrası' }
  ];

  // Eşleştirme sırasız yapılır: (x, y) çifti hem "Baba-Anne" hem "Anne-Baba"
  // sütunlarına karşı denenir.
  //   tarih: 'any' | 'sonra' | 'biri' | 'ikisi'
  //   donem: undefined | 'once2017' | 'sonra2017'  (5.12.2017 ayrımı)
  //   x, y : kod kümeleri (biri x'ten, diğeri y'den olmalı)
  // Not: 2. satır tabloda "5510, 4/I-(a), 4/I-(b), 4/I-(c)" olarak yazılıdır;
  // 4/I-(b.4) bu satırda ayrıca sayılmadığından eklenmemiştir (motor bu
  // durumu cevapta açıklar).
  var FIVE510 = ['A', 'B', 'C'];
  var AB_RULES = [
    { row: 2, tarih: 'sonra', x: FIVE510, y: FIVE510, sonuc: 'yuksekTamDusukYarim' },
    { row: 3, tarih: 'any', x: ['TSSK'], y: ['TSSK'], sonuc: 'yuksekTamDusukYarim' },
    { row: 4, tarih: 'any', x: ['ES'], y: ['ES'], sonuc: 'tercihTam' },
    { row: 5, tarih: 'any', x: ['A', 'B', 'C', 'BT', 'TSSK'], y: ['ES'], sonuc: 'ikiTam' },
    { row: 6, tarih: 'any', x: ['TSSK'], y: ['A', 'B', 'BT', 'C', 'ES'], sonuc: 'ikiTam' },
    { row: 7, tarih: 'biri', x: ['A', 'B', 'BT'], y: ['A', 'B', 'BT'], sonuc: 'yuksekTamDusukYarim' },
    { row: 8, tarih: 'ikisi', x: ['A'], y: ['A'], sonuc: 'yuksekTamDusukYarim' },
    { row: 9, tarih: 'ikisi', x: ['B'], y: ['B'], donem: 'once2017', sonuc: 'yuksekOlan' },
    { row: 10, tarih: 'ikisi', x: ['B'], y: ['B'], donem: 'sonra2017', sonuc: 'yuksekTamDusukYarim' },
    { row: 11, tarih: 'ikisi', x: ['BT'], y: ['BT'], donem: 'once2017', sonuc: 'yuksekOlan' },
    { row: 12, tarih: 'ikisi', x: ['BT'], y: ['BT'], donem: 'sonra2017', sonuc: 'yuksekTamDusukYarim' }
  ];

  var AB_SONUC = {
    yuksekTamDusukYarim: { key: 'yuksekTamDusukYarim', title: 'Yüksek aylık tam, düşük aylık yarım bağlanır.', tone: 'info' },
    tercihTam: { key: 'tercihTam', title: 'Tercih edilen aylık tam bağlanır.', tone: 'warn' },
    ikiTam: { key: 'ikiTam', title: 'İki tam aylık bağlanır.', tone: 'good' },
    yuksekOlan: { key: 'yuksekOlan', title: 'Yüksek olan aylık bağlanır.', tone: 'warn' }
  };

  /* ------------------------------------------------------------------ */
  /* 3) Dul eşe, iki eşten (sayfa: "dul eşe")                            */
  /* ------------------------------------------------------------------ */

  var DUL_STATUS = [
    { code: '506', kurum: 'SSK / 4-a', label: '506 sayılı Kanun (SSK)', excel: '506' },
    { code: 'A', kurum: 'SSK / 4-a', label: '5510 4/I-(a)', excel: '5510, 4/I-(a)' },
    { code: '1479', kurum: 'Bağ-Kur / 4-b', label: '1479 sayılı Kanun (Bağ-Kur)', excel: '1479' },
    { code: 'B', kurum: 'Bağ-Kur / 4-b', label: '5510 4/I-(b)', excel: '5510, 4/I-(b)' },
    { code: '2926', kurum: 'Tarım', label: '2926 sayılı Kanun (Tarım Bağ-Kur)', excel: '2926' },
    { code: 'BT', kurum: 'Tarım', label: '5510 4/I-(b.4) Tarım', excel: '5510, 4/I-(b.4)' },
    { code: '2925', kurum: 'Tarım', label: '2925 sayılı Kanun (Tarım SSK)', excel: '2925' },
    { code: '5434', kurum: 'Emekli Sandığı / 4-c', label: '5434 sayılı Kanun (Emekli Sandığı)', excel: '5434' },
    { code: 'C', kurum: 'Emekli Sandığı / 4-c', label: '5510 4/I-(c)', excel: '5510, 4/I-(c)' },
    { code: 'BS', kurum: 'Banka Sandığı', label: 'Banka Sandığı', excel: 'Banka Sandığı' }
  ];

  // ilk: ölen ilk eş, ikinci: ölen ikinci eş. Eşleştirme sırasız yapılır.
  var DUL_RULES = [
    { row: 2, ilk: ['506'], ikinci: ['506'], sonuc: 'tercih' },
    { row: 3, ilk: ['1479'], ikinci: ['1479'], sonuc: 'tercih' },
    { row: 4, ilk: ['2925'], ikinci: ['2925'], sonuc: 'tercih' },
    { row: 5, ilk: ['2926'], ikinci: ['2926'], sonuc: 'tercih' },
    { row: 6, ilk: ['5434'], ikinci: ['5434'], sonuc: 'tercih' },
    { row: 7, ilk: ['506'], ikinci: ['A'], sonuc: 'tercih' },
    { row: 8, ilk: ['1479'], ikinci: ['B'], sonuc: 'tercih' },
    { row: 9, ilk: ['2926'], ikinci: ['BT'], sonuc: 'tercih' },
    { row: 10, ilk: ['C'], ikinci: ['C'], sonuc: 'tercih' },
    { row: 12, ilk: ['5434'], ikinci: ['C'], sonuc: 'tercih' },
    { row: 13, ilk: ['506'], ikinci: ['1479', '2925', '2926', '5434', 'B', 'BT', 'C', 'BS'], sonuc: 'iki' },
    { row: 14, ilk: ['1479'], ikinci: ['506', '2925', '2926', '5434', 'A', 'BT', 'C', 'BS'], sonuc: 'iki' },
    { row: 15, ilk: ['2926'], ikinci: ['506', '2925', '5434', 'A', 'B', 'C', 'BS'], sonuc: 'iki' },
    { row: 16, ilk: ['2925'], ikinci: ['506', '1479', '2926', '5434', 'A', 'B', 'BT', 'C', 'BS'], sonuc: 'iki' },
    { row: 17, ilk: ['5434'], ikinci: ['506', '1479', '2925', '2926', 'A', 'B', 'BT', 'BS'], sonuc: 'iki' }
  ];

  var DUL_SONUC = {
    tercih: { key: 'tercih', title: 'Tercih edilen aylık bağlanır.', tone: 'warn' },
    iki: { key: 'iki', title: 'İki aylık bağlanır.', tone: 'good' }
  };

  // Excel'in "dul eşe" sayfasında 11. satırda yer alan dipnotlar
  var DUL_NOTLAR = [
    { no: 16, text: 'Ölen eşlerin tamamının veya birinin ölüm tarihi 1 Ekim 2008 tarihi öncesi ve aylık almaya esas sigorta kanunları (ve sigorta statüleri) farklıysa iki aylık bağlanır.' },
    { no: 17, text: '1 Ekim 2008 tarihinden önce ölen sigortalıların gelir ve aylıkları farklı statüde ise aylık ve gelir tam bağlandığı gibi aylığın 5434 sayılı Kanun kapsamında, gelirin ise diğer kanunlar kapsamında olması halinde aylık ve gelir tam bağlanır.' }
  ];

  var RULES = {
    esAnneBaba: { status: ES_STATUS, rules: ES_RULES, sonuc: ES_SONUC },
    anneBaba: { status: AB_STATUS, tarih: AB_TARIH, donem: AB_DONEM, rules: AB_RULES, sonuc: AB_SONUC, baslik: 'Tablo-6: Kız Çocuklarına Anne ve Babadan İki Aylık Bağlanmasına İlişkin Tablo' },
    dulEs: { status: DUL_STATUS, rules: DUL_RULES, sonuc: DUL_SONUC, notlar: DUL_NOTLAR }
  };

  root.SGK_RULES = RULES;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RULES;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
