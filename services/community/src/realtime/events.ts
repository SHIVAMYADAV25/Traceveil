/** Every event the server can push. The browser receives them as { type, data }. */
export type ServerEvent =
  | { type: "ready"; data: { personaId: string } }
  | { type: "subscribed"; data: { roomId: string } }
  | { type: "unsubscribed"; data: { roomId: string } }
  | { type: "pong"; data: Record<string, never> }
  | { type: "error"; data: { code: string; message: string } }
  | { type: "message.created"; data: { message: unknown } }
  | { type: "message.updated"; data: { message: unknown } }
  | { type: "message.hidden"; data: { roomId: string; messageId: string } }
  | { type: "message.deleted"; data: { roomId: string; messageId: string } }
  | {
      type: "reaction.changed";
      data: { roomId: string; messageId: string; kind: string; personaId: string; added: boolean; count: number };
    }
  | { type: "room.updated"; data: { room: unknown } }
  | { type: "notification.created"; data: { notification: unknown } }
  | { type: "account.restricted"; data: { kind: string; endsAt: string | null } };

export type ClientMessage =
  | { type: "subscribe"; roomId: string }
  | { type: "unsubscribe"; roomId: string }
  | { type: "ping" };
