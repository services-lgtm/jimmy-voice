# Jimmy Voice Hero → Go Build Supply homepage — agent brief

**Goal:** Make the "Hey, I'm Jimmy" voice app the HERO of the gobuildsupply.com
homepage, so customers **talk to the site** instead of browsing. Same design and
function as the existing app — we are embedding the real app, not rebuilding it.

There are two parts: **(A) host the app**, then **(B) embed it on the homepage.**

---

## Part A — Host the Jimmy app (get a public https URL)

It's a single Node service that serves both the API and the web app.

- **Runtime:** Node 20+
- **Install:** `npm install`
- **Build:** `npm run build`  → outputs `dist/index.js` (server) + `dist/public` (client)
- **Start:** `npm run start`  (runs `NODE_ENV=production node dist/index.js`)
- **Port:** reads `process.env.PORT` (falls back to 3000). Bind to the host's port.
- **Health:** `GET /` returns the app; `POST /api/trpc/voice.chat` is the chat API.

Works on any Node host (Render, Railway, Fly, a VPS, etc.). Build command
`npm install && npm run build`, start command `npm run start`.

### Environment variables (set these on the host)
Copy the values from the project's `.env` file:

| Variable | What it is |
|---|---|
| `BIGCOMMERCE_STORE_HASH` | Store hash (`n9hvqo7nsn`) — real catalog |
| `BIGCOMMERCE_ACCESS_TOKEN` | BigCommerce API token (Products read) |
| `BIGCOMMERCE_STORE_URL` | `https://gobuildsupply.com` (for product links) |
| `ELEVENLABS_API_KEY` | Voice (text-to-speech) |
| `BUILT_IN_FORGE_API_KEY` | Whisper transcription + LLM chat |
| `BUILT_IN_FORGE_API_URL` | LLM/Whisper endpoint base |
| `DATABASE_URL` | `file:./local.db` (local SQLite; no external DB needed) |
| `PORT` | Provided by the host |
| `CORS_ORIGINS` | *(optional)* extra allowed origins, comma-separated. The store domains are already allowed in code. |

**Must be served over HTTPS** — the microphone will not work otherwise.

➡️ Result of Part A: a public address like `https://jimmy.gobuildsupply.com`.

---

## Part B — Embed it as the homepage hero

1. Open `gobuild-homepage-hero.html` (in this project).
2. Replace `https://REPLACE-WITH-YOUR-JIMMY-URL` with the URL from Part A
   (no trailing slash). There are two spots — the `<iframe src=...>` and the
   safety check; set the iframe `src`.
3. Place the whole block as the **first element of the homepage main content**,
   above the carousel / featured products, so Jimmy is the hero.
   - Stencil theme: top of `templates/pages/home.html`, **or**
   - Storefront → Script Manager → Location: Footer, Pages: **Home page only**.
4. The iframe already has `allow="microphone; autoplay"` — needed for the voice mic.
   Keep it.

That's it. Load the homepage, tap the mic, talk to Jimmy.

---

## Notes / gotchas
- **HTTPS on both sides** (storefront is already https; the Jimmy host must be too)
  or the browser blocks the microphone.
- **CORS** is already handled in `server/_core/index.ts` for gobuildsupply.com,
  www, and the `.mybigcommerce.com` preview. With the iframe approach the app
  calls its own API (same origin), so CORS isn't even hit — but it's there if needed.
- The app pulls **real products + live pricing** from BigCommerce. If a search
  ever returns nothing it falls back to sample products; flip `USE_DEMO_PRODUCTS`
  to `false` in `server/shopify.ts` to disable that once the catalog is fully live.
- Iframe height is set to 820px (720px on phones) in the snippet — adjust if you
  want it taller/shorter.
