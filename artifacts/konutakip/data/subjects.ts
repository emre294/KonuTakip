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

const AYT_MATEMATIK_TOPICS: Topic[] = [
  makeTopic("ayt-matematik-0", "Mantık"),
  makeTopic("ayt-matematik-1", "Kümeler"),
  makeTopic("ayt-matematik-2", "Fonksiyonlar"),
  makeTopic("ayt-matematik-3", "Denklemler"),
  makeTopic("ayt-matematik-4", "İkinci Dereceden Denklemler"),
  makeTopic("ayt-matematik-14", "Karmaşık Sayılar"),
  makeTopic("ayt-matematik-15", "Parabol"),
  makeTopic("ayt-matematik-16", "Eşitsizlikler"),
  makeTopic("ayt-matematik-17", "Polinomlar"),
  makeTopic("ayt-matematik-18", "Çarpanlara Ayırma"),
  makeTopic("ayt-matematik-19", "Permütasyon"),
  makeTopic("ayt-matematik-20", "Kombinasyon"),
  makeTopic("ayt-matematik-21", "Binom"),
  makeTopic("ayt-matematik-13", "Olasılık ve İstatistik"),
  makeTopic("ayt-matematik-5", "Trigonometri"),
  makeTopic("ayt-matematik-8", "Logaritma"),
  makeTopic("ayt-matematik-9", "Diziler"),
  makeTopic("ayt-matematik-22", "Seriler"),
  makeTopic("ayt-matematik-10", "Limit ve Süreklilik"),
  makeTopic("ayt-matematik-11", "Türev"),
  makeTopic("ayt-matematik-12", "İntegral"),
];

const AYT_GEOMETRI: Subject = {
  id: "ayt-geometri",
  name: "AYT Geometri",
  color: "#4F46E5",
  topics: [
    makeTopic("ayt-geometri-0", "Üçgenler"),
    makeTopic("ayt-geometri-1", "Üçgende Benzerlik"),
    makeTopic("ayt-geometri-2", "Üçgende Alan"),
    makeTopic("ayt-geometri-3", "Açıortay ve Kenarortay"),
    makeTopic("ayt-geometri-4", "Çokgenler"),
    makeTopic("ayt-geometri-5", "Dörtgenler"),
    makeTopic("ayt-geometri-6", "Çember ve Daire"),
    makeTopic("ayt-geometri-7", "Çemberde Açılar"),
    makeTopic("ayt-geometri-8", "Çemberde Uzunluk ve Alan"),
    makeTopic("ayt-geometri-9", "Doğrunun Analitik İncelenmesi"),
    makeTopic("ayt-matematik-6", "Analitik Geometri - Doğru"),
    makeTopic("ayt-matematik-7", "Analitik Geometri - Çember"),
    makeTopic("ayt-geometri-10", "Dönüşüm Geometrisi"),
    makeTopic("ayt-geometri-11", "Katı Cisimler"),
  ],
};

const AYT_FIZIK: Subject = {
  id: "ayt-fizik",
  name: "AYT Fizik",
  color: "#0891B2",
  topics: [
    makeTopic("ayt-fizik-0", "Vektörler"),
    makeTopic("ayt-fizik-1", "Kinematik"),
    makeTopic("ayt-fizik-2", "Dinamik"),
    makeTopic("ayt-fizik-3", "İş, Enerji ve Güç"),
    makeTopic("ayt-fizik-4", "Momentum ve İmpuls"),
    makeTopic("ayt-fizik-12", "Tork ve Denge"),
    makeTopic("ayt-fizik-13", "Kütle Merkezi"),
    makeTopic("ayt-fizik-14", "Basit Makineler"),
    makeTopic("ayt-fizik-15", "Elektriksel Kuvvet ve Elektrik Alan"),
    makeTopic("ayt-fizik-7", "Elektrik Alanı"),
    makeTopic("ayt-fizik-16", "Elektriksel Potansiyel"),
    makeTopic("ayt-fizik-17", "Kondansatörler"),
    makeTopic("ayt-fizik-18", "Manyetik Alan ve Manyetik Kuvvet"),
    makeTopic("ayt-fizik-8", "Manyetizma"),
    makeTopic("ayt-fizik-11", "Elektromanyetik İndüksiyon"),
    makeTopic("ayt-fizik-5", "Basit Harmonik Hareket"),
    makeTopic("ayt-fizik-6", "Dalgalar"),
    makeTopic("ayt-fizik-9", "Optik"),
    makeTopic("ayt-fizik-19", "Çembersel Hareket"),
    makeTopic("ayt-fizik-20", "Kütle Çekim ve Kepler Yasaları"),
    makeTopic("ayt-fizik-10", "Modern Fizik"),
    makeTopic("ayt-fizik-21", "Modern Fiziğin Teknolojideki Uygulamaları"),
  ],
};

const AYT_KIMYA: Subject = {
  id: "ayt-kimya",
  name: "AYT Kimya",
  color: "#0D9488",
  topics: [
    makeTopic("ayt-kimya-0", "Kimyasal Türler ve Tepkimeler"),
    makeTopic("ayt-kimya-9", "Gazlar"),
    makeTopic("ayt-kimya-7", "Tepkime Hızı"),
    makeTopic("ayt-kimya-8", "Kimyasal Denge"),
    makeTopic("ayt-kimya-1", "Asit-Baz Dengesi"),
    makeTopic("ayt-kimya-2", "Çözünürlük Dengesi"),
    makeTopic("ayt-kimya-3", "Elektrokimya"),
    makeTopic("ayt-kimya-12", "Kimya ve Elektrik"),
    makeTopic("ayt-kimya-13", "Enerji Kaynakları ve Bilimsel Gelişmeler"),
    makeTopic("ayt-kimya-5", "Karbon Kimyası"),
    makeTopic("ayt-kimya-4", "Organik Kimya"),
    makeTopic("ayt-kimya-6", "Makromoleküller"),
    makeTopic("ayt-kimya-10", "Endüstriyel Kimya"),
    makeTopic("ayt-kimya-11", "Çevre Kimyası"),
  ],
};

const AYT_BIYOLOJI: Subject = {
  id: "ayt-biyoloji",
  name: "AYT Biyoloji",
  color: "#16A34A",
  topics: [
    makeTopic("ayt-biyoloji-0", "Hücre Biyolojisi"),
    makeTopic("ayt-biyoloji-1", "Hücre Bölünmeleri"),
    makeTopic("ayt-biyoloji-2", "Kalıtım"),
    makeTopic("ayt-biyoloji-3", "DNA ve Genetik Kod"),
    makeTopic("ayt-biyoloji-12", "Nükleik Asitler"),
    makeTopic("ayt-biyoloji-13", "Protein Sentezi"),
    makeTopic("ayt-biyoloji-14", "Canlılarda Enerji Dönüşümleri"),
    makeTopic("ayt-biyoloji-15", "Fotosentez"),
    makeTopic("ayt-biyoloji-16", "Kemosentez"),
    makeTopic("ayt-biyoloji-17", "Hücresel Solunum"),
    makeTopic("ayt-biyoloji-18", "İnsan Fizyolojisi"),
    makeTopic("ayt-biyoloji-6", "Sindirim Sistemi"),
    makeTopic("ayt-biyoloji-7", "Dolaşım ve Bağışıklık"),
    makeTopic("ayt-biyoloji-8", "Solunum Sistemi"),
    makeTopic("ayt-biyoloji-9", "Üriner Sistem"),
    makeTopic("ayt-biyoloji-19", "Sinir Sistemi"),
    makeTopic("ayt-biyoloji-20", "Endokrin Sistem"),
    makeTopic("ayt-biyoloji-21", "Duyu Organları"),
    makeTopic("ayt-biyoloji-22", "Destek ve Hareket Sistemi"),
    makeTopic("ayt-biyoloji-23", "Üreme Sistemi ve Embriyonik Gelişim"),
    makeTopic("ayt-biyoloji-10", "Bitki Biyolojisi"),
    makeTopic("ayt-biyoloji-5", "Ekosistem ve Çevre"),
    makeTopic("ayt-biyoloji-4", "Evrim"),
    makeTopic("ayt-biyoloji-11", "Biyoteknoloji ve Genetik Mühendisliği"),
  ],
};

const AYT_EDEBIYAT: Subject = {
  id: "ayt-edebiyat",
  name: "AYT Türk Dili ve Edebiyatı",
  color: "#8B5CF6",
  topics: [
    makeTopic("ayt-edebiyat-12", "Güzel Sanatlar ve Edebiyat"),
    makeTopic("ayt-edebiyat-13", "Metinlerin Sınıflandırılması"),
    makeTopic("ayt-edebiyat-8", "Şiir Bilgisi"),
    makeTopic("ayt-edebiyat-14", "İslamiyet Öncesi Türk Edebiyatı"),
    makeTopic("ayt-edebiyat-1", "Halk Edebiyatı"),
    makeTopic("ayt-edebiyat-0", "Divan Edebiyatı"),
    makeTopic("ayt-edebiyat-15", "Geçiş Dönemi Eserleri"),
    makeTopic("ayt-edebiyat-2", "Tanzimat Dönemi"),
    makeTopic("ayt-edebiyat-3", "Servetifünun Dönemi"),
    makeTopic("ayt-edebiyat-4", "Fecriati Topluluğu"),
    makeTopic("ayt-edebiyat-5", "Millî Edebiyat Dönemi"),
    makeTopic("ayt-edebiyat-6", "Cumhuriyet Dönemi Türk Edebiyatı"),
    makeTopic("ayt-edebiyat-16", "Edebî Akımlar"),
    makeTopic("ayt-edebiyat-17", "Dünya Edebiyatı"),
    makeTopic("ayt-edebiyat-7", "Roman ve Hikâye"),
    makeTopic("ayt-edebiyat-9", "Tiyatro"),
    makeTopic("ayt-edebiyat-10", "Öğretici Metinler"),
    makeTopic("ayt-edebiyat-18", "Edebî Sanatlar"),
    makeTopic("ayt-edebiyat-11", "Dil Bilgisi"),
  ],
};

const AYT_TARIH1: Subject = {
  id: "ayt-tarih1",
  name: "AYT Tarih 1",
  color: "#B45309",
  topics: [
    makeTopic("ayt-tarih1-8", "Tarih ve Zaman"),
    makeTopic("ayt-tarih1-9", "İlk ve Orta Çağlarda Türk Dünyası"),
    makeTopic("ayt-tarih1-10", "İslam Medeniyetinin Doğuşu"),
    makeTopic("ayt-tarih1-11", "Türklerin İslamiyet'i Kabulü"),
    makeTopic("ayt-tarih1-0", "Osmanlı Devleti'nin Kuruluşu"),
    makeTopic("ayt-tarih1-1", "Osmanlı Devleti'nin Yükselişi"),
    makeTopic("ayt-tarih1-2", "Osmanlı Devleti'nde Değişim"),
    makeTopic("ayt-tarih1-3", "XVII. Yüzyıl Osmanlı Devleti"),
    makeTopic("ayt-tarih1-4", "Tanzimat Dönemi"),
    makeTopic("ayt-tarih1-5", "I. Meşrutiyet"),
    makeTopic("ayt-tarih1-6", "II. Meşrutiyet"),
    makeTopic("ayt-tarih1-7", "Osmanlı Devleti'nin Dağılma Süreci"),
    makeTopic("ayt-tarih1-12", "Millî Mücadele"),
    makeTopic("ayt-tarih1-13", "Atatürk İlke ve İnkılapları"),
  ],
};

const AYT_COGRAFYA1: Subject = {
  id: "ayt-cografya1",
  name: "AYT Coğrafya 1",
  color: "#9333EA",
  topics: [
    makeTopic("ayt-cografya1-8", "Ekosistem ve Madde Döngüleri"),
    makeTopic("ayt-cografya1-0", "Nüfus Politikaları ve Yerleşme"),
    makeTopic("ayt-cografya1-9", "Şehirlerin Fonksiyonları"),
    makeTopic("ayt-cografya1-1", "Ulaşım Sistemleri"),
    makeTopic("ayt-cografya1-2", "Tarım ve Hayvancılık"),
    makeTopic("ayt-cografya1-3", "Sanayi"),
    makeTopic("ayt-cografya1-4", "Enerji Kaynakları"),
    makeTopic("ayt-cografya1-10", "Madenler"),
    makeTopic("ayt-cografya1-11", "Ticaret ve Turizm"),
    makeTopic("ayt-cografya1-5", "Türkiye'nin İklimi"),
    makeTopic("ayt-cografya1-6", "Bitki ve Toprak"),
    makeTopic("ayt-cografya1-7", "Doğal Afetler"),
  ],
};

const AYT_TARIH2: Subject = {
  id: "ayt-tarih2",
  name: "AYT Tarih 2",
  color: "#DC2626",
  topics: [
    makeTopic("ayt-tarih2-8", "İnsanlığın İlk Dönemleri"),
    makeTopic("ayt-tarih2-9", "İlk ve Orta Çağlarda Türk Dünyası"),
    makeTopic("ayt-tarih2-10", "İslam Medeniyeti"),
    makeTopic("ayt-tarih2-11", "Türk-İslam Devletleri"),
    makeTopic("ayt-tarih2-12", "Osmanlı Siyasi Tarihi"),
    makeTopic("ayt-tarih2-13", "Osmanlı Kültür ve Medeniyeti"),
    makeTopic("ayt-tarih2-0", "Fransız İhtilali"),
    makeTopic("ayt-tarih2-1", "Sanayi İnkılabı"),
    makeTopic("ayt-tarih2-2", "Milliyetçilik Hareketleri"),
    makeTopic("ayt-tarih2-3", "I. Dünya Savaşı"),
    makeTopic("ayt-tarih2-4", "Millî Mücadele"),
    makeTopic("ayt-tarih2-5", "Atatürk İlke ve İnkılapları"),
    makeTopic("ayt-tarih2-6", "II. Dünya Savaşı"),
    makeTopic("ayt-tarih2-7", "Soğuk Savaş Dönemi"),
    makeTopic("ayt-tarih2-14", "Yumuşama Dönemi ve Sonrası"),
    makeTopic("ayt-tarih2-15", "Küreselleşen Dünya"),
  ],
};

const AYT_COGRAFYA2: Subject = {
  id: "ayt-cografya2",
  name: "AYT Coğrafya 2",
  color: "#0891B2",
  topics: [
    makeTopic("ayt-cografya2-8", "Doğal Sistemler"),
    makeTopic("ayt-cografya2-0", "Ülkeler ve Bölgeler"),
    makeTopic("ayt-cografya2-1", "Küreselleşme"),
    makeTopic("ayt-cografya2-2", "Çevre Sorunları"),
    makeTopic("ayt-cografya2-3", "Kalkınma ve Ekonomi"),
    makeTopic("ayt-cografya2-4", "Nüfus Politikaları"),
    makeTopic("ayt-cografya2-5", "Göç"),
    makeTopic("ayt-cografya2-6", "Enerji Politikaları"),
    makeTopic("ayt-cografya2-7", "Kıtalar Coğrafyası"),
    makeTopic("ayt-cografya2-9", "Türkiye'nin Jeopolitiği"),
    makeTopic("ayt-cografya2-10", "Kültür Bölgeleri"),
    makeTopic("ayt-cografya2-11", "Uluslararası Örgütler"),
    makeTopic("ayt-cografya2-12", "Doğal Afetler ve Çevre Yönetimi"),
  ],
};

const AYT_FELSEFE: Subject = {
  id: "ayt-felsefe",
  name: "AYT Felsefe Grubu",
  color: "#DB2777",
  topics: [
    makeTopic("ayt-felsefe-0", "Psikoloji Bilimini Tanıma"),
    makeTopic("ayt-felsefe-1", "Psikolojinin Temel Süreçleri"),
    makeTopic("ayt-felsefe-8", "Öğrenme, Bellek ve Düşünme"),
    makeTopic("ayt-felsefe-9", "Ruh Sağlığının Temelleri"),
    makeTopic("ayt-felsefe-2", "Sosyoloji Bilimini Tanıma"),
    makeTopic("ayt-felsefe-3", "Toplumsal Yapı"),
    makeTopic("ayt-felsefe-10", "Toplumsal Değişme ve Gelişme"),
    makeTopic("ayt-felsefe-11", "Toplum ve Kültür"),
    makeTopic("ayt-felsefe-4", "Klasik Mantık"),
    makeTopic("ayt-felsefe-12", "Mantık ve Dil"),
    makeTopic("ayt-felsefe-5", "Felsefenin Alanları"),
    makeTopic("ayt-felsefe-6", "Bilgi ve Gerçeklik"),
    makeTopic("ayt-felsefe-7", "Siyaset Felsefesi"),
    makeTopic("ayt-felsefe-13", "Bilim Felsefesi"),
    makeTopic("ayt-felsefe-14", "Ahlak Felsefesi"),
    makeTopic("ayt-felsefe-15", "Din ve Sanat Felsefesi"),
  ],
};

const AYT_DIN: Subject = {
  id: "ayt-din",
  name: "AYT Din Kültürü",
  color: "#EA580C",
  topics: [
    makeTopic("ayt-din-0", "İslam'ın Temel Kaynakları"),
    makeTopic("ayt-din-1", "Hz. Muhammed'in Hayatı ve Örnekliği"),
    makeTopic("ayt-din-2", "İslam'ın İbadetleri"),
    makeTopic("ayt-din-3", "Ahlak ve Değerler"),
    makeTopic("ayt-din-4", "Dinler Tarihi"),
    makeTopic("ayt-din-5", "Türk-İslam Düşünürleri"),
    makeTopic("ayt-din-6", "Değerler Eğitimi"),
    makeTopic("ayt-din-7", "Çağdaş Dinî Akımlar"),
    makeTopic("ayt-din-8", "İslam Düşüncesinde Yorumlar"),
    makeTopic("ayt-din-9", "İslam ve Bilim"),
    makeTopic("ayt-din-10", "İslam ve Estetik"),
    makeTopic("ayt-din-11", "Yaşayan Dinler"),
  ],
};

export const AYT_SUBJECTS_BY_FIELD: Record<
  StudyField,
  Subject[]
> = {
  sayisal: [
    {
      id: "ayt-matematik",
      name: "AYT Matematik",
      color: "#2563EB",
      topics: AYT_MATEMATIK_TOPICS,
    },
    AYT_GEOMETRI,
    AYT_FIZIK,
    AYT_KIMYA,
    AYT_BIYOLOJI,
  ],

  esitAgirlik: [
    {
      id: "ayt-matematik",
      name: "AYT Matematik",
      color: "#2563EB",
      topics: AYT_MATEMATIK_TOPICS,
    },
    AYT_GEOMETRI,
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
