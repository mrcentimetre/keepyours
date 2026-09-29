# Waitlist page

The waitlist is the home page of the Next.js app at the repo root.

| File | What it is |
|---|---|
| `app/page.tsx` | The page itself (server component) |
| `components/waitlist/hero.tsx` | Headline, form and feature cards; swaps to the pass after joining |
| `components/waitlist/waitlist-form.tsx` | The form: email, name, X handle |
| `components/waitlist/waitlist-ticket.tsx`, `lib/ticket.ts` | The pass shown after joining (name + @handle, never the email) |
| `components/waitlist/launch-badge.tsx`, `lib/badge-*.ts` | The "Soon" badge and its WebGL shader |
| `app/api/waitlist/route.ts` | Server route that forwards a signup to the sheet |
| `app/pass/`, `lib/pass-params.ts` | `/pass?n=&h=` share link; `og/` draws that person's pass as the X card |
| `app/globals.css` | Tailwind import, brand tokens (`@theme`), page background |
| `public/` | `logo-128.png`, `logo-256.png`, `apple-icon.png`, `og-banner.png`; originals in `brand/` |

The browser never talks to Google directly. It posts to `/api/waitlist`, which
forwards server-side, so there is no CORS problem and the sheet URL stays out of
the page source.

## Make the form actually save emails

The route reads one environment variable, `WAITLIST_ENDPOINT`. Set it locally in
`.env.local` and in Vercel → Settings → Environment Variables (all three
environments).

**Google Sheets (free, unlimited)**
1. New Sheet → Extensions → Apps Script, paste (replacing everything):
   ```js
   const HEADERS = ['Joined', 'Name', 'X handle', 'Email', 'OK to tag on X', 'Source'];

   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSheet();
     if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

     const body = JSON.parse(e.postData.contents);
     const handle = String(body.handle || '').replace(/^@+/, '');
     sheet.appendRow([
       new Date(),
       // A leading = + - @ would run as a formula in the sheet; ' keeps it text.
       safe(body.name),
       handle ? '@' + handle : '',
       safe(body.email),
       body.consent === true ? 'yes' : 'no',
       safe(body.source),
     ]);
     return ContentService.createTextOutput(JSON.stringify({ ok: true }))
       .setMimeType(ContentService.MimeType.JSON);
   }

   function safe(v) {
     const s = String(v || '');
     return /^[=+\-@]/.test(s) ? "'" + s : s;
   }
   ```
   `@handle` is written starting with `@` on purpose: `appendRow` stores it as
   plain text, and it reads right in the sheet. An existing sheet with the old
   `Joined | Email | Source` columns: add the new header row by hand, or start
   a fresh tab.
2. Deploy → New deployment → Web app → execute as me, access "anyone" → copy the
   `/exec` URL into `WAITLIST_ENDPOINT`.
3. Every time the script changes, deploy a **new version** — editing alone does
   nothing to the live URL.

**Formspree** works too: same variable, paste the `https://formspree.io/f/…`
endpoint instead. It ignores the `text/plain` content type but still records the
body.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # what Vercel runs
```

## Deploy

Vercel auto-detects Next.js at the repo root. Root Directory stays `./` — no
`vercel.json` needed. Point `keepyours.xyz` at it in Vercel → Settings → Domains.

The product app lives at `/app` in this same project (see `docs/BUILD-PLAN.md`);
the waitlist stays at `/` until launch.

## Rules for this page

- **No fake counts.** Don't add "join 2,000 others" until 2,000 people have
  actually joined. When the number is real and worth showing, add it under the form.
- Keep it one screen on a phone. Every extra section costs sign-ups.
- The asks are email, name and X handle — the name and handle go on the
  shareable pass, the email never does. No wallet, no country.
