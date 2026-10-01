# Çift Aylık Sorgusu

Ölüm aylığında hak sahipliğini ve eşten, anne-babadan ya da iki eşten
**iki aylık mı, tek aylık mı** bağlanacağını, kaynak dokümandaki tablolara
dayanarak gösteren statik web uygulaması.

**Kaynak doküman:** Murat Özdamar (SGK Denetmeni), "Kadınlara Eşinden
Anne-Babasından ve Çocuğundan Ölüm Aylığı Bağlanması", *İş ve Hayat*, s.118–160.
Dokümandaki 9 numaralı tablo ve s.148–150'deki numarasız tablo uygulamada
birebir kodlanmıştır. Uygulama yalnızca bu tabloları ve metindeki hükümleri
uygular; tabloda karşılığı olmayan durumda "Kaynak tabloda bu durum için satır
yok" der. Her sonuç dayanak tablo satırını (tablo no, sayfa, satır) gösterir.

> Not: Kaynak bir SGK genelgesi değil, SGK denetmeninin yayımlanmış makalesidir.
> Canlı kullanımdan önce kurumun güncel genelgeleriyle (ör. 2018-38 sayılı
> Emeklilik İşlemleri Genelgesi) karşılaştırılarak onaylanmalıdır.

## Modüller

| Modül | Dayanak | Sonuç |
| --- | --- | --- |
| Eşten ve anne-babadan aylık | 5.12.2017 sonrası: s.148–150 tablosu + Tablo-8 · 5.12.2017 öncesi: Tablo-9 + Tablo-8 · Yargıtay ilkesi (s.151) | İki aylık / Tek aylık / Tercih ettiği (yüksek) aylık / Fazla olan aylık / Yalnızca eşten |
| Anne ve babadan aylık | Tablo-6 · evlat edinme hükmü (s.132) · dipnot 28, 29 | Yüksek tam-düşük yarım / İki tam / Tercih edilen / Yüksek olan |
| İki eşten aylık | Tablo-2 · dipnot 16, 17 · m.54/son | Tercih edilen / İki aylık |
| Kız çocuğunun hak sahipliği | Tablo-3 (5.12.2017 öncesi), Tablo-4 (sonrası), Tablo-5 (Yargıtay) · malul istisnası | Hak sahibi / değil, koşul koşul |
| Annenin hak sahipliği | Tablo-7 · s.135–141 hükümleri | Hak sahibi / değil, koşul koşul |
| Dul eşin hak sahipliği ve hissesi | s.123–124 hükümleri (evlilik, yeniden evlenme, %75 / %60 / %50) | Hak sahipliği ve hisse oranı |
| Ölüm aylığı için prim şartı | Tablo-1 · s.121 | Prim şartı sağlanıyor / sağlanmıyor |

Eşten ve anne-babadan ile kız çocuğu modüllerinde SGK uygulamasının yanında
Yargıtay görüşü ayrı bir kartta gösterilir.

## İki mod

**Adım adım** (varsayılan, vatandaş için): her ekranda tek soru, büyük
seçenekler. Kullanıcı kurumu ve vefat yılını söyler; tablodaki statü
(ör. "5510 4/I-(a), ölüm 30.9.2008 sonrası") uygulama tarafından türetilir.
Yalnızca sonucu değiştiren eşik tarihlerinin bulunduğu yıllarda (1.10.2008,
15.10.2008, Bağ-Kur için 4.10.2000 / 8.8.2001 / 2.8.2003, SSK için 6.8.2003,
Tarım SSK için 8.9.1999) gün sorulur. Koşul soruları yalnızca ilgili tabloda
aranan koşullar için sorulur. Evet/Hayır ve 5.12.2017 sorularında "Bilmiyorum"
seçilirse iki olasılığın cevabı birlikte gösterilir.

**Hızlı giriş** (personel için): yedi modülün hepsi tek sayfalık formdur.
Tablo-2, Tablo-6 ve s.148–150 tablosunda statü doğrudan seçilir, sorgu bağlantı
olarak paylaşılır ve kaynak tabloda statü × statü çapraz görünüm vardır. Diğer
modüllerde (eş + anne-baba tüm dönemler, kız çocuğu, anne, dul eş, prim şartı)
adım adım moddaki soruların tamamı tek formda görünür; bir alan değişince
sonuç anında güncellenir. Sekmelere doğrudan bağlantı verilebilir
(`#kiz`, `#anne`, `#dulHak`, `#prim`, `#esTam`).

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
- Kaynak tablo sürüm damgası (dosya özeti, çıkarım tarihi, satır sayısı)
  yazdırma özetinde ve kopyalanan metinde yer alır; ekranda gösterilmez.
- Yazı tipi IBM Plex Sans (SIL Open Font License), `assets/fonts/` altında yerel
  kopya; dış istek yapılmaz.

## Çalıştırma

Derleme adımı yoktur ve dış kaynak (yazı tipi, CDN, API) kullanılmaz; `index.html`
doğrudan açılabilir, intranette veya herhangi bir statik sunucuda yayınlanabilir:

```bash
npm start            # http://localhost:8080  (python3 -m http.server)
```

GitHub Pages için: Settings → Pages → "Deploy from a branch", kök dizin.

Kendi sunucunuza (Ubuntu/Debian, nginx) yayınlamak için kendi bilgisayarınızdan:

```bash
bash deploy/deploy.sh root@SUNUCU_IP        # DOMAIN=alan.adi ile alan adı değiştirilebilir
```

Betik nginx'i kurar, dosyaları `/var/www/cift-aylik` altına kopyalar ve
`deploy/nginx.conf` yapılandırmasını etkinleştirir, ardından Let's Encrypt ile
HTTPS sertifikası alır (varsayılan alan adı sgk.krccorp.net).
Çevrimdışı çalışma ve ana ekrana ekleme için HTTPS (veya localhost) gerekir.

## Dosya yapısı

```
index.html              Arayüz iskeleti
css/app.css, fonts.css  Stil (açık/koyu tema, yazı boyutu, A4 yazdırma) ve yerel yazı tipi
js/config.js            Kurum adı ve logosu
js/excel-rows.js        Tablo-2, Tablo-6 ve s.148–150 tablosunun Excel aktarımı (üretilir)
js/genelge.js           Kaynak dokümandaki diğer tablolar (1, 3, 4, 5, 7, 8, 9) ve hükümler
js/rules.js             Excel tablolarının kodlanmış kuralları
js/engine.js            Excel tabloları için eşleştirme motoru
js/hukum.js             Tablo-1, 3, 4, 5, 7, 8, 9 ve Yargıtay ilkesinin kuralları
js/derive.js            Kurum + vefat tarihinden statü, Bağ-Kur dönemleri, eşik tarihleri
js/flows.js             Yedi modülün soru akışları ve sonuç hesabı (DOM'suz)
js/texts.js             Sonuç metinleri
js/app.js               Ortak arayüz: kaynak tablolar, dayanak, hızlı giriş, yazdırma
js/wizard.js            Adım adım modun görünümü
sw.js, manifest.webmanifest, assets/   Çevrimdışı çalışma, simgeler, yazı tipi
data/                   Kaynak Excel ve ham satırlar
docs/                   Mimari ve sık sorulan sorular dokümanı
deploy/                 Sunucu kurulum betikleri ve nginx yapılandırması
tests/                  Otomatik testler
```

## Doğrulama

```bash
npm test
```

Testler şunları garanti eder:

- Excel tablolarının kuralları hücre metinlerinden bağımsız türetilen
  kodlarla birebir aynıdır; motor her satırı aynen üretir.
- Tablo-9'un 30 kuralı tablo hücrelerinden türetilenle aynıdır; hiçbir
  girdi çelişen satırlara düşmez. Tablo-1, 3, 4, 5, 7, 8 satır eşleşmeleri ve
  sınır günleri (ör. 3.10.2000 / 4.10.2000, 5.8.2003 / 6.8.2003, 7.9.1999 /
  8.9.1999) ayrı ayrı test edilir.
- Yedi modülün soru akışı tüm cevap kombinasyonlarında (12.600'ü aşkın yol)
  dolaşılır: her yol biter, aynı soru iki kez sorulmaz, sonuç doğrudan hesapla
  aynıdır, dayanak satırları ve hüküm notları tanımlıdır.
- Arayüz metinlerinde hukuki yorum veya yönlendirme ifadesi yoktur; tablo
  sürüm damgası kaynak Excel ile uyuşur.

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

## Marka ve kurum logosu

Uygulamanın kendi logosu `assets/icon.svg` (üst bant, sekme simgesi, telefon
simgesi ve A4 çıktı başlığında kullanılır). Kurum logosu varsayılan olarak
gösterilmez; kurumun yazılı izni alındıktan sonra logo dosyasını `assets/`
altına koyup `js/config.js` içinde tanımlayın:

```js
window.SGK_CONFIG = { kurumLogo: 'assets/kurum-logo.svg', kurumAdi: 'Sosyal Güvenlik Kurumu' };
```

Logo üst bantta ve A4 çıktıda uygulama logosunun solunda, ince bir ayraçla görünür.

