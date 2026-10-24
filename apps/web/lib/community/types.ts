// Shapes returned by services/community. Kept in one place so every screen agrees.

export type Role = "member" | "verified_helper" | "moderator" | "admin";
export type RoomKind = "chat" | "announcements" | "quiet";
export type ReactionKind = "care" | "hug" | "thanks" | "me_too" | "strength" | "seen";
export type NeedTag = "listen" | "advice" | "reading";
export type ReportReason =
  | "harassment" | "threat" | "fake_helper" | "leaked_content" | "personal_details"
  | "self_harm_risk" | "minor_involved" | "spam" | "other";

export interface Restriction {
  id: string;
  kind: "room_mute" | "suspend" | "ban";
  roomId: string | null;
  reason: string;
  endsAt: string | null;
}

export interface Me {
  account: { handle: string; role: Role; createdAt: string };
  persona: { id: string; displayName: string; avatarSeed: string };
  onboardingComplete: boolean;
  restrictions: Restriction[];
  unreadNotifications: number;
  communityOpen: boolean;
}

export interface Room {
  id: string;
  spaceSlug: string;
  slug: string;
  title: string;
  purpose: string;
  kind: RoomKind;
  language: string;
  slowModeSeconds: number;
  minAccountAgeHours: number;
  isLocked: boolean;
}
export interface RoomListItem extends Room { unread: number; muted: boolean }
export interface Space { slug: string; title: string; description: string; rooms: RoomListItem[] }

export type PostingState =
  | { allowed: true }
  | { allowed: false; code: string; message: string; endsAt?: string | null };

export interface RoomDetail extends Room {
  notes: Array<{ id: string; title: string; body: string }>;
  posting: PostingState;
}

export interface Message {
  id: string;
  roomId: string;
  status: "visible" | "hidden_by_mod" | "deleted_by_author";
  body: string | null;
  contentWarning: string | null;
  needTag: NeedTag | null;
  createdAt: string;
  editedAt: string | null;
  author: {
    personaId: string;
    displayName: string;
    avatarSeed: string;
    badge: "admin" | "moderator" | "verified_helper" | null;
    linksClickable: boolean;
  };
  replyTo: { id: string; authorName: string; status: string; excerpt: string | null; hasContentWarning: boolean } | null;
  mentions: Array<{ personaId: string; displayName: string }>;
  reactions: Array<{ kind: ReactionKind; count: number; mine: boolean }>;
}

export interface AppNotification {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export type ReportStatus = "open" | "in_review" | "actioned" | "dismissed" | "escalated";
export interface ReportSummary {
  id: string;
  reason: ReportReason;
  priority: "normal" | "urgent";
  status: ReportStatus;
  createdAt: string;
  ageMinutes: number;
  resolvedAt: string | null;
  room: { id: string; title: string; spaceSlug: string; roomSlug: string } | null;
  targetName: string;
  assigned: "me" | "other" | null;
}
export interface SnapshotMessage {
  id: string; personaId: string; displayName: string; body: string | null; contentWarning: string | null;
  status: string; createdAt: string; reported: boolean;
}
export interface ReportDetail extends ReportSummary {
  note: string | null;
  snapshot: SnapshotMessage[];
  messageStillVisible: boolean;
  target: {
    personaId: string; displayName: string; isStaff: boolean; deleted: boolean; priorReports: number;
    activeRestrictions: Array<{ kind: string; roomId: string | null; endsAt: string | null }>;
    history: Array<{ action: string; reason: string | null; createdAt: string }>;
  };
}

export type ServerEvent =
  | { type: "ready"; data: { personaId: string } }
  | { type: "subscribed" | "unsubscribed"; data: { roomId: string } }
  | { type: "pong"; data: Record<string, never> }
  | { type: "error"; data: { code: string; message: string } }
  | { type: "message.created" | "message.updated"; data: { message: Message } }
  | { type: "message.hidden" | "message.deleted"; data: { roomId: string; messageId: string } }
  | { type: "reaction.changed"; data: { roomId: string; messageId: string; kind: ReactionKind; personaId: string; added: boolean; count: number } }
  | { type: "room.updated"; data: { room: Room } }
  | { type: "notification.created"; data: { notification: AppNotification } }
  | { type: "account.restricted"; data: { kind: string; endsAt: string | null } };
