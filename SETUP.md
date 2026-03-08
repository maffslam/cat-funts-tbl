# Cat Funts TBL – Setup Guide

## Quick Start (5 minutes)

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it whatever you want
3. Once created, go to **Build → Firestore Database** → **Create database** → Start in **test mode** (you'll add proper rules later)
4. Go to **Build → Authentication** → **Get started**
5. Enable **Google** sign-in (flip the toggle, add your email as support email)
6. Enable **Phone** sign-in (flip the toggle)
7. Go to **Project settings** (gear icon) → **General** → scroll to **Your apps** → click the web icon (`</>`)
8. Register your app (name doesn't matter) → copy the `firebaseConfig` values

### 2. Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in the Firebase config values from step 8 above:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 – you should see the sign-in screen.

### 4. Deploy to Netlify

#### Option A: Link to GitHub (recommended)
1. Push the code to a GitHub repo
2. In Netlify, click **Add new site** → **Import an existing project** → select your repo
3. Build settings should auto-detect: **Build command:** `npm run build` | **Publish directory:** `dist`
4. Add your environment variables in **Site settings → Environment variables**
5. Deploy

#### Option B: Manual deploy
```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### 5. Firestore Security Rules

Once you're happy it's working, go to **Firestore → Rules** in the Firebase Console and paste the contents of `firestore.rules` from this project. Click **Publish**.

### 6. PWA Icons

Replace the placeholder icon references in `public/manifest.json` with actual icons:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

You can generate these from any image using [RealFaviconGenerator](https://realfavicongenerator.net).

---

## How It Works

### For your mates

1. You create the competition → get an invite code (e.g. "FATCLUB")
2. Share the app URL + code in WhatsApp
3. They open the link → sign in with Google or phone → enter the code + their details
4. They're in

### Data flow

- All competition data lives in **Firebase Firestore** (Google's cloud database)
- **Real-time listeners** mean the leaderboard updates live – no refresh needed
- Private weigh-ins are stored but only visible to the owner
- Auth via Google one-tap or phone SMS – zero passwords

### File structure

```
cat-funts-tbl/
├── index.html              # Entry point
├── package.json            # Dependencies
├── vite.config.js          # Build config
├── netlify.toml            # Netlify deploy config
├── firestore.rules         # Firestore security rules
├── .env.example            # Environment variable template
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main app (all views)
    ├── firebase.js         # Firebase config + helpers
    ├── banter.js           # 109-message banter engine
    ├── utils.js            # Weight, date, scoring, sprint logic
    ├── styles.js           # Shared styles + colour palette
    └── components/
        └── ShareButtons.jsx # WhatsApp + clipboard share
```

---

## Firebase Free Tier Limits

The Spark (free) plan gives you:
- 50,000 reads/day
- 20,000 writes/day
- 1GB storage
- 10 SMS verifications/day

For 8 players weighing in weekly, you'll use roughly 0.1% of these limits. You will never need to pay.
