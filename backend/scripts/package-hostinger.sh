#!/usr/bin/env bash
# Builds everything Hostinger needs into hostinger-upload/ (git-ignored).
#   npm run deploy:package -- yourdomain.com
#
#   hostinger-upload/
#   ├── public_html.zip   → extract INSIDE  public_html/          (React site + api/)
#   ├── bookera_app.zip   → extract NEXT TO public_html/          (private backend)
#   └── (the same two folders unzipped, to inspect or upload by FTP)
#
# A production config.php is generated with a fresh secret key. The database
# values are placeholders — fill them in on Hostinger once the database exists.
# Uploaded covers, e-book files, logs and your local config are never included.
set -euo pipefail

DOMAIN="${1:-}"
DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#www.}"; DOMAIN="${DOMAIN%%/*}"
if [[ ! "$DOMAIN" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]]; then
  echo "Usage: npm run deploy:package -- yourdomain.com"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/hostinger-upload"
cd "$ROOT"

echo "→ Building the React site (live mode)…"
VITE_API_MODE=live VITE_API_BASE=/api npm run build >/dev/null

rm -rf "$OUT"
mkdir -p "$OUT/public_html/api" "$OUT/bookera_app"

echo "→ Collecting files…"
# 1. React build → public_html/
rsync -a --exclude '.DS_Store' "$ROOT/dist/" "$OUT/public_html/"
# 2. Public API → public_html/api/   (no uploaded covers)
rsync -a --exclude '.DS_Store' --exclude 'uploads/covers/*' "$ROOT/backend/public/" "$OUT/public_html/api/"
mkdir -p "$OUT/public_html/api/uploads/covers"
# 3. Private backend → bookera_app/   (no secrets, no uploaded files, no logs)
rsync -a --exclude '.DS_Store' \
  --exclude 'config/config.php' \
  --exclude 'storage/books/*' --exclude 'storage/logs/*' --exclude 'storage/tmp/*' --exclude 'storage/sessions/' \
  "$ROOT/backend/app/" "$OUT/bookera_app/"
mkdir -p "$OUT/bookera_app/storage/books" "$OUT/bookera_app/storage/logs" "$OUT/bookera_app/storage/tmp" "$OUT/bookera_app/storage/sessions"

# 4. Production config.php from the sample
python3 - "$ROOT/backend/app/config/config.sample.php" "$OUT/bookera_app/config/config.php" "$DOMAIN" <<'PY'
import re, secrets, sys
src, dst, domain = sys.argv[1:]
s = open(src, encoding='utf-8').read()
def put(key, value):
    global s
    s, n = re.subn(r"('" + key + r"'\s*=>\s*)[^,\n]+,", lambda m: m.group(1) + value + ",", s, count=1)
    assert n == 1, key
put('env', "'production'")
put('debug', 'false')
put('app_url', f"'https://{domain}'")
s = re.sub(r"'cors_allowed_origins'\s*=>\s*\[[^\]]*\]", f"'cors_allowed_origins' => ['https://{domain}', 'https://www.{domain}']", s)
put('host', "'localhost'")
put('name', "'FILL_IN_DATABASE_NAME'   /* hPanel → Databases, e.g. u123456789_bookera */")
put('user', "'FILL_IN_DATABASE_USER'   /* e.g. u123456789_bookera */")
put('pass', "'FILL_IN_DATABASE_PASSWORD'")
put('app_key', f"'{secrets.token_hex(32)}'")
put('cookie_secure', 'true')
put('from_email', f"'books@{domain}'")
put('smtp_user', f"'books@{domain}'")
put('log_only', 'false')
s = re.sub(r"[ \t]*// XAMPP default[^\n]*", "", s)
open(dst, 'w', encoding='utf-8').write(s)
PY
chmod 600 "$OUT/bookera_app/config/config.php"

echo "→ Zipping…"
(cd "$OUT/public_html" && zip -rqX "$OUT/public_html.zip" .)
(cd "$OUT" && zip -rqX "$OUT/bookera_app.zip" bookera_app)

echo
echo "✓ Ready for Hostinger (https://$DOMAIN) in hostinger-upload/"
echo "  public_html.zip  → upload to public_html/ and Extract there"
echo "  bookera_app.zip  → upload to the folder that CONTAINS public_html and Extract there"
echo "  Then edit bookera_app/config/config.php → database name, user, password."
