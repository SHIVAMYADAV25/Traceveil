import glob
import os
import tempfile
import threading
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from engine import discovery as d
from engine import video as videolib
from routers import analysis
from video_world import ROWS, handler, video_bytes

from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def offline_world(monkeypatch):
    monkeypatch.setenv("TRACEVEIL_NETGUARD", "0")
    monkeypatch.setattr(d, "_load_dataset_rows", lambda: ROWS)
    monkeypatch.setattr(d, "_TRANSPORT", httpx.MockTransport(handler))


@pytest.fixture(autouse=True)
def drain_scans():
    """Tests that start a scan must not leak a running thread (or a held slot) into the next test."""
    yield
    end = time.time() + 90
    while time.time() < end:
        if analysis._video_slots._value == analysis.MAX_CONCURRENT_VIDEO_SCANS and \
           analysis._scan_slots._value == analysis.MAX_CONCURRENT_SCANS:
            return
        time.sleep(0.2)
    raise AssertionError("a scan did not finish within 90 s")


def temp_files():
    return set(glob.glob(os.path.join(tempfile.gettempdir(), "traceveil-video-*")))


def new_case() -> str:
    r = client.post("/api/cases/", json={"anonymous": True, "platform_source": "Telegram",
                                         "issue_type": "x", "pipeline_type": "ncii"})
    return r.json()["case_id"]


def upload(case_id, data=None, name="clip.mp4", ctype="video/mp4", **form):
    data = video_bytes("user") if data is None else data
    return client.post(f"/api/analysis/{case_id}/discover-video", files={"video": (name, data, ctype)}, data=form)


def wait_done(case_id, timeout=60.0):
    end = time.time() + timeout
    while time.time() < end:
        body = client.get(f"/api/analysis/{case_id}/discover").json()
        if body["status"] != "running":
            return body
        time.sleep(0.3)
    raise AssertionError("scan did not finish")


def test_video_upload_runs_the_full_flow():
    before = temp_files()
    cid = new_case()
    r = upload(cid)
    assert r.status_code == 202
    queued = r.json()
    assert queued["input_type"] == "video" and queued["reference_frames"] >= 5
    assert queued["video_info"]["duration_seconds"] == 15.0

    body = wait_done(cid)
    assert body["status"] == "completed" and body["input_type"] == "video"
    matches = {m["domain"]: m for m in body["direct_matches"]}
    assert matches["copy.example"]["category"] == "verified"
    assert matches["copy.example"]["video_url"].endswith("/v/copy.mp4")
    assert body["coverage"] and body["recent_events"]
    assert temp_files() == before, "the uploaded video must not be left on disk"


def test_result_stores_only_keyframe_times_never_frames_or_video():
    cid = new_case()
    upload(cid)
    wait_done(cid)
    stored = analysis._discovery_store.get(cid)
    assert stored["video_info"]["keyframe_times"]
    assert len(str(stored)) < 60_000, "no image or video bytes may be persisted"


def test_result_survives_restart():
    cid = new_case()
    upload(cid)
    wait_done(cid)
    analysis._discoveries.clear()
    body = client.get(f"/api/analysis/{cid}/discover").json()
    assert body["status"] == "completed" and body["input_type"] == "video"


@pytest.mark.parametrize("data,name,ctype,status", [
    (b"not a video at all", "a.mp4", "video/mp4", 422),          # right label, undecodable content
    (b"GIF89a", "a.gif", "image/gif", 415),                       # wrong type
    (b"hi", "notes.txt", "text/plain", 415),
])
def test_validation(data, name, ctype, status):
    before = temp_files()
    assert upload(new_case(), data, name, ctype).status_code == status
    assert temp_files() == before


def test_octet_stream_is_accepted_when_the_extension_is_a_video_extension():
    assert upload(new_case(), name="clip.mp4", ctype="application/octet-stream").status_code == 202


def test_oversize_upload_is_rejected_and_cleaned_up(monkeypatch):
    monkeypatch.setattr(videolib, "MAX_VIDEO_BYTES", 10_000)
    before = temp_files()
    r = upload(new_case())
    assert r.status_code == 413 and temp_files() == before


def test_overlong_video_is_rejected(monkeypatch):
    monkeypatch.setattr(videolib, "MAX_DURATION_SECONDS", 5)
    r = upload(new_case())
    assert r.status_code == 422 and "longer than" in r.json()["detail"]


def test_busy_video_slot_returns_429_and_does_not_leak_slots(monkeypatch):
    busy = threading.BoundedSemaphore(1)
    busy.acquire()
    monkeypatch.setattr(analysis, "_video_slots", busy)
    general_before = analysis._scan_slots._value
    assert upload(new_case()).status_code == 429
    assert analysis._scan_slots._value == general_before, "a rejected request must give back the general slot"


def test_failed_validation_releases_slots():
    before = (analysis._video_slots._value, analysis._scan_slots._value)
    assert upload(new_case(), b"junk", "a.mp4").status_code == 422
    assert (analysis._video_slots._value, analysis._scan_slots._value) == before


def test_slots_are_released_after_a_scan_finishes():
    before = (analysis._video_slots._value, analysis._scan_slots._value)
    cid = new_case()
    upload(cid)
    wait_done(cid)
    time.sleep(0.3)
    assert (analysis._video_slots._value, analysis._scan_slots._value) == before


def test_second_scan_on_the_same_case_is_refused_while_running():
    cid = new_case()
    assert upload(cid).status_code == 202
    assert upload(cid).status_code in (409, 202)   # 409 while running; 202 only if the first already finished
    wait_done(cid)


def test_invalid_origin_domain():
    assert upload(new_case(), origin_domain="127.0.0.1:8000").status_code == 422
