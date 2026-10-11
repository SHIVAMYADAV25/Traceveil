import hashlib
import logging
import os
import re
import threading
import time
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from engine.discovery import _open_rgb, run_discovery_scan
from engine.ela import run_ela
from engine.models import AnalysisResult, DiscoveryResult
from engine.pipeline import run_pipeline
from engine.store import JsonStore, retention_seconds

router = APIRouter()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# In-memory result store — swap for a DB in production
_results: dict[str, dict] = {}
_discoveries: dict[str, dict] = {}   # live cache for running scans
_discovery_lock = threading.Lock()
_discovery_store = JsonStore("discoveries")  # durable copy: survives restarts, purged after SNIFFER_RETENTION_DAYS

# At most N scans run at once; each scan can issue thousands of requests.
MAX_CONCURRENT_SCANS = int(os.getenv("SNIFFER_MAX_CONCURRENT_SCANS", "2"))
_scan_slots = threading.BoundedSemaphore(MAX_CONCURRENT_SCANS)
_HOST_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$")
INTERRUPTED_MESSAGE = "This scan was interrupted by a server restart. Please run it again."
logger = logging.getLogger("sniffer.discovery")


def startup_maintenance() -> None:
    """Run once at service start: drop expired records and fail scans that were
    mid-flight when the previous process stopped (their thread no longer exists)."""
    _discovery_store.purge_older_than(retention_seconds())
    for key in _discovery_store.keys():
        record = _discovery_store.get(key)
        if record and record.get("status") in {"running", "queued"}:
            record.update(status="failed", error=INTERRUPTED_MESSAGE, finished_at=time.time())
            _discovery_store.set(key, record)


@router.post("/{case_id}/run", response_model=AnalysisResult)
async def run_analysis(
    case_id: str,
    suspicious_image: UploadFile = File(...),
    reference_image: Optional[UploadFile] = File(None),
    evidence_image: Optional[UploadFile] = File(None),
):
    if suspicious_image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type: {suspicious_image.content_type}. "
                "Allowed: image/jpeg, image/png, image/webp."
            ),
        )

    suspicious_bytes = await suspicious_image.read()
    if len(suspicious_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")

    reference_bytes: bytes | None = None
    if reference_image is not None:
        reference_bytes = await reference_image.read()

    evidence_bytes: bytes | None = None
    if evidence_image is not None and evidence_image.content_type in ALLOWED_MIME_TYPES:
        evidence_bytes = await evidence_image.read()
        if len(evidence_bytes) > MAX_FILE_SIZE:
            evidence_bytes = None  # silently skip oversized evidence

    result = run_pipeline(
        case_id=case_id,
        suspicious_bytes=suspicious_bytes,
        suspicious_mime=suspicious_image.content_type or "image/jpeg",
        reference_bytes=reference_bytes,
    )

    # Run lightweight ELA + hash analysis on supporting evidence if provided
    if evidence_bytes:
        try:
            ela = run_ela(evidence_bytes)
            sha256 = hashlib.sha256(evidence_bytes).hexdigest()
            result.supporting_evidence = {
                "sha256": sha256,
                "ela_mean_residual": ela.ela_mean_residual,
                "ela_flagged": ela.ela_flagged,
                "ela_heatmap": ela.ela_heatmap,
                "manipulation_note": (
                    "Possible editing artifacts detected in supporting evidence."
                    if ela.ela_flagged
                    else "No obvious editing artifacts detected in supporting evidence."
                ),
                "used_as": "Supporting evidence for this case",
            }
        except Exception:
            pass  # Evidence analysis is additive — never fail the main result

    _results[case_id] = result.model_dump()
    return result


@router.get("/{case_id}/result", response_model=AnalysisResult)
def get_analysis_result(case_id: str):
    result = _results.get(case_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    return result


@router.post("/{case_id}/discover", response_model=DiscoveryResult, status_code=202)
async def start_discovery(
    case_id: str,
    suspicious_image: UploadFile = File(...),
    evidence_image: Optional[UploadFile] = File(None),
    origin_domain: Optional[str] = Form(None),
    demo: bool = Form(False),
):
    if suspicious_image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type: {suspicious_image.content_type}. "
                "Allowed: image/jpeg, image/png, image/webp."
            ),
        )

    # Bounded read: never pull more than limit+1 bytes into memory.
    suspicious_bytes = await suspicious_image.read(MAX_FILE_SIZE + 1)
    if len(suspicious_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")
    try:
        _open_rgb(suspicious_bytes)
    except Exception:
        raise HTTPException(status_code=422, detail="The file could not be read as an image.")

    domain: Optional[str] = None
    if origin_domain and origin_domain.strip():
        domain = origin_domain.strip().lower().removeprefix("https://").removeprefix("http://").split("/")[0]
        if not _HOST_RE.match(domain):
            raise HTTPException(status_code=422, detail="origin_domain must be a website name like example.com.")

    # Optional supporting screenshot: hashed and ELA-checked, never fails the scan.
    evidence: Optional[dict] = None
    if evidence_image is not None and evidence_image.content_type in ALLOWED_MIME_TYPES:
        evidence_bytes = await evidence_image.read(MAX_FILE_SIZE + 1)
        if 0 < len(evidence_bytes) <= MAX_FILE_SIZE:
            evidence = {"sha256": hashlib.sha256(evidence_bytes).hexdigest(), "size_bytes": len(evidence_bytes)}
            try:
                ela = run_ela(evidence_bytes)
                evidence.update(ela_mean_residual=ela.ela_mean_residual, ela_flagged=ela.ela_flagged)
            except Exception:
                pass

    with _discovery_lock:
        existing = _discoveries.get(case_id)
        if existing and existing.get("status") == "running":
            raise HTTPException(status_code=409, detail="A scan is already running for this case.")

    if not _scan_slots.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="The server is already running the maximum number of scans. Please retry in a minute.",
        )

    now = time.time()
    queued = DiscoveryResult(
        case_id=case_id,
        status="running",
        started_at=now,
        evidence=evidence,
        direct_matches=[],
        related_domains=[],
    )
    with _discovery_lock:
        _discoveries[case_id] = queued.model_dump()
    _discovery_store.set(case_id, _discoveries[case_id])

    fields = set(DiscoveryResult.model_fields)

    def progress_cb(update: dict) -> None:
        with _discovery_lock:
            current = _discoveries.get(case_id)
            if current is None:
                return
            event = update.get("event")
            if event:
                events = current.setdefault("recent_events", [])
                events.append(event)
                del events[:-60]
            for key, value in update.items():
                if key in fields and key != "recent_events":
                    current[key] = value

    def worker() -> None:
        try:
            result = run_discovery_scan(
                case_id=case_id,
                suspicious_bytes=suspicious_bytes,
                origin_domain=domain,
                progress_cb=progress_cb,
                demo=demo,  # per request; no process-wide state
            )
            payload = result.model_dump()
            payload["started_at"] = now
            payload["finished_at"] = time.time()
            payload["evidence"] = evidence
        except Exception:
            logger.exception("discovery scan failed for case %s", case_id)
            payload = DiscoveryResult(
                case_id=case_id,
                status="failed",
                started_at=now,
                finished_at=time.time(),
                direct_matches=[],
                related_domains=[],
                error="The scan failed unexpectedly. Please try again.",
                evidence=evidence,
            ).model_dump()
        finally:
            _scan_slots.release()
        with _discovery_lock:
            _discoveries[case_id] = payload
        _discovery_store.set(case_id, payload)

    threading.Thread(target=worker, daemon=True).start()
    return queued


@router.get("/{case_id}/discover", response_model=DiscoveryResult)
def get_discovery(case_id: str):
    with _discovery_lock:
        result = _discoveries.get(case_id)
    if result is None:
        result = _discovery_store.get(case_id)
        # A "running" record on disk with no live job means the process restarted mid-scan.
        if result and result.get("status") in {"running", "queued"}:
            result = {**result, "status": "failed", "error": INTERRUPTED_MESSAGE}
    if not result:
        raise HTTPException(status_code=404, detail="Discovery result not found.")
    return result
