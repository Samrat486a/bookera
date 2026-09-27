"""
Phase 5 authentication tests — runs against your local XAMPP API.

    npm run backend:test

Needs: XAMPP Apache + MySQL running, `npm run backend:sync` done.
Creates throwaway accounts ending in @example.test and deletes them afterwards
(also clears the rate_limits table). LOCAL USE ONLY — never point this at production.
"""
import json, re, time, urllib.request, urllib.error, http.cookiejar, subprocess
BASE = "http://localhost/bookera/api"
MYSQL = ["/Applications/XAMPP/xamppfiles/bin/mysql", "--no-defaults", "-uroot", "-h127.0.0.1", "-P3306", "bookera", "-N", "-e"]
MAIL_LOG = "/Applications/XAMPP/xamppfiles/bookera_app/storage/logs/mail.log"
passed = failed = 0

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = None
    def req(self, method, path, body=None, csrf=True, origin="http://localhost:5173"):
        h = {"Accept": "application/json"}
        if origin: h["Origin"] = origin
        data = None
        if body is not None:
            data = json.dumps(body).encode(); h["Content-Type"] = "application/json"
        if csrf and self.csrf: h["X-CSRF-Token"] = self.csrf
        r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
        t = time.perf_counter()
        try:
            resp = self.op.open(r); code = resp.status; raw = resp.read()
        except urllib.error.HTTPError as e:
            code = e.code; raw = e.read()
        self.elapsed = time.perf_counter() - t
        try: j = json.loads(raw)
        except Exception: j = {"raw": raw[:120]}
        tok = (j.get("data") or {}).get("csrfToken") if isinstance(j, dict) else None
        if tok: self.csrf = tok
        return code, j
    def session(self): return self.req("GET", "/auth/session.php")

def check(label, cond, detail=""):
    global passed, failed
    if cond: passed += 1; print(f"  ✓ {label}")
    else: failed += 1; print(f"  ✗ {label}  {detail}")

def sql(q): return subprocess.run(MYSQL + [q], capture_output=True, text=True).stdout.strip()

sql("DELETE FROM users WHERE email LIKE '%@example.test'; DELETE FROM rate_limits;")
A = {"name": "Riya Sen", "email": "riya@example.test", "phone": "+91 98765 43210", "password": "Reading-2026!"}

print("REGISTRATION")
a = Client(); code, j = a.session()
check("guest session → user null + CSRF token", code == 200 and j["data"]["user"] is None and len(j["data"]["csrfToken"]) == 64)
b = Client(); b.session(); b.csrf = None
code, j = b.req("POST", "/auth/register.php", A, csrf=False)
check("register without CSRF token → 403 CSRF_INVALID", code == 403 and j.get("code") == "CSRF_INVALID", j)
code, j = a.req("POST", "/auth/register.php", A, origin="https://evil.example")
check("register from a foreign website → 403", code == 403 and j.get("code") == "BAD_ORIGIN", j)
code, j = a.req("POST", "/auth/register.php", {"name": "R", "email": "nope", "phone": "12", "password": "password123"})
check("invalid fields → 422 with a message per field", code == 422 and set(j.get("errors", {})) == {"name", "email", "phone", "password"}, j)
code, j = a.req("POST", "/auth/register.php", {**A, "name": "<script>alert(1)</script>"})
check("HTML/script in name rejected", code == 422 and "name" in j.get("errors", {}), j)
code, j = a.req("POST", "/auth/register.php", A)
check("valid registration → 201, signed in as reader", code == 201 and j["data"]["user"]["email"] == A["email"] and j["data"]["user"]["role"] == "reader", j)
check("phone normalised to +919876543210", j["data"]["user"]["phone"] == "+919876543210", j["data"]["user"]["phone"])
check("password stored as bcrypt hash, never plain", sql(f"SELECT password_hash FROM users WHERE email='{A['email']}'").startswith("$2y$"))
check("response never contains password hash", "password" not in json.dumps(j).lower().replace("password has been", ""))
code, j = a.session()
check("session now shows the member", j["data"]["user"] and j["data"]["user"]["email"] == A["email"])
c = Client(); c.session()
code, j = c.req("POST", "/auth/register.php", {**A, "email": "RIYA@example.test"})
check("duplicate email (any case) → 409 ACCOUNT_EXISTS", code == 409 and j.get("code") == "ACCOUNT_EXISTS", j)

print("LOGIN / LOGOUT")
code, j = a.req("POST", "/auth/logout.php")
check("logout → 200", code == 200)
code, j = a.session()
check("after logout: not signed in", j["data"]["user"] is None)
code, j = a.req("POST", "/auth/login.php", {"email": A["email"], "password": "wrong-password"})
t_wrong = a.elapsed
check("wrong password → 401 generic message", code == 401 and j["message"] == "Incorrect email or password.", j)
code, j = a.req("POST", "/auth/login.php", {"email": "nobody@example.test", "password": "whatever-123"})
t_none = a.elapsed
check("unknown email → identical 401 message", code == 401 and j["message"] == "Incorrect email or password.", j)
check(f"similar timing for both ({t_wrong*1000:.0f}ms vs {t_none*1000:.0f}ms) — can't detect accounts", abs(t_wrong - t_none) < 0.08)
code, j = a.req("POST", "/auth/login.php", {"email": "' OR '1'='1", "password": "' OR '1'='1"})
check("SQL injection attempt → 401, no bypass", code == 401, j)
code, j = a.req("POST", "/auth/login.php", {"email": "  RIYA@EXAMPLE.TEST ", "password": A["password"]})
check("correct login (email case/spaces ignored) → 200", code == 200 and j["data"]["user"]["email"] == A["email"], j)
check("last_login_at recorded", sql(f"SELECT last_login_at IS NOT NULL FROM users WHERE email='{A['email']}'") == "1")

print("RATE LIMITING")
v = Client(); v.session()
codes = [v.req("POST", "/auth/login.php", {"email": A["email"], "password": f"bad-{i}"})[0] for i in range(6)]
check(f"5 wrong passwords → 401, 6th → 429 (got {codes})", codes[:5] == [401]*5 and codes[5] == 429)
code, j = v.req("POST", "/auth/login.php", {"email": A["email"], "password": A["password"]})
check("even the right password is refused while locked", code == 429, j)
sql("DELETE FROM rate_limits;")

print("PROFILE (own data only)")
g = Client(); g.session()
code, j = g.req("GET", "/users/profile.php")
check("profile without login → 401", code == 401 and j.get("code") == "UNAUTHENTICATED")
code, j = a.req("GET", "/users/profile.php")
check("profile when signed in → 200", code == 200 and j["data"]["user"]["name"] == "Riya Sen")
other_id = sql("INSERT INTO users (name,email,password_hash) VALUES ('Other','other@example.test','x'); SELECT LAST_INSERT_ID();")
code, j = a.req("POST", "/users/update-profile.php", {"id": int(other_id), "name": "Riya S.", "phone": "9876500000", "bio": "Loves sci-fi", "readingInterests": ["Fiction", "Science", "Fiction"]})
check("update profile → 200, own record changed", code == 200 and j["data"]["user"]["name"] == "Riya S." and j["data"]["user"]["readingInterests"] == ["Fiction", "Science"], j)
check("sending another user's id is ignored", sql(f"SELECT name FROM users WHERE id={other_id}") == "Other")
code, j = a.req("POST", "/users/update-profile.php", {"name": "Riya S.", "email": "new@example.test"})
check("email change without current password → 422", code == 422 and "currentPassword" in j.get("errors", {}), j)

print("FORGOT / RESET PASSWORD")
before = open(MAIL_LOG).read() if __import__("os").path.exists(MAIL_LOG) else ""
code1, j1 = g.req("POST", "/auth/forgot-password.php", {"email": A["email"]})
code2, j2 = g.req("POST", "/auth/forgot-password.php", {"email": "ghost@example.test"})
check("same answer for existing and unknown email", code1 == code2 == 200 and j1["message"] == j2["message"])
log = open(MAIL_LOG).read()[len(before):]
m = re.search(r"reset-password\?token=([a-f0-9]{64})", log)
check("reset email written to mail.log with a one-time link", bool(m) and "riya@example.test" in log and "ghost@" not in log)
token = m.group(1)
check("only a SHA-256 hash of the token is stored", sql(f"SELECT COUNT(*) FROM password_resets WHERE token_hash = SHA2('{token}',256)") == "1" and sql(f"SELECT COUNT(*) FROM password_resets WHERE token_hash = '{token}'") == "0")
other_device = Client(); other_device.session()
other_device.req("POST", "/auth/login.php", {"email": A["email"], "password": A["password"]})
check("second device signed in", other_device.req("GET", "/users/profile.php")[0] == 200)
code, j = g.req("POST", "/auth/reset-password.php", {"token": "0"*64, "password": "New-Secret-42"})
check("wrong token → 400", code == 400 and j.get("code") == "RESET_TOKEN_INVALID")
code, j = g.req("POST", "/auth/reset-password.php", {"token": token, "password": "New-Secret-42"})
check("valid token → password updated + signed in", code == 200 and j["data"]["user"]["email"] == A["email"], j)
code, j = g.req("POST", "/auth/reset-password.php", {"token": token, "password": "Another-Secret-43"})
check("same link can't be used twice", code == 400)
check("other device was signed out by the reset", other_device.req("GET", "/users/profile.php")[0] == 401)
n = Client(); n.session()
check("old password no longer works", n.req("POST", "/auth/login.php", {"email": A["email"], "password": A["password"]})[0] == 401)
check("new password works", n.req("POST", "/auth/login.php", {"email": A["email"], "password": "New-Secret-42"})[0] == 200)
g.req("POST", "/auth/forgot-password.php", {"email": A["email"]})
tok2 = re.findall(r"token=([a-f0-9]{64})", open(MAIL_LOG).read())[-1]
sql("UPDATE password_resets SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE used_at IS NULL")
check("expired link (after 60 min) refused", g.req("POST", "/auth/reset-password.php", {"token": tok2, "password": "Late-Secret-44"})[0] == 400)

print("CHANGE PASSWORD / BLOCKED ACCOUNT")
code, j = n.req("POST", "/users/change-password.php", {"currentPassword": "nope", "newPassword": "Fresh-Secret-55"})
check("wrong current password → 422", code == 422 and "currentPassword" in j.get("errors", {}))
code, j = n.req("POST", "/users/change-password.php", {"currentPassword": "New-Secret-42", "newPassword": "Fresh-Secret-55"})
check("change password → 200, stays signed in", code == 200 and n.req("GET", "/users/profile.php")[0] == 200, j)
sql(f"UPDATE users SET status='blocked' WHERE email='{A['email']}'")
check("blocked member's existing session stops working", n.req("GET", "/users/profile.php")[0] == 401)
m2 = Client(); m2.session()
code, j = m2.req("POST", "/auth/login.php", {"email": A["email"], "password": "Fresh-Secret-55"})
check("blocked member can't sign in → 403", code == 403 and j.get("code") == "ACCOUNT_BLOCKED", j)

print("COOKIE FLAGS")
ck = [c for c in m2.jar][0]
check(f"session cookie '{ck.name}' is HttpOnly + SameSite=Lax", ck.has_nonstandard_attr("HttpOnly") and (ck.get_nonstandard_attr("SameSite") or "").lower() == "lax", ck.__dict__)

sql("DELETE FROM users WHERE email LIKE '%@example.test'; DELETE FROM rate_limits;")
print(f"\n{passed} passed, {failed} failed — test accounts removed")
