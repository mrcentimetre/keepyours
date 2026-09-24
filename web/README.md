# Waitlist page

One static file: `index.html`. No build step, no framework.

## Make the form actually save emails

Pick one and paste the URL into `const ENDPOINT = ""` near the bottom of `index.html`.

**Formspree (fastest, free tier ~50 submissions/month)**
1. formspree.io → new form → copy the endpoint, e.g. `https://formspree.io/f/xabcdefg`
2. Paste it into `ENDPOINT`.
3. Submit a test from the live site; confirm the email arrives.

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
2. Deploy → New deployment → Web app → execute as me, access "anyone" → copy the URL into `ENDPOINT`.

**Tally / Typeform:** also fine, but they take people off your page, so conversion drops.

## Deploy

```bash
cd web
vercel --prod
```

Then point `keepyours.xyz` at the deployment in Vercel → Settings → Domains.

## Rules for this page

- **No fake counts.** Don't add "join 2,000 others" until 2,000 people have actually joined. When the number is real and worth showing, add it under the form.
- Keep it one screen on a phone. Every extra section costs sign-ups.
- The only ask is the email. No name, no wallet, no country.

## When the app is live

Replace this page with the app's landing page, or keep it at `/waitlist` and point the domain root at the app.
