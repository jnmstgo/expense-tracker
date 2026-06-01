# AI Expense Tracker

A production-ready, AI-powered expense tracking SPA built with React 18, TypeScript, and Google APIs.

## Features

- **AI Receipt Scanning** — Upload any receipt and Gemini Vision auto-fills the form
- **Google Auth (SSO)** — Sign in with Google, scoped to Sheets & Drive
- **Google Sheets as DB** — Each user's data lives in their own Google Drive spreadsheet
- **Multi-user** — Fully isolated data per Google account
- **Offline-first** — Expenses queued locally, synced automatically on reconnect
- **Geolocation** — Auto-capture city + coordinates via Nominatim reverse geocoding
- **Premium UI** — Glassmorphism, dark mode, animated transitions, Recharts analytics

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Fill in your credentials (see below)
nano .env

# 3. Start development server
npm run dev
```

## Environment Variables

| Variable | Source | Required |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) | ✅ |
| `GEMINI_API_KEY` | [AI Studio](https://aistudio.google.com) | ✅ |
| `VITE_APP_URL` | Your deployed URL | For CORS |

## Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Enable APIs**
   - Enable: **Google Sheets API**, **Google Drive API**
3. **OAuth consent screen** → External → Add scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
4. **Credentials** → Create **OAuth 2.0 Client ID** (Web application)
   - Authorised JS origins: `http://localhost:5173` + your production URL
   - Copy **Client ID** → `VITE_GOOGLE_CLIENT_ID`

## Gemini API Setup

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key → copy to `GEMINI_API_KEY`
3. This key is used **only** in the serverless function — never exposed to the browser

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
vercel --prod
# Set env vars in Vercel dashboard → Settings → Environment Variables
```

### Netlify

```bash
npm run build
# Drag & drop `dist/` to netlify.com/drop
# Add env vars in Site Settings → Build & deploy → Environment
```

## Architecture

```
Browser (React SPA)
  ├── Zustand stores (auth, expenses, ui)
  ├── Google Identity Services (OAuth2)
  ├── Google Sheets REST API v4
  ├── /api/gemini-ocr (serverless proxy)
  └── LocalStorage (offline cache + sync queue)
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite 5 |
| State | Zustand 4 with persist middleware |
| Styling | Tailwind CSS 3, Glassmorphism |
| Charts | Recharts |
| Auth | Google Identity Services (GIS) |
| Database | Google Sheets v4 REST API |
| AI | Gemini 1.5 Flash Vision |
| Serverless | Vercel / Netlify Functions |
| Offline | LocalStorage queue + background sync |

## Security

- Gemini API key is **never** in frontend code
- All AI calls go through `/api/gemini-ocr` serverless proxy
- Google OAuth scoped to minimum required permissions (`drive.file` not `drive`)
- CORS headers locked to `VITE_APP_URL`
