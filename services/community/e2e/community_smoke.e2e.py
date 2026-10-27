"""
Smoke test for the redesigned Community UI. Needs the service (port 8004, COMMUNITY_OPEN=true) and the
web app (port 3000) running against a freshly seeded database. Chromium only.

    python3 services/community/e2e/community_smoke.e2e.py

Covers: entry page, sign-up without an age box, recovery phrase, rules shown before the name step,
landing on #welcome with the rules visible, a team-only channel being read-only, posting in a chat
channel, the "what would help" tray opening inside the input, the reaction picker, and the sidebar.
The older 45-check script (community_ui.e2e.OUTDATED.py) targets the previous interface and is kept only for reference.
"""
import sys
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3000"
failures = []

def check(name, fn):
    try:
        fn(); print("ok  ", name)
    except Exception as e:  # noqa: BLE001
        failures.append(name); print("FAIL", name, "-", str(e).splitlines()[0])

with sync_playwright() as p:
    browser = p.chromium.launch()
    pg = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))

    pg.goto(f"{BASE}/community/join")
    check("sign-up has no age checkbox", lambda: expect(pg.get_by_text("18")).to_have_count(0))
    pg.get_by_role("button", name="Create my private sign-in").click()
    pg.get_by_role("button", name="Show my recovery phrase").click()
    pg.get_by_label("I have saved my handle and recovery phrase").check()
    pg.get_by_role("button", name="Continue").click()
    pg.wait_for_url("**/onboarding")
    check("rules are on the page before the name step", lambda: expect(pg.get_by_text("Be kind.")).to_be_visible())
    pg.get_by_label("I agree to these four things").check()
    pg.get_by_role("button", name="Enter the Community").click()
    pg.wait_for_url("**/start-here/welcome")

    check("welcome shows the rules without pressing anything", lambda: expect(pg.get_by_text("Our four rules")).to_be_visible())
    check("welcome is read-only for members", lambda: expect(pg.get_by_text("Only the Traceveil team can post")).to_be_visible())
    check("sidebar lists the five groups", lambda: [expect(pg.get_by_role("button", name=n)).to_be_visible() for n in ["Start here", "Victim support", "Traceveil product support", "Legal & resources", "Bugs & feedback"]])
    check("leave quickly is visible", lambda: expect(pg.get_by_role("button", name="Leave quickly")).to_be_visible())
    check("members do not see team tools", lambda: expect(pg.get_by_role("link", name="Admin")).to_have_count(0))

    pg.goto(f"{BASE}/community/bugs-feedback/report-a-bug")
    pg.locator("#composer").fill("The scan page froze for a moment.")
    pg.get_by_role("button", name="Send", exact=True).click()
    check("a posted message appears", lambda: expect(pg.get_by_text("The scan page froze for a moment.")).to_be_visible())
    pg.get_by_role("button", name="What would help").click()
    check("tray opens inside the input", lambda: expect(pg.get_by_role("radio", name="Someone to listen")).to_be_visible())
    pg.locator("article").last.hover()
    pg.locator("article").last.get_by_role("button", name="React", exact=True).click()
    check("reaction picker shows six emoji", lambda: expect(pg.get_by_role("menuitemcheckbox")).to_have_count(6))

    # Round 2: frame, header persistence, dropdown, message layout, input outline.
    pg.goto(f"{BASE}/community/bugs-feedback/report-a-bug"); pg.wait_for_timeout(1500)
    pg.evaluate("window.__hdr = document.querySelector('header')")
    pg.get_by_role("link", name="feature-requests").click(); pg.wait_for_url("**/feature-requests")
    check("header is the same element after changing channel", lambda: (_ for _ in ()).throw(AssertionError("header was rebuilt")) if not pg.evaluate("window.__hdr === document.querySelector('header') && window.__hdr.isConnected") else None)
    check("header text follows the channel", lambda: expect(pg.locator("header h1")).to_have_text("feature-requests"))
    pg.get_by_role("button", name="Community menu").click()
    check("dropdown is on top of the list, not clipped", lambda: (_ for _ in ()).throw(AssertionError("clipped")) if not pg.evaluate("(() => { const e = [...document.querySelectorAll('[role=menuitem]')][0]; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e.contains(t); })()") else None)
    pg.keyboard.press("Escape")
    pg.locator("#composer").fill("my own message sits on the left"); pg.get_by_role("button", name="Send", exact=True).click()
    pg.wait_for_selector("article:has-text('my own message sits on the left')")
    check("own message starts at the left like everyone else's", lambda: (_ for _ in ()).throw(AssertionError("not on the left")) if pg.locator("article", has_text="my own message sits on the left").first.locator("svg, img").first.bounding_box()["x"] > 500 else None)
    pg.locator("#composer").click()
    check("composer input draws no square outline of its own", lambda: (_ for _ in ()).throw(AssertionError(pg.evaluate("getComputedStyle(document.querySelector('#composer')).outlineStyle"))) if pg.evaluate("getComputedStyle(document.querySelector('#composer')).outlineStyle") not in ("none",) else None)

    check("no script errors on the page", lambda: (_ for _ in ()).throw(AssertionError(errors[0])) if errors else None)
    browser.close()

print(f"\n{len(failures)} failed" if failures else "\nall passed")
sys.exit(1 if failures else 0)
