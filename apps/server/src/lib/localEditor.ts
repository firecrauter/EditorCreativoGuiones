import type { Request } from "express";
import u from "@/utils";

export function assertLocalEditor(req: Request) {
  u.mcpControl.assertAppRequest(req);
  if (!u.workspace.isLocalHostRequest(req)) throw Object.assign(new Error("Codex sólo está disponible desde el editor de esta PC."), { status: 403 });
}
