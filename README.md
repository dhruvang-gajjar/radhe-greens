# Ganesh Heritage Member Directory & Portal 🏢

A modern, mobile-first **Next.js (App Router)** searchable member directory and resident registration application built for **Ganesh Heritage Co-operative Housing Society**. Ready for 1-click deployment to **Vercel**.

Data was extracted and verified directly from `GANESH HERITAGE MEMBER.pdf` (224 flats, 63 registered members across 4 blocks).

---

## ✨ Features

- 🔍 **Instant Search**: Search by Flat number (e.g. `702`, `D-702`), Resident Name, Phone number, or Floor.
- 🏢 **Block Filter Pills**: Filter by **All**, **Block A**, **Block B**, **Block C**, or **Block D**.
- 📋 **Minimalist Member Cards**:
  - Clean unit badge (`Block D • 702`) and floor tag.
  - Resident Name.
  - **Clickable Phone**: Tap phone number to directly **Call**, message on **WhatsApp**, or copy number (no separate bulky buttons).
  - Additional details (vehicle no, notes, etc.).
  - No clutter: Resident type badges and edit buttons removed as requested.
- ➕ **Add / Update Resident Page (`/add`)**:
  - Select Block (**A, B, C, D**)
  - Select Flat number (**101 to 1404**)
  - Pre-fills existing details if flat is already registered so residents can update their record easily.
  - Supports Name, Phone number (+91 with validation), and Additional Details.
- 🚀 **Vercel Ready**: Zero-config deployment on Vercel with static generation and optimized bundle size.

---

## 🛠️ Local Development

Install dependencies:
```bash
npm install
```

Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser or on your phone.

Build for production:
```bash
npm run build
npm run start
```

---

## 🚀 Deploy to Vercel

1. Push this repository to **GitHub / GitLab / Bitbucket**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your repository — Vercel will automatically detect Next.js.
4. Click **"Deploy"**!
