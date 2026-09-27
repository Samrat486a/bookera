# Bookera — Discover. Read. Learn.

Bookera is an e-book store and reading platform. The frontend is React + TypeScript + Tailwind CSS v4 (Vite); the backend is PHP 8 + MySQL for Hostinger (see [backend/README.md](backend/README.md)).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ → upload to Hostinger public_html
```

## Two modes

| `VITE_API_MODE` | What happens |
|---|---|
| `mock` (default) | Self-contained demo: accounts, purchases and libraries live in the browser, a demo payment window stands in for Razorpay, and sample PDFs are generated on the fly. |
| `live` | Real member accounts, Razorpay payments, emailed PDFs and secure reading via the PHP API in `/api`. |

Set it in `.env.local` (dev) or `.env.production` (build).

Demo sign-in: any email/password works; **maya@bookera.demo** has sample purchases. Admin demo: open `/admin`.

## Buying flow
- **Signed-in members:** Buy → confirm → Razorpay → book added to library + PDF emailed.
- **Guests:** Buy → enter name, email, password (the same details as sign-up) → Razorpay → on success the member account is created, the book is emailed and appears in their library. If payment fails or is cancelled, **no account is created**.
- **Free books** skip the payment step.

## Routes
| Route | Page |
|---|---|
| `/` | Home |
| `/ebooks`, `/ebooks/:id` | Catalogue and book details (Buy / Read / Download) |
| `/checkout/:id`, `/checkout/success` | Checkout (guest or member) and confirmation |
| `/dashboard` | Member library: purchased books, progress, Read / Download |
| `/read/:id` | In-browser PDF reader: page controls, zoom, fit, full screen, light/sepia/night, keyboard + swipe |
| `/categories`, `/about`, `/publish` | Discovery, about, contact the owner to publish a book |
| `/login`, `/signup`, `/profile` | Account |
| `/admin/*` | Admin studio (catalogue, readers) |

## Key folders
```
src/lib/api.ts          API client + Razorpay Checkout loader (live mode)
src/lib/checkout.ts     demo-mode order helpers
src/lib/pdf/            PDF loading/downloading (+ demo PDF generator)
src/context/StoreContext.tsx   user, libraries, catalogue
src/pages/Checkout.tsx  checkout + success
src/pages/Reader.tsx    PDF reader (lazy-loaded with pdf.js)
backend/                PHP API, SQL schema, Hostinger deployment guide
```

All books, authors, ratings and statistics are fictional demo data.
