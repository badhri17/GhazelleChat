# Ghazelle Chat

**Chat at gazelle speed — clone, run, and sprint.**

Ghazelle Chat is a full-stack, edge-ready chat application that streams replies from multiple LLM providers (OpenAI, Groq & Anthropic) in real-time. It ships with credential-based authentication, a local SQLite database that can be swapped for Turso/libSQL for global low-latency reads and a modern, responsive UI built with Nuxt 3 & Tailwind CSS.

---

## ✨ Features

• **Realtime AI chat** – Server-Sent Events (SSE) stream model tokens as they arrive for snappy UX.  
• **Multi-provider toggle** – Switch between GPT-4o, Llama 3 & Claude-3 on the fly.  
• **Persisted conversations** – Drizzle ORM manages `conversations` & `messages` tables (SQLite/Turso).  
• **Email / password auth** – Powered by Lucia with a Drizzle adapter.  
• **Mobile-first UI** – Radix-Vue primitives via shadcn-nuxt, light/dark themes, RTL-ready.  
• **Edge deploy-ready** – Designed for Vercel Edge Functions (< 75 ms TTFB, first token < 400 ms).  
• **Keyboard shortcuts & micro-interactions** – Ctrl + K to focus input, Esc clears draft, animated send button, toast notifications.  
• **Extensible** – Drop-in support for additional providers, vector search or PWA offline cache.

---

## 🏗 Tech Stack

| Layer | Choice | Rationale |
| ----- | ------ | --------- |
| Meta-framework | **Nuxt 3 + Nitro** | Hybrid SSR / edge; Vue SFC DX |
| UI | **Tailwind CSS + shadcn-nuxt (Radix-Vue)** | Accessible, unstyled primitives; tiny CSS footprint |
| Icons & Motion | `@nuxt/icon`, `tw-animate` | One-line SVG import, utility animations |
| Auth | **Lucia + Drizzle adapter** | Credentials today, OAuth tomorrow |
| DB | **libSQL / Turso + Drizzle ORM** | Offline `file:./db.sqlite`, swap to edge URL in prod |
| LLM SDKs | `openai`, `groq-sdk`, `@anthropic-ai/sdk` | Pluggable provider dropdown |
| Validation | **Zod** | End-to-end schema validation |

---

## 🚀 Quick Start

```bash
# 1. Clone & install deps
pnpm install --frozen-lockfile

# 2. Copy env template & fill in secrets
a cp .env.example .env

# 3. Push database schema & optional seed
docker run … # optional if using Turso
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
| POST | `/api/chat/resume` | Resume a streaming response |
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

PRs & issues are welcome! If you add features that require new env vars, please update `README.md` & `.env.example`.

1. Fork → create feature branch → commit → open PR against `master`.  
2. Ensure `pnpm lint` & `pnpm test` (coming soon) pass.  
3. Describe your changes thoroughly.

---

## 📜 License

MIT © 2024 Ghazelle Chat Contributors
