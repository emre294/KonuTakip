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
- Her soru 5 seçenekli olsun.
- Yalnızca bir doğru cevap bulunsun.
- Çeldiriciler mantıklı olsun.
- Her soruda doğru cevap ve adım adım çözüm yer alsın.
- Gerçek ÖSYM sorularını birebir kopyalama.
- Ham LaTeX kullanma.
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

SORU ÇÖZÜMÜ İSTENDİYSE:
${STEP_BY_STEP_RULES}

KONU ANLATIMI İSTENDİYSE:

## Konu Başlığı

### Kısa Özet

Konuyu 2–3 cümleyle özetle.

### Temel Kavramlar

Kavramları kısa ve anlaşılır biçimde açıkla.

### Formüller ve Kurallar

Formülleri okunabilir düz metin ve Unicode ile yaz.

### Adım Adım Anlatım

Konuyu mantıksal sırayla anlat.

### Çözümlü Örnek

Tipik bir soruyu hiçbir önemli işlemi atlamadan çöz.

### Sık Yapılan Hatalar

En yaygın hataları listele.

### Kısa Tekrar Önerisi

Öğrencinin konuyu pekiştirmesi için kısa öneri ver.

DOSYA VE GÖRSEL:
- Yüklenen görsel veya PDF'deki metni gerçekten incele.
- Okunamayan bölümü tahmin etme.
- Önce soruyu kısaca yeniden yaz.
- Ardından adım adım çöz.
- Birden fazla soru varsa ilk okunabilir sorudan başla.

Kurallar:
- Yalnızca Markdown metni üret.
- JSON, HTML veya kod bloğu üretme.
- Ham LaTeX kullanma.
- Gereksiz uzun giriş yapma.
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
- 5 seçenek oluştur.
- Yalnızca bir doğru cevap bulunsun.
- Doğru cevabı belirt.
- Çözümü adım adım göster.
- Çeldiriciler mantıklı olsun.
- Ham LaTeX kullanma.

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
- İstenen soru sayısına uy.
- TYT veya AYT seviyesine uygun ol.
- Her soru 5 seçenekli olsun.
- Her sorunun tek doğru cevabı olsun.
- Sorular farklı kazanımları ölçsün.
- Cevap anahtarı ve adım adım çözümler ekle.
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

export function buildFeaturePrompt(
  feature: AIFeature,
  requestData: Record<string, unknown>
): string {
  const instruction = FEATURE_INSTRUCTIONS[feature];
  const outputRules = TEXT_OUTPUT_FEATURES.has(feature)
    ? TEXT_OUTPUT_RULES
    : JSON_OUTPUT_RULES;

  return `
GÖREV TÜRÜ:
${feature}

ÖZEL TALİMAT:
${instruction}

UYGULAMADAN GELEN İSTEK VERİSİ:
${JSON.stringify(requestData, null, 2)}

${outputRules}
`.trim();
}
