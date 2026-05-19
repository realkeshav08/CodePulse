# 🧠 CodePulse AI — Intelligence for Modern Devs

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)

> An AI-powered code analyzer that gives you complexity metrics, security
> insights, and quality reviews — paste your code and get an instant deep-dive.

---

## 🌟 Features

| Feature | What it does |
| :--- | :--- |
| **Code Explanation** | Plain-language walkthrough of what your code does. |
| **Unit Test Suggestions** | Generates test cases that exercise your logic. |
| **Complexity Analysis** | Big-O time & space complexity, visualised with Chart.js. |
| **Performance Optimization** | Flags bottlenecks and suggests faster patterns. |
| **Documentation Generation** | Auto-writes comments and doc blocks. |
| **Security Vulnerability Detection** | Lists likely issues (XSS, SQLi, etc.) with a risk score. |
| **Syntax & Error Detection** | Spots syntax errors and likely bugs. |
| **Code Quality Review** | Best-practice and maintainability feedback. |

---

## 🛠️ Tech Stack

| Technology | Role |
| :--- | :--- |
| **React 19** | UI layer with hooks and an error boundary. |
| **Vite 8** | Build tooling and dev server. |
| **Tailwind CSS 4** | Styling via the `@tailwindcss/vite` plugin. |
| **Google Gemini** | AI analysis with a cascading free-tier model fallback. |
| **Chart.js** | Renders the complexity charts. |
| **DOMPurify** | Sanitises AI-generated markdown before it is rendered. |

---

## 🚀 Quick Start

### 1. Install

```bash
git clone https://github.com/realkeshav08/CodePulse.git
cd CodePulse
npm install
```

### 2. Configure

Copy the example env file and add your Google AI Studio API key:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a key at <https://aistudio.google.com/app/apikey>.

> 🔒 The key has **no `VITE_` prefix on purpose**. It is read only by the
> server-side function in `api/analyze.js`, so Vite never bundles it into the
> client — the key stays on the server and is never exposed to the browser.

### 3. Run

```bash
npm run build    # produce a production bundle in dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

Because the API key now lives in a serverless function, the app needs that
function running during development. Use the Vercel CLI, which serves both the
Vite frontend and the `/api` route together and loads `.env` automatically:

```bash
npm i -g vercel   # one-time
vercel dev        # http://localhost:3000
```

> `npm run dev` still starts the Vite frontend on its own, but `/api/analyze`
> will return 404 there — analysis only works under `vercel dev` (or once
> deployed).

---

## 📂 Project Structure

```text
api/
└── analyze.js    # Serverless proxy — holds the Gemini key, runs model fallback
src/
├── components/   # UI components
│   └── ui/       # Reusable design-system primitives
├── pages/        # Router views (Home, Chat)
├── utils/        # Client connector that calls /api/analyze (no key here)
├── data/         # Feature list
└── lib/          # Helpers (classname merge)
```

---

## 🛡️ Security & Resilience

- **Server-side API key:** Gemini calls are proxied through `api/analyze.js`.
  The key never leaves the server and is never included in the client bundle.
- **Anti-XSS:** AI-generated markdown is sanitised with **DOMPurify** before
  being inserted into the DOM.
- **Error boundary:** A React error boundary keeps a failed render from
  crashing the whole page.
- **Input limits:** Uploaded files are capped at 512 KB on the client and the
  API rejects oversized prompts.
- **Dependencies:** `npm audit` currently reports zero known vulnerabilities.

---

Built by **[realkeshav08](https://github.com/realkeshav08)**
