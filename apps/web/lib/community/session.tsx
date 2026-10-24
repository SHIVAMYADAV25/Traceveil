"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, get, post } from "./api";
import { CommunitySocket, type SocketStatus } from "./socket";
import type { AppNotification, Me, ServerEvent, Space } from "./types";

type Phase = "loading" | "signed_out" | "ready";
type Listener = (e: ServerEvent) => void;

interface CommunityContextValue {
  phase: Phase;
  me: Me | null;
  spaces: Space[];
  socketStatus: SocketStatus;
  /** Goes up by one every time the live connection comes back, so screens can catch up. */
  reconnectTick: number;
  isStaff: boolean;
  isAdmin: boolean;
  /** Suspended or banned: can see their account page but nothing else. */
  isLockedOut: boolean;
  toast: string | null;
  showToast: (message: string) => void;
  reloadMe: () => Promise<Me | null>;
  reloadSpaces: () => Promise<void>;
  signOut: () => Promise<void>;
  subscribe: (roomId: string) => void;
  unsubscribe: (roomId: string) => void;
  addEventListener: (fn: Listener) => () => void;
  setUnread: (n: number) => void;
  markRoomRead: (roomId: string) => void;
}

const Ctx = createContext<CommunityContextValue | null>(null);

export function useCommunity(): CommunityContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommunity must be used inside <CommunityProvider>");
  return v;
}

/** Run a handler for every live event while the component is mounted. */
export function useCommunityEvents(handler: Listener): void {
  const { addEventListener } = useCommunity();
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => addEventListener((e) => ref.current(e)), [addEventListener]);
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("closed");
  const [reconnectTick, setReconnectTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const socketRef = useRef<CommunitySocket | null>(null);
  const listeners = useRef(new Set<Listener>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const reloadMe = useCallback(async () => {
    try {
      const data = await get<Me>("/me");
      setMe(data);
      setPhase("ready");
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { setMe(null); setPhase("signed_out"); return null; }
      // Service unreachable: stay signed out so the entry page can explain.
      setPhase((p) => (p === "loading" ? "signed_out" : p));
      return null;
    }
  }, []);

  const reloadSpaces = useCallback(async () => {
    try { setSpaces((await get<{ spaces: Space[] }>("/spaces")).spaces); } catch { /* keep what we have */ }
  }, []);

  // First load: who is signed in? (State is set in the callbacks, after the answer arrives.)
  useEffect(() => {
    let alive = true;
    get<Me>("/me")
      .then((data) => { if (alive) { setMe(data); setPhase("ready"); } })
      .catch(() => {
        if (!alive) return;
        // A 401 means signed out. If the service is down we also show the entry page, which explains itself.
        setMe(null); setPhase("signed_out");
      });
    return () => { alive = false; };
  }, []);

  const isLockedOut = !!me?.restrictions.some((r) => r.kind === "suspend" || r.kind === "ban");

  // The live connection exists only while someone is signed in and allowed in.
  useEffect(() => {
    if (phase !== "ready" || !me || isLockedOut) return;
    const socket = new CommunitySocket();
    socketRef.current = socket;
    const offStatus = socket.onStatus((s, reconnected) => {
      setSocketStatus(s);
      if (reconnected) setReconnectTick((n) => n + 1);
    });
    const offEvent = socket.onEvent((e) => {
      if (e.type === "notification.created") {
        setMe((m) => (m ? { ...m, unreadNotifications: m.unreadNotifications + 1 } : m));
      }
      if (e.type === "account.restricted") void reloadMe();
      listeners.current.forEach((l) => l(e));
    });
    socket.connect();
    return () => { offStatus(); offEvent(); socket.close(); socketRef.current = null; setSocketStatus("closed"); };
    // Only re-create the connection when the person changes, not on every profile refresh.
  }, [phase, me?.persona.id, isLockedOut, reloadMe]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep room unread dots fresh: on sign-in, every 45 seconds, and when the tab becomes visible.
  useEffect(() => {
    if (phase !== "ready" || isLockedOut) return;
    const refresh = () => { get<{ spaces: Space[] }>("/spaces").then((r) => setSpaces(r.spaces)).catch(() => undefined); };
    refresh();
    const timer = setInterval(refresh, 45_000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [phase, isLockedOut]);

  const signOut = useCallback(async () => {
    try { await post("/auth/logout"); } catch { /* signing out locally anyway */ }
    socketRef.current?.close();
    setMe(null);
    setSpaces([]);
    setPhase("signed_out");
  }, []);

  const addEventListener = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);

  // These four must keep the same identity between renders. Screens list them as effect
  // dependencies, so a new copy on every update would make those effects run in a loop.
  const subscribe = useCallback((roomId: string) => socketRef.current?.subscribe(roomId), []);
  const unsubscribe = useCallback((roomId: string) => socketRef.current?.unsubscribe(roomId), []);
  const setUnread = useCallback((n: number) => setMe((m) => (m ? { ...m, unreadNotifications: n } : m)), []);
  const markRoomRead = useCallback(
    (roomId: string) => setSpaces((all) => all.map((s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === roomId && r.unread !== 0 ? { ...r, unread: 0 } : r)) }))),
    [],
  );

  const value = useMemo<CommunityContextValue>(() => ({
    phase, me, spaces, socketStatus, reconnectTick, toast, showToast,
    isStaff: me?.account.role === "moderator" || me?.account.role === "admin",
    isAdmin: me?.account.role === "admin",
    isLockedOut,
    reloadMe, reloadSpaces, signOut, addEventListener,
    subscribe, unsubscribe, setUnread, markRoomRead,
  }), [phase, me, spaces, socketStatus, reconnectTick, toast, showToast, isLockedOut, reloadMe, reloadSpaces, signOut, addEventListener, subscribe, unsubscribe, setUnread, markRoomRead]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
        {toast && (
          <div className="pointer-events-auto rounded-full bg-[#0a0a0a] px-4 py-2 text-[13px] font-medium text-white shadow-lg">{toast}</div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export type { AppNotification };
