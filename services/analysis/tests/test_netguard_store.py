import asyncio

import httpx
import pytest

from engine import netguard
from engine.store import JsonStore


@pytest.mark.parametrize("ip,expected", [
    ("8.8.8.8", True), ("1.1.1.1", True),
    ("127.0.0.1", False), ("10.1.2.3", False), ("192.168.0.5", False), ("172.16.9.9", False),
    ("169.254.169.254", False),      # cloud metadata endpoint
    ("100.64.0.1", False),           # carrier-grade NAT
    ("::1", False), ("fe80::1", False), ("::ffff:127.0.0.1", False),
    ("not-an-ip", False),
])
def test_is_public_ip(ip, expected):
    assert netguard.is_public_ip(ip) is expected


def test_redirect_to_internal_address_is_blocked(monkeypatch):
    monkeypatch.setenv("SNIFFER_NETGUARD", "1")

    async def fake_resolve(host):
        return ["93.184.216.34"] if host == "public.example" else ["127.0.0.1"]
    monkeypatch.setattr(netguard, "_resolve", fake_resolve)
    netguard._cache.clear()

    def handler(request):
        if request.url.host == "public.example":
            return httpx.Response(302, headers={"location": "http://169.254.169.254/latest/meta-data/"})
        return httpx.Response(200, text="secret")

    async def go():
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler), follow_redirects=True,
            event_hooks={"request": [netguard.request_hook]},
        ) as client:
            return await client.get("http://public.example/")

    with pytest.raises(netguard.BlockedAddress):
        asyncio.run(go())


@pytest.mark.parametrize("url", ["ftp://example.com/", "http://example.com:22/", "file:///etc/passwd", "http://localhost/"])
def test_bad_scheme_port_and_localhost_rejected(monkeypatch, url):
    async def fake_resolve(host):
        return ["127.0.0.1"] if host == "localhost" else ["93.184.216.34"]
    monkeypatch.setattr(netguard, "_resolve", fake_resolve)
    netguard._cache.clear()
    with pytest.raises(ValueError):
        asyncio.run(netguard.assert_public_url(url))


def test_store_roundtrip_and_traversal_protection(tmp_path):
    store = JsonStore("t", base_dir=tmp_path)
    assert store.set("abc-123", {"a": 1}) is True
    assert store.get("abc-123") == {"a": 1}
    for bad in ("../../etc/passwd", "a/b", "", "x" * 80, "..", "a.json"):
        assert store.get(bad) is None
        assert store.set(bad, {"x": 1}) is False
    assert not list(tmp_path.rglob("passwd*"))


def test_store_purges_expired_records(tmp_path):
    import os, time
    store = JsonStore("t", base_dir=tmp_path)
    store.set("old", {"a": 1}); store.set("new", {"a": 2})
    old = time.time() - 10 * 86400
    os.utime(store._path("old"), (old, old))
    assert store.purge_older_than(7 * 86400) == 1
    assert store.get("old") is None and store.get("new") == {"a": 2}
