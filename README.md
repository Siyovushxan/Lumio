# Lumio

> A quiet library that reads your photos and writes them back as a book.

AI-powered photo album platform — turn light into memory.

## Stack

- **Frontend:** React + Vite + TypeScript, Zustand, React Router
- **Backend:** Firebase (Auth, Firestore)
- **AI:** Google Gemini API (Vision + text)
- **Photos:** Google Photos Picker API + local upload
- **PDF:** jsPDF (magazine-style layouts)

## Setup

```bash
npm install
cp .env.local.example .env.local   # add your Firebase + Gemini keys
npm run dev
```

## Features

- 🌓 Light/Dark theme + 4 palette variants
- 🌍 3 languages (en/uz/ru)
- 📸 Google Photos picker + device upload
- ✨ AI fairy-tale generation from photos (Gemini Vision)
- 📖 Magazine-style PDF export with cover + chapters
- 🔐 AES-256 encryption · zero-knowledge architecture
