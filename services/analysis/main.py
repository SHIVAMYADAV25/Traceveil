from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import hashlib
import os
import io
import time
from typing import Optional

from routers import cases, analysis, registry, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Traceveil Analysis Service starting up...")
    analysis.startup_maintenance()   # fail interrupted scans, purge expired records
    cases.startup_maintenance()
    yield
    print("Traceveil Analysis Service shutting down...")


# Comma-separated list, e.g. "https://traceveil.vercel.app,https://traceveil.example.com"
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app = FastAPI(
    title="Traceveil Analysis API",
    description="Digital Media Authenticity Verification — Analysis Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(registry.router, prefix="/api/registry", tags=["Registry"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/")
def root():
    return {"service": "Traceveil Analysis API", "status": "running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}
