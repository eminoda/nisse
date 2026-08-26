import type { ZenTaoBug } from "../services/types.js";
import type { TextToolResult } from "./types.js";

type BugDetailService = { getBugDetail(bugId: string | number): Promise<ZenTaoBug> };

export async function getBugDetail(
  service: BugDetailService,
  input: { bugId: string | number },
): Promise<TextToolResult> {
  const bugId = Number(input?.bugId);
  if (!Number.isInteger(bugId) || bugId < 1) throw new Error("bugId must be a positive integer");
  const bug = await service.getBugDetail(bugId);
  return { content: [{ type: "text", text: JSON.stringify(bug) }] };
}
