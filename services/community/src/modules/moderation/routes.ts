import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { actorOf, requireRole } from "../../plugins/auth.js";
import { REPORT_ACTIONS, applyReportAction, claimReport, getReportDetail, hideMessageDirect, listReports } from "./service.js";

const reportParams = z.object({ reportId: z.string().regex(/^\d+$/) });
const reason = z.string().trim().min(3, "Please give a short reason.").max(500);
const listQuery = z.object({
  state: z.enum(["active", "mine", "closed", "all"]).default("active"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const actionBody = z.object({
  action: z.enum(REPORT_ACTIONS),
  reason,
  durationHours: z.number().int().min(1).max(24 * 365).optional(),
});

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
  const ctx = app.ctx;
  const staff = requireRole("moderator", "admin");

  app.get("/mod/reports", { preHandler: staff }, async (req) => {
    const q = listQuery.parse(req.query);
    return listReports(ctx, actorOf(req), q);
  });

  app.get("/mod/reports/:reportId", { preHandler: staff }, async (req) => {
    const { reportId } = reportParams.parse(req.params);
    return { report: await getReportDetail(ctx, actorOf(req), reportId) };
  });

  app.post("/mod/reports/:reportId/claim", { preHandler: staff }, async (req) => {
    const { reportId } = reportParams.parse(req.params);
    const { force } = z.object({ force: z.boolean().default(false) }).parse(req.body ?? {});
    return { report: await claimReport(ctx, actorOf(req), reportId, force) };
  });

  app.post("/mod/reports/:reportId/actions", { preHandler: staff }, async (req) => {
    const { reportId } = reportParams.parse(req.params);
    const body = actionBody.parse(req.body);
    return { report: await applyReportAction(ctx, actorOf(req), reportId, body) };
  });

  app.post("/mod/messages/:messageId/hide", { preHandler: staff }, async (req) => {
    const { messageId } = z.object({ messageId: z.string().regex(/^\d+$/) }).parse(req.params);
    const { reason: why } = z.object({ reason }).parse(req.body);
    return hideMessageDirect(ctx, actorOf(req), messageId, why);
  });
}
