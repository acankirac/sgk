// Kaynak dokümandaki tabloların birebir aktarımı.
// Kaynak: Murat Özdamar (SGK Denetmeni), "Kadınlara Eşinden Anne-Babasından ve
// Çocuğundan Ölüm Aylığı Bağlanması", İş ve Hayat, s.118–160.
// Tablo-2, Tablo-6 ve s.148–150'deki numarasız tablo js/excel-rows.js içindedir
// (aynı tabloların Excel aktarımı). Hücre metinleri kaynaktaki gibidir; yalnızca
// satır sonları birleştirilmiştir. Satır numaraları 1'den başlar.
(function (root) {
  'use strict';

  var C1 = 'Türkiye’de/Yurtdışında sigortalı çalışmamak · Asli sigortalı geliri/aylığı almamak · Evlenmemiş, boşanmış, dul kalmış olmak';
  var C_ES = 'Devlet memuru olmamak (5434 veya 5510, m.4/I-c sigortalısı olmamak) · 5434 veya 5510, m.4/I-c kapsamında aylık almamak · Evlenmemiş, boşanmış, dul kalmış olmak';
  var C_HIC = 'Türkiye’de/Yurtdışında sigortalı çalışmamak · Herhangi bir statüde aylık almamak (ölüm gelir/aylığı dahil) · Evlenmemiş, boşanmış, dul kalmış olmak';
  var A5510 = 'Asli sigortalı geliri/aylığı veya ölen çocuklar hariç ölüm aylığı/geliri almamak · Kişi başına düşen geliri asgari ücretin altında olması · Artan hisse bulunması (+65 yaş hariç)';
  var BK_A = '4.10.2000 öncesi veya 8.8.2001–1.8.2003 arası';
  var BK_B = '4.10.2000–7.8.2001 arası veya 2.8.2003–30.9.2008 arası';
  var BK_A72 = '1.10.1972–3.10.2000 arası veya 8.8.2001–1.8.2003 arası';
  var PRIM_5510 = 'En az 1800 gün prim ödenmiş olması (4/I-a kapsamındaki sigortalılar için her türlü borçlanma hariç en az 5 yıl sigortalılık süresi bulunması + 900 gün prim ödenmiş olması)';
  var PRIM_SSK = 'Toplam 1800 gün prim ödenmiş olması veya 5 yıl sigortalılık süresi bulunması ve en az 900 gün prim ödenmiş olması (borçlanmayla tamamlanabilir)';
  var PRIM_1080 = 'En az 1080 gün prim ödenmiş olması (eksik kalan süreler borçlanmayla tamamlanabilir)';
  var PRIM_1800 = 'En az 1800 gün prim ödenmiş olması (eksik kalan süreler borçlanmayla tamamlanabilir)';
  var GELIR_SSK = 'SSK aylığı ve toplam geliri brüt asgari ücret altında ise iki aylık alır. Üstündeyse Bağ-Kur aylığı alamaz. (1.10.2016’dan itibaren iki aylık)';
  var GELIR_ES = '5434 aylığı ve toplam geliri brüt asgari ücret altında ise iki aylık alır. Üstündeyse Bağ-Kur aylığı alamaz. (1.10.2016’dan itibaren iki aylık)';

  function rows(list) { return list.map(function (cells, i) { return { row: i + 1, cells: cells }; }); }

  var TABLES = {
    t1: {
      no: 1, sayfa: '122–123',
      title: 'Ölüm aylığı bağlanabilmesi için gerekli sigortalılık süresi ve/veya prim ödeme gün sayısı',
      header: ['Ölüm aylığı statüsü / uygulanacak kanun', 'Ölüm tarihi', 'Ölüm aylığı için gerekli prim süresi'],
      rows: rows([
        ['4/I-a veya 4/I-b veya 4/I-c', '30.9.2008 sonrası', PRIM_5510],
        ['Emekli Sandığı (5434)', 'Ölüm tarihinin önemi yok', 'En az 10 yıl (3600 gün) prim ödenmiş olması (5 yıl/1800 gün prim ödemesi varsa 5510, m.32 ve m.34 kapsamından aylık bağlanır.)'],
        ['SSK', '1.10.2008 öncesi', PRIM_SSK],
        ['Tarım SSK (2925 sayılı Kanun)', 'Ölüm tarihinin önemi yok', PRIM_SSK],
        ['Bağ-Kur', BK_A, PRIM_1080],
        ['Bağ-Kur', BK_B, PRIM_1800],
        ['Tarım Bağ-Kur (2926 sayılı Kanun)', BK_A, PRIM_1080],
        ['Tarım Bağ-Kur (2926 sayılı Kanun)', BK_B, PRIM_1800],
        ['Banka Sandıkları (aktif veya SGK’ya devir)', '1.10.2008 öncesi', PRIM_SSK],
        ['Banka Sandıkları (aktif veya SGK’ya devir)', '30.9.2008 sonrası', PRIM_5510]
      ])
    },
    t3: {
      no: 3, sayfa: '129–130',
      title: '5.12.2017 tarihi öncesi kız çocuklarına ölüm aylığı bağlanması için aranan şartlar',
      header: ['Aylık statüsü', 'Ölüm tarihi', 'Kız çocukları için hak sahipliği koşulları'],
      rows: rows([
        ['4/I-a, 4/I-b, 4/I-b.4, 4/I-c, Banka Sandığı', '30.9.2008 sonrası', C1],
        ['SSK (506)', '1.10.2008 öncesi', C1],
        ['Emekli Sandığı (5434)', 'Ölüm tarihinin önemi bulunmuyor', C_ES],
        ['Bağ-Kur (1479)', BK_A, '1 Ekim 2016 tarihi öncesindeki uygulama: Evlenmemiş, boşanmış, dul kalmış olmak · Geçimini sağlayacak başka bir geliri olmamak (gelirleri toplamının brüt asgari ücretten fazla olmaması)'],
        ['Bağ-Kur (1479)', BK_A, '1 Ekim 2016 tarihinden itibaren uygulama: ' + C1],
        ['Bağ-Kur (1479)', BK_B, C1],
        ['Tarım Bağ-Kur (2926)', BK_A, C_HIC],
        ['Tarım Bağ-Kur (2926)', BK_B, C1],
        ['Tarım SSK (2925)', '8.9.1999 öncesi', C_HIC],
        ['Tarım SSK (2925)', '7.9.1999 sonrası', C1],
        ['Banka Sandıkları (faal veya SGK’ya devredilen)', 'Ölüm tarihinin önemi yok', C1]
      ])
    },
    t4: {
      no: 4, sayfa: '131',
      title: '5.12.2017 tarihinden itibaren kız çocuklarına ölüm aylığı bağlanması için aranan şartlar',
      header: ['Aylık statüsü', 'Ölüm tarihi', 'Kız çocukları için hak sahipliği koşulları'],
      rows: rows([
        ['SSK, Tarım SSK, Bağ-Kur, Tarım Bağ-Kur, 4/I-(a), 4/I-(b), 4/I-(b.4), 4/I-(c), Banka Sandıkları (faal veya SGK’ya devredilen)', 'Ölüm tarihinin önemi bulunmuyor', C1],
        ['Emekli Sandığı (5434)', 'Ölüm tarihinin önemi bulunmuyor', C_ES]
      ])
    },
    t5: {
      no: 5, sayfa: '132',
      title: 'Yargıtay’a göre kız çocuklarına ölüm aylığı bağlanması için aranan şartlar',
      header: ['Aylık statüsü', 'Ölüm tarihi', 'Kız çocukları için hak sahipliği koşulları'],
      rows: rows([
        ['SSK, Tarım SSK, Bağ-Kur, Tarım Bağ-Kur, 4/I-(a), 4/I-(b), 4/I-(b.4), 4/I-(c), Banka Sandıkları', 'Ölüm tarihinin önemi bulunmuyor', C1],
        ['Emekli Sandığı (5434)', 'Ölüm tarihinin önemi bulunmuyor', C_ES]
      ])
    },
    t7: {
      no: 7, sayfa: '139–141',
      title: 'Sigortalının annesine ölüm aylığı bağlanması için aranan şartlar',
      header: ['Sigortalılık statüsü', 'Ölüm tarihi', 'Anne için hak sahipliği koşulları'],
      rows: rows([
        ['4/I-(a), 4/I-(b), 4/I-(b.4), 4/I-(c)', '30.9.2008 sonrası', A5510],
        ['SSK', '6.8.2003 öncesi', '5.12.2017 tarihi öncesi uygulama: Geçimi sigortalı tarafından sağlanması · Artan hisse olması'],
        ['SSK', '6.8.2003 öncesi', '5.12.2017 tarihinden itibaren uygulama: ' + A5510],
        ['SSK', '6.8.2003 ile 1.10.2008 arası', '5.12.2017 tarihi öncesi uygulama: Sigortalı olmayı gerektirir çalışması olmamak · Gelir ve/veya aylık almamak · Artan hisse olması'],
        ['SSK', '6.8.2003 ile 1.10.2008 arası', '5.12.2017 tarihinden itibaren uygulama: ' + A5510],
        ['Emekli Sandığı (5434)', 'Farketmez (hizmeti +10 yıl)', 'Devlet memuru olmamak (5434 veya 5510, m.4/I-c sigortalısı olmamak) · 5434 veya 5510, m.4/I-c kapsamında aylık almamak · Anne için: sigortalının ölüm tarihinde dul ve muhtaç olması'],
        ['Emekli Sandığı (5434)', 'Farketmez (hizmeti 5–10 yıl arası)', A5510],
        ['Bağ-Kur, Tarım Bağ-Kur', BK_A, '5.12.2017 tarihi öncesi uygulama: Geçimi sigortalı tarafından sağlanması (kişi başına düşen gelirler toplamı brüt asgari ücretin altında olması) · Artan hisse olması'],
        ['Bağ-Kur, Tarım Bağ-Kur', BK_A, '5.12.2017 tarihinden itibaren uygulama: ' + A5510],
        ['Bağ-Kur, Tarım Bağ-Kur', BK_B, '5.12.2017 tarihi öncesi uygulama: Türkiye’de sigortalı çalışmamak · Asli sigortalı geliri/aylığı veya ölen çocuklar hariç ölüm aylığı/geliri almamak'],
        ['Bağ-Kur, Tarım Bağ-Kur', BK_A + ' [kaynakta böyle yazılmıştır]', '5.12.2017 tarihinden itibaren uygulama: ' + A5510]
      ])
    },
    t8: {
      no: 8, sayfa: '142',
      title: 'Dul kadınlara aynı sigorta statüsünden eş ve anne-babasından aylık bağlanması',
      header: ['Eşin sigorta statüsü', 'Anne-babanın sigorta statüsü', 'Alınacak aylık'],
      rows: rows([
        ['SSK', 'SSK', 'Tercih Ettiği/Yüksek Aylık'],
        ['Tarım SSK', 'Tarım SSK', 'Tercih Ettiği/Yüksek Aylık'],
        ['Bağ-Kur', 'Bağ-Kur', 'Tercih Ettiği/Yüksek Aylık'],
        ['Tarım Bağ-Kur', 'Tarım Bağ-Kur', 'Tercih Ettiği/Yüksek Aylık'],
        ['5434-Emekli Sandığı', '5434-Emekli Sandığı', 'Tercih Ettiği/Yüksek Aylık'],
        ['4/I-(a)', '4/I-(a)', 'Tercih Ettiği/Yüksek Aylık'],
        ['4/I-(b)', '4/I-(b)', 'Tercih Ettiği/Yüksek Aylık'],
        ['4/I-(b.4)', '4/I-(b.4)', 'Tercih Ettiği/Yüksek Aylık'],
        ['4/I-(c)', '4/I-(c)', 'Tercih Ettiği/Yüksek Aylık'],
        ['Aynı Banka Sandığı (aktif-devir)', 'Aynı Banka Sandığı (aktif-devir)', 'Tercih Ettiği/Yüksek Aylık']
      ])
    },
    t9: {
      no: 9, sayfa: '145–147',
      title: 'Dul kadınlara farklı sigorta statüsünden eş ve anne-babasından aylık bağlanması (5.12.2017 öncesi uygulama)',
      header: ['Eşin sigorta statüsü', 'Eşin ölüm tarihi', 'Anne-babanın sigorta statüsü', 'Anne-babanın ölüm tarihi', 'Alınacak aylık'],
      rows: rows([
        ['5510, 4/I-(a), 4/I-(b), 4/I-(b.4), 4/I-c', '30.9.2008 sonrası', '5510, 4/I-(a), 4/I-(b), 4/I-(b.4), 4/I-c', '30.9.2008 sonrası', 'Tercih Ettiği Aylık'],
        ['5434, 4/I-c', 'Farketmez', '5434, 4/I-c', 'Farketmez', 'Tercih Ettiği Aylık'],
        ['Bağ-Kur', '1.10.2008 öncesi', 'Bağ-Kur', '1.10.2008 öncesi', 'Fazla Olan Aylık (dipnot 47)'],
        ['Bağ-Kur', '1.10.2008 öncesi', '4/I-(b)', '30.9.2008 sonrası', 'Tercih Ettiği Aylık (dipnot 48)'],
        ['4/I-(b)', '30.9.2008 sonrası', 'Bağ-Kur', '1.10.2008 öncesi', 'Tercih Ettiği Aylık'],
        ['SSK', '1.10.2008 öncesi', 'SSK', '1.10.2008 öncesi', 'Fazla Olan Aylık'],
        ['SSK', '1.10.2008 öncesi', '4/I-(a)', '30.9.2008 sonrası', 'Tercih Ettiği Aylık'],
        ['4/I-(a)', '30.9.2008 sonrası', 'SSK', '1.10.2008 öncesi', 'Tercih Ettiği Aylık'],
        ['Bağ-Kur', '1.10.2008 öncesi', 'SSK, 5434, 2925', '1.10.2008 öncesi', 'İki aylık'],
        ['Bağ-Kur', '1.10.2008 öncesi', '4/I-(a), 4/I-(b.4), 4/I-c, 5434', '30.9.2008 sonrası', 'İki aylık'],
        ['4/I-(b) veya 4/I-(b.4)', '30.9.2008 sonrası', 'SSK, 5434, 2925', '1.10.2008 öncesi', 'İki aylık'],
        ['SSK', '1.10.2008 öncesi', '4/I-(b), 4/I-(c), 4/I-(b.4), 2925, 5434', '30.9.2008 sonrası', 'İki aylık'],
        ['SSK', '1.10.2008 öncesi', 'Bağ-Kur', BK_A72, GELIR_SSK],
        ['SSK', '1.10.2008 öncesi', 'Bağ-Kur', BK_B, 'İki aylık'],
        ['4/I-(a)', '30.9.2008 sonrası', 'Bağ-Kur', BK_A72, GELIR_SSK],
        ['4/I-(a)', '30.9.2008 sonrası', 'Bağ-Kur', BK_B, 'İki aylık'],
        ['5434', '1.10.2008 öncesi', 'SSK', '1.10.2008 öncesi', 'İki aylık'],
        ['5434', '30.9.2008 sonrası', '4/I-(a), 4/I-(b), 4/I-(b.4)', '30.9.2008 sonrası', 'İki aylık'],
        ['5434', '1.10.2008 öncesi', '4/I-(a), 4/I-(b), 4/I-(b.4)', '30.9.2008 sonrası', 'İki aylık'],
        ['5434', '30.9.2008 sonrası', 'SSK', '1.10.2008 öncesi', 'İki aylık'],
        ['5434', '1.10.2008 öncesi', 'Bağ-Kur', BK_A72, GELIR_ES],
        ['5434', '1.10.2008 öncesi', 'Bağ-Kur', BK_B, 'İki aylık'],
        ['5434', '30.9.2008 sonrası', 'Bağ-Kur', BK_A72, GELIR_ES],
        ['5434', '30.9.2008 sonrası', 'Bağ-Kur', BK_B, 'İki aylık'],
        ['5434', '30.9.2008 sonrası', '2926', BK_A72, 'Tek aylık'],
        ['5434', '30.9.2008 sonrası', '2926', BK_B, 'İki aylık'],
        ['SSK veya Bağ-Kur veya 2925 veya 2926', '1.10.2008 öncesi', '5434', '1.10.2008 öncesi', 'İki aylık'],
        ['4/I-(a) veya 4/I-(b) veya 4/I-(b.4) veya 2925', '30.9.2008 sonrası', '5434', '30.9.2008 sonrası', 'İki aylık'],
        ['SSK veya Bağ-Kur veya 2925 veya 2926', '1.10.2008 öncesi', '5434', '30.9.2008 sonrası', 'İki aylık'],
        ['4/I-(a) veya 4/I-(b) veya 4/I-(b.4) veya 2925', '30.9.2008 sonrası', '5434', '1.10.2008 öncesi', 'İki aylık']
      ])
    }
  };

  // Kaynak dokümandaki dipnot ve metin hükümleri (sonuçlarda dayanak olarak gösterilir)
  var NOTES = {
    dn29: { sayfa: '134', text: '5.12.2017 tarihi öncesi uygulamaya göre, 18 yaşından küçük yetim kız çocuklarına her iki aylık tam olarak ödenir. 18 yaşını tamamlayınca yüksek aylık tam ödenir, düşük aylık kesilir. (dipnot 29)' },
    dn28: { sayfa: '134', text: 'Ölüm tarihi 4.10.2000 öncesi ve 2.8.2001–1.8.2003 arası olan sigortalının geçimini sağlayacak geliri bulunan kız çocuklarına 1.10.2016 öncesi aylık bağlanmamış, 1.10.2016–4.7.2017 arasında tek aylık, 5.12.2017’den itibaren yüksek aylık tam düşük aylık yarım bağlanmıştır. (dipnot 28)' },
    dn47: { sayfa: '145', text: 'Anne/babanın ölüm tarihi 1.10.1972–3.10.2000 veya 8.8.2001–1.8.2003 arası ise toplam geliri brüt asgari ücret üzerinde çıkan yetim kadınlara anne/babadan ölüm aylığı bağlanamaz; yalnızca ölen eş üzerinden aylık bağlanır. (dipnot 47)' },
    dn48: { sayfa: '145', text: 'Ölen anne/babanın statüsü 4/I-(b) olmakla birlikte (4) numaralı alt bent kapsamında (Tarım Bağ-Kur) ise hak sahibi dul ve yetim kız çocuğuna her iki aylık da bağlanır. (dipnot 48)' },
    dn16: { sayfa: '124', text: 'Ölen eşlerin tamamının veya birinin ölüm tarihi 1 Ekim 2008 tarihi öncesi ve aylık almaya esas sigorta kanunları (ve sigorta statüleri) farklıysa iki aylık bağlanır. (dipnot 16)' },
    dn17: { sayfa: '124', text: '1 Ekim 2008 tarihinden önce ölen sigortalıların gelir ve aylıkları farklı statüde ise aylık ve gelir tam bağlandığı gibi aylığın 5434 sayılı Kanun kapsamında, gelirin ise diğer kanunlar kapsamında olması halinde aylık ve gelir tam bağlanır. (dipnot 17)' },
    dn18: { sayfa: '125', text: '5510, m.34/I gereği hak sahibi çocuklardan 18 yaşını, lise ve dengi öğrenimde 20 yaşını, yükseköğrenimde 25 yaşını doldurmayanların 4/I-(a) kapsamında sigortalı sayılmaları 1.4.2017’den itibaren aylık bağlanmasına engel değildir. (dipnot 18)' },
    gelirAylik: { sayfa: '124', text: 'İki eşin de ölümü halinde eşlerin birinden ölüm geliri, diğerinden ölüm aylığı alma hakkı bulunan dul eşe gelir ve aylık mukayesesi yapılarak yüksek olan tam, düşük olan yarım bağlanır (5510, m.54/son).' },
    evlilik: { sayfa: '123–124', text: 'Dul eşe aylık bağlanması için sigortalının ölüm tarihinde Türk Medeni Kanunu’na göre evlilik birliğinin bulunması ve dul eşin sigortalının ölümü sonrası evlenmemesi gerekir. Dul eşin gelir ya da aylık alması veya sigortalı çalışması ölüm aylığı almasına engel değildir.' },
    evlenme: { sayfa: '124', text: 'Dul eşin evlenmesi halinde aylığı kesilir, evlilik ölüm nedeniyle sona ererse dul eşe yeniden aylık bağlanır. Önceki ve sonraki eşinden de ölüm aylığına hak kazanan eşe tercih ettiği aylık bağlanır (5510, m.54/I).' },
    hisse5510: { sayfa: '123', text: '5510 sayılı Kanunun yürürlüğünden sonra ölen 4/I-(a), 4/I-(b) veya 4/I-(c) kapsamındaki sigortalının hak sahibi eşi dışında ölüm aylığına hak kazanmış çocuk bulunmuyorsa, eşin çalışması veya kendi sigortalılığı nedeniyle gelir ya da aylık alması ölüm aylığı hissesini %75’ten %50’ye indirir (5510, m.34). Aynı oranlar aktif ve SGK’ya devredilmiş banka sandıkları için de geçerlidir (5510, geçici m.20/XI).' },
    hisse5434: { sayfa: '123–124', text: '5434 sayılı Kanun kapsamındaki sigortalının dul eşinin aylık hissesi, başka aylık alan yoksa %75, aylık alan bir çocuk varsa %60’tır; 5434 sayılı Kanun kapsamında emekli, adi malullük, vazife malullüğü aylığı alan veya iştirakçi olan dul eş için %50 uygulanır (5434, m.68).' },
    anneOz: { sayfa: '141', text: 'Anne yalnızca öz çocuğunun ölümü halinde hak sahibi olur; üvey veya evlat edindiği çocuğu üzerinden ölüm aylığına hak kazanamaz.' },
    anneIki: { sayfa: '141', text: 'Ölen birden fazla çocuğundan 506, 1479, 2926 ve 5510 sayılı Kanunlara göre ölüm aylığına hak kazanan anneye iki aylıkla sınırlı olmak üzere yüksek olan aylık tam, düşük aylık yarım ödenir (5510, m.54).' },
    anneGelir: { sayfa: '135–136', text: 'Gelir değerlendirmesi, anne ve baba birlikte yaşıyorsa ikisinin toplam gelirine, ayrı yaşıyorlarsa annenin gelirine göre yapılır; anneyle birlikte yaşayan çocukların veya diğer kişilerin geliri eklenmez. Yargıtay’a göre eşin geliri dikkate alınmaz.' },
    anneGecim: { sayfa: '137', text: 'Geçimin sigortalı tarafından sağlanması, içinde bulunulan çevrenin sosyal yapısına göre değerlendirilir; sigortalı ile birlikte yaşama, parasal destek olmasa da geçimin sağlandığı sonucunu doğurur.' },
    anneHisse: { sayfa: '135', text: 'Anne dışında eşle birlikte aylık bağlanacak ikiden fazla çocuk varsa veya eş dışında birden fazla çocuk varsa artan hisse olmayabilir; anne 65 yaşından büyükse diğer hak sahiplerinin hisselerinden eksiltme yapılarak aylık bağlanabilir.' },
    anne5434: { sayfa: '134', text: '5434 sayılı Kanun kapsamında anne ve baba arasında evlilik birliği varsa anneye ölüm aylığı bağlanamaz; 5510 m.4/I-a, b, c kapsamında evlilik birliğinin önemi yoktur. (dipnot 30)' },
    prim0: { sayfa: '121', text: 'Ölüm aylığı için sigortalının sağlığında belirli süre prim ödemesi bulunması veya malullük ya da yaşlılık aylığı almakta iken ölmesi gerekir. İş kazası veya meslek hastalığı nedeniyle ölümde hak sahiplerine ölüm geliri bağlanır; prim ödemesi yeterliyse ölüm aylığı da bağlanır (5510, m.16 ve m.34).' },
    miras: { sayfa: '121', text: 'Mirasın reddedilmesi, hak sahibi niteliği taşımak koşuluyla ölüm aylığı almaya engel değildir.' },
    evlatlik: { sayfa: '132', text: 'Evlat edinilmiş kız çocuğunun hem biyolojik hem evlat edinen babasının (veya annesinin) ölümü halinde iki aylıkla sınırlı olarak iki aylık bağlanır; 5510 m.54 uygulanmaz, iki aylık da tam ödenir.' },
    es5434: { sayfa: '132', text: 'Anne ya da babadan bağlanacak aylıklardan birinin 5434 sayılı Kanun kapsamında olması halinde yetim kız çocuğuna her iki aylık tam ödenir.' },
    malul: { sayfa: '126', text: 'Kurum Sağlık Kurulu kararıyla çalışma gücünü en az %60 oranında yitirip malul olduğu anlaşılan kız çocukları, 5510 sayılı Kanun veya yabancı ülke mevzuatı kapsamında çalışmamak ve kendi sigortalılığı nedeniyle aylık almamak şartıyla evli olsalar da ölüm aylığına hak kazanır.' },
    ilke4: { sayfa: '151', text: 'Eşten ve anne/babadan iki aylık ilkeleri: (1) Eşin ölümü 1.10.2008 öncesi ve bu ölümden aylık bağlanmışsa statüler farklıysa iki aylık; (2) eş 1.10.2008 sonrası ölmüş olsa da anne/babadan 1.10.2008 öncesi aylık bağlanmışsa statüler farklıysa iki aylık (eş 5510 statüsünde ve anne/baba 2926 ise tek aylık); (3) biri 5434, diğeri 4/I-(c) dışındaki farklı statüdeyse iki aylık; (4) biri 2925, diğeri farklı statüdeyse iki aylık.' },
    yargitayEs: { sayfa: '151', text: 'Yargıtay’a göre ölümlerden en az biri 1.10.2008 öncesi ve sigortalılık statüleri farklı ise iki aylık bağlanır; her iki ölüm 1.10.2008 sonrası olsa bile aylıklardan biri 5434, diğeri 506, 1479, 2925, 2926 veya 5510 4/I-(a), (b), (b.4) kapsamındaysa iki aylık bağlanması gerekir.' },
    yargitayKiz: { sayfa: '131', text: 'Yargıtay’a göre temel kural ölüm tarihindeki mevzuatın uygulanmasıdır; sonradan yapılan lehe değişikliklerden de hak sahipleri faydalandırılır. SGK 5.12.2017 öncesi için aylık bağlamamakta, Yargıtay ise 5510 m.97’yi gözeterek bu dönem için de aylık bağlanmasına karar vermektedir.' }
  };

  var KAYNAK = {
    baslik: 'Kadınlara Eşinden Anne-Babasından ve Çocuğundan Ölüm Aylığı Bağlanması',
    yazar: 'Murat Özdamar, SGK Denetmeni',
    yayin: 'İş ve Hayat, s.118–160',
    kisa: 'Özdamar, İş ve Hayat, s.118–160'
  };

  var GENELGE = { TABLES: TABLES, NOTES: NOTES, KAYNAK: KAYNAK };

  root.SGK_GENELGE = GENELGE;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GENELGE;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
