/**
 * LocalMockAIProvider — deterministic mock provider for development and testing.
 *
 * • Always available (no credentials required)
 * • Returns realistic Turkish YKS-themed educational content
 * • Simulates a realistic network delay (300–900 ms depending on operation)
 * • Never throws unless the caller explicitly breaks the contract
 *
 * This is the ONLY active provider until a real provider is wired in.
 * Swap it via AIManager.configure() — the rest of the app is unaffected.
 *
 * Topic detection: buildTeachContent() keyword-matches the user's input against
 * a curated content bank (parabol, limit, türev, trigonometri, Newton, hücre,
 * paragraf, mol, TYT/AYT orientations). Unrecognised topics get a generic
 * but realistic educational response.
 */

import type { IAIProvider } from "../AIProvider";
import {
  AIProviderKind,
  type QuestionGenerationRequest,
  type QuestionGenerationResponse,
  type QuestionEvaluationRequest,
  type QuestionEvaluationResponse,
  type AITeacherRequest,
  type AITeacherResponse,
  type ExplainQuestionRequest,
  type ExplainQuestionResponse,
  type AnalyzeMistakesRequest,
  type AnalyzeMistakesResponse,
  type PracticeQuestionRequest,
  type PracticeQuestionResponse,
  type StudyCoachRequest,
  type StudyCoachResponse,
  type MiniExamRequest,
  type MiniExamResponse,
  type StudyPlanRequest,
  type StudyPlanResponse,
  type ExplanationStep,
  type GeneratedQuestion,
  type MistakePattern,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function mockDelay(minMs = 400, maxMs = 900): Promise<void> {
  return new Promise((r) => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

function now(): string {
  return new Date().toISOString();
}

function baseResponse(startMs: number): {
  provider: typeof AIProviderKind.LOCAL_MOCK;
  durationMs: number;
  generatedAt: string;
} {
  return {
    provider: AIProviderKind.LOCAL_MOCK,
    durationMs: Date.now() - startMs,
    generatedAt: now(),
  };
}

function makeQuestionId(topicId: string, index: number): string {
  return `mock_q_${topicId}_${index}_${Date.now()}`;
}

// ─── AI Teacher content bank ──────────────────────────────────────────────────

interface TeachContent {
  summary: string;
  steps: ExplanationStep[];
  keyPoints: string[];
  commonMistakes: string[];
  practiceHint: string;
}

function matches(question: string, keywords: string[]): boolean {
  return keywords.some((k) => question.includes(k));
}

function buildTeachContent(question: string, topicName: string): TeachContent {
  const q = question.toLowerCase();

  // ── Parabol / İkinci Derece ────────────────────────────────────────────────
  if (matches(q, ["parabol", "ikinci derece", "tepe nokta", "ax²", "discriminant"])) {
    return {
      summary:
        "Parabol, f(x) = ax² + bx + c biçiminde yazılan ikinci dereceden bir fonksiyonun grafiğidir. " +
        "'a' katsayısı parabolün yönünü belirler: a > 0 ise parabol yukarı açık (U şeklinde), " +
        "a < 0 ise aşağı açık (∩ şeklinde) olur. Parabolün tepe noktası x = -b/2a formülü ile bulunur " +
        "ve bu nokta grafiğin simetri eksenini verir. Diskriminant Δ = b² - 4ac, parabolün x ekseniyle " +
        "kaç noktada kesiştiğini söyler: Δ > 0 ise iki nokta, Δ = 0 ise bir nokta, Δ < 0 ise hiç kesişmez.",
      steps: [
        {
          stepNumber: 1,
          title: "Katsayıları Belirle",
          content:
            "f(x) = ax² + bx + c ifadesinde a, b ve c katsayılarını yaz. 'a' katsayısı hiçbir zaman sıfır olamaz; olsaydı doğrusal bir fonksiyon olurdu.",
          example: "f(x) = 2x² - 4x + 1 için a = 2, b = -4, c = 1",
        },
        {
          stepNumber: 2,
          title: "Tepe Noktasını Bul",
          content:
            "Tepe noktasının x koordinatı x = -b/2a formülüyle hesaplanır. y koordinatı ise bu x değeri fonksiyona yazılarak bulunur.",
          example: "x = -(-4)/(2·2) = 1  →  f(1) = 2-4+1 = -1  →  Tepe: (1, -1)",
        },
        {
          stepNumber: 3,
          title: "Diskriminant ve Kökler",
          content:
            "Δ = b² - 4ac hesapla. Δ > 0 ise iki gerçel kök var; kökleri x = (-b ± √Δ) / 2a formülüyle bul.",
          example: "Δ = 16 - 8 = 8 > 0  →  İki gerçel kök: x = (4 ± 2√2) / 4",
        },
      ],
      keyPoints: [
        "a > 0 → Parabol yukarı açık, a < 0 → Aşağı açık",
        "Tepe noktası: x = -b/2a ile bulunur; minimum veya maksimum noktasıdır",
        "Δ = b² - 4ac; Δ > 0 iki kök, Δ = 0 bir kök, Δ < 0 gerçel kök yok",
        "Parabolün y-ekseniyle kesişme noktası daima (0, c)'dir",
      ],
      commonMistakes: [
        "Tepe noktası formülünde işaret hatası: x = -b/2a (eksi b bölü 2a)",
        "a katsayısının işaretini yanlış okuyarak parabolün yönünü ters çizmek",
      ],
      practiceHint:
        "Farklı a değerleriyle birkaç parabol çiz ve tepe noktasının nasıl değiştiğini gözlemle. TYT'de tepe noktası ve kök soruları sık çıkar.",
    };
  }

  // ── Limit ─────────────────────────────────────────────────────────────────
  if (matches(q, ["limit", "belirsizlik", "l'hôpital", "lhopital", "yaklaşım"])) {
    return {
      summary:
        "Limit, bir fonksiyonun belirli bir noktaya yaklaşırken hangi değere yöneldiğini ifade eder. " +
        "lim(x→a) f(x) = L yazımı, x değeri a'ya yaklaştıkça f(x)'in L'ye yaklaştığı anlamına gelir. " +
        "Limitin var olabilmesi için sol limit ve sağ limitin eşit olması gerekir. " +
        "0/0 veya ∞/∞ gibi belirsizlik durumlarında çarpanlara ayırma, eşlenik çarpma veya " +
        "L'Hôpital kuralı kullanılır.",
      steps: [
        {
          stepNumber: 1,
          title: "Doğrudan Yerine Koyma",
          content: "İlk adım olarak x = a değerini fonksiyona yaz. Sonuç belirli bir sayıysa limit o sayıdır.",
          example: "lim(x→2) (x² + 1) = 4 + 1 = 5",
        },
        {
          stepNumber: 2,
          title: "Belirsizlik Durumlarını Çöz",
          content:
            "0/0 durumunda pay ve paydayı çarpanlara ayır; ortak çarpanı sadeleştir. Ardından tekrar yerine koy.",
          example: "lim(x→1) (x²-1)/(x-1) = lim(x→1) (x+1)(x-1)/(x-1) = lim(x→1) (x+1) = 2",
        },
        {
          stepNumber: 3,
          title: "Sonsuzda Limit",
          content:
            "x→∞ durumunda en yüksek dereceli terimi bölen ve bölen için hesap yap; düşük dereceli terimler sıfıra gider.",
          example: "lim(x→∞) (3x²+x)/(x²-2) = 3/1 = 3",
        },
      ],
      keyPoints: [
        "Limitin varlığı için sol limit = sağ limit şartı zorunludur",
        "0/0 belirsizliğinde çarpanlara ayırma veya L'Hôpital dene",
        "x→∞ limitinde en yüksek kuvvetlere göre sadeleştir",
        "Paydada sıfır çıkıyorsa limit yoktur veya ±∞'dur (yan limitlere bak)",
      ],
      commonMistakes: [
        "Belirsizlik olmadan doğrudan L'Hôpital uygulamak (0/0 veya ∞/∞ yoksa kullanılmaz)",
        "Sol ve sağ limiti kontrol etmeden sonuca ulaşmaya çalışmak",
      ],
      practiceHint:
        "Her gün 5-10 limit sorusu çöz; belirsizlik türlerine göre grupla ve her birinde hangi yöntemi kullanacağını ezberle.",
    };
  }

  // ── Türev ─────────────────────────────────────────────────────────────────
  if (matches(q, ["türev", "derivative", "diferansiyel", "zincir kuralı"])) {
    return {
      summary:
        "Türev, bir fonksiyonun belirli bir noktadaki anlık değişim hızını verir. " +
        "Geometrik olarak türev, o noktadaki teğet doğrusunun eğimidir. " +
        "f'(x) ya da dy/dx notasyonuyla gösterilir. " +
        "Temel kurallar: (xⁿ)' = nxⁿ⁻¹, (sin x)' = cos x, (cos x)' = -sin x, (eˣ)' = eˣ, (ln x)' = 1/x. " +
        "Bileşke fonksiyonlar için zincir kuralı: [f(g(x))]' = f'(g(x))·g'(x).",
      steps: [
        {
          stepNumber: 1,
          title: "Kuvvet Kuralını Uygula",
          content: "f(x) = xⁿ → f'(x) = n·xⁿ⁻¹. Sabitin türevi sıfırdır.",
          example: "f(x) = 3x⁴ + 2x - 5  →  f'(x) = 12x³ + 2",
        },
        {
          stepNumber: 2,
          title: "Çarpım ve Bölüm Kuralları",
          content: "(u·v)' = u'v + uv'  |  (u/v)' = (u'v - uv') / v²",
          example: "(x²·sin x)' = 2x·sin x + x²·cos x",
        },
        {
          stepNumber: 3,
          title: "Zincir Kuralı",
          content: "Bileşke fonksiyon f(g(x))'in türevi f'(g(x))·g'(x)'tir. Dıştan içe doğru türev alınır.",
          example: "(sin(3x))' = cos(3x)·3 = 3cos(3x)",
        },
      ],
      keyPoints: [
        "Kuvvet kuralı: (xⁿ)' = nxⁿ⁻¹ — en sık kullanılan kural",
        "Teğet eğimi m = f'(a) — geometrik yorum",
        "Zincir kuralı: dışın türevi × için türevi",
        "Türevin sıfır olduğu noktalar maksimum veya minimum adaydır",
      ],
      commonMistakes: [
        "Bileşke fonksiyonda zincir kuralını unutmak (örn. (sin 2x)' = cos 2x yazıp 2 ile çarpmamak)",
        "Çarpım kuralı yerine her faktörün türevini ayrı almak",
      ],
      practiceHint:
        "Türev kurallarını birlikte çalış: önce kuvvet + toplam, sonra çarpım + bölüm, en son zincir. AYT'de bileşke türevler çok sık çıkar.",
    };
  }

  // ── Trigonometri ──────────────────────────────────────────────────────────
  if (matches(q, ["trigonometri", "sinüs", "kosinüs", "tanjant", "sin", "cos", "tan", "birim çember"])) {
    return {
      summary:
        "Trigonometri, açılar ve kenar uzunlukları arasındaki ilişkileri inceler. " +
        "Birim çember üzerinde θ açısına karşılık gelen nokta (cos θ, sin θ) koordinatlarını verir. " +
        "Temel özdeşlikler: sin²θ + cos²θ = 1, tan θ = sin θ / cos θ. " +
        "Özel açılar (30°, 45°, 60°, 90°) için değerleri ezberlemek YKS'de büyük avantaj sağlar.",
      steps: [
        {
          stepNumber: 1,
          title: "Özel Açı Değerleri",
          content:
            "sin 30°=1/2, cos 30°=√3/2 | sin 45°=cos 45°=√2/2 | sin 60°=√3/2, cos 60°=1/2 | sin 90°=1, cos 90°=0",
          example: "sin 30° + cos 60° = 1/2 + 1/2 = 1",
        },
        {
          stepNumber: 2,
          title: "Temel Özdeşlikler",
          content:
            "sin²θ + cos²θ = 1 özdeşliği ile biri bilindiğinde diğeri bulunur. 1 + tan²θ = sec²θ da sıklıkla kullanılır.",
          example: "sin θ = 3/5 ise  cos²θ = 1 - 9/25 = 16/25  →  cos θ = ±4/5",
        },
        {
          stepNumber: 3,
          title: "Tamamlayıcı Açı Bağıntıları",
          content: "sin(90°-θ) = cos θ, cos(90°-θ) = sin θ. Bu bağıntılar soru çözümünü kolaylaştırır.",
          example: "sin 70° = cos 20°  (90°-20° = 70° olduğu için)",
        },
      ],
      keyPoints: [
        "Birim çember: P(θ) = (cos θ, sin θ) — açı büyüdükçe nokta çemberde dolaşır",
        "sin²θ + cos²θ = 1 — her zaman geçerli temel özdeşlik",
        "Özel açılar: 0°, 30°, 45°, 60°, 90° için sin ve cos değerleri",
        "ASTC: hangi bölgede hangi fonksiyon pozitif (I: hepsi, II: sin, III: tan, IV: cos)",
      ],
      commonMistakes: [
        "30° ve 60° için sin ve cos değerlerini karıştırmak",
        "Negatif açılarda veya 90° ötesinde fonksiyon işaretini yanlış belirlemek",
      ],
      practiceHint:
        "Birim çemberi baştan çizerek özel açı değerlerini türet; ezberlemek yerine anlayarak öğren.",
    };
  }

  // ── Newton Yasaları ───────────────────────────────────────────────────────
  if (matches(q, ["newton", "kuvvet", "ivme", "hareket yasası", "eylemsizlik", "f=ma", "f = ma"])) {
    return {
      summary:
        "Newton'un hareket yasaları klasik mekaniğin temelini oluşturur. " +
        "1. Yasa (eylemsizlik): Net kuvvet sıfırsa cisim duruyorsa durur, hareket ediyorsa sabit hızla hareket eder. " +
        "2. Yasa: F = ma — net kuvvet, kütleyle ivmenin çarpımına eşittir. " +
        "3. Yasa (etki-tepki): Her kuvvetin büyüklüğü eşit, yönü zıt bir karşı kuvveti vardır.",
      steps: [
        {
          stepNumber: 1,
          title: "Serbest Cisim Diyagramı",
          content:
            "Problemi çözmeden önce cisme etki eden tüm kuvvetleri (ağırlık, normal, sürtünme, gerilme) diyagram üzerinde göster.",
          example: "Eğik düzlemdeki kutu: ağırlık (aşağı), normal (dik), sürtünme (eğime zıt)",
        },
        {
          stepNumber: 2,
          title: "Bileşenlere Ayır ve F = ma Uygula",
          content:
            "Kuvvetleri x ve y eksenlerine ayır, her eksen için ΣF = ma denklemini yaz ve ivmeyi çöz.",
          example: "ΣFx = F - f = ma  |  ΣFy = N - mg = 0  →  N = mg",
        },
        {
          stepNumber: 3,
          title: "Etki-Tepki Çiftleri",
          content:
            "Etki-tepki kuvvetleri farklı cisimler üzerine etki eder; aynı cismin kuvvetleriyle karıştırma.",
          example: "Zemin ayakkabıya N kuvveti uygular; ayakkabı da zemine N' = N kuvveti uygular (zıt yönde)",
        },
      ],
      keyPoints: [
        "F = ma — net kuvvet, kütle ve ivme arasındaki ilişki",
        "Ağırlık W = mg (m: kütle kg, g ≈ 10 m/s²)",
        "Eylemsizlik: net kuvvet sıfırsa hız değişmez",
        "Etki-tepki çiftleri farklı cisimler üzerindedir",
      ],
      commonMistakes: [
        "Ağırlık (W = mg, Newton) ile kütleyi (m, kg) karıştırmak",
        "Normal kuvvetin her zaman mg'ye eşit olduğunu sanmak (eğimde veya ivmeli düzende değişir)",
      ],
      practiceHint:
        "Her mekanik probleminde önce serbest cisim diyagramı çiz; bu alışkanlık hata oranını belirgin düşürür.",
    };
  }

  // ── Hücre / Biyoloji ──────────────────────────────────────────────────────
  if (matches(q, ["hücre", "dna", "rna", "mitoz", "mayoz", "protein", "biyoloji", "gen", "kromozom"])) {
    return {
      summary:
        "Hücre, canlıların yapısal ve işlevsel temel birimidir. Prokaryot hücreler (bakteriler) zarsız organel ve " +
        "çekirdek içermez; ökaryot hücreler (bitkiler, hayvanlar) ise zarlı organeller ve belirgin çekirdek içerir. " +
        "DNA çift sarmal yapılıdır; A-T (2 hidrojen bağı) ve G-C (3 hidrojen bağı) eşleşir. " +
        "Mitoz bölünme 2n→2n (büyüme/onarım), mayoz bölünme 2n→n (üreme hücreleri) üretir.",
      steps: [
        {
          stepNumber: 1,
          title: "Prokaryot vs Ökaryot",
          content:
            "Prokaryotlar: zarsız organel yok, halkasal DNA, ribozom var. Ökaryotlar: çekirdek, mitokondri, ER vb.",
          example: "Bakteri (prokaryot) vs insan kas hücresi (ökaryot)",
        },
        {
          stepNumber: 2,
          title: "DNA ve Baz Eşleşmesi",
          content:
            "DNA çift sarmalda: Adenin-Timin (A=T, 2 H bağı), Guanin-Sitozin (G≡C, 3 H bağı). RNA'da timin yerine urasil.",
          example: "5'-ATGCGA-3' kalıbından 3'-TACGCT-5' tamamlayıcı iplik oluşur",
        },
        {
          stepNumber: 3,
          title: "Mitoz ve Mayoz",
          content:
            "Mitoz: profaz→metafaz→anafaz→telofaz; 2n → 2n (2 hücre). Mayoz: 2 bölünme; 2n → n (4 haploid hücre).",
          example: "İnsan: 2n=46 | Mitoz → 2 hücre (her biri 46) | Mayoz → 4 hücre (her biri 23)",
        },
      ],
      keyPoints: [
        "A-T (2 bağ), G-C (3 bağ) — DNA baz eşleşme kuralı",
        "Mitoz: büyüme/onarım, 2n→2n | Mayoz: üreme, 2n→n",
        "RNA'da urasil (U) vardır, timin (T) yoktur",
        "Ribozom → protein sentezi, Mitokondri → ATP, Kloroplast → fotosentez",
      ],
      commonMistakes: [
        "Mitoz ile mayozu karıştırmak — hangi hücrelerde ve kaç hücre oluştuğuna dikkat",
        "DNA replikasyonu (3'→5' şablon okunur, 5'→3' sentez) yönünü ters yazmak",
      ],
      practiceHint:
        "Mitoz evrelerini şema üzerinde çalış; her evre için kromozom sayısını ve hücre görünümünü ayrı yaz.",
    };
  }

  // ── Paragraf / Türkçe ─────────────────────────────────────────────────────
  if (matches(q, ["paragraf", "türkçe", "ana düşünce", "yardımcı düşünce", "konu", "anlatım biçimi", "cümle"])) {
    return {
      summary:
        "Paragraf, bir ana düşünce etrafında örgütlenmiş cümlelerden oluşan yazı birimidir. " +
        "Ana düşünce (ana fikir) paragrafta anlatılmak istenen temel mesajdır; genellikle başta veya sonda yer alır. " +
        "Yardımcı düşünceler ana düşünceyi destekler. " +
        "TYT Türkçe'de paragraf soruları yaklaşık 20-25 puan değerindedir.",
      steps: [
        {
          stepNumber: 1,
          title: "Ana Düşünceyi Bul",
          content:
            "Tüm cümleleri okuyup 'Bu paragrafın tek cümlelik özeti ne?' sorusunu sor. Yargı içeren ve tüm cümleleri kapsayan seçenek ana düşüncedir.",
          example: "'Kitap okumanın katkıları' konuysa, 'Kitap okumak insanı geliştirir' ana düşüncedir; 'Herkes kitap okumalı' değil",
        },
        {
          stepNumber: 2,
          title: "Anlatım Biçimini Belirle",
          content:
            "Açıklama (bilgi), tartışma (karşı görüş + savunma), betimleme (duyular), hikâye etme (olaylar), kanıtlama (ispat).",
          example: "Doğa manzarası ayrıntılı = betimleme | Sıralı olaylar = hikâye etme",
        },
        {
          stepNumber: 3,
          title: "Bağlantı İfadelerini Oku",
          content:
            "'Ancak' (zıtlık), 'bu nedenle' (sonuç), 'örneğin' (örnekleme), 'bununla birlikte' (ekleme).",
          example: "'Bu nedenle kitap okumak faydalıdır' → sonuç cümlesi, genellikle ana düşünceye yakın",
        },
      ],
      keyPoints: [
        "Konu ne hakkında (isim) ≠ Ana düşünce ne söylüyor (yargı)",
        "Ana düşünce tüm cümleleri kapsar; yardımcı düşünceler kapsamaz",
        "Anlatım biçimleri: açıklama, tartışma, betimleme, hikâye etme, kanıtlama",
        "Ana düşünce ilk cümlede olmak zorunda değil — son cümlede de olabilir",
      ],
      commonMistakes: [
        "Konuyu ana düşünce olarak seçmek — konu isim öbeği, ana düşünce yargı içerir",
        "Yardımcı düşüncenin ana düşünce olduğunu sanmak",
      ],
      practiceHint:
        "Her paragraf sorusundan önce 30 saniye okuyup 'Bu paragraf bize ne söylüyor?' diye sor.",
    };
  }

  // ── Mol / Kimya ───────────────────────────────────────────────────────────
  if (matches(q, ["mol", "kimya", "avogadro", "stokiyometri", "asit baz", "ph", "denklem denkleştir"])) {
    return {
      summary:
        "Mol kavramı, kimyada madde miktarını ifade etmek için kullanılan temel birimdir. " +
        "1 mol, 6,02 × 10²³ tane parçacık (Avogadro sayısı) içerir. " +
        "Mol sayısı: n = m/M (m: kütle gram, M: molar kütle g/mol). " +
        "Kimyasal denklemlerde katsayılar mol oranlarını verir; bu oran stokiyometri hesaplarının temelidir.",
      steps: [
        {
          stepNumber: 1,
          title: "Molar Kütle Hesapla",
          content: "Bileşiğin formülündeki her elementin atom kütlesini sayısıyla çarp ve topla.",
          example: "H₂O: 2×1 + 1×16 = 18 g/mol  |  NaCl: 23 + 35,5 = 58,5 g/mol",
        },
        {
          stepNumber: 2,
          title: "Mol-Kütle-Parçacık Dönüşümü",
          content: "n = m/M | m = n×M | N = n × 6,02×10²³ | Gaz (STP): V = n × 22,4 L",
          example: "36 g su: n = 36/18 = 2 mol  →  2 × 6,02×10²³ = 1,204×10²⁴ molekül",
        },
        {
          stepNumber: 3,
          title: "Denklem Katsayı Oranları",
          content: "Denkleştirilen denklemde katsayılar mol oranını verir. Verilen miktardan oranla bilinmeyeni bul.",
          example: "2H₂ + O₂ → 2H₂O: 4 mol H₂ → 4 mol H₂O (2 mol O₂ harcanır)",
        },
      ],
      keyPoints: [
        "1 mol = 6,02 × 10²³ parçacık (Avogadro sayısı)",
        "n = m/M | m = n×M | M = m/n — üçünü de tersten kullanabilmelisin",
        "Gazlar (STP): n = V/22,4",
        "Denklem katsayıları mol oranı verir, gram oranı değil",
      ],
      commonMistakes: [
        "Denklem katsayılarını doğrudan gram oranı olarak kullanmak",
        "Atom kütlesi (g/mol) ile gerçek atom kütlesini (u) karıştırmak",
      ],
      practiceHint:
        "Stokiyometri sorularını adım adım çöz: kütle → mol → denklem oranı → mol → kütle.",
    };
  }

  // ── TYT Matematik genel ───────────────────────────────────────────────────
  if (matches(q, ["tyt matematik", "tyt mat"])) {
    return {
      summary:
        "TYT Matematik bölümü 40 sorudan oluşur. Konu dağılımı: sayı-cebir ~%40, " +
        "denklem-eşitsizlik ~%25, fonksiyon-grafik ~%20, veri-istatistik ~%15.",
      steps: [
        {
          stepNumber: 1,
          title: "Çıkmış Soru Analizi",
          content: "Son 5 yılın TYT sorularını tara; her kategoriden en çok çıkan 3 konu tipini listele ve önce bunları pekiştir.",
        },
        {
          stepNumber: 2,
          title: "Zayıf Konu Planı",
          content: "Deneme sınavlarındaki hatalı soruları konu bazlı listele; her zayıf konuya ayrı 'onarım seansı' yap.",
        },
        {
          stepNumber: 3,
          title: "Hız ve Doğruluk",
          content: "TYT'de soru başına ~1 dakika düşer. 'Kolay → orta → zor' sıralamasıyla çalış; 80 saniyeyi geçen soruyu geç.",
        },
      ],
      keyPoints: [
        "TYT Matematik: 40 soru — sayı, cebir, denklem, fonksiyon, veri",
        "Net 30+ için soru bazlı değil konu bazlı çalışmak gerekir",
        "Yanlış hesaplamayı önlemek için işlemleri kenar boşluğuna yaz",
      ],
      commonMistakes: [
        "Zor soruya takılıp kolay soruları atlayarak zaman kaybetmek",
        "Deneme çözmeden teorik tekrar yapmak — aktif pratik şart",
      ],
      practiceHint:
        "Haftada en az 2 tam TYT denemesi çöz ve her sonrasında hata analizini tamamla.",
    };
  }

  // ── AYT Fizik genel ───────────────────────────────────────────────────────
  if (matches(q, ["ayt fizik", "ayt fiz"])) {
    return {
      summary:
        "AYT Fizik 14 soru içerir. Konular: kinematik, dinamik, iş-güç-enerji, momentum, " +
        "dalgalar, elektrik, manyetizma, modern fizik.",
      steps: [
        {
          stepNumber: 1,
          title: "Formül Listesi Çıkar",
          content: "Her konunun temel formüllerini ayrı bir karta yaz; bağlantıları ve hangi koşulda kullanıldığını not et.",
          example: "Kinematik: v=v₀+at, x=v₀t+½at², v²=v₀²+2ax",
        },
        {
          stepNumber: 2,
          title: "Problem Çözme Şeması",
          content: "Verilenler → Bilinmeyenler → Formül → Çözüm → Birim kontrolü.",
        },
        {
          stepNumber: 3,
          title: "Zor Konulara Odaklan",
          content: "Elektrik, manyetizma ve modern fizik en düşük başarı oranına sahip; bunlara daha fazla süre ayır.",
        },
      ],
      keyPoints: [
        "Serbest cisim diyagramı çizmek hata oranını yarıya indirir",
        "Enerji yöntemi bazen Newton yasalarından daha hızlı sonuç verir",
        "Birim analizi: her formülde birimleri kontrol et",
      ],
      commonMistakes: [
        "Sürtünme kuvvetini enerji korunumunda hesaba katmamak",
        "Elektrik ve manyetik kuvvetlerin yönünü karıştırmak",
      ],
      practiceHint:
        "AYT Fizik için günde minimum 5 soru çöz; teori + pratik dengesi şart.",
    };
  }

  // ── Biyoloji tekrar ───────────────────────────────────────────────────────
  if (matches(q, ["biyoloji tekrar", "biyoloji özet", "biyoloji konu"])) {
    return {
      summary:
        "AYT Biyoloji 13 soru içerir. Ağırlıklar: hücre biyolojisi ~%35, kalıtım ~%30, " +
        "insan fizyolojisi ~%20, evrim-ekoloji ~%15.",
      steps: [
        {
          stepNumber: 1,
          title: "Hücre Konusunu Sağlam Otur",
          content: "Mitoz, mayoz, hücresel solunum ve fotosentez denklemleriyle birlikte çalış.",
        },
        {
          stepNumber: 2,
          title: "Kalıtım Problemleri",
          content: "Punnett karesi ve çapraz diyagramlarını hızlı çizebilmelisin. Bağlı ve eşey bağlı kalıtım pratik gerektirir.",
        },
        {
          stepNumber: 3,
          title: "Ezber Değil Bağlantı",
          content: "Her organeli işleviyle birlikte öğren; yapı-işlev ilişkisini kur.",
        },
      ],
      keyPoints: [
        "Hücre organelleri: ribozom → protein, mitokondri → ATP, kloroplast → fotosentez",
        "Mitoz: büyüme/onarım | Mayoz: üreme",
        "Mendel yasaları: dominantlık, ayrılma, bağımsız dağılım",
      ],
      commonMistakes: [
        "DNA replikasyonu ile transkripsiyon ve translasyonu karıştırmak",
        "Kalıtım problemlerinde ebeveynlerin genotipini yanlış belirlemek",
      ],
      practiceHint: "Konu haritası çiz ve konular arası bağlantıları görselleştir.",
    };
  }

  // ── Genel / Varsayılan yanıt ──────────────────────────────────────────────
  return buildGenericResponse(topicName, q);
}

function buildGenericResponse(topicName: string, question: string): TeachContent {
  const isExamQuestion = matches(question, ["soru", "çöz", "hesapla", "bul", "nasıl yapılır"]);
  const subject = matches(question, ["matematik", "mat"]) ? "Matematik"
    : matches(question, ["fizik"]) ? "Fizik"
    : matches(question, ["kimya"]) ? "Kimya"
    : matches(question, ["biyoloji"]) ? "Biyoloji"
    : matches(question, ["türkçe", "edebiyat"]) ? "Türkçe/Edebiyat"
    : "ilgili ders";

  if (isExamQuestion) {
    return {
      summary: `"${topicName}" sorusunu çözmek için önce verilenler ve bilinmeyenler belirlenmeli, ardından uygun yöntem uygulanmalı. ${subject} dersinde bu tür soruları adım adım çözmek hata riskini azaltır.`,
      steps: [
        { stepNumber: 1, title: "Soruyu Analiz Et", content: "Verilenler ve istenenleri ayrı ayrı yaz. Hangi formül veya yöntemi kullanacağını belirle." },
        { stepNumber: 2, title: "Çözüm Planı Yap", content: `${subject} sorularında sistematik yaklaşım başarıyı artırır. Tanıdık örüntüleri ara.` },
        { stepNumber: 3, title: "Kontrol Et", content: "Sonucu vererek doğruluğunu test et; birimi ve mantığını gözden geçir." },
      ],
      keyPoints: [`${subject} sorularında şema: Anla → Planla → Uygula → Kontrol et`, "Benzer çözülmüş örneklere bak", "Birden fazla yöntem denemeye hazır ol"],
      commonMistakes: ["Soruyu tam okumadan çözmeye başlamak", "Birimleri ve işaret kurallarını gözden kaçırmak"],
      practiceHint: `Bu soru türünü anlamak için ${subject} kaynaklarındaki benzer örnekleri incele.`,
    };
  }

  return {
    summary: `"${topicName}" konusu YKS hazırlığında önemli bir alandır. Temel kavramları sağlam öğrenmek, ardından örnek sorularla pekiştirmek en etkili yoldur.`,
    steps: [
      { stepNumber: 1, title: "Temel Kavramları Öğren", content: `${topicName} konusunda önce tanımları ve temel kuralları öğren. Ders kitabının ilgili bölümünü oku.` },
      { stepNumber: 2, title: "Çözümlü Örneklerle Pekiştir", content: "Çözümü verilen örnekleri adım adım takip et; her adımın mantığını anla." },
      { stepNumber: 3, title: "Bağımsız Pratik Yap", content: "Örnekleri kendin kapatarak benzer soruları çöz. Hataları belirle ve tekrar çalış." },
    ],
    keyPoints: [`${topicName} konusunu tam anlamak için temel ve ileri kavramları birlikte çalış`, "Pasif okuma değil aktif çözme alışkanlığı edin", "Zayıf noktaları belirleyip onlara odaklan"],
    commonMistakes: ["Konuyu yüzeysel okuyup anladığını sanmak", "Hata yapılan soruları analiz etmeden geçmek"],
    practiceHint: `Günde ${topicName} konusundan 5-10 soru çöz ve her hata için neden yaptığını yaz.`,
  };
}

// ─── Practice question bank ───────────────────────────────────────────────────

interface PracticeQuestionSpec {
  text: string;
  options: { key: "A" | "B" | "C" | "D" | "E"; text: string }[];
  correct: "A" | "B" | "C" | "D" | "E";
  explanation: string;
}

const PRACTICE_QUESTION_BANK: Record<string, PracticeQuestionSpec> = {
  parabol: {
    text: "f(x) = 2x² - 4x + 1 fonksiyonunun tepe noktasının koordinatları nedir?",
    options: [
      { key: "A", text: "(1, -1)" },
      { key: "B", text: "(-1, 7)" },
      { key: "C", text: "(2, 1)" },
      { key: "D", text: "(-2, 17)" },
      { key: "E", text: "(0, 1)" },
    ],
    correct: "A",
    explanation:
      "Tepe noktası: x = -b/2a = -(-4)/(2·2) = 4/4 = 1. f(1) = 2(1)² - 4(1) + 1 = 2 - 4 + 1 = -1. Tepe noktası (1, -1).",
  },
  limit: {
    text: "lim(x→1) (x² - 1) / (x - 1) ifadesinin değeri nedir?",
    options: [
      { key: "A", text: "2" },
      { key: "B", text: "0" },
      { key: "C", text: "1" },
      { key: "D", text: "∞" },
      { key: "E", text: "-1" },
    ],
    correct: "A",
    explanation:
      "Doğrudan yerine koyunca 0/0 belirsizliği çıkar. Çarpanlara ayırarak: (x²-1)/(x-1) = (x+1)(x-1)/(x-1) = (x+1). lim(x→1) (x+1) = 1+1 = 2.",
  },
  türev: {
    text: "f(x) = 3x⁴ - 2x³ + x - 5 fonksiyonunun f'(x) türevi nedir?",
    options: [
      { key: "A", text: "12x³ - 6x² + 1" },
      { key: "B", text: "12x³ - 6x² - 1" },
      { key: "C", text: "3x³ - 2x² + 1" },
      { key: "D", text: "12x⁴ - 6x³ + 1" },
      { key: "E", text: "12x³ - 6x² + x" },
    ],
    correct: "A",
    explanation:
      "Kuvvet kuralı: (xⁿ)' = nxⁿ⁻¹. f'(x) = 4·3x³ - 3·2x² + 1·1 - 0 = 12x³ - 6x² + 1. Sabitin türevi sıfırdır.",
  },
  trigonometri: {
    text: "sin²(60°) + cos²(30°) ifadesinin değeri nedir?",
    options: [
      { key: "A", text: "3/2" },
      { key: "B", text: "1" },
      { key: "C", text: "√3/2" },
      { key: "D", text: "2" },
      { key: "E", text: "1/2" },
    ],
    correct: "A",
    explanation:
      "sin 60° = √3/2, cos 30° = √3/2. sin²(60°) = 3/4. cos²(30°) = 3/4. Toplam = 3/4 + 3/4 = 6/4 = 3/2.",
  },
  newton: {
    text: "Kütlesi 5 kg olan bir cisme 30 N net kuvvet uygulanıyor. Cismin ivmesi kaç m/s² dir?",
    options: [
      { key: "A", text: "6 m/s²" },
      { key: "B", text: "150 m/s²" },
      { key: "C", text: "25 m/s²" },
      { key: "D", text: "35 m/s²" },
      { key: "E", text: "0,6 m/s²" },
    ],
    correct: "A",
    explanation:
      "Newton'un 2. yasası: F = m·a → a = F/m = 30/5 = 6 m/s².",
  },
  hücre: {
    text: "DNA'da adenin nükleotidinin sayısı 120 ise, timin nükleotidinin sayısı kaçtır?",
    options: [
      { key: "A", text: "120" },
      { key: "B", text: "60" },
      { key: "C", text: "240" },
      { key: "D", text: "180" },
      { key: "E", text: "40" },
    ],
    correct: "A",
    explanation:
      "DNA çift sarmalında Chargaff kuralı: A = T ve G = C. Adenin sayısı 120 ise timin sayısı da 120'dir.",
  },
  paragraf: {
    text: "Aşağıdakilerden hangisi ana düşünce ile konu arasındaki temel farkı doğru ifade eder?",
    options: [
      { key: "A", text: "Konu 'ne hakkında'yı, ana düşünce 'ne söylüyor'u belirtir" },
      { key: "B", text: "Konu ve ana düşünce aynı anlama gelir" },
      { key: "C", text: "Ana düşünce her zaman ilk cümlede yer alır" },
      { key: "D", text: "Konu bir yargı, ana düşünce bir isim öbeğidir" },
      { key: "E", text: "Ana düşünce yardımcı düşüncelerden daha kısadır" },
    ],
    correct: "A",
    explanation:
      "Konu isim öbeğiyle ifade edilir (ne hakkında). Ana düşünce ise yargı içerir (ne söylüyor). Örn: Konu 'kitap okuma', ana düşünce 'Kitap okumak insanı geliştirir'.",
  },
  mol: {
    text: "36 g su (H₂O) kaç mol su içerir? (H: 1 g/mol, O: 16 g/mol)",
    options: [
      { key: "A", text: "2 mol" },
      { key: "B", text: "36 mol" },
      { key: "C", text: "18 mol" },
      { key: "D", text: "0,5 mol" },
      { key: "E", text: "1 mol" },
    ],
    correct: "A",
    explanation:
      "H₂O molar kütlesi: 2×1 + 16 = 18 g/mol. n = m/M = 36/18 = 2 mol.",
  },
};

function findPracticeQuestion(topicName: string): PracticeQuestionSpec | null {
  const key = topicName.toLowerCase();
  for (const [k, spec] of Object.entries(PRACTICE_QUESTION_BANK)) {
    if (key.includes(k)) return spec;
  }
  return null;
}

function buildGenericPracticeQuestion(req: PracticeQuestionRequest): PracticeQuestionSpec {
  return {
    text: `${req.topicName} konusuyla ilgili aşağıdakilerden hangisi doğrudur?`,
    options: [
      { key: "A", text: `${req.topicName} konusunun temel prensibi doğru uygulanmıştır` },
      { key: "B", text: "Temel prensip yanlış uygulanmıştır" },
      { key: "C", text: "Bu konuda genel bir kural yoktur" },
      { key: "D", text: "Sonuç her zaman değişkendir" },
      { key: "E", text: "Tanım eksik verilmiştir" },
    ],
    correct: "A",
    explanation: `${req.topicName} konusunun temel prensibini bilmek bu soruyu doğru çözmenin anahtarıdır. Gerçek AI entegrasyonu tamamlandığında bu soru ${req.subjectName} müfredatına özgü içerikle üretilecektir.`,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class LocalMockAIProvider implements IAIProvider {
  readonly kind = AIProviderKind.LOCAL_MOCK;
  readonly isAvailable = true;

  // ── Question Generation ────────────────────────────────────────────────────

  async generateQuestions(
    req: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse> {
    const start = Date.now();
    await mockDelay();

    const questions: GeneratedQuestion[] = Array.from({ length: req.count }, (_, i) => ({
      id: makeQuestionId(req.topicId, i),
      topicId: req.topicId,
      topicName: req.topicName,
      subjectName: req.subjectName,
      questionText: `${req.topicName} konusunda soru ${i + 1}: Bu konuyla ilgili hangisi doğrudur?`,
      options: [
        { key: "A" as const, text: "Birinci şık — doğru yanıt" },
        { key: "B" as const, text: "İkinci şık — yanlış" },
        { key: "C" as const, text: "Üçüncü şık — yanlış" },
        { key: "D" as const, text: "Dördüncü şık — yanlış" },
        { key: "E" as const, text: "Beşinci şık — yanlış" },
      ],
      correctAnswer: "A" as const,
      explanation: `Bu soruda ${req.topicName} konusunun temel kavramı test edilmektedir. Doğru yanıt A şıkkıdır çünkü tanım bunu gerektirir.`,
      difficulty:
        req.difficulty === "mixed"
          ? (["easy", "medium", "hard"] as const)[i % 3]
          : req.difficulty,
      estimatedTimeSeconds: req.difficulty === "hard" ? 90 : req.difficulty === "medium" ? 60 : 45,
    }));

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      questions,
      requestedCount: req.count,
      deliveredCount: questions.length,
    };
  }

  // ── Question Evaluation ────────────────────────────────────────────────────

  async evaluateQuestion(
    req: QuestionEvaluationRequest
  ): Promise<QuestionEvaluationResponse> {
    const start = Date.now();
    await mockDelay(300, 600);

    const isCorrect = req.userAnswer === req.correctAnswer;

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      isCorrect,
      explanation: `${req.topicName} sorusunun doğru yanıtı "${req.correctAnswer}" şıkkıdır. ${isCorrect ? "Tebrikler, doğru yanıtladın!" : `Sen "${req.userAnswer}" seçtin, bu yanlış.`}`,
      improvementTip: isCorrect
        ? ""
        : `${req.topicName} konusunu tekrar çalışmanı öneririz. Özellikle temel tanımlara odaklan.`,
      relatedTopicsToReview: isCorrect ? [] : [req.topicName, req.subjectName],
    };
  }

  // ── AI Teacher ─────────────────────────────────────────────────────────────

  async teachTopic(req: AITeacherRequest): Promise<AITeacherResponse> {
    const start = Date.now();
    await mockDelay();

    const question = req.userQuestion ?? req.topicName;
    const content = buildTeachContent(question, req.topicName);

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      summary: content.summary,
      steps: content.steps,
      keyPoints: content.keyPoints,
      commonMistakes: content.commonMistakes,
      practiceHint: content.practiceHint,
    };
  }

  // ── Explain Question ───────────────────────────────────────────────────────

  async explainQuestion(
    req: ExplainQuestionRequest
  ): Promise<ExplainQuestionResponse> {
    const start = Date.now();
    await mockDelay(300, 700);

    const isWrong =
      req.userAnswer !== undefined && req.userAnswer !== req.correctAnswer;
    const content = buildTeachContent(req.topicName.toLowerCase(), req.topicName);

    // Find the text of the correct option for a richer explanation
    const correctOption = req.options.find((o) => o.key === req.correctAnswer);
    const userOption = req.userAnswer
      ? req.options.find((o) => o.key === req.userAnswer)
      : undefined;

    const correctAnswerExplanation =
      `${req.correctAnswer} şıkkı${correctOption ? ` ("${correctOption.text}")` : ""} doğrudur. ` +
      content.summary.slice(0, 200) +
      (content.summary.length > 200 ? "…" : "");

    const wrongAnswerAnalysis: string | undefined = isWrong
      ? `"${req.userAnswer}" şıkkı${userOption ? ` ("${userOption.text}")` : ""} yanlıştır. ` +
        (content.commonMistakes[0] ??
          `${req.topicName} konusunun temel prensibi bu seçenekte göz ardı edilmiş.`)
      : undefined;

    // Build solution steps from topic content, falling back to generic steps
    const steps: ExplanationStep[] =
      content.steps.length > 0
        ? content.steps.slice(0, 3)
        : [
            {
              stepNumber: 1,
              title: "Soruyu Analiz Et",
              content: `"${req.questionText.slice(0, 80).trim()}…" sorusunda ${req.topicName} konusunun temel prensibi uygulanmaktadır.`,
            },
            {
              stepNumber: 2,
              title: "Doğru Yanıtı Belirle",
              content: correctAnswerExplanation,
            },
          ];

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      correctAnswerExplanation,
      wrongAnswerAnalysis,
      steps,
      keyConceptsUsed: [req.topicName, ...content.keyPoints.slice(0, 2)],
      similarTopicsToStudy: [
        req.subjectName,
        ...content.keyPoints
          .slice(2, 4)
          .filter((kp) => kp !== req.topicName),
      ],
    };
  }

  // ── Analyze Mistakes ───────────────────────────────────────────────────────

  async analyzeMistakes(
    req: AnalyzeMistakesRequest
  ): Promise<AnalyzeMistakesResponse> {
    const start = Date.now();
    await mockDelay(500, 1000);

    const { mistakes, topWeakAreasCount = 3 } = req;

    if (mistakes.length === 0) {
      return {
        ...baseResponse(start),
        requestId: req.requestId,
        patterns: [],
        weakestSubjects: [],
        topRecommendations: [
          "Henüz hata kaydı bulunmuyor.",
          "İlk sorularını çözdükten sonra buraya dön!",
        ],
        overallInsight:
          "Hata analizi için yeterli veri yok. Sorular çözdükçe bu analiz kişiselleşecek.",
      };
    }

    // ── Group by subject and topic ──────────────────────────────────────────
    const subjectMap = new Map<string, number>();
    const topicMap = new Map<string, number>();
    mistakes.forEach((m) => {
      subjectMap.set(m.subjectName, (subjectMap.get(m.subjectName) ?? 0) + 1);
      topicMap.set(m.topicName, (topicMap.get(m.topicName) ?? 0) + 1);
    });

    const weakestSubjects = Array.from(subjectMap.entries())
      .map(([subjectName, mistakeCount]) => ({ subjectName, mistakeCount }))
      .sort((a, b) => b.mistakeCount - a.mistakeCount)
      .slice(0, topWeakAreasCount);

    const weakestTopics = Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // ── Build patterns ──────────────────────────────────────────────────────
    const patterns: MistakePattern[] = [];

    if (weakestTopics.length > 0) {
      patterns.push({
        patternType: "topic_gap",
        affectedTopicNames: weakestTopics,
        frequency: Math.ceil(mistakes.length * 0.55),
        description: `${weakestTopics.join(", ")} konularında tekrarlayan hatalar tespit edildi. Temel kavramlar eksik görünüyor.`,
        recommendedAction: `${weakestTopics[0]} konusunu baştan ele al; tanımları ve çözümlü örnekleri yeniden incele.`,
      });
    }

    if (mistakes.length >= 4) {
      patterns.push({
        patternType: "concept_confusion",
        affectedTopicNames: weakestTopics.slice(0, 2),
        frequency: Math.ceil(mistakes.length * 0.25),
        description: "Birbirine benzer kavramlar arasında karışıklık yaşanıyor.",
        recommendedAction:
          "Bu kavramları yan yana karşılaştır; her birinin neyi ölçtüğünü kısa bir tabloya yaz.",
      });
    }

    if (mistakes.length >= 7) {
      patterns.push({
        patternType: "careless_mistake",
        affectedTopicNames: weakestTopics,
        frequency: Math.ceil(mistakes.length * 0.15),
        description: "Bilgi var ama baskı altında dikkat dağılıyor.",
        recommendedAction:
          "Soru okuma hızını biraz düşür; her soruyu iki kez oku, özellikle 'hangisi yanlış' tipinde.",
      });
    }

    const topSubject = weakestSubjects[0]?.subjectName ?? "ilgili ders";
    const topTopic = weakestTopics[0] ?? "zayıf konular";

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      patterns,
      weakestSubjects,
      topRecommendations: [
        `${topSubject} dersine bu hafta öncelik ver — en çok hata burada yapılıyor`,
        `${topTopic} konusunu baştan çalış, ardından 10 soru çöz`,
        "Hata yaptığın soruların benzerlerini çözdükten sonra aynı soruya geri dön",
        "Her hata için 'neden yanlış yaptım?' sorusunu not al",
      ],
      overallInsight:
        `${mistakes.length} hata analiz edildi. En çok hata ${topSubject} dersinde, ` +
        `özellikle ${topTopic} konusunda yapılıyor. ` +
        "Hedefli tekrar ile bu süreç kısaltılabilir; genel değil seçici çalışmak şu an için daha verimli.",
    };
  }

  // ── Practice Question ──────────────────────────────────────────────────────

  async generatePracticeQuestion(
    req: PracticeQuestionRequest
  ): Promise<PracticeQuestionResponse> {
    const start = Date.now();
    await mockDelay(300, 700);

    const spec = findPracticeQuestion(req.topicName) ?? buildGenericPracticeQuestion(req);

    const difficulty =
      req.difficulty === "mixed"
        ? (["easy", "medium", "hard"] as const)[Math.floor(Math.random() * 3)]
        : req.difficulty;

    const question: GeneratedQuestion = {
      id: `mock_pq_${req.topicId}_${Date.now()}`,
      topicId: req.topicId,
      topicName: req.topicName,
      subjectName: req.subjectName,
      questionText: spec.text,
      options: spec.options,
      correctAnswer: spec.correct,
      explanation: spec.explanation,
      difficulty,
      estimatedTimeSeconds: difficulty === "hard" ? 90 : difficulty === "medium" ? 60 : 45,
    };

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      question,
    };
  }

  // ── Study Coach ────────────────────────────────────────────────────────────

  async coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse> {
    const start = Date.now();
    await mockDelay();

    const { learnerSnapshot: s } = req;

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      overallAssessment: `TYT ilerlemesi %${s.tytProgressPct}, AYT ilerlemesi %${s.aytProgressPct}. ${s.studyStreakDays} günlük seri harika! Sınava ${s.daysUntilExam} gün kaldı.`,
      recommendations: [
        {
          id: "mock_rec_1",
          type: "action",
          priority: "high",
          title: "Bu Haftanın Önceliği",
          body:
            s.weakSubjectNames.length > 0
              ? `${s.weakSubjectNames.slice(0, 2).join(", ")} derslerinde eksikler var. Bu hafta bunlara odaklan.`
              : "Genel ilerleme iyi görünüyor. Tempoyu koru.",
          estimatedImpact: "high",
          relatedTopicIds: [],
        },
        {
          id: "mock_rec_2",
          type: "insight",
          priority: "medium",
          title: "Tempo Analizi",
          body: `Günde ortalama ${Math.ceil(s.totalTopicsCompleted / Math.max(1, 30))} konu tamamlıyorsun. Sınava yetişmek için bu tempoyu koru.`,
          estimatedImpact: "medium",
        },
        {
          id: "mock_rec_3",
          type: "encouragement",
          priority: "low",
          title: "Motivasyon",
          body: "Her gün küçük adımlar atmak büyük hedefe ulaşmanın en güvenilir yoludur. Devam et!",
          estimatedImpact: "low",
        },
      ],
      weeklyFocusSuggestion: "Bu hafta TYT'ye ağırlık ver ve her gün en az 1 AYT konusu ekle.",
      motivationalMessage:
        "Başarı bir yolculuktur, varış değil. Sen bu yolun en doğru yolcususun!",
    };
  }

  // ── Mini Exams ─────────────────────────────────────────────────────────────

  async generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse> {
    const start = Date.now();
    await mockDelay(600, 1200);

    const questions: GeneratedQuestion[] = Array.from(
      { length: req.questionCount },
      (_, i) => {
        const topicId =
          req.weakTopicIds[i % Math.max(1, req.weakTopicIds.length)] ?? "mock_topic";
        return {
          id: makeQuestionId(topicId, i),
          topicId,
          topicName: `Zayıf Konu ${(i % Math.max(1, req.weakTopicIds.length)) + 1}`,
          subjectName: req.examType === "TYT" ? "Türkçe" : "Matematik",
          questionText: `${req.examType} Mini Sınavı — Soru ${i + 1}`,
          options: [
            { key: "A" as const, text: "Doğru şık" },
            { key: "B" as const, text: "Yanlış şık" },
            { key: "C" as const, text: "Yanlış şık" },
            { key: "D" as const, text: "Yanlış şık" },
            { key: "E" as const, text: "Yanlış şık" },
          ],
          correctAnswer: "A" as const,
          explanation: `Soru ${i + 1} — gerçek AI ile içerik üretilecek.`,
          difficulty: req.difficulty,
          estimatedTimeSeconds:
            (req.targetDurationMinutes * 60) / req.questionCount,
        };
      }
    );

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      exam: {
        id: `mock_exam_${Date.now()}`,
        title: `${req.examType} Mini Denemesi`,
        description: `Zayıf konularına odaklanan ${req.questionCount} soruluk mini deneme.`,
        examType: req.examType,
        questions,
        totalTimeSeconds: req.targetDurationMinutes * 60,
        targetedWeakAreas: req.weakTopicIds,
      },
    };
  }

  // ── Study Plans ────────────────────────────────────────────────────────────

  async generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse> {
    const start = Date.now();
    await mockDelay();

    const today = new Date();
    const weeklyPlan = Array.from(
      { length: Math.min(req.planDurationDays, 7) },
      (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return {
          date: date.toISOString().split("T")[0],
          dayLabel: DAYS_TR[date.getDay() === 0 ? 6 : date.getDay() - 1],
          totalMinutes: req.dailyAvailableMinutes,
          sessions: [
            {
              subjectName: "Matematik",
              topicNames: [`Konu ${i * 2 + 1}`, `Konu ${i * 2 + 2}`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.4),
              priority: (i < 2 ? "high" : "medium") as "high" | "medium" | "low",
            },
            {
              subjectName: "Türkçe",
              topicNames: ["Paragraf Türleri"],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.3),
              priority: "medium" as const,
            },
            {
              subjectName: req.studyField === "say" ? "Fizik" : "Tarih",
              topicNames: [`${req.studyField.toUpperCase()} Konusu`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.3),
              priority: "low" as const,
            },
          ],
        };
      }
    );

    const totalIncomplete =
      req.incompleteTYTTopicIds.length + req.incompleteAYTTopicIds.length;

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      weeklyPlan,
      totalTopicsCovered: weeklyPlan.length * 3,
      estimatedCompletionPct: Math.min(
        100,
        totalIncomplete > 0
          ? Math.round((weeklyPlan.length * 3 * 100) / totalIncomplete)
          : 100
      ),
      notes:
        "Bu plan örnek verilerle oluşturulmuştur. Gerçek AI entegrasyonu tamamlandığında kişiselleştirilmiş plan üretilecektir.",
    };
  }
}
