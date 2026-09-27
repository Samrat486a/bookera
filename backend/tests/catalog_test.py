"""
Phase 7 catalogue tests — runs against your local XAMPP API.

    npm run backend:test:catalog

Creates a throwaway admin (@example.test) and a test book, then removes both
(and their uploaded files). LOCAL USE ONLY — never point this at production.
"""
import io, json, os, subprocess, time, uuid, zipfile, urllib.request, urllib.error, http.cookiejar

BASE = "http://localhost/bookera/api"
MYSQL = ["/Applications/XAMPP/xamppfiles/bin/mysql", "--no-defaults", "-uroot", "-h127.0.0.1", "-P3306", "bookera", "-N", "-e"]
PHP = "/Applications/XAMPP/xamppfiles/bin/php"
XAMPP_UPLOADS = "/Applications/XAMPP/xamppfiles/htdocs/bookera/api/uploads/covers"
passed = failed = 0

def sql(q): return subprocess.run(MYSQL + [q], capture_output=True, text=True).stdout.strip()

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = None
    def _send(self, method, path, data=None, headers=None):
        h = {"Accept": "application/json", "Origin": "http://localhost:5173", **(headers or {})}
        if self.csrf and method == "POST": h["X-CSRF-Token"] = self.csrf
        r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
        try:
            resp = self.op.open(r); code, raw = resp.status, resp.read()
        except urllib.error.HTTPError as e:
            code, raw = e.code, e.read()
        try: j = json.loads(raw)
        except Exception: j = {"raw": raw[:80]}
        tok = (j.get("data") or {}).get("csrfToken") if isinstance(j, dict) and isinstance(j.get("data"), dict) else None
        if tok: self.csrf = tok
        return code, j
    def get(self, path): return self._send("GET", path)
    def post(self, path, body=None): return self._send("POST", path, json.dumps(body or {}).encode(), {"Content-Type": "application/json"})
    def upload(self, path, fields, file_field, filename, content, ctype):
        b = "----bk" + uuid.uuid4().hex
        parts = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items()]
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{filename}"\r\nContent-Type: {ctype}\r\n\r\n'.encode() + content + b"\r\n")
        parts.append(f"--{b}--\r\n".encode())
        return self._send("POST", path, b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={b}"})

def check(label, cond, detail=""):
    global passed, failed
    if cond: passed += 1; print(f"  ✓ {label}")
    else: failed += 1; print(f"  ✗ {label}  {str(detail)[:220]}")

# ---- test files
png = subprocess.run([PHP, "-r", '$i=imagecreatetruecolor(600,900);imagefill($i,0,0,imagecolorallocate($i,54,84,255));ob_start();imagepng($i);echo ob_get_clean();'], capture_output=True).stdout
pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 400]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
ebuf = io.BytesIO()
with zipfile.ZipFile(ebuf, "w") as z:
    z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
    z.writestr("META-INF/container.xml", "<container/>")
epub = ebuf.getvalue()
php_payload = b"<?php echo 'pwned'; ?>"

sql("DELETE FROM users WHERE email LIKE '%@example.test'; DELETE FROM rate_limits;")

print("PUBLIC CATALOGUE")
g = Client()
code, j = g.get("/books/list.php?per_page=100")
books = j["data"]["books"]; total = j["data"]["pagination"]["total"]
db_published = int(sql("SELECT COUNT(*) FROM books WHERE status='published' AND deleted_at IS NULL"))
check(f"list returns only published books ({total} = database {db_published})", code == 200 and total == db_published and all(b["status"] == "published" for b in books))
b0 = books[0]
check("book shape matches the React app (slug id, price in ₹, cover, author)", isinstance(b0["id"], str) and "dbId" in b0 and isinstance(b0["price"], (int, float)) and "cover" in b0 and b0["authorName"])
check("private fields never exposed publicly (file name/size)", all("fileName" not in b and "hasFile" not in b for b in books))
code, j = g.get("/books/list.php?q=javascript")
check("search 'javascript' finds Modern JavaScript Development", any(b["id"] == "modern-javascript-development" for b in j["data"]["books"]))
code, j = g.get("/books/list.php?q=alex%20morgan")
check("search by author name works", j["data"]["pagination"]["total"] >= 1 and all(b["authorName"] == "Alex Morgan" for b in j["data"]["books"]))
code, j = g.get("/books/list.php?category=fiction")
check("category filter (by slug)", j["data"]["books"] and all(b["category"] == "Fiction" for b in j["data"]["books"]))
code, j = g.get("/books/list.php?price=free")
check("free filter", j["data"]["books"] and all(b["price"] == 0 for b in j["data"]["books"]))
code, j = g.get("/books/list.php?sort=price_desc&per_page=100")
prices = [b["price"] for b in j["data"]["books"]]
check("sort by price (high → low)", prices == sorted(prices, reverse=True))
code, j = g.get("/books/list.php?per_page=5&page=2")
check("pagination (5 per page, page 2)", len(j["data"]["books"]) == 5 and j["data"]["pagination"]["page"] == 2)
code, j = g.get("/books/list.php?q=%27%20OR%201%3D1%20--")
check("SQL injection in search → no results, no error", code == 200 and j["data"]["pagination"]["total"] == 0)
code, j = g.get("/books/list.php?sort=id;DROP%20TABLE%20books")
check("unknown sort value falls back safely", code == 200 and int(sql("SELECT COUNT(*) FROM books")) > 0)
code, j = g.get("/books/details.php?slug=the-lantern-house")
check("details: book + related titles", code == 200 and j["data"]["book"]["title"] == "The Lantern House" and len(j["data"]["related"]) >= 1)
draft_slug = sql("SELECT slug FROM books WHERE status='draft' LIMIT 1")
check("details: drafts are not visible to the public → 404", g.get(f"/books/details.php?slug={draft_slug}")[0] == 404)
code, j = g.get("/categories/list.php")
check("categories with book counts", code == 200 and len(j["data"]["categories"]) == 12 and sum(c["bookCount"] for c in j["data"]["categories"]) == db_published)
code, j = g.get("/authors/list.php")
check("authors list", code == 200 and len(j["data"]["authors"]) >= 10)

print("ADMIN ACCESS CONTROL")
g.get("/auth/session.php")
check("guest → admin list 401", g.get("/admin/books/list.php")[0] == 401)
reader = Client(); reader.get("/auth/session.php")
reader.post("/auth/register.php", {"name": "Reader Test", "email": "reader@example.test", "phone": "9876543210", "password": "Reader-Pass-1"})
check("reader → admin list 403", reader.get("/admin/books/list.php")[0] == 403)
check("reader can't create books → 403", reader.post("/admin/books/create.php", {"title": "Hack"})[0] == 403)
admin = Client(); admin.get("/auth/session.php")
admin.post("/auth/register.php", {"name": "Admin Test", "email": "admin@example.test", "phone": "9876543211", "password": "Admin-Pass-1"})
sql("UPDATE users SET role='admin' WHERE email='admin@example.test'")
code, j = admin.get("/admin/books/list.php")
check("admin sees every book incl. drafts", code == 200 and any(b["status"] == "draft" for b in j["data"]["books"]))
check("admin list includes file status", all("hasFile" in b for b in j["data"]["books"]))
nocsrf = Client(); nocsrf.jar = admin.jar
check("admin POST without CSRF token → 403", nocsrf.post("/admin/books/create.php", {"title": "x"})[0] == 403)

print("CREATE → UPLOAD → PUBLISH → EDIT → DELETE")
code, j = admin.post("/admin/books/create.php", {"title": "", "price": -5, "isbn": "12"})
check("invalid book → 422 with field messages", code == 422 and {"title", "category", "author", "description", "pages", "price", "isbn"} <= set(j.get("errors", {})), j.get("errors"))
payload = {"title": "Test Driven Reading", "subtitle": "A phase 7 test", "category": "Programming", "author": "Casey Test", "authorBio": "Writes tests.",
           "description": "A short description that is long enough to pass validation.", "longDescription": "Long text.",
           "pages": 120, "format": "PDF", "language": "English", "level": "Beginner", "publishedAt": "2026-09-01", "price": 249,
           "isbn": "978-0-00-000000-2", "tags": ["Testing", "testing", "PHP"], "learn": ["One", "Two"], "status": "published",
           "cover": {"bg": "#14171B", "fg": "#F6F4EE", "accent": "#FFAE1F", "pattern": "code"}}
code, j = admin.post("/admin/books/create.php", payload)
book = j.get("data", {}).get("book", {})
check("create → 201, saved as draft even if 'published' was asked", code == 201 and book.get("status") == "draft", j)
check("slug generated from title", book.get("id") == "test-driven-reading")
check("price stored in paise (₹249 → 24900)", sql(f"SELECT price_paise FROM books WHERE id={book.get('dbId')}") == "24900")
check("new author created automatically", sql("SELECT COUNT(*) FROM authors WHERE name='Casey Test'") == "1")
check("tags de-duplicated & lower-cased", book.get("tags") == ["testing", "php"], book.get("tags"))
bid = book["dbId"]
code, j = admin.post("/admin/books/status.php", {"id": bid, "status": "published"})
check("publish without an e-book file → 422 FILE_REQUIRED", code == 422 and j.get("code") == "FILE_REQUIRED")
code, j = admin.upload("/admin/books/upload-cover.php", {"id": bid}, "cover", "cover.png", php_payload, "image/png")
check("PHP code disguised as .png → rejected", code == 415, j)
code, j = admin.upload("/admin/books/upload-cover.php", {"id": bid}, "cover", "cover.png", png, "image/png")
cover_url = j.get("data", {}).get("book", {}).get("coverImage") or ""
check("real PNG cover → re-encoded and stored", code == 200 and cover_url.startswith("/api/uploads/covers/") and cover_url.endswith((".jpg", ".webp")), j)
with urllib.request.urlopen("http://localhost/bookera" + cover_url) as r:
    check("cover is publicly served as an image", r.status == 200 and r.headers["Content-Type"].startswith("image/"))
code, j = admin.upload("/admin/books/upload-file.php", {"id": bid}, "file", "book.pdf", b"just some text, not a pdf", "application/pdf")
check("text file renamed .pdf → rejected by content check", code == 415, j)
code, j = admin.upload("/admin/books/upload-file.php", {"id": bid}, "file", "book.epub", epub, "application/epub+zip")
check("real EPUB accepted, format switches to EPUB", code == 200 and j["data"]["book"]["format"] == "EPUB" and j["data"]["book"]["hasFile"], j)
epub_name = j.get("data", {}).get("book", {}).get("fileName")
code, j = admin.upload("/admin/books/upload-file.php", {"id": bid}, "file", "book.pdf", pdf, "application/pdf")
fname = j.get("data", {}).get("book", {}).get("fileName")
check("real PDF accepted (replaces the EPUB), stored privately", code == 200 and j["data"]["book"]["format"] == "PDF" and fname and fname.endswith(".pdf"), j)
try:
    urllib.request.urlopen("http://localhost/bookera_app/storage/books/" + fname); private_reachable = True
except urllib.error.HTTPError: private_reachable = False
check("private e-book NOT reachable by URL (it's outside the web folder)", not private_reachable)
try:
    urllib.request.urlopen("http://localhost/bookera/api/uploads/" + fname); reachable = True
except urllib.error.HTTPError: reachable = False
check("e-book not in the public uploads folder", not reachable)
STORAGE = "/Applications/XAMPP/xamppfiles/bookera_app/storage/books"
check("old EPUB file deleted from storage when replaced", epub_name and not os.path.exists(os.path.join(STORAGE, epub_name)) and os.path.exists(os.path.join(STORAGE, fname)))
code, j = admin.post("/admin/books/status.php", {"id": bid, "status": "published"})
check("publish with file → live", code == 200 and j["data"]["book"]["status"] == "published", j)
check("now visible in the public catalogue", g.get("/books/details.php?slug=test-driven-reading")[0] == 200)
code, j = admin.post("/admin/books/update.php", {**payload, "id": bid, "title": "Test Driven Reading, 2nd Edition", "price": 0, "status": "published"})
check("edit: title changed, URL slug kept, now free", code == 200 and j["data"]["book"]["id"] == "test-driven-reading" and j["data"]["book"]["price"] == 0 and sql(f"SELECT is_free FROM books WHERE id={bid}") == "1", j)
code, j = admin.post("/admin/books/status.php", {"id": bid, "available": False})
check("disable purchases (Currently unavailable)", code == 200 and j["data"]["book"]["available"] is False)
code, j = admin.post("/admin/books/create.php", {**payload, "title": "Dup ISBN"})
check("duplicate ISBN refused → 409", code == 409 and j.get("code") == "DUPLICATE_ISBN")
code, j = admin.post("/admin/books/delete.php", {"id": bid})
check("delete → soft-deleted", code == 200 and sql(f"SELECT deleted_at IS NOT NULL FROM books WHERE id={bid}") == "1")
check("deleted book gone from public catalogue", g.get("/books/details.php?slug=test-driven-reading")[0] == 404)
check("deleted book gone from admin list", not any(b["dbId"] == bid for b in admin.get("/admin/books/list.php")[1]["data"]["books"]))
check("every admin action recorded in the audit log", int(sql(f"SELECT COUNT(*) FROM admin_audit_log WHERE entity_id='{bid}'")) >= 7)

print("UPLOAD FOLDER HARDENING")
evil = os.path.join(XAMPP_UPLOADS, "evil.php")
try:
    with open(evil, "w") as f: f.write("<?php echo 'EXECUTED'; ?>")
    try:
        with urllib.request.urlopen("http://localhost/bookera/api/uploads/covers/evil.php") as r: body = r.read().decode(); status = r.status
    except urllib.error.HTTPError as e: body, status = "", e.code
    check(f"a .php file placed in uploads is never executed (HTTP {status})", "EXECUTED" not in body and status == 403)
finally:
    if os.path.exists(evil): os.remove(evil)

# ---- cleanup
cover_file = cover_url.rsplit("/", 1)[-1]
for p in [os.path.join(XAMPP_UPLOADS, cover_file)]:
    if cover_file and os.path.exists(p): os.remove(p)
sql(f"DELETE FROM admin_audit_log WHERE entity_type='book' AND entity_id='{bid}'; DELETE FROM books WHERE id={bid}; DELETE FROM authors WHERE name='Casey Test'; DELETE FROM users WHERE email LIKE '%@example.test'; DELETE FROM rate_limits;")
if fname and os.path.exists(os.path.join(STORAGE, fname)): os.remove(os.path.join(STORAGE, fname))
print(f"\n{passed} passed, {failed} failed — test admin, book, cover and e-book file removed")
