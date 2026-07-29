import { TYT_SUBTOPICS_BY_TOPIC_ID } from "./tytSubtopics";

export type StudyField = "sayisal" | "esitAgirlik" | "sozel";

export interface Subtopic {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subtopics?: Subtopic[];
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}

export interface ExamSection {
  id: string;
  name: string;
  subjects: Subject[];
}

function makeTopics(subjectId: string, names: string[]): Topic[] {
  return names.map((name, i) => ({ id: `${subjectId}-${i}`, name }));
}

function makeSubtopics(
  topicId: string,
  names: string[],
): Subtopic[] {
  return names.map((name, index) => ({
    id: `${topicId}-sub-${index}`,
    name,
  }));
}

function makeTopic(
  id: string,
  name: string,
  subtopicNames: string[] = [],
): Topic {
  const resolvedSubtopics =
    subtopicNames.length > 0
      ? subtopicNames
      : TYT_SUBTOPICS_BY_TOPIC_ID[id] ?? [];

  return {
    id,
    name,
    subtopics:
      resolvedSubtopics.length > 0
        ? makeSubtopics(id, resolvedSubtopics)
        : undefined,
  };
}

export const TYT_SUBJECTS: Subject[] = [
  {
    id: "tyt-turkce",
    name: "Türkçe",
    color: "#8B5CF6",
    topics: [
      makeTopic("tyt-turkce-0", "Sözcükte Anlam"),
      makeTopic("tyt-turkce-1", "Cümlede Anlam"),
      makeTopic("tyt-turkce-5", "Paragrafta Anlam"),
      makeTopic("tyt-turkce-10", "Paragrafın Yapısı"),
      makeTopic("tyt-turkce-11", "Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları"),
      makeTopic("tyt-turkce-12", "Sözel Mantık"),
      makeTopic("tyt-turkce-8", "Ses Bilgisi"),
      makeTopic("tyt-turkce-9", "Sözcükte Yapı"),
      makeTopic("tyt-turkce-2", "Sözcük Türleri"),
      makeTopic("tyt-turkce-3", "Fiiller"),
      makeTopic("tyt-turkce-13", "Fiilimsiler"),
      makeTopic("tyt-turkce-14", "Ek Fiil"),
      makeTopic("tyt-turkce-4", "Cümlenin Ögeleri"),
      makeTopic("tyt-turkce-15", "Cümle Türleri"),
      makeTopic("tyt-turkce-16", "Anlatım Bozukluğu"),
      makeTopic("tyt-turkce-6", "Yazım Kuralları"),
      makeTopic("tyt-turkce-7", "Noktalama İşaretleri"),
    ],
  },
  {
    id: "tyt-matematik",
    name: "Matematik",
    color: "#2563EB",
    topics: [
      makeTopic("tyt-matematik-9", "Temel Kavramlar"),
      makeTopic("tyt-matematik-0", "Sayılar ve Sayı Kümeleri"),
      makeTopic("tyt-matematik-1", "Doğal Sayılar ve Tam Sayılar"),
      makeTopic("tyt-matematik-18", "Sayı Basamakları"),
      makeTopic("tyt-matematik-19", "Tek ve Çift Sayılar"),
      makeTopic("tyt-matematik-20", "Pozitif ve Negatif Sayılar"),
      makeTopic("tyt-matematik-2", "Bölme ve Bölünebilme"),
      makeTopic("tyt-matematik-3", "EBOB ve EKOK"),
      makeTopic("tyt-matematik-21", "Asal Sayılar ve Çarpanlar"),
      makeTopic("tyt-matematik-4", "Rasyonel Sayılar ve Ondalık Gösterim"),
      makeTopic("tyt-matematik-22", "Mutlak Değer"),
      makeTopic("tyt-matematik-5", "Üslü İfadeler"),
      makeTopic("tyt-matematik-6", "Köklü İfadeler"),
      makeTopic("tyt-matematik-23", "Çarpanlara Ayırma"),
      makeTopic("tyt-matematik-7", "Oran ve Orantı"),
      makeTopic("tyt-matematik-8", "Yüzde, Kâr-Zarar ve Faiz"),
      makeTopic("tyt-matematik-10", "Denklem Çözme"),
      makeTopic("tyt-matematik-11", "Basit Eşitsizlikler"),
      makeTopic("tyt-matematik-24", "Kümeler ve Kartezyen Çarpım"),
      makeTopic("tyt-matematik-25", "Mantık"),
      makeTopic("tyt-matematik-26", "Fonksiyon Kavramı"),
      makeTopic("tyt-matematik-27", "Polinomlara Giriş"),
      makeTopic("tyt-matematik-28", "Permütasyon"),
      makeTopic("tyt-matematik-29", "Kombinasyon"),
      makeTopic("tyt-matematik-15", "Olasılık"),
      makeTopic("tyt-matematik-16", "Veri, Grafik ve İstatistik"),
      makeTopic("tyt-matematik-17", "Problemler"),
    ],
  },
  {
    id: "tyt-geometri",
    name: "Geometri",
    color: "#4F46E5",
    topics: [
      makeTopic("tyt-geometri-0", "Doğruda Açılar"),
      makeTopic("tyt-geometri-1", "Üçgende Açılar"),
      makeTopic("tyt-matematik-12", "Üçgenler"),
      makeTopic("tyt-geometri-2", "Dik Üçgen"),
      makeTopic("tyt-geometri-3", "Özel Üçgenler"),
      makeTopic("tyt-geometri-4", "Üçgende Eşlik ve Benzerlik"),
      makeTopic("tyt-geometri-5", "Üçgenin Yardımcı Elemanları"),
      makeTopic("tyt-geometri-6", "Üçgende Alan"),
      makeTopic("tyt-matematik-13", "Dörtgenler ve Çokgenler"),
      makeTopic("tyt-geometri-7", "Özel Dörtgenler"),
      makeTopic("tyt-matematik-14", "Çember ve Daire"),
      makeTopic("tyt-geometri-8", "Temel Analitik Geometri"),
      makeTopic("tyt-geometri-9", "Katı Cisimler"),
    ],
  },
  {
    id: "tyt-fen-fizik",
    name: "Fizik",
    color: "#0891B2",
    topics: [
      makeTopic("tyt-fen-fizik-0", "Fizik Bilimine Giriş ve Ölçme"),
      makeTopic("tyt-fen-fizik-1", "Madde ve Özellikleri"),
      makeTopic("tyt-fen-fizik-7", "Özkütle"),
      makeTopic("tyt-fen-fizik-8", "Dayanıklılık"),
      makeTopic("tyt-fen-fizik-9", "Adezyon, Kohezyon ve Yüzey Gerilimi"),
      makeTopic("tyt-fen-fizik-2", "Hareket ve Kuvvet"),
      makeTopic("tyt-fen-fizik-10", "İş, Güç ve Enerji"),
      makeTopic("tyt-fen-fizik-3", "Basınç"),
      makeTopic("tyt-fen-fizik-11", "Kaldırma Kuvveti"),
      makeTopic("tyt-fen-fizik-4", "Isı, Sıcaklık ve Genleşme"),
      makeTopic("tyt-fen-fizik-5", "Elektrostatik"),
      makeTopic("tyt-fen-fizik-12", "Elektrik Akımı ve Devreler"),
      makeTopic("tyt-fen-fizik-13", "Manyetizma"),
      makeTopic("tyt-fen-fizik-14", "Dalgalar"),
      makeTopic("tyt-fen-fizik-6", "Optik"),
    ],
  },
  {
    id: "tyt-fen-kimya",
    name: "Kimya",
    color: "#0D9488",
    topics: [
      makeTopic("tyt-fen-kimya-6", "Kimya Bilimi"),
      makeTopic("tyt-fen-kimya-0", "Atom ve Periyodik Sistem"),
      makeTopic("tyt-fen-kimya-7", "Kimyasal Türler Arası Etkileşimler"),
      makeTopic("tyt-fen-kimya-1", "Maddenin Hâlleri"),
      makeTopic("tyt-fen-kimya-8", "Kimyanın Temel Kanunları"),
      makeTopic("tyt-fen-kimya-9", "Mol Kavramı"),
      makeTopic("tyt-fen-kimya-4", "Kimyasal Tepkimeler ve Hesaplamalar"),
      makeTopic("tyt-fen-kimya-2", "Karışımlar"),
      makeTopic("tyt-fen-kimya-10", "Ayırma ve Saflaştırma Teknikleri"),
      makeTopic("tyt-fen-kimya-3", "Asitler, Bazlar ve Tuzlar"),
      makeTopic("tyt-fen-kimya-11", "Kimya Her Yerde"),
      makeTopic("tyt-fen-kimya-5", "Organik Kimyaya Giriş"),
    ],
  },
  {
    id: "tyt-fen-biyoloji",
    name: "Biyoloji",
    color: "#16A34A",
    topics: [
      makeTopic("tyt-fen-biyoloji-5", "Canlıların Ortak Özellikleri"),
      makeTopic("tyt-fen-biyoloji-6", "Canlıların Temel Bileşenleri"),
      makeTopic("tyt-fen-biyoloji-0", "Hücre ve Organeller"),
      makeTopic("tyt-fen-biyoloji-7", "Hücre Zarından Madde Geçişleri"),
      makeTopic("tyt-fen-biyoloji-1", "Canlıların Sınıflandırılması"),
      makeTopic("tyt-fen-biyoloji-8", "Canlı Âlemleri"),
      makeTopic("tyt-fen-biyoloji-9", "Mitoz ve Eşeysiz Üreme"),
      makeTopic("tyt-fen-biyoloji-10", "Mayoz ve Eşeyli Üreme"),
      makeTopic("tyt-fen-biyoloji-2", "Kalıtım"),
      makeTopic("tyt-fen-biyoloji-3", "Ekosistem Ekolojisi"),
      makeTopic("tyt-fen-biyoloji-11", "Güncel Çevre Sorunları"),
      makeTopic("tyt-fen-biyoloji-12", "Doğal Kaynaklar ve Biyolojik Çeşitlilik"),
      makeTopic("tyt-fen-biyoloji-4", "Bitkilerde Üreme"),
    ],
  },
  {
    id: "tyt-sosyal-tarih",
    name: "Tarih",
    color: "#B45309",
    topics: [
      makeTopic("tyt-sosyal-tarih-0", "Tarih ve Zaman"),
      makeTopic("tyt-sosyal-tarih-1", "İnsanlığın İlk Dönemleri"),
      makeTopic("tyt-sosyal-tarih-2", "İlk ve Orta Çağlarda Türk Dünyası"),
      makeTopic("tyt-sosyal-tarih-3", "İslam Medeniyetinin Doğuşu"),
      makeTopic("tyt-sosyal-tarih-5", "Türklerin İslamiyet'i Kabulü ve İlk Türk-İslam Devletleri"),
      makeTopic("tyt-sosyal-tarih-4", "Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi"),
      makeTopic("tyt-sosyal-tarih-6", "Beylikten Devlete Osmanlı"),
      makeTopic("tyt-sosyal-tarih-7", "Dünya Gücü Osmanlı"),
      makeTopic("tyt-sosyal-tarih-8", "Değişim Çağında Avrupa ve Osmanlı"),
      makeTopic("tyt-sosyal-tarih-9", "Uluslararası İlişkilerde Denge Stratejisi"),
      makeTopic("tyt-sosyal-tarih-10", "XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya"),
      makeTopic("tyt-sosyal-tarih-11", "Millî Mücadele"),
      makeTopic("tyt-sosyal-tarih-12", "Atatürkçülük ve Türk İnkılabı"),
    ],
  },
  {
    id: "tyt-sosyal-cografya",
    name: "Coğrafya",
    color: "#9333EA",
    topics: [
      makeTopic("tyt-sosyal-cografya-0", "Doğa ve İnsan"),
      makeTopic("tyt-sosyal-cografya-1", "Dünya'nın Şekli ve Hareketleri"),
      makeTopic("tyt-sosyal-cografya-5", "Coğrafi Konum"),
      makeTopic("tyt-sosyal-cografya-6", "Harita Bilgisi"),
      makeTopic("tyt-sosyal-cografya-2", "Atmosfer ve İklim"),
      makeTopic("tyt-sosyal-cografya-7", "İç Kuvvetler"),
      makeTopic("tyt-sosyal-cografya-8", "Dış Kuvvetler"),
      makeTopic("tyt-sosyal-cografya-3", "Türkiye'nin Yer Şekilleri"),
      makeTopic("tyt-sosyal-cografya-9", "Su, Toprak ve Bitkiler"),
      makeTopic("tyt-sosyal-cografya-4", "Nüfus, Göç ve Yerleşme"),
      makeTopic("tyt-sosyal-cografya-10", "Ekonomik Faaliyetler"),
      makeTopic("tyt-sosyal-cografya-11", "Bölgeler"),
      makeTopic("tyt-sosyal-cografya-12", "Uluslararası Ulaşım Hatları"),
      makeTopic("tyt-sosyal-cografya-13", "Doğal Afetler"),
    ],
  },
  {
    id: "tyt-sosyal-felsefe",
    name: "Felsefe",
    color: "#DB2777",
    topics: [
      makeTopic("tyt-sosyal-felsefe-0", "Felsefeyi Tanıma"),
      makeTopic("tyt-sosyal-felsefe-3", "Felsefi Düşüncenin Özellikleri"),
      makeTopic("tyt-sosyal-felsefe-4", "Akıl Yürütme ve Argümantasyon"),
      makeTopic("tyt-sosyal-felsefe-1", "Bilgi Felsefesi"),
      makeTopic("tyt-sosyal-felsefe-5", "Varlık Felsefesi"),
      makeTopic("tyt-sosyal-felsefe-2", "Ahlak Felsefesi"),
      makeTopic("tyt-sosyal-felsefe-6", "Bilim Felsefesi"),
      makeTopic("tyt-sosyal-felsefe-7", "Siyaset Felsefesi"),
      makeTopic("tyt-sosyal-felsefe-8", "Din Felsefesi"),
      makeTopic("tyt-sosyal-felsefe-9", "Sanat Felsefesi"),
    ],
  },
  {
    id: "tyt-sosyal-din",
    name: "Din Kültürü",
    color: "#EA580C",
    topics: [
      makeTopic("tyt-sosyal-din-3", "Bilgi ve İnanç"),
      makeTopic("tyt-sosyal-din-4", "Din ve İslam"),
      makeTopic("tyt-sosyal-din-5", "Allah-İnsan İlişkisi"),
      makeTopic("tyt-sosyal-din-6", "İslam ve İbadet"),
      makeTopic("tyt-sosyal-din-0", "İslam'ın Temel Kaynakları"),
      makeTopic("tyt-sosyal-din-1", "Hz. Muhammed'in Hayatı ve Örnekliği"),
      makeTopic("tyt-sosyal-din-2", "Ahlak ve Değerler"),
      makeTopic("tyt-sosyal-din-7", "Vahiy ve Akıl"),
      makeTopic("tyt-sosyal-din-8", "İslam Düşüncesinde Yorumlar"),
      makeTopic("tyt-sosyal-din-9", "Din, Kültür ve Medeniyet"),
      makeTopic("tyt-sosyal-din-10", "Yaşayan Dinler"),
    ],
  },
];

const AYT_MATEMATIK_TOPICS = makeTopics("ayt-matematik", [
  "Mantık",
  "Kümeler",
  "Fonksiyonlar",
  "Denklemler",
  "İkinci Dereceden Denklemler",
  "Trigonometri",
  "Analitik Geometri - Doğru",
  "Analitik Geometri - Çember",
  "Logaritma",
  "Diziler",
  "Limit ve Süreklilik",
  "Türev",
  "İntegral",
  "Olasılık ve İstatistik",
]);

const AYT_FIZIK: Subject = {
  id: "ayt-fizik",
  name: "AYT Fizik",
  color: "#0891B2",
  topics: makeTopics("ayt-fizik", [
    "Vektörler",
    "Kinematik",
    "Dinamik",
    "İş-Enerji-Güç",
    "Momentum ve İmpuls",
    "Basit Harmonik Hareket",
    "Dalgalar",
    "Elektrik Alanı",
    "Manyetizma",
    "Optik",
    "Modern Fizik",
    "Elektromanyetik İndüksiyon",
  ]),
};

const AYT_KIMYA: Subject = {
  id: "ayt-kimya",
  name: "AYT Kimya",
  color: "#0D9488",
  topics: makeTopics("ayt-kimya", [
    "Kimyasal Türler ve Tepkimeler",
    "Asit-Baz Dengesi",
    "Çözünürlük Dengesi",
    "Elektrokimya",
    "Organik Kimya",
    "Karbon Kimyası",
    "Makromoleküller",
    "Reaksiyon Hızı",
    "Kimyasal Denge",
    "Gazlar Teorisi",
    "Endüstriyel Kimya",
    "Çevre Kimyası",
  ]),
};

const AYT_BIYOLOJI: Subject = {
  id: "ayt-biyoloji",
  name: "AYT Biyoloji",
  color: "#16A34A",
  topics: makeTopics("ayt-biyoloji", [
    "Hücre Biyolojisi",
    "Hücre Bölünmesi",
    "Kalıtım",
    "DNA ve Genetik Kod",
    "Evrim",
    "Ekosistem ve Çevre",
    "Sindirim Sistemi",
    "Dolaşım Sistemi",
    "Solunum Sistemi",
    "Boşaltım Sistemi",
    "Bitki Biyolojisi",
    "Biyoteknoloji",
  ]),
};

const AYT_EDEBIYAT: Subject = {
  id: "ayt-edebiyat",
  name: "AYT Türk Dili ve Edebiyatı",
  color: "#8B5CF6",
  topics: makeTopics("ayt-edebiyat", [
    "Divan Edebiyatı",
    "Halk Edebiyatı",
    "Tanzimat Dönemi",
    "Servet-i Fünun",
    "Fecr-i Ati",
    "Milli Edebiyat",
    "Cumhuriyet Dönemi",
    "Roman ve Hikaye",
    "Şiir Bilgisi",
    "Tiyatro",
    "Deneme-Makale",
    "Dil Bilgisi",
  ]),
};

const AYT_TARIH1: Subject = {
  id: "ayt-tarih1",
  name: "AYT Tarih 1",
  color: "#B45309",
  topics: makeTopics("ayt-tarih1", [
    "Osmanlı Devleti'nin Kuruluşu",
    "Yükselme Dönemi",
    "Duraklama Dönemi",
    "Gerileme Dönemi",
    "Tanzimat Dönemi",
    "I. Meşrutiyet",
    "II. Meşrutiyet",
    "Osmanlı'nın Çöküşü",
  ]),
};

const AYT_COGRAFYA1: Subject = {
  id: "ayt-cografya1",
  name: "AYT Coğrafya 1",
  color: "#9333EA",
  topics: makeTopics("ayt-cografya1", [
    "Nüfus ve Yerleşme",
    "Ulaşım",
    "Tarım",
    "Sanayi",
    "Enerji Kaynakları",
    "Türkiye'nin İklimi",
    "Bitkiler ve Toprak",
    "Doğal Afetler",
  ]),
};

const AYT_TARIH2: Subject = {
  id: "ayt-tarih2",
  name: "AYT Tarih 2",
  color: "#DC2626",
  topics: makeTopics("ayt-tarih2", [
    "Fransız Devrimi",
    "Sanayi Devrimi",
    "Milliyetçilik Hareketleri",
    "I. Dünya Savaşı",
    "Kurtuluş Savaşı",
    "Atatürk İlkeleri",
    "II. Dünya Savaşı",
    "Soğuk Savaş",
  ]),
};

const AYT_COGRAFYA2: Subject = {
  id: "ayt-cografya2",
  name: "AYT Coğrafya 2",
  color: "#0891B2",
  topics: makeTopics("ayt-cografya2", [
    "Ülkeler ve Bölgeler",
    "Küreselleşme",
    "Çevre Sorunları",
    "Kalkınma",
    "Nüfus Sorunları",
    "Göç",
    "Enerji Politikaları",
    "Kıtalar Coğrafyası",
  ]),
};

const AYT_FELSEFE: Subject = {
  id: "ayt-felsefe",
  name: "AYT Felsefe Grubu",
  color: "#DB2777",
  topics: makeTopics("ayt-felsefe", [
    "Psikolojiye Giriş",
    "Davranış Psikolojisi",
    "Sosyolojiye Giriş",
    "Toplumsal Yapı",
    "Mantık",
    "Felsefenin Alanları",
    "Bilgi ve Gerçeklik",
    "Siyaset Felsefesi",
  ]),
};

const AYT_DIN: Subject = {
  id: "ayt-din",
  name: "AYT Din Kültürü",
  color: "#EA580C",
  topics: makeTopics("ayt-din", [
    "İslam'ın Temel Kaynakları",
    "Hz. Muhammed'in Hayatı",
    "İslam'ın İbadetleri",
    "Ahlak ve Değerler",
    "Dinler Tarihi",
    "Türk-İslam Düşünürleri",
    "Değerler Eğitimi",
    "Çağdaş Dini Akımlar",
  ]),
};

export const AYT_SUBJECTS_BY_FIELD: Record<StudyField, Subject[]> = {
  sayisal: [
    { id: "ayt-matematik", name: "AYT Matematik", color: "#2563EB", topics: AYT_MATEMATIK_TOPICS },
    AYT_FIZIK,
    AYT_KIMYA,
    AYT_BIYOLOJI,
  ],
  esitAgirlik: [
    { id: "ayt-matematik", name: "AYT Matematik", color: "#2563EB", topics: AYT_MATEMATIK_TOPICS },
    AYT_EDEBIYAT,
    AYT_TARIH1,
    AYT_COGRAFYA1,
  ],
  sozel: [
    AYT_EDEBIYAT,
    AYT_TARIH1,
    AYT_COGRAFYA1,
    AYT_TARIH2,
    AYT_COGRAFYA2,
    AYT_FELSEFE,
    AYT_DIN,
  ],
};

export const FIELD_LABELS: Record<StudyField, string> = {
  sayisal: "Sayısal",
  esitAgirlik: "Eşit Ağırlık",
  sozel: "Sözel",
};

// Official 2027 YKS dates — TYT on Saturday, AYT on Sunday (3rd weekend of June,
// matching ÖSYM's historical pattern). Update here when ÖSYM publishes the
// official schedule; both CountdownCards and ai-coach derive from these constants.
export const TYT_EXAM_DATE = new Date("2027-06-19T09:30:00");
export const AYT_EXAM_DATE = new Date("2027-06-20T09:30:00");
