import type { ResolveBugInput } from "../services/types.js";
import type { TextToolResult } from "./types.js";

type ResolveService = {
  resolveBug(bugId: string | number, input: ResolveBugInput): Promise<{ status: "success" }>;
};

const resolutions = [
  "fixed",
  "notrepro",
  "bydesign",
  "duplicate",
  "external",
  "postponed",
  "willnotfix",
  "tostory",
] as const;

export const resolveBugToolMetadata = {
  risk: "write" as const,
  approvalRequired: true,
};

export async function resolveBug(
  service: ResolveService,
  input: { bugId: string | number } & ResolveBugInput,
): Promise<TextToolResult> {
  const bugId = Number(input?.bugId);
  if (!Number.isInteger(bugId) || bugId < 1) throw new Error("bugId must be a positive integer");
  if (!resolutions.includes(input.resolution)) throw new Error("resolution is not supported by ZenTao");
  const resolveInput: ResolveBugInput = {
    resolution: input.resolution,
    ...(input.resolvedDate === undefined ? {} : { resolvedDate: input.resolvedDate }),
    ...(input.resolvedBuild === undefined ? {} : { resolvedBuild: input.resolvedBuild }),
    ...(input.assignedTo === undefined ? {} : { assignedTo: input.assignedTo }),
    ...(input.comment === undefined ? {} : { comment: input.comment }),
  };
  await service.resolveBug(bugId, resolveInput);
  return { content: [{ type: "text", text: JSON.stringify({ status: "success", bugId }) }] };
}

export { resolutions };
