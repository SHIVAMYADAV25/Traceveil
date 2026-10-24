"use client";
import { useCallback, useEffect, useState } from "react";
import { Archive, Lock, Plus } from "lucide-react";
import { ApiError, del, get, patch, post } from "@/lib/community/api";
import { copy } from "@/lib/community/copy";
import { useCommunity } from "@/lib/community/session";
import { Dialog, Field, Notice, Pill, PrimaryButton, SecondaryButton, Spinner, TextArea, TextInput } from "../ui";

interface AdminRoom { id: string; slug: string; title: string; purpose: string; kind: "chat" | "announcements" | "quiet"; language: string; slowModeSeconds: number; minAccountAgeHours: number; isLocked: boolean; isArchived: boolean }
interface AdminSpace { id: string; slug: string; title: string; description: string; isArchived: boolean; rooms: AdminRoom[] }
interface Note { id: string; title: string; body: string }

const KINDS = [{ id: "chat", label: "Conversation (everyone can write)" }, { id: "quiet", label: "Quiet room (team writes, members read and react)" }, { id: "announcements", label: "Announcements (team writes)" }];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function Rooms() {
  const { showToast, reloadSpaces } = useCommunity();
  const [spaces, setSpaces] = useState<AdminSpace[] | null>(null);
  const [editing, setEditing] = useState<AdminRoom | null>(null);
  const [draft, setDraft] = useState<AdminRoom | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [creatingIn, setCreatingIn] = useState<AdminSpace | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSpace, setNewSpace] = useState(false);
  const [spaceTitle, setSpaceTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => { setSpaces((await get<{ spaces: AdminSpace[] }>("/admin/spaces")).spaces); }, []);
  useEffect(() => {
    let alive = true;
    get<{ spaces: AdminSpace[] }>("/admin/spaces").then((r) => { if (alive) setSpaces(r.spaces); }).catch(() => { if (alive) setSpaces([]); });
    return () => { alive = false; };
  }, []);
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : copy.errors.generic);

  async function open(room: AdminRoom) {
    setEditing(room); setDraft({ ...room }); setError(null); setNotes([]); setNoteTitle(""); setNoteBody("");
    try { setNotes((await get<{ room: { notes: Note[] } }>(`/rooms/${room.id}`)).room.notes); } catch { /* archived rooms have no notes view */ }
  }
  async function save() {
    if (!draft || !editing) return;
    setError(null);
    try {
      await patch(`/admin/rooms/${editing.id}`, { title: draft.title, purpose: draft.purpose, kind: draft.kind, language: draft.language, slowModeSeconds: draft.slowModeSeconds, minAccountAgeHours: draft.minAccountAgeHours, isLocked: draft.isLocked, isArchived: draft.isArchived });
      setEditing(null); showToast("Room saved"); await load(); await reloadSpaces();
    } catch (e) { fail(e); }
  }
  async function addNote() {
    if (!editing) return;
    try { await post(`/admin/rooms/${editing.id}/notes`, { title: noteTitle, body: noteBody }); setNoteTitle(""); setNoteBody(""); setNotes((await get<{ room: { notes: Note[] } }>(`/rooms/${editing.id}`)).room.notes); } catch (e) { fail(e); }
  }
  async function removeNote(id: string) {
    try { await del(`/admin/notes/${id}`); setNotes((n) => n.filter((x) => x.id !== id)); } catch (e) { fail(e); }
  }
  async function createRoom() {
    if (!creatingIn) return;
    setError(null);
    try { await post(`/admin/spaces/${creatingIn.id}/rooms`, { slug: slugify(newTitle), title: newTitle.trim() }); setCreatingIn(null); setNewTitle(""); showToast("Room created"); await load(); await reloadSpaces(); } catch (e) { fail(e); }
  }
  async function createSpace() {
    setError(null);
    try { await post("/admin/spaces", { slug: slugify(spaceTitle), title: spaceTitle.trim() }); setNewSpace(false); setSpaceTitle(""); showToast("Space created"); await load(); await reloadSpaces(); } catch (e) { fail(e); }
  }

  if (!spaces) return <Spinner />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13.5px] text-[#6b7280]">Spaces group related rooms. Changes appear for members straight away. Archiving hides a room without deleting anything.</p>
        <SecondaryButton onClick={() => { setNewSpace(true); setError(null); }}><Plus className="size-3.5" />New space</SecondaryButton>
      </div>
      {spaces.map((s) => (
        <section key={s.id} className="rounded-2xl border border-[#e8e4de] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#f0ede8] px-4 py-3">
            <div><h3 className="text-[15px] font-semibold text-[#0a0a0a]">{s.title}</h3><p className="text-[12.5px] text-[#6b7280]">{s.description}</p></div>
            <SecondaryButton size="sm" onClick={() => { setCreatingIn(s); setNewTitle(""); setError(null); }}><Plus className="size-3.5" />Add room</SecondaryButton>
          </div>
          <ul className="divide-y divide-[#f0ede8]">
            {s.rooms.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className={`flex-1 text-[14px] ${r.isArchived ? "text-[#6b7280] line-through" : "text-[#0a0a0a]"}`}>{r.title}</span>
                {r.kind !== "chat" && <Pill tone="indigo">{r.kind === "quiet" ? "Quiet" : "Team only"}</Pill>}
                {r.isLocked && <Pill tone="amber"><Lock className="size-3" />Paused</Pill>}
                {r.isArchived && <Pill><Archive className="size-3" />Archived</Pill>}
                {r.slowModeSeconds > 0 && <Pill>{r.slowModeSeconds}s slow mode</Pill>}
                <SecondaryButton size="sm" onClick={() => void open(r)}>Edit</SecondaryButton>
              </li>
            ))}
            {s.rooms.length === 0 && <li className="px-4 py-4 text-[13.5px] text-[#6b7280]">No rooms yet.</li>}
          </ul>
        </section>
      ))}

      <Dialog open={editing !== null && draft !== null} onClose={() => setEditing(null)} title={`Edit: ${editing?.title ?? ""}`} wide>
        {draft && (
          <div className="space-y-4">
            <Field label="Name" htmlFor="r-title"><TextInput id="r-title" value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label="What this room is for (one line)" htmlFor="r-purpose"><TextArea id="r-purpose" rows={2} maxLength={300} value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} /></Field>
            <Field label="Who can write" htmlFor="r-kind">
              <select id="r-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as AdminRoom["kind"] })} className="w-full rounded-lg border border-[#e8e4de] bg-[#fafaf8] px-3.5 py-2.5 text-[14.5px] focus:border-[#0a0a0a] focus:outline-none">
                {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Slow mode (seconds)" htmlFor="r-slow"><TextInput id="r-slow" type="number" min={0} max={3600} value={draft.slowModeSeconds} onChange={(e) => setDraft({ ...draft, slowModeSeconds: Math.max(0, Number(e.target.value) || 0) })} /></Field>
              <Field label="Minimum account age (hours)" htmlFor="r-age"><TextInput id="r-age" type="number" min={0} value={draft.minAccountAgeHours} onChange={(e) => setDraft({ ...draft, minAccountAgeHours: Math.max(0, Number(e.target.value) || 0) })} /></Field>
              <Field label="Language code" htmlFor="r-lang"><TextInput id="r-lang" value={draft.language} maxLength={6} onChange={(e) => setDraft({ ...draft, language: e.target.value.toLowerCase() })} /></Field>
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={draft.isLocked} onChange={(e) => setDraft({ ...draft, isLocked: e.target.checked })} className="size-4 accent-[#0a0a0a]" />Pause this room (members cannot write)</label>
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={draft.isArchived} onChange={(e) => setDraft({ ...draft, isArchived: e.target.checked })} className="size-4 accent-[#0a0a0a]" />Archive (hide from members)</label>
            </div>

            <div className="rounded-xl border border-[#e8e4de] bg-[#fafaf8] p-4">
              <h4 className="mb-2 text-[13.5px] font-semibold text-[#0a0a0a]">Pinned notes</h4>
              {notes.length === 0 && <p className="mb-2 text-[13px] text-[#6b7280]">No pinned notes.</p>}
              <ul className="mb-3 space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-[13.5px]">
                    <div><p className="font-medium">{n.title}</p><p className="whitespace-pre-line text-[#374151]">{n.body}</p></div>
                    <SecondaryButton size="sm" onClick={() => void removeNote(n.id)}>Remove</SecondaryButton>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <TextInput aria-label="Note title" placeholder="Title, for example: What helped me" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} maxLength={80} />
                <TextArea aria-label="Note text" rows={3} placeholder="Text" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} maxLength={2000} />
                <SecondaryButton size="sm" disabled={!noteTitle.trim() || !noteBody.trim()} onClick={() => void addNote()}>Pin this note</SecondaryButton>
              </div>
            </div>
            {error && <Notice tone="red" role="alert">{error}</Notice>}
            <div className="flex justify-end gap-2"><SecondaryButton onClick={() => setEditing(null)}>Cancel</SecondaryButton><PrimaryButton onClick={() => void save()}>Save room</PrimaryButton></div>
          </div>
        )}
      </Dialog>

      <Dialog open={creatingIn !== null} onClose={() => setCreatingIn(null)} title={`New room in ${creatingIn?.title ?? ""}`}>
        <Field label="Room name" htmlFor="n-room" hint={newTitle ? `Address: ${slugify(newTitle)}` : "You can change everything else afterwards."}><TextInput id="n-room" value={newTitle} maxLength={80} onChange={(e) => setNewTitle(e.target.value)} /></Field>
        {error && <div className="mt-3"><Notice tone="red" role="alert">{error}</Notice></div>}
        <div className="mt-4 flex justify-end gap-2"><SecondaryButton onClick={() => setCreatingIn(null)}>Cancel</SecondaryButton><PrimaryButton disabled={slugify(newTitle).length < 2} onClick={() => void createRoom()}>Create room</PrimaryButton></div>
      </Dialog>

      <Dialog open={newSpace} onClose={() => setNewSpace(false)} title="New space">
        <Field label="Space name" htmlFor="n-space" hint={spaceTitle ? `Address: ${slugify(spaceTitle)}` : undefined}><TextInput id="n-space" value={spaceTitle} maxLength={80} onChange={(e) => setSpaceTitle(e.target.value)} /></Field>
        {error && <div className="mt-3"><Notice tone="red" role="alert">{error}</Notice></div>}
        <div className="mt-4 flex justify-end gap-2"><SecondaryButton onClick={() => setNewSpace(false)}>Cancel</SecondaryButton><PrimaryButton disabled={slugify(spaceTitle).length < 2} onClick={() => void createSpace()}>Create space</PrimaryButton></div>
      </Dialog>
    </div>
  );
}
