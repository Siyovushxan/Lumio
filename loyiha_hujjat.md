# MemoryAI — Loyiha Hujjatlari

---

## 1. MAHSULOT TALABLARI (PRD)

### 1.1 Maqsad
Foydalanuvchi rasmlarini AI tahlil qilib, eng yaxshi lahzalarni tanlaydigan, statistika ko'rsatadigan va ertak-albom yarataydigan web platforma.

### 1.2 Foydalanuvchi muammosi
- 73% odamlar rasmlarini hech qachon qaytib ko'rmaydi
- Yillik albom yasamoqchi bo'lsa, 3+ soat vaqt ketadi
- Bolaning o'sish tarixi — rasmlar bor, lekin tartibsiz, hikoyasi yo'q

### 1.3 Yechim
Google Photos ulash → AI tahlil → statistika → PDF albom yoki ertak-albom — hech narsa qilmasdan.

---

## 2. FUNKSIYALAR RO'YXATI

### Modul A: Autentifikatsiya
- [x] Google OAuth 2.0 bilan kirish
- [x] Email + parol bilan ro'yxatdan o'tish / kirish
- [x] Firebase Authentication
- [x] Profilni saqlash (ism, avatar URL, preferences) → Firestore

### Modul B: Rasm Manbasi Ulash
- [x] Google Photos OAuth ulash (alohida scope)
- [x] Rasm metadata olish (sana, joylashuv, soni) — rasm o'zi serverga kelmaydi
- [ ] Apple iCloud — keyingi versiya

### Modul C: Statistika (Firebase'da matn sifatida)
- [x] Jami rasm soni
- [x] Yillar bo'yicha taqsimot (2020: 340, 2021: 520...)
- [x] Fasllar bo'yicha (Qish/Bahor/Yoz/Kuz %) 
- [x] Eng faol oylar
- [x] AI xulosa: "Siz yozda ko'proq rasm olasiz, dengiz va tabiat sevuvchi ko'rinasiz"
- [x] Firebase'da saqlash: `users/{uid}/stats` → JSON matn

### Modul D: Albom Yaratish
- [x] Munosabat tanlash (Yil xulosasi / Sayohat / Bayram / Maxsus)
- [x] Sana oralig'i va shaxslar filtri
- [x] AI eng yaxshi 30–50 rasmni tanlaydi (Google Vision API)
- [x] Chiroyli PDF yaratish (layout, sarlavha, sana)
- [x] PDF 24 soat serverda → foydalanuvchi yuklab oladi → o'chiriladi
- [x] Albom metadata Firebase'da: `users/{uid}/albums/{albumId}`

### Modul E: Ertak-Albom (Story Album)
- [x] Shaxs(lar) tanlash (masalan, "Layla" — barcha rasmlarda)
- [x] Sana oralig'i (tug'ilishdan bugungi kungacha)
- [x] AI quyidagilarni qiladi:
  - Tanilgan shaxsning rasmlarini filtrlaydi (yuz aniqlash)
  - Vaqt bo'yicha tartiblashtiradi
  - Har davr uchun ertak uslubida matn yozadi
  - Rasm + matn birlashtirib PDF yaratadi
- [x] Ertak uslubi tanlash: bolalar ertagi / romantic / biografik / she'riy
- [x] Til tanlash: O'zbek / Rus / Ingliz

### Modul F: Mening Albomlarim
- [x] Yaratilgan albomlar tarixi
- [x] Qayta yuklab olish (24 soat ichida)
- [x] Albom metadatasi: sana, rasm soni, turi

---

## 3. FIREBASE ARXITEKTURASI

### 3.1 Firestore Struktura

```
users/
  {uid}/
    profile:
      name: string
      email: string
      avatarUrl: string
      googlePhotosConnected: boolean
      createdAt: timestamp

    stats:
      totalPhotos: number
      lastAnalyzed: timestamp
      yearlyBreakdown: { "2022": 340, "2023": 520, "2024": 780 }
      seasonBreakdown: { winter: 18, spring: 22, summer: 42, autumn: 18 }
      topMonths: ["July", "August", "December"]
      aiInsight: "Siz yozda ko'proq rasm olasiz..."
      preferredSubjects: ["tabiat", "oila", "ovqat"]

    albums/
      {albumId}/
        title: string
        type: "yearly" | "travel" | "story" | "event"
        createdAt: timestamp
        photoCount: number
        dateRange: { from: timestamp, to: timestamp }
        pdfUrl: string          ← 24 soatlik vaqtinchalik URL
        pdfExpiresAt: timestamp
        persons: [string]       ← story album uchun
        storyStyle: string      ← story album uchun
        language: string
        status: "processing" | "ready" | "expired"
```

### 3.2 Firebase Storage
```
albums/{uid}/{albumId}/album.pdf   ← 24 soat, keyin o'chiriladi
```
**Rasmlar Firebase Storage'da SAQLANMAYDI.**

### 3.3 Firebase Rules (asosiy)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

---

## 4. TEXNIK ARXITEKTURA

### 4.1 Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS + custom CSS (animatsiyalar)
- **State:** Zustand
- **Firebase SDK:** firebase/app, firebase/auth, firebase/firestore, firebase/storage

### 4.2 Backend (Serverless)
- **Firebase Cloud Functions** (Node.js 20)
  - `analyzePhotos` — Google Photos metadata olish + Vision AI
  - `generateAlbum` — PDF yaratish
  - `generateStoryAlbum` — Ertak + PDF
  - `cleanupExpiredPDFs` — Scheduled: har 6 soatda
- **Google Vision API** — rasm sifati, yuz, voqea aniqlash
- **Claude API (Anthropic)** — ertak matn yaratish
- **PDFKit** (Node.js) — PDF yaratish

### 4.3 Rasm Oqimi (Maxfiylik)
```
Google Photos API → Cloud Function RAM
       ↓
Google Vision API (URL bo'yicha, rasm kelmaydi)
       ↓
Natija (skor, yuz, voqea) → PDF yaratish
       ↓
PDF → Firebase Storage (24 soat)
       ↓
Foydalanuvchi yuklab oladi
       ↓
24 soat → PDF o'chiriladi
```
**Server diskida hech qachon rasm saqlanmaydi.**

### 4.4 API Integratsiyalar
| API | Maqsad | Narxi |
|---|---|---|
| Google OAuth | Login + Photos ulash | Bepul |
| Google Photos API | Metadata + URL | Bepul (kvota: 10,000/kun) |
| Google Vision AI | Rasm tahlil | $1,50/1000 rasm |
| Anthropic Claude API | Ertak matn | ~$0,003/albom |
| Firebase | Auth + DB + Storage | Bepul (Spark) → $25/oy (Blaze) |

---

## 5. FOYDALANUVCHI OQIMI

### Oqim 1: Yangi foydalanuvchi
```
Landing → Register/Google Login → Google Photos ulash →
Tahlil (1-2 daqiqa) → Dashboard (statistika) → Albom yaratish
```

### Oqim 2: Oddiy albom
```
Dashboard → "Albom yarat" → Tur tanlash → Sana/filtr →
AI jarayoni (30-60 soniya) → PDF tayyor → Yuklab olish
```

### Oqim 3: Ertak-albom
```
Dashboard → "Ertak Albom" → Shaxs(lar) tanlash →
Sana oralig'i → Uslub + Til → AI jarayon (2-3 daqiqa) →
PDF tayyor → Yuklab olish
```

---

## 6. SAHIFALAR RO'YXATI

| Sahifa | URL | Tavsif |
|---|---|---|
| Landing | `/` | Taqdimot, kirish |
| Login/Register | `/auth` | Auth |
| Connect Photos | `/connect` | Google Photos ulash |
| Dashboard | `/dashboard` | Statistika + asosiy panel |
| Create Album | `/create` | Albom turi tanlash |
| Album Settings | `/create/settings` | Filtrlar, parametrlar |
| Processing | `/create/processing` | AI jarayon ekrani |
| My Albums | `/albums` | Tarixi |
| Settings | `/settings` | Profil, ulangan hisob |

---

## 7. BOSQICHLAR

### MVP (0–2 oy): $0 xarajat
- Firebase bepul tier
- Google Photos + Vision API
- Oddiy albom (PDF)
- Statistika

### v1.0 (2–4 oy): ~$50–150/oy
- Ertak-albom funksiyasi
- Claude API integratsiya
- Obuna tizimi (Stripe)
- To'lov: $4,99 albom / $29,99 yillik

### v2.0 (4–8 oy)
- Apple iCloud ulash
- Ko'p til qo'llab-quvvatlash
- Albomni do'stga ulashish (vaqtinchalik link)

---

## 8. PDF SHIFRLASH ARXITEKTURASI (Zero-Knowledge)

### 8.1 Shifrlash jarayoni
```
PDF yaratildi (Cloud Function RAM)
        ↓
AES-256-GCM bilan shifrlash:
  - Key: crypto.randomBytes(32) — foydalanuvchi UIDbdan derivatsiya
  - IV: crypto.randomBytes(12) — har PDF uchun yangi
  - AuthTag: 16 bayt
        ↓
Shifrlangan blob → Firebase Storage
  Path: albums/{uid}/{albumId}/album.enc
        ↓
Key metadata → Firestore (uid bilan bog'liq, admin o'qiy olmaydi)
        ↓
Vaqtinchalik signed URL (1 soat) → foydalanuvchiga
        ↓
Brauzerda: URL orqali yuklab → dekriptatsiya → foydalanuvchiga PDF
```

### 8.2 Firebase Storage Rules (Admin blok)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Faqat egasi o'z fayllarini o'qiy va yoza oladi
    match /albums/{uid}/{albumId}/{file} {
      allow read, write: if request.auth != null
                         && request.auth.uid == uid;
      // Admin — bloklangan (request.auth.token.admin ham ishlamaydi)
    }
    // Boshqa barcha yo'llar — bloklangan
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 8.3 Firestore Rules (Admin ma'lumot o'qiy olmaydi)
```javascript
match /users/{uid}/{document=**} {
  allow read, write: if request.auth.uid == uid;
  // Admin Service Account faqat Cloud Functions orqali ishlaydi
  // UI Admin panelda faqat aggregate statistika ko'rinadi (uid yo'q)
}
```

### 8.4 Admin Panel — nima ko'rinadi
| Ma'lumot | Admin ko'radiganmi |
|---|---|
| PDF fayl mazmuni | ❌ Yo'q (shifrlangan blob) |
| Foydalanuvchi rasmlari | ❌ Yo'q (serverda saqlanmaydi) |
| Foydalanuvchi ismi/email | ✓ Ha (aloqa uchun) |
| Albom metadata (soni, sanasi) | ✓ Ha |
| Dekriptatsiya kaliti | ❌ Yo'q (faqat foydalanuvchida) |

---

## 9. KO'P TIL QO'LLAB-QUVVATLASH (i18n)

**Maqsad tillar:** O'zbek (uz), Rus (ru), Ingliz (en), Koreys (ko), Xitoy (zh), Yapon (ja)

**Texnologiya:** `i18next` + `react-i18next`

### 9.1 Implementatsiya
```javascript
// i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { uz, ru, en, ko, zh, ja },
    fallbackLng: 'en',
    detection: { order: ['localStorage', 'navigator'] }
  });
```

### 9.2 Tarjima fayl strukturasi
```
/locales/
  uz/translation.json
  ru/translation.json
  en/translation.json
  ko/translation.json
  zh/translation.json
  ja/translation.json
```

### 9.3 Kalit namunalari
```json
// en/translation.json
{
  "hero.title": "You have 5,000+ photos.",
  "hero.subtitle": "When did you last look at them?",
  "hero.cta": "Start for Free",
  "feature.stats": "Photo Statistics",
  "feature.album": "AI Album Creation",
  "feature.story": "Story Album",
  "feature.edit": "AI Editing",
  "security.title": "Even we can't see them",
  "security.badge": "AES-256-GCM · Zero-Knowledge",
  "editor.prompt_placeholder": "E.g.: Remove this photo...",
  "album.encrypted_badge": "AES-256-GCM Encrypted"
}
```

### 9.4 Maxsus til ehtiyojlari
| Til | Xususiyat |
|---|---|
| Yapon (ja) | RTL yo'q, lekin vertikal matn qo'llab-quvvatlash |
| Xitoy (zh) | Soddalashtirilgan (zh-CN) va An'anaviy (zh-TW) |
| Koreys (ko) | Hangul shrift: Noto Sans KR |
| O'zbek (uz) | Kirill va Lotin yozuvi tanlovi |

### 9.5 Til tanlash UI
- Nav o'ng tomonida: 🌐 dropdown
- Tanlangan til localStorage'da saqlanadi
- Ertak-albom tili: foydalanuvchi interfeys tilidan mustaqil tanlanadi

---

## 10. AI TAHRIRLASH (Album Edit Feature)

### 10.1 Arxitektura
```
Foydalanuvchi prompt yozadi
        ↓
Firebase Cloud Function: editAlbum
        ↓
Anthropic Claude API (claude-sonnet-4-20250514)
  System: "You are a photo album editor AI..."
  Context: album metadata (photo count, dates, type)
  User: tahrirlash so'rovi
        ↓
Javob: JSON format
  { action, target, newText?, removeIds?, addCriteria? }
        ↓
Cloud Function javobni bajaradi
        ↓
Firebase: yangilangan metadata saqlandi
        ↓
PDF qayta yaratiladi (agar foydalanuvchi "Saqlash" bosса)
```

### 10.2 Qo'llab-quvvatlanadigan tahrirlash amallari

**Foto albom uchun:**
| Buyruq | Amal |
|---|---|
| "Bu rasmni olib tashlang" | Belgilangan rasmni olib tashlash |
| "Eng yaxshi 5 rasmni qoldiring" | Boshqa rasmlarni olib tashlash |
| "Dekabr rasmlarini qo'shing" | Sana filtri bo'yicha rasmlar qo'shish |
| "Qayta tartiblashtiring" | Rasmlar tartibini o'zgartirish |

**Ertak albom uchun:**
| Buyruq | Amal |
|---|---|
| "Bu qismni she'riyroq qiling" | Claude matnni qayta yozadi |
| "Ertakni qisqartiring" | Har qism uchun qisqaroq variant |
| "Ko'proq tavsif qo'shing" | Claude matnni boyitadi |
| "Rus tilida yozing" | Tilni o'zgartirish |

### 10.3 Claude API so'rovi namunasi
```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are a photo album AI editor. 
             Album type: ${album.type}
             Current photos: ${album.photoCount}
             Story sections: ${album.sections?.length || 0}
             Respond ONLY in JSON: { action, details, newText? }`,
    messages: [{ role: "user", content: userPrompt }]
  })
});
```

### 10.4 Xarajat hisob-kitobi
- O'rtacha tahrirlash so'rovi: ~500 token input + ~300 output
- Narxi: ~$0.002/so'rov (claude-sonnet)
- Foydalanuvchi o'rtacha 5 so'rov/albom = **~$0.01/albom**
