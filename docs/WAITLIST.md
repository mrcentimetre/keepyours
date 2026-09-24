# Waitlist page

The waitlist is the home page of the Next.js app at the repo root.

| File | What it is |
|---|---|
| `app/page.jsx` | The page itself (server component) |
| `app/waitlist-form.jsx` | The email form (client component) |
| `app/api/waitlist/route.js` | Server route that forwards the email to the sheet |
| `app/globals.css` | All the styling |
| `public/` | `logo.svg`, `logo-256.png`, `og-banner.png` |

The browser never talks to Google directly. It posts to `/api/waitlist`, which
forwards server-side, so there is no CORS problem and the sheet URL stays out of
the page source.

## Make the form actually save emails

The route reads one environment variable, `WAITLIST_ENDPOINT`. Set it locally in
`.env.local` and in Vercel → Settings → Environment Variables (all three
environments).

**Google Sheets (free, unlimited)**
1. New Sheet → Extensions → Apps Script, paste:
   ```js
   function doPost(e){
     const sheet = SpreadsheetApp.getActiveSheet();
     const body = JSON.parse(e.postData.contents);
     sheet.appendRow([new Date(), body.email, body.source || '']);
     return ContentService.createTextOutput(JSON.stringify({ok:true}))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```
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

When the app itself is built it goes at `/dashboard` (etc.) in this same
project; the waitlist stays at `/` until launch.

## Rules for this page

- **No fake counts.** Don't add "join 2,000 others" until 2,000 people have
  actually joined. When the number is real and worth showing, add it under the form.
- Keep it one screen on a phone. Every extra section costs sign-ups.
- The only ask is the email. No name, no wallet, no country.
