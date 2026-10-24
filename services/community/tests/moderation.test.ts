import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ageAccount, createTestEnv, newMember, roomId, setRole, uid, type Client, type TestEnv } from "./helpers.js";

let env: TestEnv;
let room: string;
beforeAll(async () => {
  env = await createTestEnv();
  room = await roomId(env, "harassment-and-doxxing");
});
afterAll(async () => env.close());

async function member(): Promise<Client> {
  const c = await newMember(env);
  await ageAccount(env, c, 24 * 30);
  return c;
}
async function staff(role: "moderator" | "admin"): Promise<Client> {
  const c = await member();
  await setRole(env, c, role);
  return c;
}
const say = async (c: Client, body: string) =>
  (await c.post(`/rooms/${room}/messages`, { clientMsgId: uid(), body })).body.message;

/** Set up: a bad actor posts, a victim reports. Returns everything needed. */
async function scenario(reason = "harassment") {
  const bad = await member();
  const victim = await member();
  await say(victim, "context before");
  const msg = await say(bad, "an abusive message");
  await say(victim, "context after");
  const rep = await victim.post(`/messages/${msg.id}/reports`, { reason, note: "they keep doing this" });
  return { bad, victim, msg, reportId: rep.body.reportId as string, status: rep.status };
}

describe("making a report", () => {
  it("creates a report with frozen context and tells nothing to the reported person", async () => {
    const mod = await staff("moderator");
    const { bad, status, reportId } = await scenario();
    expect(status).toBe(201);
    const detail = await mod.get(`/mod/reports/${reportId}`);
    expect(detail.status).toBe(200);
    const snap = detail.body.report.snapshot;
    expect(snap.map((m: any) => m.body)).toEqual(["context before", "an abusive message", "context after"]);
    expect(snap.filter((m: any) => m.reported)).toHaveLength(1);
    expect(detail.body.report.note).toBe("they keep doing this");
    // the reporter is never revealed to moderators
    expect(JSON.stringify(detail.body)).not.toMatch(/reporter/i);
    // the reported person gets no notification
    expect((await bad.get("/notifications")).body.notifications).toHaveLength(0);
  });

  it("keeps the snapshot even if the message is later edited or deleted", async () => {
    const mod = await staff("moderator");
    const { bad, msg, reportId } = await scenario();
    await bad.del(`/messages/${msg.id}`);
    const snap = (await mod.get(`/mod/reports/${reportId}`)).body.report.snapshot;
    expect(snap.find((m: any) => m.reported).body).toBe("an abusive message");
  });

  it("marks threats, minors, self-harm risk and personal details as urgent", async () => {
    for (const reason of ["threat", "minor_involved", "self_harm_risk", "personal_details"]) {
      const mod = await staff("moderator");
      const { reportId } = await scenario(reason);
      expect((await mod.get(`/mod/reports/${reportId}`)).body.report.priority).toBe("urgent");
    }
    const mod = await staff("moderator");
    const { reportId } = await scenario("spam");
    expect((await mod.get(`/mod/reports/${reportId}`)).body.report.priority).toBe("normal");
  });

  it("refuses duplicates, self-reports, unknown reasons and onboarding-less reporters", async () => {
    const { victim, msg, bad } = await scenario();
    const dup = await victim.post(`/messages/${msg.id}/reports`, { reason: "harassment" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("already_reported");
    expect((await bad.post(`/messages/${msg.id}/reports`, { reason: "spam" })).body.error.code).toBe("cannot_report_self");
    expect((await victim.post(`/messages/${msg.id}/reports`, { reason: "boring" })).status).toBe(400);
    const fresh = await newMember(env, { onboard: false });
    expect((await fresh.post(`/messages/${msg.id}/reports`, { reason: "spam" })).status).toBe(403);
  });

  it("notifies every moderator and admin about a new report, but not the reporter", async () => {
    const mod = await staff("moderator");
    const adm = await staff("admin");
    const { victim } = await scenario();
    for (const s of [mod, adm]) {
      const n = (await s.get("/notifications")).body.notifications;
      expect(n.some((x: any) => x.kind === "report_new")).toBe(true);
    }
    expect((await victim.get("/notifications")).body.notifications.some((x: any) => x.kind === "report_new")).toBe(false);
  });
});

describe("who can see the queue", () => {
  it("is closed to members and open to moderators and admins", async () => {
    const m = await member();
    expect((await m.get("/mod/reports")).status).toBe(403);
    expect((await m.get("/admin/stats")).status).toBe(403);
    expect((await (await staff("moderator")).get("/mod/reports")).status).toBe(200);
    expect((await (await staff("moderator")).get("/admin/stats")).status).toBe(403);
    expect((await (await staff("admin")).get("/admin/stats")).status).toBe(200);
  });

  it("shows urgent reports first, with counts", async () => {
    await env.db.query("TRUNCATE reports RESTART IDENTITY CASCADE");
    const mod = await staff("moderator");
    await scenario("spam");
    const urgent = await scenario("threat");
    await scenario("harassment");
    const list = await mod.get("/mod/reports");
    expect(list.body.reports[0].id).toBe(urgent.reportId);
    expect(list.body.reports[0].priority).toBe("urgent");
    expect(list.body.counts).toMatchObject({ active: 3, urgent: 1, mine: 0 });
  });

  it("hides reports about the team from moderators; admins see them", async () => {
    await env.db.query("TRUNCATE reports RESTART IDENTITY CASCADE");
    const mod = await staff("moderator");
    const adm = await staff("admin");
    const victim = await member();
    const msg = await say(mod, "a message from a moderator");
    const rep = await victim.post(`/messages/${msg.id}/reports`, { reason: "harassment" });
    const other = await staff("moderator");
    expect((await other.get("/mod/reports")).body.reports).toHaveLength(0);
    expect((await other.get(`/mod/reports/${rep.body.reportId}`)).status).toBe(404);
    expect((await adm.get("/mod/reports")).body.reports).toHaveLength(1);
    expect((await adm.get("/notifications")).body.notifications.some((n: any) => n.kind === "report_new")).toBe(true);
    expect((await other.get("/notifications")).body.notifications.some((n: any) => n.kind === "report_new")).toBe(false);
  });
});

describe("claiming and acting", () => {
  it("lets one moderator claim a report; others are told it is taken", async () => {
    const a = await staff("moderator");
    const b = await staff("moderator");
    const { reportId } = await scenario();
    const claimed = await a.post(`/mod/reports/${reportId}/claim`);
    expect(claimed.body.report.status).toBe("in_review");
    expect(claimed.body.report.assigned).toBe("me");
    const clash = await b.post(`/mod/reports/${reportId}/claim`);
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe("already_claimed");
    const adm = await staff("admin");
    expect((await adm.post(`/mod/reports/${reportId}/claim`, { force: true })).status).toBe(200);
  });

  it("hides a message: gone for members, kept for the record, the author is told why", async () => {
    const mod = await staff("moderator");
    const { bad, victim, msg, reportId } = await scenario();
    const r = await mod.post(`/mod/reports/${reportId}/actions`, { action: "hide_message", reason: "Abusive language" });
    expect(r.status).toBe(200);
    expect(r.body.report.status).toBe("actioned");
    const view = (await victim.get(`/rooms/${room}/messages`)).body.messages.find((m: any) => m.id === msg.id);
    expect(view.status).toBe("hidden_by_mod");
    expect(view.body).toBeNull();
    const { rows } = await env.db.query("SELECT body FROM messages WHERE id = $1", [msg.id]);
    expect(rows[0].body).toBe("an abusive message");
    const note = (await bad.get("/notifications")).body.notifications.find((n: any) => n.kind === "mod_notice");
    expect(note.payload).toMatchObject({ action: "message_hidden", reason: "Abusive language" });
    expect(JSON.stringify(note)).not.toContain(victim.displayName);
  });

  it("tells the reporter a result without saying what was done", async () => {
    const mod = await staff("moderator");
    const { victim, reportId } = await scenario();
    await mod.post(`/mod/reports/${reportId}/actions`, { action: "warn", reason: "First warning" });
    const n = (await victim.get("/notifications")).body.notifications.find((x: any) => x.kind === "report_result");
    expect(n.payload).toEqual({ outcome: "action_taken" });
  });

  it("dismisses a report and says no action was taken", async () => {
    const mod = await staff("moderator");
    const { victim, reportId } = await scenario("spam");
    const r = await mod.post(`/mod/reports/${reportId}/actions`, { action: "dismiss", reason: "Not a violation" });
    expect(r.body.report.status).toBe("dismissed");
    expect((await victim.get("/notifications")).body.notifications.find((x: any) => x.kind === "report_result").payload.outcome).toBe("no_action");
    const again = await mod.post(`/mod/reports/${reportId}/actions`, { action: "warn", reason: "Changed my mind" });
    expect(again.status).toBe(409);
  });

  it("requires a reason for every action", async () => {
    const mod = await staff("moderator");
    const { reportId } = await scenario();
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "warn", reason: "" })).status).toBe(400);
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "warn" })).status).toBe(400);
  });

  it("mutes a person in one room only, for a set time, and they can appeal", async () => {
    const mod = await staff("moderator");
    const { bad, reportId } = await scenario();
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "mute_room", reason: "Cool off" })).body.error.code).toBe("duration_required");
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "mute_room", reason: "Cool off", durationHours: 24 * 30 })).body.error.code).toBe("duration_too_long");
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "mute_room", reason: "Cool off", durationHours: 24 })).status).toBe(200);

    const blocked = await bad.post(`/rooms/${room}/messages`, { clientMsgId: uid(), body: "still here" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("muted_in_room");
    const other = await roomId(env, "small-wins");
    expect((await bad.post(`/rooms/${other}/messages`, { clientMsgId: uid(), body: "I can post elsewhere" })).status).toBe(201);
    expect((await bad.get(`/rooms/${room}/messages`)).status).toBe(200); // can still read

    const notice = (await bad.get("/notifications")).body.notifications.find((n: any) => n.kind === "restriction");
    expect(notice.payload).toMatchObject({ kind: "room_mute", canAppeal: true, reason: "Cool off" });
  });

  it("suspends: cannot read or post, but can still reach their account page and appeal", async () => {
    const mod = await staff("moderator");
    const { bad, reportId } = await scenario("threat");
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "suspend", reason: "Threats", durationHours: 48 })).status).toBe(200);

    const read = await bad.get(`/rooms/${room}/messages`);
    expect(read.status).toBe(403);
    expect(read.body.error.code).toBe("suspended");
    expect((await bad.get("/spaces")).status).toBe(403);
    expect((await bad.get("/me")).status).toBe(200);
    expect((await bad.get("/me")).body.restrictions[0].kind).toBe("suspend");
    expect((await bad.get("/notifications")).status).toBe(200);

    const mine = await bad.get("/restrictions/mine");
    expect(mine.body.restrictions).toHaveLength(1);
    const appeal = await bad.post("/appeals", { restrictionId: mine.body.restrictions[0].id, body: "I was angry and I am sorry. It will not happen again." });
    expect(appeal.status).toBe(201);
    expect((await bad.post("/appeals", { restrictionId: mine.body.restrictions[0].id, body: "Sending this one more time please." })).body.error.code).toBe("already_appealed");
  });

  it("only admins can ban; moderators cannot act on the team; nobody can restrict an admin", async () => {
    const mod = await staff("moderator");
    const adm = await staff("admin");
    const { reportId } = await scenario("harassment");
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "ban", reason: "Repeated abuse" })).body.error.code).toBe("admin_only");
    expect((await adm.post(`/mod/reports/${reportId}/actions`, { action: "ban", reason: "Repeated abuse" })).status).toBe(200);

    const peer = await staff("moderator");
    const victim = await member();
    const peerMsg = await say(peer, "mod message");
    const rep = await victim.post(`/messages/${peerMsg.id}/reports`, { reason: "harassment" });
    // moderators cannot even see it, so use a direct hide to prove the rule too
    expect((await mod.post(`/mod/messages/${peerMsg.id}/hide`, { reason: "nope" })).body.error.code).toBe("cannot_act_on_staff");
    expect((await adm.post(`/mod/reports/${rep.body.reportId}/actions`, { action: "warn", reason: "Please be careful" })).status).toBe(200);

    const otherAdmin = await staff("admin");
    const adminMsg = await say(otherAdmin, "admin message");
    const rep2 = await victim.post(`/messages/${adminMsg.id}/reports`, { reason: "harassment" });
    expect((await adm.post(`/mod/reports/${rep2.body.reportId}/actions`, { action: "suspend", reason: "x y z", durationHours: 2 })).body.error.code).toBe("cannot_act_on_admin");
  });

  it("a banned person cannot get back in by signing in again", async () => {
    const adm = await staff("admin");
    const { bad, reportId } = await scenario();
    await adm.post(`/mod/reports/${reportId}/actions`, { action: "ban", reason: "Repeated abuse" });
    const again = await (async () => {
      const c = (await import("./helpers.js")).Client;
      const fresh = new c(env);
      await fresh.post("/auth/login", { handle: bad.handle, secret: bad.phrase });
      return fresh;
    })();
    const r = await again.get("/spaces");
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("banned");
  });

  it("escalating hands the report to admins and stops moderators acting on it", async () => {
    const mod = await staff("moderator");
    const adm = await staff("admin");
    const { reportId } = await scenario("threat");
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "escalate", reason: "Needs an admin decision" })).body.report.status).toBe("escalated");
    expect((await adm.get("/notifications")).body.notifications.some((n: any) => n.kind === "report_escalated")).toBe(true);
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "warn", reason: "Trying anyway" })).body.error.code).toBe("escalated_to_admin");
    expect((await mod.post(`/mod/reports/${reportId}/actions`, { action: "note", reason: "Extra context for the admin" })).status).toBe(200);
    expect((await adm.post(`/mod/reports/${reportId}/actions`, { action: "suspend", reason: "Threats", durationHours: 72 })).status).toBe(200);
  });

  it("writes every action to an append-only record that cannot be edited", async () => {
    const mod = await staff("moderator");
    const { reportId } = await scenario();
    await mod.post(`/mod/reports/${reportId}/actions`, { action: "warn", reason: "Be kind" });
    const { rows } = await env.db.query("SELECT id, action, reason FROM mod_actions WHERE report_id = $1", [reportId]);
    expect(rows[0]).toMatchObject({ action: "warn", reason: "Be kind" });
    await expect(env.db.query("UPDATE mod_actions SET reason = 'edited' WHERE id = $1", [rows[0].id])).rejects.toThrow(/append-only/);
    await expect(env.db.query("DELETE FROM mod_actions WHERE id = $1", [rows[0].id])).rejects.toThrow(/append-only/);
    await env.db.query("INSERT INTO audit_log (actor_account_id, action) VALUES ($1, 'test')", [crypto.randomUUID()]);
    await expect(env.db.query("DELETE FROM audit_log")).rejects.toThrow(/append-only/);
    await expect(env.db.query("UPDATE audit_log SET action = 'x'")).rejects.toThrow(/append-only/);
  });

  it("moderators can hide a message directly, without a report", async () => {
    const mod = await staff("moderator");
    const bad = await member();
    const msg = await say(bad, "spotted by a moderator");
    expect((await mod.post(`/mod/messages/${msg.id}/hide`, { reason: "Shares personal details" })).status).toBe(200);
    expect((await mod.post(`/mod/messages/${msg.id}/hide`, { reason: "again again" })).body.error.code).toBe("already_hidden");
  });
});

describe("appeals", () => {
  it("lets an admin overturn a restriction, which restores access and tells the person", async () => {
    await env.db.query("DELETE FROM appeals");
    const adm = await staff("admin");
    const mod = await staff("moderator");
    const { bad, reportId } = await scenario();
    await mod.post(`/mod/reports/${reportId}/actions`, { action: "suspend", reason: "Spam", durationHours: 72 });
    const rid = (await bad.get("/restrictions/mine")).body.restrictions[0].id;
    await bad.post("/appeals", { restrictionId: rid, body: "That was a mistake, I was quoting someone else." });

    const open = await adm.get("/admin/appeals");
    expect(open.body.appeals).toHaveLength(1);
    expect(open.body.appeals[0].imposedByMe).toBe(false);
    const appealId = open.body.appeals[0].id;
    expect((await mod.post(`/admin/appeals/${appealId}/decision`, { decision: "overturned", note: "ok" })).status).toBe(403);
    expect((await adm.post(`/admin/appeals/${appealId}/decision`, { decision: "overturned", note: "Context was missing" })).status).toBe(200);
    expect((await adm.post(`/admin/appeals/${appealId}/decision`, { decision: "upheld", note: "again" })).status).toBe(409);

    expect((await bad.get(`/rooms/${room}/messages`)).status).toBe(200);
    const n = (await bad.get("/notifications")).body.notifications.find((x: any) => x.kind === "appeal_decided");
    expect(n.payload).toMatchObject({ decision: "overturned", note: "Context was missing" });
  });

  it("an upheld appeal keeps the restriction in place", async () => {
    const adm = await staff("admin");
    const { bad, reportId } = await scenario();
    await adm.post(`/mod/reports/${reportId}/actions`, { action: "suspend", reason: "Harassment", durationHours: 72 });
    const rid = (await bad.get("/restrictions/mine")).body.restrictions[0].id;
    await bad.post("/appeals", { restrictionId: rid, body: "Please look at this again, it was unfair." });
    const appealId = (await adm.get("/admin/appeals")).body.appeals.find((a: any) => a.restriction.id === rid).id;
    await adm.post(`/admin/appeals/${appealId}/decision`, { decision: "upheld", note: "The messages were clear" });
    expect((await bad.get(`/rooms/${room}/messages`)).status).toBe(403);
  });

  it("will not let someone appeal another person's restriction", async () => {
    const adm = await staff("admin");
    const { reportId } = await scenario();
    await adm.post(`/mod/reports/${reportId}/actions`, { action: "suspend", reason: "Harassment", durationHours: 72 });
    const rid = (await adm.get("/admin/restrictions")).body.restrictions[0].id;
    const stranger = await member();
    expect((await stranger.post("/appeals", { restrictionId: rid, body: "This is not mine to appeal at all." })).status).toBe(404);
  });
});
