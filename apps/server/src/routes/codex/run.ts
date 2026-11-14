import { Router } from "express";
import { codexRunSchema } from "@toonflow/story";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { assertLocalEditor } from "@/lib/localEditor";
import u from "@/utils";

export default Router().post("/", validateFields(codexRunSchema.shape), async (req, res) => {
  assertLocalEditor(req);
  const directory = await u.workspace.resolveWorkspace(req, req.body.directory);
  res.status(202).json(success(await u.codex.start(directory, req.body)));
});
