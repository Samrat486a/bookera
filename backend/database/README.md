# Bookera database

| File | What it is |
|---|---|
| `schema.sql` | All 18 tables, keys, indexes and rules. Import into an **empty** database. It never drops tables. |
| `seed.sql` | Starter catalogue: 12 categories, 10 authors, 26 books. Regenerate with `npm run db:seed-sql`. |

Tested on MariaDB 10.4.28 (the version in XAMPP). Hostinger runs a newer MariaDB/MySQL, which is also compatible.

## Tables at a glance

```
users ──┬── password_resets
        ├── cart_items ──────────── books ── authors
        ├── wishlists ───────────── books ── categories
        ├── reviews ─────────────── books
        ├── notifications
        ├── library (ownership) ─── books, orders
        ├── downloads (audit) ───── books, orders
        └── orders ── order_items ─ books
                   └─ payments
webhook_events · publish_enquiries · rate_limits · admin_audit_log
```

| Table | Purpose |
|---|---|
| `users` | Members and admins (`role`), with hashed passwords and `active`/`blocked` status |
| `password_resets` | One-time reset tokens (only a SHA-256 hash is stored) |
| `categories`, `authors`, `books` | Catalogue. Books are soft-deleted; prices are in paise; `is_free` must match the price |
| `cart_items` | Signed-in cart (one row per book) |
| `orders`, `order_items` | Checkout. Items copy the title and price at purchase time. A guest's `user_id` stays NULL until they pay |
| `payments` | Razorpay order/payment IDs, status, method, errors, refunds |
| `webhook_events` | Each Razorpay webhook stored once, so replays are ignored |
| `library` | Who owns which book (+ reading progress). A refund sets `revoked_at` |
| `downloads` | Log of every read, download and email-link use |
| `wishlists`, `reviews`, `notifications` | Engagement. Reviews are 1–5 stars, one per member per book, and need admin approval |
| `publish_enquiries` | Messages from the "Have a book to publish?" page |
| `rate_limits`, `admin_audit_log` | Throttling of login/reset/checkout, and a record of admin actions |

## Rules the database enforces itself
- Emails, book slugs, ISBNs, order numbers and Razorpay IDs are unique.
- A free book costs 0; a paid book costs more than 0.
- `order total + discount = subtotal`, and `line total = unit price × quantity`.
- A refund can't exceed the amount paid. Reading progress is 0–100%. Ratings are 1–5.
- A book can't be owned twice, reviewed twice, or appear twice in one order.
- A book that has been sold can't be hard-deleted (use soft delete).
- Deleting a user removes their cart, wishlist, reviews, library and notifications, but **keeps their orders** for your records.

## Import on XAMPP (local)
1. Open XAMPP → **Manage Servers** → start **MySQL Database** (and **Apache Web Server**).
2. Open http://localhost/phpmyadmin
3. **New** → database name `bookera` → collation `utf8mb4_unicode_ci` → **Create**.
4. Select `bookera` → **Import** → choose `schema.sql` → **Import**.
5. **Import** again → choose `seed.sql` → **Import**.
6. Check: the left sidebar shows 18 tables; `books` has 26 rows.

Hostinger works the same way through hPanel → Databases → phpMyAdmin (see the deployment phase).
