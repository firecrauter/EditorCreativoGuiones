import { Router } from "express";
import { success } from "@/lib/responseFormat";
import { assertLocalEditor } from "@/lib/localEditor";
import { catalogStatus } from "@/utils/codex/catalog";

export default Router().get("/", async (req, res) => {
  assertLocalEditor(req);
  res.set("Cache-Control", "no-store").json(success(await catalogStatus(true)));
});
