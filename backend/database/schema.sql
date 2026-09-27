-- =====================================================================
--  Bookera — production database schema
--  Compatible with MariaDB 10.4+ (XAMPP, Hostinger) and MySQL 8.0+
--
--  Import in phpMyAdmin: select your (empty) database → Import → this file,
--  then import seed.sql.
--
--  Conventions
--    • Money is stored as whole paise (INT UNSIGNED) — ₹399.00 = 39900. No floats.
--    • All times are stored in UTC; the frontend formats them for India.
--    • Books are soft-deleted (deleted_at) so past orders keep their history.
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
-- Safety: this file never drops tables. Import it into an EMPTY database;
-- if a table already exists the import stops instead of overwriting data.

-- ---------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------

CREATE TABLE users (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name               VARCHAR(120) NOT NULL,
  email              VARCHAR(190) NOT NULL,
  phone              VARCHAR(20)  NULL,
  password_hash      VARCHAR(255) NOT NULL,                       -- password_hash(), never plain text
  role               ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  status             ENUM('active','blocked') NOT NULL DEFAULT 'active',
  bio                VARCHAR(500) NULL,
  reading_interests  JSON NULL,                                   -- ["Programming","Fiction"]
  email_verified_at  DATETIME NULL,
  last_login_at      DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_phone (phone),
  KEY ix_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  token_hash    CHAR(64) NOT NULL,                                -- SHA-256 of the emailed token; the token itself is never stored
  expires_at    DATETIME NOT NULL,
  used_at       DATETIME NULL,
  requested_ip  VARCHAR(45) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_resets_token (token_hash),
  KEY ix_resets_user (user_id, created_at),
  CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------

CREATE TABLE categories (
  id           SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(80)  NOT NULL,
  name         VARCHAR(80)  NOT NULL,
  description  VARCHAR(255) NULL,
  tone         CHAR(7)      NOT NULL DEFAULT '#3654FF',          -- accent colour used by the UI
  sort_order   SMALLINT     NOT NULL DEFAULT 0,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  UNIQUE KEY uq_categories_name (name),
  CONSTRAINT ck_categories_tone CHECK (tone REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE authors (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(120) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  specialization  VARCHAR(120) NULL,
  bio             VARCHAR(500) NULL,
  city            VARCHAR(80)  NULL,
  tone            CHAR(7)      NOT NULL DEFAULT '#14171B',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_authors_slug (slug),
  KEY ix_authors_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE books (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug               VARCHAR(160) NOT NULL,                       -- used in URLs: /ebooks/<slug>
  title              VARCHAR(255) NOT NULL,
  subtitle           VARCHAR(255) NULL,
  author_id          INT UNSIGNED NOT NULL,
  category_id        SMALLINT UNSIGNED NOT NULL,
  short_description  VARCHAR(255) NOT NULL,
  description        TEXT NULL,
  pages              SMALLINT UNSIGNED NULL,
  language           VARCHAR(40) NOT NULL DEFAULT 'English',
  format             ENUM('pdf','epub') NOT NULL DEFAULT 'pdf',
  isbn               VARCHAR(20) NULL,
  publisher          VARCHAR(120) NULL,
  published_on       DATE NULL,
  level              ENUM('Beginner','Intermediate','Advanced','All levels') NOT NULL DEFAULT 'All levels',
  price_paise        INT UNSIGNED NOT NULL DEFAULT 0,
  is_free            TINYINT(1) NOT NULL DEFAULT 0,
  status             ENUM('draft','published','unpublished') NOT NULL DEFAULT 'draft',
  is_enabled         TINYINT(1) NOT NULL DEFAULT 1,              -- 0 = "Currently unavailable" (visible, can't be bought)
  is_featured        TINYINT(1) NOT NULL DEFAULT 0,
  cover_path         VARCHAR(255) NULL,                           -- public image, e.g. uploads/covers/abc.webp
  cover_design       JSON NULL,                                   -- generated cover {bg, fg, accent, pattern} when no image
  file_path          VARCHAR(255) NULL,                           -- PRIVATE e-book file, relative to storage/books/
  file_size          INT UNSIGNED NULL,
  file_mime          VARCHAR(80) NULL,
  tags               JSON NULL,
  learn              JSON NULL,                                   -- "What readers will learn"
  requirements       JSON NULL,
  rating_avg         DECIMAL(2,1) NOT NULL DEFAULT 0.0,           -- recalculated from approved reviews
  rating_count       INT UNSIGNED NOT NULL DEFAULT 0,
  sales_count        INT UNSIGNED NOT NULL DEFAULT 0,             -- number of owners ("readers")
  created_by         INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_books_slug (slug),
  UNIQUE KEY uq_books_isbn (isbn),
  KEY ix_books_listing (status, is_enabled, deleted_at, is_featured),
  KEY ix_books_category (category_id),
  KEY ix_books_author (author_id),
  KEY ix_books_published (published_on),
  FULLTEXT KEY ft_books_search (title, subtitle, short_description),
  CONSTRAINT fk_books_author   FOREIGN KEY (author_id)   REFERENCES authors (id)    ON UPDATE CASCADE,
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories (id) ON UPDATE CASCADE,
  CONSTRAINT fk_books_creator  FOREIGN KEY (created_by)  REFERENCES users (id)      ON DELETE SET NULL,
  -- a free book costs nothing; a paid book must cost something
  CONSTRAINT ck_books_price CHECK ((is_free = 1 AND price_paise = 0) OR (is_free = 0 AND price_paise > 0)),
  CONSTRAINT ck_books_rating CHECK (rating_avg BETWEEN 0 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Shopping cart (signed-in members; guests keep their cart in the browser
-- and it is merged into this table when they log in)
-- ---------------------------------------------------------------------

CREATE TABLE cart_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  book_id     INT UNSIGNED NOT NULL,
  quantity    TINYINT UNSIGNED NOT NULL DEFAULT 1,               -- e-books: the API keeps this at 1
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_user_book (user_id, book_id),
  KEY ix_cart_book (book_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
  CONSTRAINT ck_cart_qty CHECK (quantity >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Orders & payments
-- ---------------------------------------------------------------------

CREATE TABLE orders (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number           VARCHAR(24) NOT NULL,                    -- shown to buyers, e.g. BKR-260927-7QX2
  user_id                INT UNSIGNED NULL,                       -- NULL for a guest until the payment succeeds
  is_guest               TINYINT(1) NOT NULL DEFAULT 0,
  customer_name          VARCHAR(120) NOT NULL,
  customer_email         VARCHAR(190) NOT NULL,
  customer_phone         VARCHAR(20)  NULL,
  pending_password_hash  VARCHAR(255) NULL,                       -- guest's chosen password (hashed); cleared after payment/cleanup
  subtotal_paise         INT UNSIGNED NOT NULL,
  discount_paise         INT UNSIGNED NOT NULL DEFAULT 0,
  total_paise            INT UNSIGNED NOT NULL,
  currency               CHAR(3) NOT NULL DEFAULT 'INR',
  status                 ENUM('pending','payment_processing','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  failure_reason         VARCHAR(255) NULL,
  ip_address             VARCHAR(45) NULL,
  user_agent             VARCHAR(255) NULL,
  email_sent_at          DATETIME NULL,
  paid_at                DATETIME NULL,
  cancelled_at           DATETIME NULL,
  refunded_at            DATETIME NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY ix_orders_user (user_id, created_at),
  KEY ix_orders_status (status, created_at),
  KEY ix_orders_email (customer_email),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT ck_orders_total CHECK (total_paise + discount_paise = subtotal_paise),
  CONSTRAINT ck_orders_currency CHECK (currency = 'INR')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id          INT UNSIGNED NOT NULL,
  book_id           INT UNSIGNED NOT NULL,
  title_snapshot    VARCHAR(255) NOT NULL,                        -- title & price as they were at purchase time
  unit_price_paise  INT UNSIGNED NOT NULL,
  quantity          TINYINT UNSIGNED NOT NULL DEFAULT 1,
  line_total_paise  INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_items (order_id, book_id),
  KEY ix_order_items_book (book_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_book  FOREIGN KEY (book_id)  REFERENCES books (id),
  CONSTRAINT ck_items_line CHECK (line_total_paise = unit_price_paise * quantity AND quantity >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id             INT UNSIGNED NOT NULL,
  provider             VARCHAR(20) NOT NULL DEFAULT 'razorpay',
  razorpay_order_id    VARCHAR(64) NOT NULL,
  razorpay_payment_id  VARCHAR(64) NULL,
  razorpay_signature   VARCHAR(255) NULL,
  amount_paise         INT UNSIGNED NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'INR',
  status               ENUM('created','attempted','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
  method               VARCHAR(30) NULL,                          -- upi, card, netbanking, wallet…
  error_code           VARCHAR(80) NULL,
  error_description    VARCHAR(255) NULL,
  refund_id            VARCHAR(64) NULL,
  refunded_paise       INT UNSIGNED NOT NULL DEFAULT 0,
  captured_at          DATETIME NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_rzp_order (razorpay_order_id),
  UNIQUE KEY uq_payments_rzp_payment (razorpay_payment_id),
  KEY ix_payments_order (order_id),
  KEY ix_payments_status (status, created_at),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT ck_payments_refund CHECK (refunded_paise <= amount_paise)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every Razorpay webhook is recorded once (replay protection + debugging)
CREATE TABLE webhook_events (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider         VARCHAR(20) NOT NULL DEFAULT 'razorpay',
  event_id         VARCHAR(100) NOT NULL,                         -- X-Razorpay-Event-Id
  event_type       VARCHAR(60) NOT NULL,
  payload          JSON NOT NULL,
  processed_at     DATETIME NULL,
  error            VARCHAR(255) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webhook_event (provider, event_id),
  KEY ix_webhook_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Ownership, reading & downloads
-- ---------------------------------------------------------------------

-- A row here = the member may read/download the book.
CREATE TABLE library (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  book_id       INT UNSIGNED NOT NULL,
  order_id      INT UNSIGNED NULL,
  source        ENUM('purchase','free','admin_grant') NOT NULL DEFAULT 'purchase',
  granted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at    DATETIME NULL,                                    -- set on refund; access checks require NULL
  progress      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_page     INT UNSIGNED NULL,
  last_read_at  DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_library_user_book (user_id, book_id),
  KEY ix_library_book (book_id),
  KEY ix_library_order (order_id),
  CONSTRAINT fk_library_user  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE,
  CONSTRAINT fk_library_book  FOREIGN KEY (book_id)  REFERENCES books (id),
  CONSTRAINT fk_library_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL,
  CONSTRAINT ck_library_progress CHECK (progress <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit trail of every read / download / email-link use
CREATE TABLE downloads (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  book_id     INT UNSIGNED NOT NULL,
  order_id    INT UNSIGNED NULL,
  type        ENUM('read','download','email_link') NOT NULL,
  ip_address  VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_downloads_user (user_id, created_at),
  KEY ix_downloads_book (book_id, created_at),
  CONSTRAINT fk_downloads_user  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE SET NULL,
  CONSTRAINT fk_downloads_book  FOREIGN KEY (book_id)  REFERENCES books (id),
  CONSTRAINT fk_downloads_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Engagement
-- ---------------------------------------------------------------------

CREATE TABLE wishlists (
  user_id     INT UNSIGNED NOT NULL,
  book_id     INT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id),
  KEY ix_wishlists_book (book_id),
  CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlists_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Only members who own a book may review it (enforced by the API)
CREATE TABLE reviews (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  book_id       INT UNSIGNED NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  title         VARCHAR(120) NULL,
  body          TEXT NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  moderated_by  INT UNSIGNED NULL,
  moderated_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_user_book (user_id, book_id),
  KEY ix_reviews_book_status (book_id, status, created_at),
  KEY ix_reviews_status (status, created_at),
  CONSTRAINT fk_reviews_user      FOREIGN KEY (user_id)      REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_book      FOREIGN KEY (book_id)      REFERENCES books (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_moderator FOREIGN KEY (moderated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per recipient (announcements are fanned out when sent)
CREATE TABLE notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  type        VARCHAR(40)  NOT NULL,                             -- order_paid, review_approved, announcement…
  title       VARCHAR(160) NOT NULL,
  body        VARCHAR(500) NULL,
  link        VARCHAR(255) NULL,
  read_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_notifications_user (user_id, read_at, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "Have a book to publish?" contact form
CREATE TABLE publish_enquiries (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL,
  phone       VARCHAR(20)  NULL,
  book_title  VARCHAR(255) NOT NULL,
  genre       VARCHAR(80)  NULL,
  stage       VARCHAR(60)  NULL,
  message     TEXT NOT NULL,
  status      ENUM('new','contacted','closed') NOT NULL DEFAULT 'new',
  ip_address  VARCHAR(45) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_enquiries_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------

-- Fixed-window rate limiting, e.g. key 'login:203.0.113.5:user@mail.com'
CREATE TABLE rate_limits (
  rl_key        VARCHAR(190) NOT NULL,
  hits          INT UNSIGNED NOT NULL DEFAULT 0,
  window_start  DATETIME NOT NULL,
  PRIMARY KEY (rl_key),
  KEY ix_rate_limits_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_audit_log (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id     INT UNSIGNED NULL,
  action       VARCHAR(60) NOT NULL,                              -- book.create, order.refund, review.approve…
  entity_type  VARCHAR(40) NOT NULL,
  entity_id    VARCHAR(64) NULL,
  details      JSON NULL,
  ip_address   VARCHAR(45) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_admin (admin_id, created_at),
  KEY ix_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
