# Bookera backend — PHP 8 + MySQL (Hostinger shared hosting)

Built in phases. **Done: 1–6** (analysis, database, schema, connection, authentication, React auth). Next: 7 — books/catalogue API.

## Layout

```
backend/
├── public/          → web folder         XAMPP: htdocs/bookera/api/     Hostinger: public_html/api/
│   ├── _init.php       finds and loads app/ (never served directly)
│   ├── index.php       GET /api/  health check
│   └── .htaccess       no directory listing, hides internal files
│
├── app/             → PRIVATE, outside the web folder
│   │                   XAMPP: /Applications/XAMPP/xamppfiles/bookera_app/   Hostinger: /home/uXXXX/bookera_app/
│   ├── bootstrap.php   loads config, errors, database, security headers, CORS
│   ├── config/
│   │   ├── config.sample.php   template (committed)
│   │   ├── config.php          real secrets (git-ignored, never in the browser)
│   │   └── database.php        PDO connection (prepared statements, utf8mb4, UTC, strict mode)
│   ├── lib/
│   │   ├── http.php            JSON responses, request parsing, CORS allow-list, security headers
│   │   └── errors.php          warnings → exceptions, private logs, generic errors in production
│   └── storage/                private: books/ (e-book files), logs/, tmp/
│
├── database/        schema.sql, seed.sql, README.md
├── scripts/         sync-xampp.sh, export-seed-sql.mts
└── _legacy/         first-draft API (reference only, not deployed; removed after Phase 10)
```

Why two folders: even if the web server were misconfigured, config files, code and paid
e-books in `app/` can't be downloaded, because they aren't inside the web folder at all.

## Response format (every endpoint)
```json
{ "success": true,  "message": "…", "data": { … } }
{ "success": false, "message": "…", "code": "SOME_CODE", "errors": { "field": "…" } }
```

## Local development (XAMPP on macOS)
1. XAMPP → Manage Servers → start **MySQL Database** and **Apache Web Server**.
2. Database `bookera` imported from `database/schema.sql` + `database/seed.sql` (see database/README.md).
3. First time only: `cp backend/app/config/config.sample.php backend/app/config/config.php`
   and set `security.app_key` (the local one is already generated).
4. Copy the backend into XAMPP (run again after every backend change):
   ```bash
   npm run backend:sync
   ```
5. Check: http://localhost/bookera/api/ → `"Bookera API is running"`.
6. `npm run dev` → the React app calls `/api/...`; Vite forwards it to `http://localhost/bookera/api/...`
   (see `vite.config.ts`), so it's the same origin for the browser — cookies work, no CORS needed.

Logs: `/Applications/XAMPP/xamppfiles/bookera_app/storage/logs/app-YYYY-MM-DD.log`

## Frontend connection (Phase 6)
- `.env.local` → `VITE_API_MODE=live` switches the React app's **accounts** to this API
  (sign-up, login, logout, forgot/reset password, profile, change password, session restore).
- Since Phase 7 the **catalogue** (books, categories, authors, admin book management) is live too.
  Cart, checkout, library and downloads stay in demo mode until their phases
  (`LIVE.commerce` in `src/lib/api.ts`). A guest's demo checkout already creates the real
  member account on the server — only after the (demo) payment succeeds.
- `src/lib/api.ts` fetches the CSRF token from `/auth/session.php` automatically and
  retries once if it has expired. Server field errors appear under the matching inputs.

## Endpoints so far
| Endpoint | Method | Auth | Body |
|---|---|---|---|
| `/api/` | GET | – | health check |
| `/api/auth/session.php` | GET | – | → `{ user \| null, csrfToken }` |
| `/api/auth/register.php` | POST | CSRF | `{ name, email, phone, password }` |
| `/api/auth/login.php` | POST | CSRF | `{ email, password }` |
| `/api/auth/logout.php` | POST | CSRF | – |
| `/api/auth/forgot-password.php` | POST | CSRF | `{ email }` |
| `/api/auth/reset-password.php` | POST | CSRF | `{ token, password }` |
| `/api/users/profile.php` | GET | member | – |
| `/api/users/update-profile.php` | POST | member + CSRF | `{ name, phone, bio?, readingInterests?, email?, currentPassword? }` |
| `/api/users/change-password.php` | POST | member + CSRF | `{ currentPassword, newPassword }` |
| `/api/books/list.php` | GET | – | `?q=&category=&author=&price=free\|paid&featured=1&sort=&page=&per_page=` → `{ books, pagination }` |
| `/api/books/details.php` | GET | – | `?slug=` → `{ book, author, related }` (published only) |
| `/api/categories/list.php` | GET | – | → categories with `bookCount` |
| `/api/authors/list.php` | GET | – | → authors |
| `/api/admin/books/list.php` | GET | admin | → every book incl. drafts (with `hasFile`, `fileName`, …) |
| `/api/admin/books/get.php` | GET | admin | `?id=` |
| `/api/admin/books/create.php` | POST | admin + CSRF | book fields → always saved as **draft** |
| `/api/admin/books/update.php` | POST | admin + CSRF | `{ id, …fields }` (URL slug never changes) |
| `/api/admin/books/status.php` | POST | admin + CSRF | `{ id, status?, available?, featured? }` |
| `/api/admin/books/delete.php` | POST | admin + CSRF | `{ id }` → soft delete (buyers keep their copy) |
| `/api/admin/books/upload-cover.php` | POST multipart | admin + CSRF | `id`, `cover` (JPG/PNG/WebP ≤ 5 MB) |
| `/api/admin/books/upload-file.php` | POST multipart | admin + CSRF | `id`, `file` (PDF/EPUB ≤ 100 MB) |

Every POST needs the header `X-CSRF-Token: <csrfToken from /auth/session.php>`.
Local emails (e.g. password reset links) are written to
`/Applications/XAMPP/xamppfiles/bookera_app/storage/logs/mail.log` instead of being sent.

Run the automated checks: `npm run backend:test` (auth 42 + catalogue 47 checks; uses throwaway
`@example.test` accounts and removes everything it creates).

## Books & uploads (Phase 7)
- Prices are stored in **paise** (`price_paise`); the API returns rupees. The price shown on the
  site always comes from the database — nothing the browser sends is trusted for money.
- A book can only be **published** when it has an e-book file (`FILE_REQUIRED`). The admin list
  shows a **No file** badge for these — the 26 seed books have none yet, so upload the real PDF/EPUB
  for each before selling it.
- Covers are checked as real images and **re-drawn** with GD (strips hidden content), resized to
  ≤ 1200 px wide and saved with a random name in the public `api/uploads/covers/`. PHP can never run
  in `uploads/` (`.htaccess`), and only jpg/png/webp are served from it.
- E-book files are checked by their **content** (`%PDF-` / EPUB signature), renamed randomly and
  stored in the **private** `bookera_app/storage/books/` — there is no public URL for them.
  They'll be served only to owners through the Phase 10 download endpoint.
- Replacing a cover/file deletes the old one; deleting a book is a soft delete (`deleted_at`).
- Every admin change is written to `admin_audit_log` (who, what, when, IP).
- Upload limits: 100 MB file / 110 MB request — set in `public/.htaccess` (XAMPP) and
  `public/.user.ini` (Hostinger).
- Make yourself an admin (after registering on the site):
  `UPDATE users SET role='admin' WHERE email='you@example.com';` then sign out and in again.

## Security in place (Phase 4–7)
- Sessions: HttpOnly + SameSite=Lax cookie (Secure on HTTPS), strict mode, new ID at login, stored privately in app/storage/sessions.
- CSRF token on every POST + origin check; passwords hashed with `password_hash()` and upgraded automatically.
- Login: generic errors, equal timing for unknown emails, lock after 5 failures (15 min) — checked before the password.
- Password reset: 64-char one-time token, only its SHA-256 stored, 60-minute expiry, same response for unknown emails.
- Changing/resetting a password or blocking an account signs out every other device.
- Users can only read/update their own profile — the user id always comes from the session.
- Secrets only in `app/config/config.php` (outside the web folder, git-ignored).
- PDO with real prepared statements; strict SQL mode; utf8mb4; UTC.
- Database errors are logged privately; the browser gets a generic 503.
- `debug` off in production → no internal details in any response.
- CORS: explicit allow-list with credentials, never `*`; unknown origins get no CORS headers.
- Headers: `nosniff`, `X-Frame-Options: DENY`, strict CSP for JSON, `no-store`, HSTS on HTTPS.
- Internal files (`_init.php`, dotfiles) return 403; no directory listings.
- Admin endpoints check `role = 'admin'` on the server (`require_admin()`), not just in React.

## Deploying to Hostinger (before payments are connected)
`npm run deploy:package -- yourdomain.com` → `hostinger-upload/` (git-ignored — it contains the
production `config.php` with a fresh secret key):
- `public_html.zip` → extract **inside** `public_html/` (React site + `api/`)
- `bookera_app.zip` → extract in the folder that **contains** `public_html/` (private backend)
- Then fill in the database name/user/password in `bookera_app/config/config.php`.

Until `LIVE.commerce` is switched on (Phase 8), the live site shows **"Sales open soon"** instead of
buy buttons, so nobody goes through a pretend payment. Never re-upload over `config.php`,
`storage/` or `api/uploads/covers/` on the server.
