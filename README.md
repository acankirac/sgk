# Çift Aylık Sorgusu

Ölen eşinden, anne ve babasından ya da birden fazla eşinden aylığa hak kazanan
kadına **iki aylık mı, tek aylık mı** bağlanacağını, kaynak Excel tablosundaki
satıra dayanarak gösteren statik web uygulaması.

Kaynak: `data/kadinlara_esinden_anne_babasindan.xls` (3 sayfa, 88 veri satırı).
Uygulama yalnızca bu tablodaki satırları uygular; tabloda bulunmayan
kombinasyonlar için yorum yapmaz, "tabloda satır yok" der.

## İki mod

**Adım adım** (varsayılan, yaşlı kullanıcılar için): her ekranda tek soru,
büyük seçenekler. Kullanıcı kurumu ("SSK", "Bağ-Kur", "Emekli Sandığı" …) ve
vefat yılını söyler; tablodaki statü (ör. "5510 4/I-(a), ölüm 30.9.2008
sonrası") uygulama tarafından türetilir. Yıl 2008 ise gün sorulur; Emekli
Sandığı için gerekirse memuriyete başlangıç (15.10.2008), Banka Sandığı için
devir sorusu eklenir. Evet/Hayır ve 5.12.2017 sorularında "Bilmiyorum"
seçilirse iki olasılığın cevabı kaynak satırlarıyla yan yana gösterilir.

**Hızlı giriş** (SGK personeli için): tablodaki statüler doğrudan açılır
listeden seçilir, cevap anında güncellenir; sorgu adres çubuğunda taşınır
(`#esAnneBaba?es=A&ab=BK&once=hayir`), "Bağlantıyı kopyala" ile paylaşılır.

Her iki modda cevabın altında dayanak satırın numarası, isteğe bağlı açılan
satır kartı (başlık–değer) ve sayfa altında kaynak tablo (liste veya statü ×
statü çapraz görünüm, arama kutusu) bulunur.

## Modüller

| Sekme | Excel sayfası | Girdi | Sonuç |
| --- | --- | --- | --- |
| Eşten ve anne-babadan | `eşten-anne-babadan` (60 satır) | Ölen eşin statüsü, ölen anne/babanın statüsü, anne/babadan 1.10.2008 öncesi aylık bağlanıp bağlanmadığı | İki aylık / Tek aylık |
| Anne ve babadan | `anne-babadan`, Tablo-6 (11 satır) | Baba ve annenin statüsü, ölüm tarihleri durumu, gerekirse 5.12.2017 uygulama dönemi | Yüksek tam-düşük yarım / Tercih edilen (tam) / İki tam aylık / Yüksek olan |
| İki eşten | `dul eşe` (16 satır) | Ölen ilk ve ikinci eşin tabi olduğu kanun | Tercih edilen aylık / İki aylık |

## Erişilebilirlik ve diğer özellikler

- A− / A+ ile üç kademeli yazı boyutu (tarayıcıda hatırlanır), büyük dokunma
  hedefleri, klavye ile kullanım, adım geçişlerinde odak yönetimi, açık/koyu tema.
- "Sesli oku": sonuç tarayıcının kendi Türkçe sesiyle okunur (destekleyen
  tarayıcılarda).
- "Yazdır": dosyaya konabilecek tek sayfalık özet (verilen bilgiler, sonuç,
  dayanak satırın hücreleri, kaynak tablo sürümü). "Kopyala": aynı özet metin
  olarak panoya.
- Çevrimdışı çalışma: `manifest.webmanifest` + `sw.js` ile uygulama dosyaları
  önbelleğe alınır; telefon ana ekranına eklenebilir. Önbellek adı kaynak
  tablonun sürüm damgasından türetilir, tablo değişince eski önbellek silinir.
- Kaynak tablo sürüm damgası (dosya özeti, çıkarım tarihi, satır sayısı) sayfa
  altında, yazdırma özetinde ve kopyalanan metinde yer alır.

## Çalıştırma

Derleme adımı yoktur; `index.html` doğrudan açılabilir veya herhangi bir statik
sunucuyla yayınlanabilir:

```bash
npm start            # http://localhost:8080  (python3 -m http.server)
```

GitHub Pages için: Settings → Pages → "Deploy from a branch", kök dizin.
Çevrimdışı çalışma ve ana ekrana ekleme için HTTPS (veya localhost) gerekir.

## Dosya yapısı

```
index.html            Arayüz iskeleti (adım adım + hızlı giriş + kaynak tablolar)
css/app.css           Stil (açık/koyu tema, yazı boyutu kademeleri, yazdırma)
js/excel-rows.js      Excel satırlarının ham metni ve sürüm damgası (üretilir)
js/rules.js           Excel satırlarının kodlanmış hali (statü kodları, kurallar)
js/engine.js          Eşleştirme motoru (arayüzden bağımsız)
js/derive.js          Kurum + vefat tarihinden statü türetme (adım adım mod)
js/app.js             Ortak arayüz, hızlı giriş formları, kaynak tablo, yazdırma
js/wizard.js          Adım adım mod
sw.js, manifest.webmanifest, assets/   Çevrimdışı çalışma ve simgeler
data/*.xls            Kaynak Excel
data/excel-rows.json  Testlerin karşılaştırma için kullandığı ham satırlar
scripts/extract_excel.py  Excel'den excel-rows.js / .json üretir
tests/engine.test.js  Kural ve motor doğrulama testleri
tests/derive.test.js  Tarih eşiği ve statü türetme testleri
```

## Doğrulama

```bash
npm test
```

Testler şunları garanti eder:

- `js/rules.js` içindeki her kural, Excel'deki karşılık gelen satırın hücre
  metinlerinden **otomatik türetilen** kodlarla birebir aynıdır (statüler,
  tarih koşulları, Evet/Hayır sütunu, sonuç).
- Motor, her Excel satırını (satırın kapsadığı her statü, tarih ve Evet/Hayır
  değeri için) aynen üretir; hiçbir girdi çelişen satırlara düşmez.
- Kurum + tarih türetmesi tablodaki eşikleri (1.10.2008, 15.10.2008) aynen
  uygular ve yalnızca tabloda bulunan statü kodlarını üretir.

## Excel'i güncelleme

1. `data/kadinlara_esinden_anne_babasindan.xls` dosyasını değiştirin.
2. `pip install xlrd && npm run extract` ile `js/excel-rows.js` ve
   `data/excel-rows.json` dosyalarını yeniden üretin (sürüm damgası da yenilenir).
3. Yeni veya değişen satırlar için `js/rules.js` içine kural ekleyin.
4. `npm test` çalıştırın; testler eksik ya da tutarsız kuralı satır numarasıyla
   bildirir.

## Kodlama notları

- Excel'de statü ve ölüm tarihi birlikte anlam taşır (ör. "SSK, 1.10.2008
  öncesi" ile "4/I-(a), 30.9.2008 sonrası"). Hızlı girişte her seçenek tek bir
  kod altında "kurum + tarih koşulu" olarak sunulur; adım adım modda aynı kod
  kurum + vefat tarihinden türetilir.
- "Ölüm tarihinin önemi yok" yazan hücreler, o kurumun hem eski kanun hem 5510
  karşılığını kapsar (ör. "Tarım Bağkur" → Tarım Bağ-Kur ve 4/I-(b) Tarım).
- Tablo-6'nın 2. satırı yalnızca 4/I-(a), (b), (c) sayar; 4/I-(b.4) bu satıra
  eklenmemiştir. Uygulama bu durumu sonuçta açıklar.
- "Anne ve babadan" ile "İki eşten" tablolarında eşleştirme sıradan
  bağımsızdır (baba/anne ve ilk/ikinci eş yer değiştirebilir).
- Uygulama hukuki yorum, kanun maddesi veya aylık tutarı üretmez; kişisel veri
  istemez ve hiçbir veriyi sunucuya göndermez.
