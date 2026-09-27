#!/usr/bin/env bash
# Copies the backend into XAMPP so Apache can serve it.
#   npm run backend:sync
#
#   backend/public/  →  $XAMPP/htdocs/bookera/api/     (web-accessible:  http://localhost/bookera/api/)
#   backend/app/     →  $XAMPP/bookera_app/            (private: outside htdocs, like on Hostinger)
#
# Uploaded files (app/storage, public/uploads) and logs are never deleted by a sync.
set -euo pipefail

XAMPP="${XAMPP_DIR:-/Applications/XAMPP/xamppfiles}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_DEST="$XAMPP/htdocs/bookera/api"
APP_DEST="$XAMPP/bookera_app"

[ -d "$XAMPP/htdocs" ] || { echo "XAMPP not found at $XAMPP (set XAMPP_DIR)"; exit 1; }
[ -f "$ROOT/backend/app/config/config.php" ] || { echo "Missing backend/app/config/config.php — copy config.sample.php first"; exit 1; }

mkdir -p "$API_DEST" "$APP_DEST/storage"
rsync -a --delete --exclude 'uploads/covers/*' "$ROOT/backend/public/" "$API_DEST/"
rsync -a --delete --exclude 'storage/' "$ROOT/backend/app/" "$APP_DEST/"
rsync -a --ignore-existing "$ROOT/backend/app/storage/" "$APP_DEST/storage/"
mkdir -p "$APP_DEST/storage/books" "$APP_DEST/storage/logs" "$APP_DEST/storage/tmp" "$API_DEST/uploads/covers"

# Apache in XAMPP runs as user "daemon", so it needs write access to these
# folders for logs and uploads (files Apache creates itself stay its own). (Local machine only — Hostinger runs PHP as your user.)
find "$APP_DEST/storage" "$API_DEST/uploads" -type d -exec chmod a+rwx {} + 2>/dev/null || true

echo "✓ Backend synced to XAMPP"
echo "  API:     http://localhost/bookera/api/"
echo "  Private: $APP_DEST"
