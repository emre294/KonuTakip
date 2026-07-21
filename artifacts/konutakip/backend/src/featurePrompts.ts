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

const FEATURE_INSTRUCTIONS: Record<AIFeature, string> = {
  "generate-questions": `
Verilen öğrenci, ders, konu, sınav türü, seviye ve adet bilgilerine göre özgün sorular üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- Her soru 5 seçenekli olsun.
- Yalnızca bir doğru cevap bulunsun.
- Çeldiriciler mantıklı olsun.
- Her soruda doğru cevap ve açıklamalı çözüm yer alsın.
- Gerçek ÖSYM sorularını birebir kopyalama.
`,

  "evaluate-question": `
Öğrencinin verdiği cevabı değerlendir.

Kurallar:
- Cevabın doğru veya yanlış olduğunu açıkça belirt.
- Doğru cevabı yaz.
- Öğrencinin cevabındaki hatayı açıkla.
- Kısa fakat öğretici geri bildirim ver.
- Gerekirse doğru çözüm yolunu adım adım göster.
`,

  "teach-topic": `
Verilen konuyu öğrenciye öğret.

Şu sırayı kullan:
1. Kısa tanım
2. Temel kavramlar
3. Formüller veya kurallar
4. Adım adım anlatım
5. Çözümlü örnek
6. Sık yapılan hatalar
7. Kısa çalışma önerisi

Anlatımı öğrencinin sınav türü ve seviyesine göre düzenle.
`,

  "explain-question": `
Verilen soruyu ayrıntılı şekilde çöz ve açıkla.

Kurallar:
- Verilenleri ve isteneni belirle.
- Çözümü adım adım göster.
- Her önemli adımın nedenini açıkla.
- Öğrencinin yanlış cevabı varsa neden yanlış olduğunu belirt.
- Sonucu kontrol et.
- Çoktan seçmeli soruda doğru seçeneği net biçimde yaz.
`,

  "analyze-mistakes": `
Öğrencinin yanlış sorularını ve hata kayıtlarını analiz et.

Her önemli hata için şunları belirt:
- Zayıf konu
- Hata türü
- Muhtemel neden
- Nasıl düzeltileceği
- Önerilen tekrar
- Önerilen soru sayısı

Sonunda öncelik sırasına göre kısa bir gelişim planı oluştur.
`,

  "practice-question": `
Verilen konu ve seviyeye göre tek bir özgün pratik sorusu üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- 5 seçenek oluştur.
- Yalnızca bir doğru cevap bulunsun.
- Doğru cevabı belirt.
- Ayrıntılı çözüm ekle.
- Çeldiriciler mantıklı olsun.
`,

  "coach": `
Öğrencinin ilerleme, tamamlanan konular, yanlış sorular, çalışma geçmişi ve hedef bilgilerini incele.

Şunları üret:
- Mevcut durum değerlendirmesi
- Güçlü yönler
- Öncelikli eksikler
- Bugün yapılacak en önemli görevler
- Gerçekçi çalışma önerileri
- Kısa motivasyon mesajı

Genel ve yüzeysel tavsiyeler yerine gönderilen öğrenci verilerini kullan.
`,

  "mini-exam": `
Verilen zayıf konu ve derslere göre uyarlanabilir bir mini sınav hazırla.

Kurallar:
- Soru sayısına uy.
- TYT veya AYT seviyesine uygun ol.
- Her soru 5 seçenekli olsun.
- Her sorunun tek doğru cevabı olsun.
- Sorular farklı kazanımları ölçsün.
- Cevap anahtarı ve açıklamalı çözümler ekle.
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
`
};

export function buildFeaturePrompt(
  feature: AIFeature,
  requestData: Record<string, unknown>
): string {
  const instruction = FEATURE_INSTRUCTIONS[feature];

  return `
GÖREV TÜRÜ:
${feature}

ÖZEL TALİMAT:
${instruction}

UYGULAMADAN GELEN İSTEK VERİSİ:
${JSON.stringify(requestData, null, 2)}

ÇIKTI KURALLARI:
- Yalnızca geçerli JSON üret.
- Markdown kod bloğu kullanma.
- JSON öncesinde veya sonrasında açıklama yazma.
- Alan isimlerini İngilizce yaz.
- Kullanıcıya gösterilecek metinlerin değerlerini Türkçe yaz.
- İstek verisindeki alanları dikkate al.
- Eksik bilgi varsa makul ve açık bir varsayım kullan.
- Uydurma öğrenci geçmişi veya istatistik oluşturma.
`.trim();
}
