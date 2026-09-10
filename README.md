# Atelier — proiecte electronică & Arduino

Aplicație personală pentru gestionarea proiectelor de electronică: poze, video,
detalii și cod, sincronizate pe orice dispozitiv (telefon + laptop), găzduită
pe domeniul tău.

Stack: React + Vite, Firebase (Auth + Firestore + Storage), deploy pe Vercel sau Netlify.

---

## 1. Creează proiectul Firebase (gratuit)

1. Mergi pe [console.firebase.google.com](https://console.firebase.google.com) și creează un proiect nou.
2. **Authentication** → Sign-in method → activează **Email/Password**.
   În tab-ul **Users**, adaugă manual un utilizator (email + parolă) — acesta ești tu.
   Aplicația are și un ecran de "Creează cont" — oricine cu linkul își poate face
   propriul cont, iar proiectele fiecărui cont sunt complet separate (fiecare vede
   doar ce a adăugat el, datorită regulilor din `firestore.rules`).
3. **Firestore Database** → Create database → pornește în modul **production**.
4. Deschide **Project settings** (rotița din stânga sus) → sub "Your apps" apasă
   iconița web `</>` → înregistrează o aplicație web → copiază obiectul `firebaseConfig`.

> **Notă:** Firebase **Storage** (unde s-ar fi ținut pozele/video) cere din februarie 2026
> un card legat de cont, chiar dacă rămâi la 0 lei. Ca să eviți asta complet, folosim
> Cloudinary pentru poze și video (pasul 2 mai jos) — Firestore și Authentication rămân
> 100% gratuite, fără card.

### Reguli de securitate Firestore

- În Firestore, tab **Rules**, înlocuiește conținutul cu cel din `firestore.rules` din acest proiect → **Publish**.

Aceste reguli fac ca doar tu (userul autentificat) să poți citi/scrie datele tale.

---

## 2. Creează contul Cloudinary (gratuit, fără card)

1. Mergi pe [cloudinary.com](https://cloudinary.com) → **Sign up** → te poți înregistra cu Google/GitHub sau email. Nu se cere card.
2. După logare, ajungi pe Dashboard — sus vezi **Cloud name** (un nume unic, ex. `dxyz1234`). Notează-l.
3. Mergi în **Settings** (rotița ⚙️) → tab **Upload** → secțiunea **Upload presets** → **Add upload preset**.
4. La **Signing Mode**, schimbă din "Signed" în **Unsigned** (esențial — altfel nu merge din browser fără server propriu).
5. Poți lăsa restul de setări implicite. Apasă **Save**.
6. Notează numele preset-ului generat (apare sus, ceva gen `ml_default` sau un nume random) — îl folosești în `.env`.

---

## 3. Rulează local

Ai nevoie de [Node.js](https://nodejs.org) instalat (versiunea 18+).

```bash
cd atelier-app
npm install
cp .env.example .env
```

Deschide `.env` și completează valorile din `firebaseConfig` (pasul 1.5):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

(`VITE_FIREBASE_STORAGE_BUCKET` poți să-l completezi cu ce arată Firebase, chiar dacă
nu-l folosim direct — nu strică să fie acolo.)

Apoi pornește aplicația:

```bash
npm run dev
```

Se deschide pe `http://localhost:5173`. Loghează-te cu userul creat la pasul 1.2.

---

## 4. Pune codul pe GitHub

```bash
git init
git add .
git commit -m "Prima versiune"
```

Creează un repo nou pe [github.com](https://github.com/new) (poate fi privat) și urmează instrucțiunile de acolo pentru `git remote add` + `git push`.

---

## 5. Deploy pe Vercel (recomandat, gratuit)

1. Mergi pe [vercel.com](https://vercel.com) → conectează-te cu contul GitHub.
2. **Add New → Project** → alege repo-ul `atelier-app`.
3. Vercel detectează automat Vite. Înainte de deploy, la secțiunea **Environment Variables**,
   adaugă toate cele 8 variabile din `.env` (una câte una, cu numele exact).
4. Apasă **Deploy**. În 1-2 minute primești un link de tipul `atelier-app.vercel.app` — funcțional deja pe telefon și laptop.

*(Netlify funcționează la fel: "Add new site → Import from Git", setezi build command `npm run build`, publish directory `dist`, și adaugi aceleași variabile de mediu la Site settings → Environment variables.)*

---

## 6. Pune-ți propriul domeniu

Dacă ai deja un domeniu (ex. de la un registrar românesc sau internațional):

1. În Vercel, deschide proiectul → **Settings → Domains** → scrie domeniul tău
   (ex. `atelier.numele-tau.ro`) → **Add**.
2. Vercel îți arată o înregistrare DNS (de obicei un `CNAME` către `cname.vercel-dns.com`,
   sau un `A record` dacă folosești domeniul rădăcină).
3. Intri în panoul de administrare al domeniului tău (unde l-ai cumpărat) → secțiunea DNS →
   adaugi exact înregistrarea indicată de Vercel.
4. Propagarea durează de la câteva minute până la câteva ore. Vercel emite automat
   certificatul HTTPS (gratuit, prin Let's Encrypt) — nu trebuie să faci nimic manual.

Dacă nu ai încă un domeniu, îl poți cumpăra de la orice registrar (Namecheap, GoDaddy,
sau un registrator românesc pentru `.ro`) — de obicei 10-40 lei/an pentru domenii simple.

---

## Ce mai poți ajusta

- **Mărime video**: aplicația limitează un upload la 80MB per fișier — suficient pentru
  clipuri scurte de test dintr-un proiect.
- **Cost**: Firestore + Authentication (Firebase, planul Spark) și Cloudinary (planul Free,
  25 credite/lună = aprox. 25GB combinate stocare+trafic+procesare) rămân complet gratuite,
  fără card, pentru un volum de proiect personal. Vercel e la fel, gratuit pentru uz personal.
  Singurul cost posibil e domeniul propriu (pasul 6).
- **Ștergerea fișierelor din Cloudinary**: când ștergi un proiect din aplicație, fișierele
  rămân în Cloudinary (ștergerea lor automată ar necesita o cheie secretă, nesigură de ținut
  într-o aplicație care rulează în browser). Le poți curăța manual, din când în când, din
  Cloudinary → Media Library, dacă vrei să eliberezi spațiu din cele 25 de credite lunare.
- **Iconițele din `public/`**: `icon-192.png` și `icon-512.png` sunt generate simplu —
  le poți înlocui cu propriul logo, păstrând aceleași dimensiuni.
