-- Traceveil Community: initial schema.
-- Own database. No link to the MongoDB used by apps/web.

CREATE TABLE accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle            text NOT NULL UNIQUE CHECK (handle = lower(handle)),
  recovery_hash     text NOT NULL,
  password_hash     text,
  role              text NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member', 'verified_helper', 'moderator', 'admin')),
  failed_logins     integer NOT NULL DEFAULT 0,
  locked_until      timestamptz,
  age_confirmed_at  timestamptz NOT NULL,
  rules_accepted_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now()
);

-- What other members see. Messages point here, never at accounts.
-- account_id becomes NULL when an account is deleted, so old messages stay but are unlinked.
CREATE TABLE personas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid UNIQUE REFERENCES accounts (id) ON DELETE SET NULL,
  display_name text NOT NULL,
  avatar_seed  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX personas_display_name_live
  ON personas (lower(display_name)) WHERE account_id IS NOT NULL;

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_account ON sessions (account_id);
CREATE INDEX sessions_expires ON sessions (expires_at);

CREATE TABLE spaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false
);

CREATE TABLE rooms (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id              uuid NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
  slug                  text NOT NULL,
  title                 text NOT NULL,
  purpose               text NOT NULL DEFAULT '',
  kind                  text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'announcements', 'quiet')),
  language              text NOT NULL DEFAULT 'en',
  slow_mode_seconds     integer NOT NULL DEFAULT 0 CHECK (slow_mode_seconds >= 0),
  min_account_age_hours integer NOT NULL DEFAULT 0 CHECK (min_account_age_hours >= 0),
  is_locked             boolean NOT NULL DEFAULT false,
  is_archived           boolean NOT NULL DEFAULT false,
  sort_order            integer NOT NULL DEFAULT 0,
  UNIQUE (space_id, slug)
);

CREATE TABLE room_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE room_reads (
  account_id           uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  room_id              uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  last_read_message_id bigint,
  muted                boolean NOT NULL DEFAULT false,
  PRIMARY KEY (account_id, room_id)
);

CREATE TABLE messages (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id         uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  persona_id      uuid NOT NULL REFERENCES personas (id),
  body            text NOT NULL,
  reply_to_id     bigint REFERENCES messages (id) ON DELETE SET NULL,
  need_tag        text CHECK (need_tag IN ('listen', 'advice', 'reading')),
  content_warning text,
  status          text NOT NULL DEFAULT 'visible'
                  CHECK (status IN ('visible', 'hidden_by_mod', 'deleted_by_author')),
  client_msg_id   uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz,
  expires_at      timestamptz NOT NULL,
  UNIQUE (persona_id, client_msg_id)
);
CREATE INDEX messages_room_id ON messages (room_id, id DESC);
CREATE INDEX messages_persona_created ON messages (persona_id, created_at DESC);
CREATE INDEX messages_expires ON messages (expires_at);

CREATE TABLE message_mentions (
  message_id bigint NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  persona_id uuid   NOT NULL REFERENCES personas (id),
  PRIMARY KEY (message_id, persona_id)
);

CREATE TABLE reactions (
  message_id bigint NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  persona_id uuid   NOT NULL REFERENCES personas (id),
  kind       text   NOT NULL CHECK (kind IN ('care', 'hug', 'thanks', 'me_too', 'strength', 'seen')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, persona_id, kind)
);

CREATE TABLE blocks (
  account_id         uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  blocked_persona_id uuid NOT NULL REFERENCES personas (id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, blocked_persona_id)
);

CREATE TABLE reports (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_account_id uuid REFERENCES accounts (id) ON DELETE SET NULL,
  message_id          bigint REFERENCES messages (id) ON DELETE SET NULL,
  persona_id          uuid NOT NULL REFERENCES personas (id),
  room_id             uuid,
  reason              text NOT NULL CHECK (reason IN (
    'harassment', 'threat', 'fake_helper', 'leaked_content', 'personal_details',
    'self_harm_risk', 'minor_involved', 'spam', 'other')),
  note                text,
  priority            text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  status              text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'in_review', 'actioned', 'dismissed', 'escalated')),
  assigned_to         uuid,
  context_snapshot    jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  resolution_note     text
);
CREATE INDEX reports_queue ON reports (status, priority, created_at);
CREATE INDEX reports_persona ON reports (persona_id);
CREATE UNIQUE INDEX reports_one_open_per_reporter
  ON reports (reporter_account_id, message_id) WHERE status IN ('open', 'in_review');

CREATE TABLE restrictions (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id       uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('room_mute', 'suspend', 'ban')),
  room_id          uuid,
  reason           text NOT NULL,
  starts_at        timestamptz NOT NULL DEFAULT now(),
  ends_at          timestamptz,
  active           boolean NOT NULL DEFAULT true,
  source_action_id bigint,
  created_by       uuid NOT NULL,
  CHECK (kind <> 'room_mute' OR room_id IS NOT NULL)
);
CREATE INDEX restrictions_account_active ON restrictions (account_id) WHERE active;

-- Append-only records. Columns that point at other tables are plain ids on purpose:
-- the audit trail must survive deletion of accounts, messages and rooms.
CREATE TABLE mod_actions (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_account_id uuid NOT NULL,
  action           text NOT NULL,
  persona_id       uuid,
  message_id       bigint,
  report_id        bigint,
  room_id          uuid,
  reason           text,
  meta             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mod_actions_persona ON mod_actions (persona_id, created_at DESC);

CREATE TABLE audit_log (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_account_id uuid NOT NULL,
  action           text NOT NULL,
  target           text,
  reason           text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mod_actions_append_only BEFORE UPDATE OR DELETE ON mod_actions
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_change();

CREATE TABLE appeals (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restriction_id bigint NOT NULL UNIQUE REFERENCES restrictions (id) ON DELETE CASCADE,
  account_id    uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  body          text NOT NULL,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upheld', 'overturned')),
  decided_by    uuid,
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appeals_status ON appeals (status, created_at);

CREATE TABLE notifications (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  kind       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_account ON notifications (account_id, id DESC);
