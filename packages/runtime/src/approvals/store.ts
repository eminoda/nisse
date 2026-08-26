import { randomUUID } from "node:crypto";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "failed";

export type ApprovalSummary = {
  approvalId: string;
  tool: string;
  arguments: Record<string, unknown>;
  summary: string;
  expiresAt: string;
  status: ApprovalStatus;
  result?: unknown;
  error?: string;
};

export type ApprovalEvent = {
  type: "approval.required" | "approval.resolved";
  approval: ApprovalSummary;
};

type ApprovalAction = () => Promise<unknown>;
type StoredApproval = ApprovalSummary & { expiresAtMs: number; action: ApprovalAction };

export type ApprovalStoreOptions = {
  now?: () => number;
  ttlMs?: number;
};

export class ApprovalStore {
  private readonly approvals = new Map<string, StoredApproval>();
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly listeners = new Set<(event: ApprovalEvent) => void>();

  constructor(options: ApprovalStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  }

  create(input: {
    tool: string;
    arguments: Record<string, unknown>;
    summary: string;
    action: ApprovalAction;
  }): ApprovalSummary {
    const approvalId = randomUUID();
    const expiresAtMs = this.now() + this.ttlMs;
    const approval: StoredApproval = {
      approvalId,
      tool: input.tool,
      arguments: input.arguments,
      summary: input.summary,
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresAtMs,
      status: "pending",
      action: input.action,
    };
    this.approvals.set(approvalId, approval);
    const summary = this.publicSummary(approval);
    this.emit({ type: "approval.required", approval: summary });
    return summary;
  }

  subscribe(listener: (event: ApprovalEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get(approvalId: string): ApprovalSummary {
    return this.publicSummary(this.require(approvalId));
  }

  async approve(approvalId: string): Promise<ApprovalSummary> {
    const approval = this.require(approvalId);
    this.ensurePending(approval);
    approval.status = "approved";
    try {
      approval.result = await approval.action();
      const summary = this.publicSummary(approval);
      this.emit({ type: "approval.resolved", approval: summary });
      return summary;
    } catch (error) {
      approval.status = "failed";
      approval.error = error instanceof Error ? error.message : "approval action failed";
      this.emit({ type: "approval.resolved", approval: this.publicSummary(approval) });
      throw error;
    }
  }

  reject(approvalId: string): ApprovalSummary {
    const approval = this.require(approvalId);
    this.ensurePending(approval);
    approval.status = "rejected";
    const summary = this.publicSummary(approval);
    this.emit({ type: "approval.resolved", approval: summary });
    return summary;
  }

  private ensurePending(approval: StoredApproval) {
    if (approval.status !== "pending") throw new Error("Approval already resolved");
    if (this.now() > approval.expiresAtMs) {
      approval.status = "expired";
      this.emit({ type: "approval.resolved", approval: this.publicSummary(approval) });
      throw new Error("Approval expired");
    }
  }

  private require(approvalId: string) {
    const approval = this.approvals.get(approvalId);
    if (!approval) throw new Error("Approval not found");
    return approval;
  }

  private publicSummary(approval: StoredApproval): ApprovalSummary {
    return {
      approvalId: approval.approvalId,
      tool: approval.tool,
      arguments: approval.arguments,
      summary: approval.summary,
      expiresAt: approval.expiresAt,
      status: approval.status,
      ...(approval.result === undefined ? {} : { result: approval.result }),
      ...(approval.error === undefined ? {} : { error: approval.error }),
    };
  }

  private emit(event: ApprovalEvent) {
    for (const listener of this.listeners) listener(event);
  }
}
