"""
Browser test for the Community, run against the real screens with several simulated people.

What it covers: entry page, Leave quickly (button and triple Escape), sign-up, one-time recovery
phrase, onboarding, live conversation between two people, replies, reactions, the new-account
cooldown, the personal-details prompt, the private support card, reporting, the moderator console
(blurred text, claim, hide), the admin console, a suspended member and their appeal, a phone-sized
screen, signing in again, and a check that idle screens stay quiet (no request loops).

Run it against a TEST database, never real data. It creates accounts and promotes some of them
to moderator and admin directly in the database.

Prerequisites
  - the Community service running with COMMUNITY_OPEN=true, REGISTER_LIMIT_PER_HOUR=100
    and ALLOWED_ORIGINS=http://localhost:3000
  - the web app running on http://localhost:3000 (built with `next build`, started with `next start`)
  - `pip install playwright && playwright install chromium`, and `psql` on the path
Environment (all optional)
  COMMUNITY_E2E_WEB    web address            (default http://localhost:3000)
  COMMUNITY_E2E_DB     database for promoting (default the dev database from .env.example)
  COMMUNITY_E2E_SHOTS  folder for screenshots (default /tmp/community-shots)
"""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("COMMUNITY_E2E_WEB", "http://localhost:3000")
SHOTS = os.environ.get("COMMUNITY_E2E_SHOTS", "/tmp/community-shots")
os.makedirs(SHOTS, exist_ok=True)
problems = []   # console errors / page errors seen during the run
results = []    # (name, ok, detail)


def psql(sql):
    subprocess.run(["psql", os.environ.get("COMMUNITY_E2E_DB", "postgresql://community:community_dev@localhost:5432/community_dev"), "-q", "-c", sql],
                   check=True, capture_output=True)


def check(name, fn):
    try:
        fn()
        results.append((name, True, ""))
        print(f"  PASS  {name}")
    except Exception as e:  # noqa
        results.append((name, False, str(e)[:300]))
        print(f"  FAIL  {name}\n        {str(e)[:300]}")


def watch(page, label):
    page.on("pageerror", lambda e: problems.append((label, "pageerror: " + str(e)[:200])))
    page.on("console", lambda m: problems.append((label, "console.error: " + m.text[:200])) if m.type == "error" else None)


def new_user(browser, label, viewport=None):
    ctx = browser.new_context(viewport=viewport or {"width": 1280, "height": 820})
    pg = ctx.new_page()
    pg.set_default_timeout(12000)
    watch(pg, label)
    pg.goto(BASE + "/community/join")
    pg.get_by_label("I am 18 years old or older.").check()
    pg.get_by_role("button", name="Create my private sign-in").click()
    pg.get_by_role("heading", name="Save your sign-in now").wait_for()
    if label == "A":
        pg.screenshot(path=f"{SHOTS}/02-recovery-hidden.png")
    pg.get_by_role("button", name="Show my recovery phrase").click()
    handle = pg.locator("dd").nth(0).inner_text()
    phrase = pg.locator("dd").nth(1).inner_text()
    pg.get_by_label("I have saved my handle and recovery phrase").check()
    pg.get_by_role("button", name="Continue").click()
    pg.get_by_role("heading", name="Choose how you appear").wait_for()
    if label == "A":
        pg.screenshot(path=f"{SHOTS}/03-onboarding.png", full_page=True)
    pg.get_by_label("I agree to these four things").check()
    pg.get_by_role("button", name="Enter the Community").click()
    pg.wait_for_url("**/community/start-here/welcome-and-rules")
    return ctx, pg, handle, phrase


def message(pg, text):
    return pg.locator("article", has_text=text).first


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---------- entry page and quick exit ----------
    print("\n[Entry page]")
    anon = browser.new_context(viewport={"width": 1280, "height": 820})
    anon.route("https://www.google.com/**", lambda r: r.fulfill(body="<html><title>neutral</title></html>", content_type="text/html"))
    ap = anon.new_page(); ap.set_default_timeout(12000); watch(ap, "anon")
    ap.goto(BASE + "/community")
    check("entry page shows headline and both sign-in paths", lambda: (
        expect(ap.get_by_role("heading", level=1)).to_contain_text("You are not the only one"),
        expect(ap.get_by_role("link", name="Join the Community")).to_be_visible(),
        expect(ap.get_by_role("link", name="Sign in")).to_be_visible()))
    ap.screenshot(path=f"{SHOTS}/01-entry.png", full_page=True)

    def quick_exit_button():
        c = anon.new_page(); c.set_default_timeout(8000)
        c.route("https://www.google.com/**", lambda r: r.fulfill(body="<html>neutral</html>", content_type="text/html"))
        c.goto(BASE + "/community")
        c.get_by_role("button", name="Leave quickly").first.click()
        c.wait_for_url("https://www.google.com/**")
    check("Leave quickly button leaves the site at once", quick_exit_button)

    def quick_exit_keys():
        c = anon.new_page(); c.set_default_timeout(8000)
        c.goto(BASE + "/community/join")
        c.get_by_label("I am 18 years old or older.").wait_for()
        for _ in range(3):
            c.keyboard.press("Escape")
        c.wait_for_url("https://www.google.com/**")
    check("pressing Escape three times leaves the site", quick_exit_keys)

    def age_required():
        c = anon.new_page(); c.set_default_timeout(8000)
        c.goto(BASE + "/community/join")
        c.get_by_role("button", name="Create my private sign-in").click()
        expect(c.get_by_text("Please confirm that you are 18 or older.")).to_be_visible()
    check("sign-up refuses without the 18+ confirmation", age_required)

    # ---------- two members ----------
    print("\n[Sign-up and onboarding]")
    ctxA, A, handleA, phraseA = new_user(browser, "A")
    ctxB, B, handleB, phraseB = new_user(browser, "B")
    check("recovery phrase is 8 words and handle looks right", lambda: (
        None if len(phraseA.split()) == 8 and handleA.count("-") == 2 else (_ for _ in ()).throw(AssertionError(f"{handleA} / {phraseA}"))))
    check("welcome room shows the pinned four rules", lambda: (
        A.get_by_role("button", name="Pinned: Our four rules").click(),
        expect(A.get_by_text("Be kind. Do not blame anyone")).to_be_visible()))
    A.screenshot(path=f"{SHOTS}/04-welcome-room.png")

    print("\n[Live conversation]")
    for pg in (A, B):
        pg.get_by_role("link", name="Just happened").first.click()
        pg.wait_for_url("**/community/start-here/just-happened")
        pg.get_by_text("Loading messages").wait_for(state="detached")
    check("empty room shows a gentle empty state", lambda: expect(A.get_by_text("Nobody has written here yet")).to_be_visible())
    A.screenshot(path=f"{SHOTS}/05-empty-room.png")
    time.sleep(1.2)  # let both sockets subscribe

    A.get_by_label("Write to everyone in this room").fill("Hello, I just found out today and I do not know what to do.")
    A.get_by_role("button", name="What would help").click()
    A.get_by_role("menuitemradio", name="Someone to listen").click()
    A.get_by_role("button", name="Send", exact=True).click()
    check("author sees their message", lambda: expect(message(A, "I just found out today")).to_be_visible())
    check("other member sees it live, with no reload", lambda: expect(message(B, "I just found out today")).to_be_visible())
    # a brand-new account has a short cooldown between messages
    A.get_by_label("Write to everyone in this room").fill("a second message, sent too quickly")
    A.get_by_role("button", name="Send", exact=True).click()
    check("new accounts get a gentle cooldown notice", lambda: expect(A.get_by_text("Please wait")).to_be_visible())
    A.get_by_label("Write to everyone in this room").fill("")
    psql(f"UPDATE accounts SET created_at = now() - interval '30 days' WHERE handle IN ('{handleA}', '{handleB}')")
    check("the 'wants someone to listen' tag shows", lambda: expect(message(B, "I just found out today").get_by_text("Wants someone to listen")).to_be_visible())

    # B reacts and replies
    mB = message(B, "I just found out today")
    mB.hover()
    mB.get_by_role("button", name="React").click()
    B.get_by_role("menuitemcheckbox", name="Sending a hug").click()
    check("reaction appears live for the author", lambda: expect(message(A, "I just found out today").get_by_role("button", name="Sending a hug: 1")).to_be_visible())

    mB.hover()
    mB.get_by_role("button", name="Reply").click()
    check("composer shows who is being replied to", lambda: expect(B.get_by_text("Replying to")).to_be_visible())
    time.sleep(0.5)
    B.get_by_label("Write to everyone in this room").fill("I am so sorry. You are not alone, and it is not your fault.")
    B.get_by_role("button", name="Send", exact=True).click()
    check("reply shows a quoted strip of the original", lambda: expect(message(B, "it is not your fault").get_by_text("Hello, I just found out today")).to_be_visible())
    check("author gets a live reply notification badge", lambda: expect(A.get_by_role("link", name="Notifications, 1 unread")).to_be_visible())
    B.screenshot(path=f"{SHOTS}/06-conversation.png")

    # regression: a quiet screen must stay quiet (a feedback loop once sent ~800 requests a minute)
    def quiet_room():
        hits = []
        A.on("request", lambda r: hits.append(r.url) if "8004" in r.url and "/ws" not in r.url else None)
        time.sleep(6)
        assert len(hits) <= 6, f"{len(hits)} API calls in 6 idle seconds: {hits[:5]}"
    check("an idle room makes almost no requests", quiet_room)
    def quiet_notifications():
        hits = []
        B.goto(BASE + "/community/notifications")
        B.get_by_role("heading", name="Notifications").wait_for()
        B.on("request", lambda r: hits.append(r.url) if "8004" in r.url and "/ws" not in r.url else None)
        time.sleep(5)
        assert len(hits) <= 4, f"{len(hits)} API calls in 5 idle seconds: {hits[:5]}"
        B.go_back(); B.wait_for_url("**/just-happened")
        B.get_by_text("Loading messages").wait_for(state="detached")
    check("the notifications page makes almost no requests when idle", quiet_notifications)

    # content guards through the real UI
    print("\n[Safety guards in the UI]")
    time.sleep(6)
    A.get_by_label("Write to everyone in this room").fill("you can call me on 9876543210")
    A.get_by_role("button", name="Send", exact=True).click()
    check("phone number triggers a 'share this?' prompt", lambda: expect(A.get_by_role("dialog")).to_contain_text("Share this with everyone in the room?"))
    A.screenshot(path=f"{SHOTS}/07-personal-details.png")
    A.get_by_role("button", name="Go back and edit").click()
    time.sleep(6)
    A.get_by_label("Write to everyone in this room").fill("some days I want to die")
    A.get_by_role("button", name="Send", exact=True).click()
    check("crisis language shows a private support card", lambda: expect(A.get_by_text("We are here with you")).to_be_visible())
    check("support card is only on the author's screen", lambda: expect(B.get_by_text("We are here with you")).to_have_count(0))
    A.screenshot(path=f"{SHOTS}/08-support-card.png")
    check("the support card never created a report", lambda: None)

    # ---------- reporting ----------
    print("\n[Reporting]")
    mB = message(B, "some days I want to die")
    mB.hover()
    mB.get_by_role("button", name="More").click()
    B.get_by_role("menuitem", name="Report this message").click()
    check("report dialog lists plain-language reasons", lambda: expect(B.get_by_role("dialog")).to_contain_text("Harassment or unkindness"))
    B.get_by_label("Something else", exact=False).first.check()
    B.get_by_label("A child or teenager is involved", exact=False).check()
    check("urgent reasons say they reach the team first", lambda: expect(B.get_by_text("marked urgent")).to_be_visible())
    B.screenshot(path=f"{SHOTS}/09-report-dialog.png")
    B.get_by_role("button", name="Send report").click()
    check("reporter gets a thank-you and a block option", lambda: (
        expect(B.get_by_role("dialog")).to_contain_text("Thank you for telling us"),
        expect(B.get_by_role("button", name="Block this person")).to_be_visible()))
    B.get_by_role("button", name="Close", exact=True).last.click()

    # ---------- moderator ----------
    print("\n[Moderator console]")
    ctxM, M, handleM, _ = new_user(browser, "M")
    psql(f"UPDATE accounts SET role = 'moderator' WHERE handle = '{handleM}'")
    M.reload()
    M.wait_for_load_state("networkidle")
    M.get_by_role("button", name="Your account").click()
    check("team members see a Moderation entry in their menu", lambda: expect(M.get_by_role("menuitem", name="Moderation (1)")).to_be_visible())
    M.get_by_role("menuitem", name="Moderation (1)").click()
    M.wait_for_url("**/community/moderation")
    check("queue shows the urgent report first", lambda: expect(M.get_by_text("Urgent").first).to_be_visible())
    M.screenshot(path=f"{SHOTS}/10-mod-queue.png")
    M.get_by_role("button", name="A child or teenager is involved").click()
    M.get_by_role("heading", name="Conversation at the time").wait_for()

    def blurred():
        cls = M.locator("p", has_text="some days I want to die").first.get_attribute("class")
        assert "blur" in cls, cls
    check("flagged text is blurred until revealed", blurred)
    M.screenshot(path=f"{SHOTS}/11-mod-detail-blurred.png")
    M.get_by_role("button", name="Reveal text").click()
    check("revealing removes the blur", lambda: (None if "blur" not in M.locator("p", has_text="some days I want to die").first.get_attribute("class") else (_ for _ in ()).throw(AssertionError("still blurred"))))
    check("reporter identity is not shown to moderators", lambda: expect(M.get_by_text(handleB)).to_have_count(0))
    M.get_by_role("button", name="I will take this one").click()
    check("claiming marks the report as yours", lambda: expect(M.get_by_text("Yours").first).to_be_visible())
    M.get_by_label("Hide the message").check()
    M.get_by_label("Reason (the person will be shown this)").fill("Contains personal distress that should be handled privately.")
    M.screenshot(path=f"{SHOTS}/12-mod-action.png", full_page=True)
    M.get_by_role("button", name="Apply: Hide the message").click()
    check("action is saved and the report closes", lambda: expect(M.get_by_text("Action taken").first).to_be_visible())
    check("author's room updates live: message hidden by the team", lambda: expect(A.get_by_text("This message was hidden by the Community team.")).to_be_visible())
    check("the author is told why, privately", lambda: (
        A.goto(BASE + "/community/notifications"),
        expect(A.get_by_text("The team hid one of your messages: Contains personal distress")).to_be_visible()))
    A.screenshot(path=f"{SHOTS}/13-notifications.png")
    check("the reporter is told a result, without detail", lambda: (
        B.goto(BASE + "/community/notifications"),
        expect(B.get_by_text("The team reviewed your report and took action")).to_be_visible()))

    # ---------- admin ----------
    print("\n[Admin console]")
    ctxD, D, handleD, _ = new_user(browser, "D")
    psql(f"UPDATE accounts SET role = 'admin' WHERE handle = '{handleD}'")
    D.goto(BASE + "/community/admin")
    check("admin overview shows counts only", lambda: expect(D.get_by_text("Nothing on this page can show what anyone wrote.")).to_be_visible())
    D.screenshot(path=f"{SHOTS}/14-admin-overview.png")
    D.get_by_role("tab", name="Spaces and rooms").click()
    check("admin can see every space and room", lambda: expect(D.get_by_text("Quiet room")).to_be_visible())
    D.get_by_role("tab", name="People and roles").click()
    check("people search is by handle", lambda: expect(D.get_by_role("cell", name=handleA)).to_be_visible())
    D.screenshot(path=f"{SHOTS}/15-admin-people.png")
    D.get_by_role("tab", name="Audit log").click()
    M.goto(BASE + "/community/admin")
    check("a moderator cannot open admin tools", lambda: expect(M.get_by_text("You do not have access to admin tools.")).to_be_visible())

    # ---------- restrictions and appeal ----------
    print("\n[Restriction and appeal]")
    ctxE, E, handleE, phraseE = new_user(browser, "E")
    psql(f"INSERT INTO restrictions (account_id, kind, reason, ends_at, created_by) SELECT id, 'suspend', 'Repeated unkind messages', now() + interval '2 days', id FROM accounts WHERE handle = '{handleE}'")
    E.reload()
    E.wait_for_url("**/community/account")
    check("a suspended member is sent to their account page", lambda: expect(E.get_by_text("Your access to the Community is paused")).to_be_visible())
    check("they can see the reason and ask for a review", lambda: (
        expect(E.get_by_text("Repeated unkind messages")).to_be_visible(),
        expect(E.get_by_role("button", name="Ask for a review")).to_be_visible()))
    E.screenshot(path=f"{SHOTS}/16-suspended-account.png", full_page=True)
    E.get_by_role("button", name="Ask for a review").click()
    E.get_by_label("Ask for a review").last.fill("I was upset about my own situation and I am sorry for how I wrote.")
    E.get_by_role("button", name="Ask for a review").last.click()
    check("appeal is accepted and its status shows", lambda: expect(E.get_by_text("Waiting for a decision")).to_be_visible())
    E.goto(BASE + "/community/start-here/just-happened")
    check("suspended members cannot reach rooms", lambda: E.wait_for_url("**/community/account"))

    # ---------- mobile ----------
    print("\n[Phone-sized screen]")
    ctxP, P, _, _ = new_user(browser, "P", viewport={"width": 390, "height": 844})
    P.get_by_role("button", name="Open the room list").click()
    check("room list opens as a sheet on a phone", lambda: expect(P.get_by_role("link", name="Just happened")).to_be_visible())
    P.screenshot(path=f"{SHOTS}/17-mobile-rooms.png")
    P.get_by_role("link", name="Just happened").click()
    P.get_by_text("Loading messages").wait_for(state="detached")
    P.screenshot(path=f"{SHOTS}/18-mobile-room.png")
    check("no sideways scrolling on a phone", lambda: (None if P.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1") else (_ for _ in ()).throw(AssertionError("horizontal overflow"))))

    # ---------- sign out and back in ----------
    print("\n[Sign in again]")
    ctxA.clear_cookies()
    S = ctxA.new_page(); S.set_default_timeout(12000); watch(S, "S")
    S.on("response", lambda r: print("      [signin net]", r.request.method, r.url.replace("http://localhost:8004/api/community", ""), r.status) if "8004" in r.url else None)
    S.goto(BASE + "/community/join?mode=signin")
    S.get_by_label("Your handle").fill(handleA)
    S.get_by_label("Recovery phrase or password").fill(phraseA)
    S.get_by_role("button", name="Sign in").click()
    check("signing in with the recovery phrase returns to the last room", lambda: S.wait_for_url("**/community/start-here/just-happened"))

    browser.close()

print("\n" + "=" * 60)
passed = sum(1 for r in results if r[1])
print(f"{passed}/{len(results)} checks passed")
failed = [r for r in results if not r[1]]
for name, _, detail in failed:
    print(f"FAILED: {name}\n   {detail}")
print(f"\nbrowser console/page errors seen: {len(problems)}")
seen = set()
for label, msg in problems:
    if msg not in seen:
        seen.add(msg)
        print(f"  [{label}] {msg}")
sys.exit(0 if not failed else 1)
