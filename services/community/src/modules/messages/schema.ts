import { z } from "zod";
import { CONTENT_WARNING_MAX_CHARS, MESSAGE_MAX_CHARS, NEED_TAGS } from "../../config/constants.js";

const bodyText = z
  .string()
  .max(MESSAGE_MAX_CHARS, `Messages can be up to ${MESSAGE_MAX_CHARS} characters.`)
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "Write something before sending.");

const contentWarning = z
  .string()
  .max(CONTENT_WARNING_MAX_CHARS)
  .transform((s) => s.trim())
  .optional()
  .transform((s) => (s ? s : undefined));

export const postMessageBody = z.object({
  clientMsgId: z.string().uuid(),
  body: bodyText,
  replyToId: z.string().regex(/^\d+$/).optional(),
  needTag: z.enum(NEED_TAGS).optional(),
  contentWarning,
  mentions: z.array(z.string().uuid()).max(20).default([]),
  /** Set to true after the person has been asked "are you sure?" about personal details. */
  confirmShare: z.boolean().default(false),
});

export const editMessageBody = z.object({
  body: bodyText,
  contentWarning,
  confirmShare: z.boolean().default(false),
});

export const listQuery = z.object({
  before: z.string().regex(/^\d+$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PostMessageInput = z.infer<typeof postMessageBody>;
