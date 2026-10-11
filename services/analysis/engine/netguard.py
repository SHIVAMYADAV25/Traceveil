"""
Outbound-request guard (SSRF protection) for the crawler.

Every request the discovery crawler makes — including each hop of a redirect
chain — is checked by `request_hook` before it is sent:

  * scheme must be http/https
  * port must be one of ALLOWED_PORTS
  * every IP the hostname resolves to must be globally routable
    (private, loopback, link-local, multicast, reserved and cloud-metadata
    ranges are rejected)

Residual risk: DNS can change between this check and the actual connection
(DNS rebinding). For stricter isolation run the crawler in a network
namespace / egress-filtered container as well.

Set SNIFFER_NETGUARD=0 to disable (local development against localhost only).
"""
from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
import time
from urllib.parse import urlparse

import httpx

ALLOWED_PORTS = {None, 80, 443, 8080, 8443}
_CACHE_TTL = 300.0
_cache: dict[str, tuple[float, bool]] = {}


class BlockedAddress(httpx.RequestError):
    """Raised when a request targets a non-public address."""


def enabled() -> bool:
    return os.getenv("SNIFFER_NETGUARD", "1") != "0"


def is_public_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    if ip.version == 6 and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


async def _resolve(host: str) -> list[str]:
    loop = asyncio.get_running_loop()
    infos = await loop.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    return sorted({info[4][0] for info in infos})


async def assert_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError(f"scheme not allowed: {parsed.scheme or 'none'}")
    if parsed.port not in ALLOWED_PORTS:
        raise ValueError(f"port not allowed: {parsed.port}")
    host = parsed.hostname
    if not host:
        raise ValueError("missing host")

    now = time.monotonic()
    cached = _cache.get(host)
    if cached and now - cached[0] < _CACHE_TTL:
        if cached[1]:
            return
        raise ValueError("host resolves to a non-public address")

    try:
        ipaddress.ip_address(host)
        addresses = [host]
    except ValueError:
        addresses = await _resolve(host)

    ok = bool(addresses) and all(is_public_ip(a) for a in addresses)
    if len(_cache) > 4096:
        _cache.clear()
    _cache[host] = (now, ok)
    if not ok:
        raise ValueError("host resolves to a non-public address")


async def request_hook(request: httpx.Request) -> None:
    """httpx 'request' event hook — runs for every request, redirects included."""
    if not enabled():
        return
    try:
        await assert_public_url(str(request.url))
    except (ValueError, OSError) as exc:
        raise BlockedAddress(f"blocked by network policy: {exc}", request=request) from exc
