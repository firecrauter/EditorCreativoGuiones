import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { assertLocalEditor } from "@/lib/localEditor";
import u from "@/utils";

export default Router().post("/", validateFields({ directory: z.string().min(1).max(4096), id: z.uuid() }), async (req, res) => {
  assertLocalEditor(req);
  const directory = await u.workspace.resolveWorkspace(req, req.body.directory);
  await u.codex.cancel(directory, req.body.id);
  res.json(success(null));
});
