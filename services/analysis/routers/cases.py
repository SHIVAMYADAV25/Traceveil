from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
import time

from engine.store import JsonStore, retention_seconds

router = APIRouter()


class CaseCreate(BaseModel):
    anonymous: bool
    email: Optional[str] = None
    platform_source: str  # Instagram | Telegram | Twitter / X | WhatsApp | Facebook | Other
    issue_type: str       # Deepfake / face swap | Edited image | Harassment / blackmail | Fake news | Other
    description: Optional[str] = None
    pipeline_type: Optional[str] = "deepfake"  # deepfake | ncii


class CaseResponse(BaseModel):
    case_id: str
    created_at: float
    anonymous: bool
    platform_source: str
    issue_type: str
    description: Optional[str]
    pipeline_type: Optional[str] = "deepfake"


# Cases are cached in memory and written through to a restart-safe JSON store,
# so a case (and its report link) survives a service restart. Replace with a real
# database for multi-instance deployments.
_cases: dict[str, dict] = {}
_case_store = JsonStore("cases")


def startup_maintenance() -> None:
    _case_store.purge_older_than(retention_seconds())


@router.post("/", response_model=CaseResponse, status_code=201)
def create_case(payload: CaseCreate):
    if not payload.anonymous and not payload.email:
        raise HTTPException(status_code=422, detail="Email required when not anonymous.")

    case_id = str(uuid.uuid4())
    record = {
        "case_id": case_id,
        "created_at": time.time(),
        "anonymous": payload.anonymous,
        # Do not store email in response; only persist server-side if needed
        "platform_source": payload.platform_source,
        "issue_type": payload.issue_type,
        "description": payload.description,
        "pipeline_type": payload.pipeline_type or "deepfake",
    }
    _cases[case_id] = record
    _case_store.set(case_id, record)
    return record


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str):
    record = _cases.get(case_id) or _case_store.get(case_id)
    if not record:
        raise HTTPException(status_code=404, detail="Case not found.")
    return record
