import threading
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from engine import discovery as d
from helpers import photo, thumb, to_bytes
from routers import analysis, cases
import test_discovery as td

from main import app

client = TestClient(app)
IMG = to_bytes(photo("astronaut"), "PNG")


@pytest.fixture(autouse=True)
def offline_world(monkeypatch):
    monkeypatch.setenv("TRACEVEIL_NETGUARD", "0")
    monkeypatch.setattr(d, "_load_dataset_rows", lambda: td.ROWS)
    monkeypatch.setattr(d, "_TRANSPORT", httpx.MockTransport(td.handler))


def new_case() -> str:
    r = client.post("/api/cases/", json={"anonymous": True, "platform_source": "Telegram",
                                         "issue_type": "x", "pipeline_type": "ncii"})
    assert r.status_code == 201
    return r.json()["case_id"]


def wait_done(case_id: str, timeout: float = 30.0) -> dict:
    end = time.time() + timeout
    while time.time() < end:
        body = client.get(f"/api/analysis/{case_id}/discover").json()
        if body["status"] != "running":
            return body
        time.sleep(0.2)
    raise AssertionError("scan did not finish")


def post_scan(case_id, **extra):
    files = {"suspicious_image": ("a.png", IMG, "image/png")}
    if "evidence" in extra:
        files["evidence_image"] = ("e.png", extra.pop("evidence"), "image/png")
    return client.post(f"/api/analysis/{case_id}/discover", files=files, data=extra)


def test_full_scan_via_api_with_evidence_and_origin_domain():
    cid = new_case()
    r = post_scan(cid, evidence=IMG, origin_domain="good.example")
    assert r.status_code == 202
    body = wait_done(cid)
    assert body["status"] == "completed"
    assert body["evidence"]["sha256"], "evidence screenshot is now accepted and fingerprinted"
    assert body["prioritized_network"] == "NetA", "origin_domain now drives prioritisation"
    assert body["domain_status"]["blocked.example"] == "blocked"
    assert body["recent_events"], "progress events now reach the client"


def test_result_and_case_survive_a_restart():
    cid = new_case()
    post_scan(cid)
    wait_done(cid)
    analysis._discoveries.clear()   # simulate a fresh process: memory is gone, disk remains
    cases._cases.clear()
    assert client.get(f"/api/analysis/{cid}/discover").json()["status"] == "completed"
    assert client.get(f"/api/cases/{cid}").status_code == 200


def test_scan_interrupted_by_restart_is_reported_failed_not_stuck():
    cid = "interrupted-case-1"
    record = {"case_id": cid, "status": "running", "started_at": time.time(), "direct_matches": [], "related_domains": []}
    analysis._discovery_store.set(cid, record)
    analysis._discoveries.pop(cid, None)
    body = client.get(f"/api/analysis/{cid}/discover").json()
    assert body["status"] == "failed" and "restart" in body["error"]
    analysis.startup_maintenance()
    assert analysis._discovery_store.get(cid)["status"] == "failed"


def test_input_validation():
    cid = new_case()
    assert post_scan(cid, origin_domain="http://127.0.0.1:8000/x").status_code == 422
    assert post_scan(cid, origin_domain="not a domain").status_code == 422
    bad = client.post(f"/api/analysis/{cid}/discover", files={"suspicious_image": ("a.png", b"not an image", "image/png")})
    assert bad.status_code == 422
    big = client.post(f"/api/analysis/{cid}/discover", files={"suspicious_image": ("a.png", b"0" * (10 * 1024 * 1024 + 5), "image/png")})
    assert big.status_code == 413
    wrong = client.post(f"/api/analysis/{cid}/discover", files={"suspicious_image": ("a.txt", b"hi", "text/plain")})
    assert wrong.status_code == 415


def test_too_many_concurrent_scans_gets_429(monkeypatch):
    full = threading.BoundedSemaphore(1)
    full.acquire()
    monkeypatch.setattr(analysis, "_scan_slots", full)
    assert post_scan(new_case()).status_code == 429


def test_demo_flag_on_own_image_still_runs_a_real_scan():
    cid = new_case()
    post_scan(cid, demo="true")           # IMG is not a bundled demo image
    body = wait_done(cid)
    assert body["demo"] is False
    assert "good.example" in body["target_domains"]
    assert d.DEMO_DISCOVERY_MODE is False
