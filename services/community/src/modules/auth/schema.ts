import { z } from "zod";

export const registerBody = z.object({
  password: z.string().min(8, "Use at least 8 characters.").max(128).optional(),
});

export const loginBody = z.object({
  handle: z.string().trim().min(3).max(60),
  secret: z.string().min(1).max(500),
});

export const onboardingBody = z.object({
  acceptRules: z.literal(true, { error: "Please accept the community rules to continue." }),
  displayName: z.string().max(60).optional(),
});

export const personaBody = z.object({
  displayName: z.string().max(60).optional(),
  newAvatar: z.boolean().optional(),
});

export const passwordBody = z.object({
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});

export const deleteAccountBody = z.object({
  confirm: z.literal("delete my account"),
});
