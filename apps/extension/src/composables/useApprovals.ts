import { onMounted, onUnmounted, readonly, shallowRef } from "vue";
import { runtimeClient, type ApprovalSummary } from "../runtime/client";

export function useApprovals() {
  const approvals = shallowRef<ApprovalSummary[]>([]);
  const controller = new AbortController();

  function update(approval: ApprovalSummary) {
    const existing = approvals.value.some((item) => item.approvalId === approval.approvalId);
    approvals.value = existing
      ? approvals.value.map((item) => (item.approvalId === approval.approvalId ? approval : item))
      : [...approvals.value, approval];
  }

  async function subscribe() {
    if (!runtimeClient.hasToken) return;
    try {
      await runtimeClient.subscribeEvents((event) => {
        if (event.type !== "approval.required" && event.type !== "approval.resolved") return;
        update(JSON.parse(event.data) as ApprovalSummary);
      }, controller.signal);
    } catch {
      // Runtime status UI owns the connection error; approval cards remain local.
    }
  }

  async function approve(approvalId: string) {
    update(await runtimeClient.approveApproval(approvalId));
  }

  async function reject(approvalId: string) {
    update(await runtimeClient.rejectApproval(approvalId));
  }

  onMounted(subscribe);
  onUnmounted(() => controller.abort());

  return { approvals: readonly(approvals), approve, reject };
}
