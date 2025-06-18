# Ghazelle Chat

**Chat at gazelle speed — clone, run, and sprint.**

Ghazelle Chat is an open-source, full-stack AI chat app that streams answers in real time from multiple LLM providers (OpenAI, Groq & Anthropic) in real-time. It ships with credential-based authentication, a local libSQL database that can be swapped for Turso/libSQL for global low-latency reads and a modern, responsive UI built with Nuxt 3 & Tailwind CSS.

---
## 📸 Screenshots
<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/8f58b11e-4efa-4692-a2aa-16b53f52cb34" width="400"/></td>
    <td><img src="https://github.com/user-attachments/assets/06d91f42-e0dd-4d32-83f6-03990174fbef" width="400"/></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/936303b0-7e5e-4ad7-b037-401fa377c4d9" width="400"/></td>
    <td><img src="https://github.com/user-attachments/assets/ca5f0c4a-1822-45fa-84d9-3735f2b7316c" width="400"/></td>
    </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/d12f21dd-62c9-4ed0-9d6e-3b0313a8abba" width="400"/></td>
    <td><img src="https://github.com/user-attachments/assets/2b2bbeaf-eb8b-431a-96d2-e6023c78bbe2" width="400"/></td>
    </tr>
    



  </tr>
</table>





---
## ✨ Features

• **Realtime AI chat** – Server-Sent Events (SSE) stream model tokens as they arrive for snappy UX.

• **Multi-provider toggle** – Switch between GPT-4o, Llama 3 & Claude-3 on the fly with your own API keys.

• **Resumable streams** – In-flight generations survive page refresh; The backend keeps generating even if you refresh or lose connection.    

• **Persisted conversations** – Drizzle ORM manages `conversations` & `messages` tables (libSQL/Turso). 

• **Email / password auth** – Powered by Lucia with a Drizzle adapter.  

• **Image & PDF Attachments** – supports attachments in messages for richer context. Users can upload images or PDF files along with their question.

• **Dynamic theming & backgrounds** – One-click light/dark and a gallery of ambient wallpapers that swap automatically with the theme.  

• **Mobile-first UI** – Radix-Vue primitives via shadcn-nuxt, light/dark themes.   


• **Keyboard shortcuts & micro-interactions** – Ctrl + K to focus input, Esc clears draft, animated send button, toast notifications.  

• **Extensible** – Plug in new LLM providers, vector search, or PWA offline cache with minimal code changes.

---

## 🏗 Tech Stack

| Layer            | Choice                                    |
| ---------------- | ----------------------------------------- |
| UI framework     | **Nuxt 3 + Nitro**                        |
| Styling          | **Tailwind CSS + shadcn-nuxt (Radix-Vue)**|
| Auth             | **Lucia**                                 |
| Database / ORM   | **libSQL / Turso + Drizzle**              |
| LLM SDKs         | `openai`, `groq-sdk`, `@anthropic-ai/sdk` |
| Validation       | **Zod**                                   |
## 🚀 Quick Start

```bash
# 1. Clone & install deps
pnpm install --frozen-lockfile

# 2. Copy env template & fill in secrets
cp .env.example .env

# 3. Push database schema & optional seed
pnpm db:push      # drizzle-kit push
pnpm db:seed      # optional sample data

# 4. Hack away ✨
pnpm dev          # http://localhost:3000
```

### Required Environment Variables

| Key | Description |
| --- | ----------- |
| `OPENAI_API_KEY` | Secret key from OpenAI dashboard |
| `GROQ_API_KEY` | Secret key from GroqCloud |
| `ANTHROPIC_API_KEY` | Secret key from Anthropic |
| `DATABASE_URL` | `file:./db.sqlite` (default) or Turso URL `libsql://…` |
| `AUTH_SECRET` | Random 32-byte string used by Lucia |

An example template lives in **.env.example**.

> ℹ️ Only the keys for providers you intend to use are required at runtime.

---

## 📂 Project Structure (abridged)

```
├─ assets/        # Tailwind & global CSS, images
├─ components/    # UI & page-level Vue components (shadcn-nuxt wrappers)
├─ pages/         # Nuxt file-system routes (/, /login, /chat)
├─ server/        # Nitro server routes, db, auth & utils
│  ├─ api/        # REST endpoints (auth, chat, conversations, …)
│  ├─ db/         # Drizzle schema & seed
│  └─ utils/      # OpenAI / Groq / Anthropic helpers
├─ lib/           # Shared client-side helper utilities
└─ nuxt.config.ts # Runtime config & module registration
```

---

## 🔌 API Overview

All server routes live under `/server/api` and are automatically mapped by Nitro:

| Method | Route | Purpose |
| ------ | ----- | ------- |
| POST | `/api/auth/register` | Create user |
| POST | `/api/auth/login` | Email + password login |
| POST | `/api/auth/logout` | Revoke session |
| GET  | `/api/auth/me` | Current user info |
| POST | `/api/chat` | Stream chat completion |
| GET  | `/api/conversations` | List user conversations |
| DELETE | `/api/conversations/[id]` | Delete conversation |
| GET  | `/api/conversations/[id]/messages` | Paginated messages |
| GET  | `/api/messages/[id]/content` | Full message content |
| PUT  | `/api/messages/[id]/stop` | Stop generation |

Responses are JSON or `text/event-stream` when streaming.

---

## 🛠 Useful Scripts

| Script | What it does |
| ------ | ------------ |
| `pnpm dev` | Launches Nuxt dev server with auto-reload |
| `pnpm build` | Generates production build (`.output/`) |
| `pnpm preview` | Serves the production build locally |
| `pnpm db:push` | Runs Drizzle migrations against `DATABASE_URL` |
| `pnpm db:seed` | Populates the DB with demo data |

---

## ☁️ Deployment

Ghazelle Chat is optimised for **Vercel Edge Functions** but will happily run on any Node 18+ environment.

1. Set your env vars in the hosting dashboard.  
2. Ensure `DATABASE_URL` points at Turso/libSQL for global reads.  
3. `vercel --prod` will call `pnpm build` automatically.

> For traditional servers, run `pnpm build && node .output/server/index.mjs`.

---

## 🤝 Contributing

We welcome and appreciate contributions of all kinds!  If you plan to add a new feature or make a non‑trivial change, please open an issue first so we can discuss scope and design.

1. Open an issue → discuss the proposed change or bug fix.
2. Fork the repo and create a descriptive branch name (feature/pagination, fix/input-focus, …).
3. Keep the pull request focused and include a clear description.
4. Ensure pnpm lint (and pnpm test, coming soon) pass before pushing.
5. Update the documentation and .env.example if your change introduces new environment variables.


Ensure pnpm lint (and pnpm test, coming soon) pass before pushing.

Update the documentation and .env.example if your change introduces new environment variables.

📌 Roadmap / Help‑Wanted

- Message pagination & infinite scroll

- Rate‑limiting middleware for public API routes

- Built‑in web search tool (browser with citations)

- Shareable conversation links / export

- image generation

If any of these interest you, comment on the corresponding issue (or create one) and claim it.  New ideas are always welcome!

---

## License

MIT

---

## ☕ Support(Buy me a coffee)

[![Buy Me A Coffee](https://img.shields.io/badge/-buy%20me%20a%20coffee-FFDD00?logo=buy-me-a-coffee\&logoColor=black\&style=for-the-badge)](https://www.buymeacoffee.com/badhri)
