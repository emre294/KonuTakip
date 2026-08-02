export type AIFeature =
  | "generate-questions"
  | "evaluate-question"
  | "teach-topic"
  | "explain-question"
  | "analyze-mistakes"
  | "practice-question"
  | "coach"
  | "mini-exam"
  | "study-plan";

const STEP_BY_STEP_RULES = `
SORU ÇÖZÜMÜ ZORUNLU DÜZENİ:

## Soru Analizi

- Verilen:
- İstenen:
- Kullanılacak yöntem:

## Adım Adım Çözüm

### 1. Adım

İşlemi yaz ve nedenini kısa biçimde açıkla.

### 2. Adım

Sonraki işlemi yaz ve nedenini açıkla.

Gerekli olduğu kadar numaralı adım kullan. Önemli işlem atlama.

## Sonuç

Cevabı net biçimde yaz.

## Kontrol

Sonucu kısa bir işlemle veya mantık kontrolüyle doğrula.

MATEMATİK GÖSTERİMİ:
- Ham LaTeX kullanma.
- \frac, \sqrt, \lim, \text, \boxed, \begin, \end, \left ve \right yazma.
- x², √16, 2 × 3, 10 ÷ 2, x → 2 gibi okunabilir gösterim kullan.
- Kesirleri gerektiğinde (pay)/(payda) biçiminde yaz.
`.trim();

const FEATURE_INSTRUCTIONS: Record<AIFeature, string> = {
  "generate-questions": `
Verilen öğrenci, ders, konu, sınav türü, seviye ve adet bilgilerine göre özgün sorular üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- İstenen soru sayısına tam uy.
- Her soru A, B, C, D ve E olmak üzere 5 seçenekli olsun.
- Her soruda tam olarak bir doğru cevap bulunsun.
- Soruyu göndermeden önce sessizce çöz ve bütün seçenekleri tek tek kontrol et.
- Birden fazla doğru seçenek varsa soruyu yeniden oluştur.
- Hiç doğru seçenek yoksa soruyu yeniden oluştur.
- Doğru cevabı soru kökünde, başlıkta, açıklamada veya biçimlendirmede ele verme.
- Soru metnine "doğru cevap", "cevap", "çözüm" veya seçeneği açık eden not ekleme.
- Aynı, eş anlamlı veya birbirini kapsayan seçenekler üretme.
- "Hepsi", "Hiçbiri" ve benzeri toplu seçenekleri kullanma.
- Seçenek uzunluklarını ve anlatım biçimlerini birbirine yakın tut.
- Çeldiricileri öğrencinin yapabileceği gerçek hatalara dayandır.
- Çözüm ile cevap anahtarının aynı sonucu verdiğini doğrula.
- Gerçek ÖSYM sorularını birebir kopyalama.
- Ham LaTeX kullanma.

Türkçe sorularında:
- Bağlaç olan "de/da" ayrı yazılır.
- Bulunma hâl eki "-de/-da/-te/-ta" bitişik yazılır.
- Bağlaç ile hâl ekini birbirine karıştırma.
- Bağlaç olan "ki" ayrı, ek olan "-ki" bitişik yazılır.
- "mi" soru edatı ayrı yazılır.
- Tartışmalı veya birden fazla doğru cevaba yol açabilecek örnek kullanma.

Matematik ve fen sorularında:
- Sayısal sonucu işlem yaparak doğrula.
- Mümkünse yerine koyma veya ters işlemle kontrol et.
- Birim, işaret, koşul ve tanım kümesini kontrol et.
`,

  "evaluate-question": `
Öğrencinin verdiği cevabı değerlendir.

Kurallar:
- Cevabın doğru veya yanlış olduğunu açıkça belirt.
- Doğru cevabı yaz.
- Öğrencinin hatasını açıkla.
- Doğru çözüm yolunu adım adım göster.
- Her önemli işlemin nedenini kısaca belirt.

${STEP_BY_STEP_RULES}
`,

  "teach-topic": `
Kullanıcının isteğini önce sınıflandır:

1. Kullanıcı bir soru, denklem, işlem, fotoğraf veya PDF çözümü istiyorsa konu anlatımı yapma. Doğrudan adım adım soru çözümü üret.
2. Kullanıcı açıkça bir konuyu anlatmanı istiyorsa konu anlatımı formatını kullan.
3. Kullanıcı yalnızca selam veriyorsa kısa, doğal ve tek paragraflık cevap ver.
4. Kullanıcının istemediği ek konu, test veya uzun açıklama üretme.

SORU ÇÖZÜMÜ İSTENDİYSE:
${STEP_BY_STEP_RULES}

KONU ANLATIMI İSTENDİYSE:

## Konu Başlığı
Konunun adını kısa yaz.

## Kısa Tanım
Konuyu 2–3 cümleyle tanımla.

## Mantığı
Konunun temel mantığını sade biçimde açıkla.

## Temel Kavramlar
- Her kavramı ayrı maddede açıkla.
- Gereksiz uzun cümle kullanma.

## Formüller ve Kurallar
- Formülleri okunabilir düz metin ve Unicode ile yaz.
- Her formülün ne zaman kullanıldığını belirt.

## Adım Adım Anlatım
- Mantıksal sırayla ilerle.
- Her adımda tek ana fikir anlat.
- Gereksiz tekrar yapma.

## Çözümlü Örnek
- Tipik bir örnek seç.
- Hiçbir önemli işlemi atlama.
- Sonucu kısa kontrolle doğrula.

## Sık Yapılan Hatalar
- Gerçek ve konuya özgü hataları yaz.
- Genel ve boş ifadeler kullanma.

## ÖSYM İpucu
- Konunun sınavda nasıl ölçüldüğünü kısa açıkla.

## Kısa Tekrar Önerisi
- En fazla 3 maddelik uygulanabilir öneri ver.

DOSYA VE GÖRSEL:
- Yüklenen görsel veya PDF'deki metni gerçekten incele.
- Okunamayan bölümü tahmin etme.
- Önce soruyu kısaca yeniden yaz.
- Ardından adım adım çöz.
- Birden fazla soru varsa ilk okunabilir sorudan başla.

YAZIM VE DÜZEN:
- Cevabın başında boş satır bırakma.
- İlk karakter doğrudan metin veya başlık olsun.
- Başlıklar arasında yalnızca bir boş satır bırak.
- Paragraflar arasında gereksiz boşluk bırakma.
- Her maddeyi ayrı satırda göster.
- Aynı başlığı iki kez kullanma.
- Tek cümlelik cevaplarda başlık kullanma.
- Selamlaşma cevabında Markdown başlığı kullanma.
- Yalnızca Markdown metni üret.
- JSON, HTML veya kod bloğu üretme.
- Ham LaTeX kullanma.
- Gereksiz giriş, sonuç tekrarı veya motivasyon paragrafı ekleme.
`,

  "explain-question": `
Verilen soruyu doğrudan çöz.

${STEP_BY_STEP_RULES}

Ek kurallar:
- Soruyu yeniden uzun uzun anlatma.
- Her adımda yalnızca gerekli işlemi ve kısa nedenini yaz.
- Çoktan seçmeli soruda doğru seçeneği net biçimde belirt.
- Öğrencinin yanlış cevabı varsa neden yanlış olduğunu açıkla.
- JSON, HTML veya kod bloğu üretme.
`,

  "analyze-mistakes": `
Öğrencinin yanlış sorularını ve hata kayıtlarını analiz et.

Her önemli hata için:
- Zayıf konu
- Hata türü
- Muhtemel neden
- Nasıl düzeltileceği
- Önerilen tekrar
- Önerilen soru sayısı

Sonunda öncelik sırasına göre kısa gelişim planı oluştur.
Uydurma öğrenci verisi üretme.
`,

  "practice-question": `
Verilen konu ve seviyeye göre tek bir özgün pratik sorusu üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- A, B, C, D ve E olmak üzere tam 5 seçenek oluştur.
- Tam olarak bir doğru cevap bulunsun.
- Soruyu göndermeden önce sessizce çöz ve bütün seçenekleri tek tek kontrol et.
- Birden fazla doğru seçenek varsa soruyu yeniden oluştur.
- Hiç doğru seçenek yoksa soruyu yeniden oluştur.
- Doğru cevabı soru kökünde veya açıklamada ele verme.
- Soru metnine çözüm, cevap veya öğretici not ekleme.
- Aynı, eş anlamlı veya birbirini kapsayan seçenekler oluşturma.
- "Hepsi" ve "Hiçbiri" seçeneklerini kullanma.
- Çeldiricileri öğrencinin yapabileceği gerçek hatalara dayandır.
- Çözüm ile doğru seçeneğin aynı sonucu verdiğini doğrula.
- Ham LaTeX kullanma.

Türkçe sorularında:
- Bağlaç olan "de/da" ayrı yazılır.
- Bulunma hâl eki "-de/-da/-te/-ta" bitişik yazılır.
- Bağlaç ile hâl ekini birbirine karıştırma.
- Bütün seçenekleri kurala göre ayrı ayrı kontrol et.
- Birden fazla doğru cevap doğurabilecek örnek kullanma.

${STEP_BY_STEP_RULES}
`,

  "coach": `
Öğrencinin ilerleme, tamamlanan konular, yanlış sorular, çalışma geçmişi ve hedef bilgilerini incele.

Şunları üret:

## Mevcut Durum

## Güçlü Yönler

## Öncelikli Eksikler

## Bugünün En Önemli Görevleri

## Çalışma Önerileri

## Kısa Motivasyon

Kurallar:
- Gönderilen gerçek öğrenci verilerini kullan.
- Veri yoksa uydurma istatistik oluşturma.
- Boş veya yalnızca başlıklardan oluşan cevap verme.
- Her bölümde en az bir anlamlı cümle veya madde bulunmalı.
`,

  "mini-exam": `
Verilen zayıf konu ve derslere göre uyarlanabilir mini sınav hazırla.

Kurallar:
- İstenen soru sayısına tam uy.
- TYT veya AYT seviyesine uygun ol.
- Her soru A, B, C, D ve E olmak üzere 5 seçenekli olsun.
- Her soruda tam olarak bir doğru cevap bulunsun.
- Her soruyu göndermeden önce sessizce çöz.
- Bütün seçenekleri tek tek kontrol et.
- Birden fazla doğru seçenek varsa soruyu yeniden oluştur.
- Hiç doğru seçenek yoksa soruyu yeniden oluştur.
- Sorular farklı kazanımları ölçsün.
- Doğru cevabı soru kökünde veya açıklamada ele verme.
- Cevap anahtarını sorulardan sonra ayrı bölümde ver.
- Çözümleri cevap anahtarından sonra ayrı bölümde ver.
- Aynı veya eş anlamlı seçenekleri tekrar etme.
- Çeldiricileri gerçek öğrenci hatalarına dayandır.
- Ham LaTeX kullanma.
`,

  "study-plan": `
Öğrencinin hedefi, müsait zamanı, eksik konuları, zayıf dersleri ve çalışma geçmişine göre haftalık çalışma planı hazırla.

Plan şunları içersin:
- Gün gün görevler
- Ders ve konu dağılımı
- Konu çalışması
- Soru çözümü
- Tekrar
- Yanlış analizi
- Deneme
- Dinlenme veya hafif gün

Plan gerçekçi, sürdürülebilir ve öğrencinin verilerine özel olsun.
Uydurma öğrenci geçmişi veya istatistik oluşturma.
`
};

const TEXT_OUTPUT_FEATURES = new Set<AIFeature>([
  "teach-topic",
  "explain-question",
  "coach",
  "study-plan",
]);

const TEXT_OUTPUT_RULES = `
ÇIKTI KURALLARI:
- Yalnızca okunabilir Türkçe Markdown metni üret.
- JSON, kod bloğu veya HTML etiketi kullanma.
- Kullanıcıya gösterilecek nihai metni üret.
- Eksik bilgi varsa varsayımı açıkça belirt.
- Ham LaTeX komutu kullanma.
- Bozuk karakter, anlamsız sembol veya HTML kalıntısı üretme.
- Boş cevap verme.
`.trim();

const JSON_OUTPUT_RULES = `
ÇIKTI KURALLARI:
- Yalnızca geçerli JSON üret.
- Markdown kod bloğu kullanma.
- JSON öncesinde veya sonrasında açıklama yazma.
- Alan isimlerini İngilizce yaz.
- Kullanıcıya gösterilecek metinleri Türkçe yaz.
- Eksik bilgi varsa açık bir varsayım kullan.
- Uydurma öğrenci geçmişi veya istatistik oluşturma.
- Ham LaTeX kullanma.
`.trim();

const FINAL_QUALITY_GATE = `
GÖNDERMEDEN ÖNCE ZORUNLU SESSİZ KONTROL:

1. Kullanıcının isteğini doğru sınıflandırdım mı?
2. Gereksiz giriş, tekrar veya boş paragraf var mı?
3. Türkçe doğal ve dil bilgisi açısından doğru mu?
4. Soru üretildiyse tam olarak bir doğru cevap var mı?
5. Bütün seçenekleri tek tek kontrol ettim mi?
6. Doğru cevap soru kökünde veya açıklamada sızıyor mu?
7. Çözüm ile cevap anahtarı aynı sonucu veriyor mu?
8. Türkçe sorusunda bağlaç, ek ve yazım kuralı doğru mu?
9. Matematik veya fen sorusunda işlem, birim ve işaret doğru mu?
10. Birden fazla doğru cevap ihtimali veya belirsizlik var mı?
11. Ham LaTeX, HTML, bozuk karakter veya gereksiz sembol var mı?
12. Cevabın başında veya sonunda boş satır var mı?

Bu kontrollerden biri başarısızsa cevabı göndermeden önce düzelt.
Bu kontrol listesini kullanıcıya gösterme.
`.trim();

export function buildFeaturePrompt(
  feature: AIFeature,
  requestData: Record<string, unknown>
): string {
  const instruction =
    FEATURE_INSTRUCTIONS[feature];

  const outputRules =
    TEXT_OUTPUT_FEATURES.has(feature)
      ? TEXT_OUTPUT_RULES
      : JSON_OUTPUT_RULES;

  const currentUserMessage = String(
    requestData.lastUserMessage ??
    requestData.userQuestion ??
    requestData.message ??
    requestData.prompt ??
    "",
  ).trim();

  const contextData = {
    ...requestData,
  };

  delete contextData.lastUserMessage;

  return `
GÖREV TÜRÜ:
${feature}

ÖZEL TALİMAT:
${instruction}

KULLANICININ GÜNCEL İSTEĞİ:
${currentUserMessage || "Açık bir güncel istek belirtilmedi."}

BAĞLAM VERİSİ:
${JSON.stringify(contextData, null, 2)}

ÖNCELİK KURALLARI:
- Her zaman kullanıcının güncel isteğini esas al.
- Önceki konuşma yalnızca yardımcı bağlamdır.
- Güncel istek ile geçmiş konuşma çelişirse güncel istek geçerlidir.
- Geçmiş konuşmadaki konu, kural veya örnekleri yeni istekmiş gibi ele alma.
- Özel konu sistemlerini yalnızca güncel kullanıcı mesajı açıkça istediğinde kullan.

${outputRules}

${FINAL_QUALITY_GATE}
`.trim();
}
